# Synthesis For cron-bot

This is the short version of what seems worth changing after comparing the current plan against `aider`, `mini-SWE-agent`, and `OpenHands`.

## What Looks Correct In The Current Plan

The current direction is mostly right.

The strongest parts are:

- keep the harness small
- let the model do the reasoning
- focus deterministic code on observation, execution, persistence, and guardrails
- prefer surgical repairs
- avoid config-heavy control-plane design

Those choices are consistent with the best parts of the reference tools.

## What Should Change Or Become More Explicit

### 1. Add a first-class event model

The current plan talks about modules, but not yet about the internal events that connect them.

Change:

- Add typed events for `observation`, `assessment`, `incident`, `repair_proposal`, `repair_applied`, `validation_result`, `approval_requested`, `approval_resolved`, `job_submitted`, `job_resubmitted`, `summary_posted`.
- Also include `clarification_requested` for ambiguous goals or low-confidence interpretation, and `wake_degraded` for wake failures and degraded operation.

Why:

- This is the cleanest way to support Slack, persistent memory, audits, and later debugging without building separate ad hoc paths.

### 2. Split stable repo guidance from dynamic campaign context

Right now the context plan is directionally correct but underspecified.

Change:

- Keep `AGENTS.md`-style repo guidance as a stable input.
- Add a generated campaign profile that captures:
  campaign goal, scheduler facts, key scripts, active jobs, expected outputs, failure signatures, recent interventions, and approval policy.

Why:

- This is the equivalent of combining OpenHands-style repo guidance with aider-style synthesized context selection.

### 3. Make approval mode a visible runtime state machine

Approval is currently listed as a guardrail, but it should be more central.

Change:

- Model explicit runtime modes such as:
  `observe_only`
  `ask_before_edit`
  `ask_before_resubmit`
  `bounded_auto`

Why:

- `mini-SWE-agent` gets this right. The operator should always know how much autonomy is currently enabled.

### 4. Add a lightweight execution backend abstraction early

The current plan talks about Slurm and login nodes, but not yet about execution backends as a code boundary.

Change:

- Introduce a minimal backend interface for:
  shell command execution
  file edits
  scheduler queries
  scheduler submission
  optional containerized or remote execution

Why:

- This keeps the code ready for workstation, login-node, and Singularity/Apptainer-backed environments without introducing heavy infrastructure.

### 5. Default to stateless command execution

This is not explicit enough in the current plan.

Change:

- Avoid relying on a long-lived mutable shell session.
- Prefer explicit working directory, explicit environment, and structured command records per action.

Why:

- This reduces hidden state and makes approval, replay, and debugging much easier.

### 6. Treat validation as a named subsystem

Validation is mentioned, but it should have more shape.

Change:

- Add a `validation` module or clearly named executor path for cheap checks before resubmission:
  shell syntax checks, config parsing, import checks, submission dry-runs when available, short repro commands, and user-defined smoke tests.

Why:

- This is one of the clearest wins from aider’s design.

### 7. Make replayable trajectory storage a core product feature

Memory is in the current plan, but action replay is not explicit enough.

Change:

- Store a compact trajectory for each incident and intervention:
  inputs considered, key observations, reasoning summary, commands run, diffs applied, validation results, approval outcomes, and scheduler actions.

Why:

- This is essential for trust and postmortem review, not just internal debugging.

## Suggested Module Shape

The current module outline is close, but I would adjust it slightly:

- `supervisor`: polling cadence, campaign lifecycle, incident coordination
- `context`: stable repo guidance, generated campaign profile, focused context assembly
- `llm`: assessment, diagnosis, repair proposal, repair summary, progress summary
- `executor`: stateless command runner, bounded edit application, scheduler operations
- `validation`: cheap verification steps before resubmission
- `policy`: approval mode, retry limits, token/cost budgets, editable paths
- `memory`: campaign profile, event log, intervention trajectories
- `slack`: reporting, approvals, summaries

This keeps the system small while making validation and event capture harder to ignore.

## Current Planning Risks

The biggest risks in the current direction are:

- context assembly staying too informal and eventually bloating prompts
- approvals being implemented as scattered conditionals instead of a clear mode system
- command execution becoming implicitly stateful
- memory storing summaries but not enough replayable action detail
- Pi integration becoming the design center instead of the campaign supervisor behavior being the design center

## Bottom Line

The plan does not need a major pivot.

It does need a few design commitments to stay on the good side of minimalism:

- explicit event model
- explicit approval modes
- explicit validation path
- explicit trajectory storage
- explicit separation between stable repo guidance and dynamic campaign context

If you make those explicit early, the project stays lightweight without becoming vague.

After comparing against Claude Code, OpenClaw, and Codex as well, one additional stance is worth making explicit:

- keep the project near the agentic end of the autonomy spectrum
- keep timekeeping, wakeups, retries, and hard limits deterministic

The model should own supervisory judgment. The scheduler should own the clock.
