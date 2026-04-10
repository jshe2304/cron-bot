# cron-bot

Autonomous run supervisor for compute jobs on HPC clusters. Monitors jobs, halts on anomalies, fixes bugs and reruns on crash, communicates with researcher via Slack.

**Status:** Early brainstorming / pre-prototype.

## Pi coding agent (key dependency)

Built on [Pi](https://github.com/badlogic/pi-mono) (`@mariozechner/pi-coding-agent`), a minimal extensible agent harness.

**Key packages:** `pi-agent-core` (runtime with tool calling, event streaming), `pi-ai` (multi-provider LLM API), `pi-mom` (Slack bot bridge), `pi-coding-agent` (CLI).

**Core design:**
- 4 base tools: `read`, `write`, `edit`, `bash`. Everything else via extensions.
- 4 operating modes: Interactive, print/JSON, RPC (stdin/stdout JSONL), SDK.
- Extensions are TypeScript modules adding tools/commands/event handlers. Also supports Skills (markdown), Prompt Templates, and Pi Packages.
- Agent runtime has event hooks (`beforeToolCall`/`afterToolCall`) for gating operations.
- No built-in MCP, sub-agents, or permission popups — all added through extensions.

**How we use Pi:**
- RPC/SDK mode to run headless as a subprocess.
- Fork/adapt `pi-mom` for Slack integration.
- Custom extensions for Slurm tools and log monitoring.
- `beforeToolCall` hooks to gate dangerous operations (human approval).

## Architecture

Target: HPC clusters (Slurm and PBS). Key constraints: login node policies, shared filesystem, compute node networking restrictions.

**Deployment model (under evaluation):**
- Primary approach: long-running lightweight process on login node (needs outbound HTTPS for Slack + LLM APIs, minimal CPU/RAM).
- Persistence options: user systemd, cron heartbeat, tmux/screen — depends on cluster policy.
- Alternative: lightweight scheduler jobs for the agent itself, but likely blocked by compute node network restrictions.
- Hybrid possible: agent on login node, heavy work (log parsing, analysis) submitted as short jobs.
- Must be portable across clusters with different schedulers and policies.

**Cluster assessment tooling:** `scripts/check-cluster-env.sh` — run on each cluster login node to probe scheduler, networking, persistence options, and resource limits. Sysadmin email template at `scripts/sysadmin-email-draft.md`.

## Current Design Commitments

The project is still intentionally lightweight, but a few architectural commitments are now explicit:

- internal coordination should use typed events rather than ad hoc side effects
- stable repo guidance and dynamic campaign context should be stored separately
- approval policy should be a visible runtime mode, not a hidden flag
- execution should go through a small backend interface
- commands should be stateless by default
- validation and replayable intervention trajectories are core product behavior
- the project should sit near the agentic end of the autonomy spectrum while keeping timekeeping and safety boundaries deterministic

## Runtime Shape

**Suggested module boundaries:**
- `supervisor`: polling cadence, incident lifecycle, and campaign coordination
- `context`: stable repo guidance plus generated campaign profile
- `llm`: assessment, diagnosis, repair proposal, and summaries
- `executor`: stateless command runner, file edits, scheduler actions
- `validation`: cheap checks before resubmission
- `policy`: approval modes, retry budgets, token budgets, editable path limits
- `memory`: event log, campaign profile, intervention trajectories
- `slack`: reporting and approvals

**Typed event spine:**
- `observation`
- `assessment`
- `incident`
- `repair_proposal`
- `repair_applied`
- `validation_result`
- `approval_requested`
- `approval_resolved`
- `job_submitted`
- `job_resubmitted`
- `summary_posted`

Slack, persistence, and later audit/debug views should consume these same events.

## Context Model

Keep two layers distinct:

- stable repo guidance: project instructions, conventions, cluster notes, and safety rules
- dynamic campaign context: campaign goal, active jobs, expected outputs, failure signatures, recent interventions, and current approval mode

The agent should build a compact campaign map from repository structure, job scripts, logs, and outputs instead of pushing large raw file or log dumps into context.

## Approval And Execution

Approval should be modeled as explicit runtime modes:

- `observe_only`
- `ask_before_edit`
- `ask_before_resubmit`
- `bounded_auto`

Dangerous actions should go through one policy gate. This includes file edits, destructive shell commands, job cancellation, and resubmission.

Execution should be abstracted behind a small backend boundary so the reasoning loop stays portable across login-node shells, scheduler operations, and future Singularity or Apptainer-wrapped execution.

Command execution should be stateless by default. Every action should carry explicit working directory, environment, timeout, and recorded result.

## Scheduling Stance

The supervisor should be agentic about what to inspect, how to interpret run state, and what to do next. It should not be responsible for its own wall clock.

Use deterministic scheduling infrastructure for wakeups, retries, and deferred follow-ups. The scheduler should wake the model with a reason, such as:

- periodic campaign check
- delayed follow-up
- user message
- job-state change
- validation completion

Avoid making long-lived supervision depend primarily on a model-issued `sleep` tool. That is a fragile way to keep time on a login node resident process.

## Validation And Memory

Validation should be cheap and routine before resubmission when feasible:

- script syntax checks
- config parsing checks
- import or startup smoke tests
- submission dry-runs
- short repro commands
- user-defined campaign smoke tests

Memory should store both evolving campaign state and replayable intervention trajectories. A good trajectory record includes:

- evidence inspected
- reasoning summary
- commands run
- diffs applied
- validation results
- approval outcomes
- scheduler actions taken
