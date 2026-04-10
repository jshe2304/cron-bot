# cron-bot Agent Guide

This project is a lightweight HPC campaign supervisor built on Pi. It should behave less like a rigid orchestration system and more like a careful graduate student or intern logged into the cluster, watching experiments, interpreting what is happening, making small fixes, and reporting back clearly.

## Project Direction

- Target Slurm first.
- Optimize for long-running, lightweight supervision on login nodes.
- Treat LLM reasoning as central to supervision, diagnosis, repair, analysis, and reporting.
- Keep the harness minimal. The code should provide context, memory, execution, and explicit limits. The model should do most of the thinking.
- Prioritize real productivity for computational scientists and engineers over maximal architectural purity.

Before making architectural or runtime changes, read:

- [`docs/architecture/README.md`](/Users/jshe/Code/cron-bot/docs/architecture/README.md)
- [`docs/architecture/operating-model.md`](/Users/jshe/Code/cron-bot/docs/architecture/operating-model.md)
- [`docs/architecture/core-loop.md`](/Users/jshe/Code/cron-bot/docs/architecture/core-loop.md)
- [`docs/architecture/implementation-roadmap.md`](/Users/jshe/Code/cron-bot/docs/architecture/implementation-roadmap.md)
- [`docs/architecture/implementation-checklist.md`](/Users/jshe/Code/cron-bot/docs/architecture/implementation-checklist.md)

These files are the current source of truth for how the bot should operate, what boundaries should remain explicit, and how the system should be built and tested.

If a change materially affects the operating model, scheduler/agent split, approval flow, memory model, or testing strategy, update those docs in the same change.

## Operating Philosophy

- Trust the model to reason about experiment state, logs, failures, and next actions.
- Keep deterministic code focused on observation, persistence, execution, and guardrails.
- Prefer broad capability with a small number of hard constraints over a large number of bespoke heuristics.
- Let the system learn its role from conversation, repository structure, job scripts, logs, and past runs.
- Make the user experience feel like delegating to a competent research assistant, not filling out a large control-plane config.

The project should sit near the agentic end of the autonomy spectrum. It should behave more like a resident research assistant than a fixed monitoring daemon.

That means:

- the model should decide what to inspect, how to interpret evidence, and what action is worth taking
- deterministic code should provide timekeeping, wakeups, persistence, execution boundaries, and hard safety limits
- the system should not reduce supervision to predefined anomaly metrics with occasional LLM explanations

## What The Agent Should Do

The agent supervises a compute campaign, not just a single job.

It should be able to:

- understand the campaign goal from conversation and local context
- inspect Slurm jobs, submission scripts, logs, and outputs
- notice failures, stalls, suspicious behavior, or incomplete results
- interpret what is happening using LLM reasoning
- make surgical code, config, or script edits when appropriate
- resubmit jobs and continue the campaign
- run lightweight post-completion analyses
- report progress, incidents, repairs, and outcomes over Slack

## Human Analogy

Use a strong human analogy when designing behavior.

The agent should operate like a capable junior researcher who:

- knows the experimental goal
- watches jobs and logs closely
- notices when something looks wrong even if the process has not crashed
- inspects the smallest relevant set of files
- makes the smallest plausible fix first
- reruns and checks whether the intervention worked
- summarizes progress and problems without overwhelming the user
- asks for help or approval when confidence is low or limits are reached

## System Shape

Keep the system small and readable. Prefer a few plain modules with obvious responsibilities.

Suggested module boundaries:

- `supervisor`: campaign state, polling cadence, orchestration, and incident lifecycle
- `context`: stable repo guidance, generated campaign profile, and focused context assembly
- `llm`: named task entrypoints for assessment, diagnosis, repair, summaries, and quick analysis
- `executor`: stateless commands, bounded edits, and scheduler operations
- `validation`: cheap checks before resubmission or escalation
- `policy`: explicit limits such as approval mode, retry budgets, spend caps, and editable path constraints
- `memory`: persistent campaign history, event log, campaign profile, and prior repair trajectories
- `slack`: reporting, approvals, and progress summaries

These are implementation boundaries, not separate user-facing personalities. The external interface should feel like one continuous assistant.

The system should stay small, but a few boundaries should be explicit from the start:

- internal behavior should be driven by typed events rather than ad hoc callbacks
- approval mode should be a visible runtime state, not scattered conditionals
- command execution should default to stateless actions with explicit working directory and environment
- validation should be a named step before risky resubmissions when feasible
- interventions should leave behind replayable trajectories, not only free-form summaries

## Role Of LLM Reasoning

LLMs are not only for code repair. They should also help with:

- log interpretation
- run health assessment
- anomaly triage
- experiment progress summaries
- result summaries
- quick ad hoc analyses
- selecting relevant context
- deciding when to continue watching versus intervene

Do not design the system as a fixed set of detectors plus a patch generator. Design it as an LLM-guided supervisor with deterministic execution boundaries.

## Guardrails

Minimal harness does not mean no limits.

The code should enforce a small set of explicit boundaries:

- approval mode
- retry and resubmission limits
- cost or token budget
- editable path constraints
- validation before resubmission when feasible
- escalation when confidence is low or repeated repairs fail

These should stay simple and visible in code. They are constraints, not the source of behavior.

Approval mode should be modeled explicitly. Prefer a small runtime state machine such as:

- `observe_only`: watch, assess, summarize, and ask for permission before any mutation
- `ask_before_edit`: allow diagnosis and validation, but require approval before changing files
- `ask_before_resubmit`: allow bounded edits and validation, but require approval before resubmitting or canceling jobs
- `bounded_auto`: allow bounded edits and resubmissions within configured retry and path limits

Every risky action should pass through one obvious policy path.

## Context Strategy

Do not require the user to hand-author a large manifest.

Instead:

- start from conversation and a small amount of user input
- treat repo guidance as a stable input
- inspect the repo, Slurm scripts, logs, and outputs
- infer a working campaign profile
- persist structured state internally
- let the user review or refine generated context when needed

Structured internal state is still important, but the product should feel conversational and incremental rather than config-heavy.

Keep two context layers distinct:

- stable repo guidance: durable instructions such as this file, cluster notes, and project conventions
- dynamic campaign context: current goal, key scripts, active jobs, expected outputs, recent failures, recent interventions, and current approval mode

The system should build a compact campaign map rather than shoveling raw repository contents or long logs into every prompt.

## Repair Strategy

Repairs should be surgical.

That means:

- inspect a bounded set of relevant files
- prefer the smallest plausible patch
- avoid broad refactors during campaign supervision
- validate cheaply before resubmission
- record what changed and why
- escalate when the fix would be large, risky, or speculative

Where possible, prefer direct cause-and-effect repairs over generic cleanup.

Validation should be a named subsystem, not an afterthought. Cheap default checks may include:

- shell syntax checks
- config parsing or schema checks
- import or startup smoke tests
- submission dry-runs when available
- short local repro commands
- user-defined campaign smoke tests

Resubmission should normally require a recorded validation result or a clear reason why validation was not feasible.

Interventions should also be replayable. For each incident or repair, store a compact trajectory containing:

- inputs considered
- key observations
- reasoning summary
- commands run
- diffs applied
- validation results
- approval outcomes
- scheduler actions taken

## Code Style

Write readable TypeScript.

- Each line should do one thing.
- Prefer simple control flow over clever abstractions.
- Keep dependency trees shallow.
- Use an abstraction when it is obvious and earns its keep.
- Keep modules small and responsibilities explicit.
- Avoid framework-heavy designs unless they solve a real problem in this repo.
- Favor types and plain data structures over hidden behavior.

## Current Scope

For the near term:

- Slurm first
- login-node resident process first
- Slack for communication and approvals
- Pi RPC or SDK mode as the core agent runtime
- source, config, and script edits are in scope
- the supervising agent should stay lightweight between incidents

Execution should still be abstracted behind a small backend boundary so the reasoning loop does not hard-code one environment shape. Near-term backends may still all target the login node, but the interface should make room for:

- local shell execution on the login node
- scheduler queries and submissions
- optional container-wrapped execution for Singularity or Apptainer-style environments
- later portability across scheduler or cluster policy differences

Default to stateless command execution. Persistent state should live in structured memory, not in a long-lived mutable shell session.

Scheduling should be explicit and robust. Prefer a deterministic heartbeat or cron-like scheduler that wakes the model with a reason for waking, such as:

- periodic campaign check
- delayed follow-up
- user message
- job-state change
- validation completion
- wake retry after degraded execution

Do not make long-lived supervision depend primarily on the model invoking a `sleep`-style tool and holding the control loop open. The scheduler should own the clock. The model should own the supervisory judgment on each wake.

## Internal Event Model

The runtime should emit typed events that can be consumed by memory, Slack, approvals, and audits. Useful event types include:

- `observation`
- `assessment`
- `incident`
- `repair_proposal`
- `repair_applied`
- `validation_result`
- `approval_requested`
- `approval_resolved`
- `clarification_requested`
- `job_submitted`
- `job_resubmitted`
- `summary_posted`
- `wake_degraded`

This is the preferred spine for internal coordination. It is simpler and more durable than wiring each integration separately.

The event log should be the main audit trail. The campaign profile and intervention trajectories should be treated as derived working views, not competing sources of truth.

## Design Test

When making architecture decisions, ask:

- does this keep the resident system lightweight?
- does this let the model do the reasoning work?
- does this feel like how a capable human would supervise experiments?
- does this improve scientist productivity directly?
- is the implementation still easy to read six months from now?

If the answer to several of these is no, the design is probably too heavy.
