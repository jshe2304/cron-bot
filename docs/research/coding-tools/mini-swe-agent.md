# mini-SWE-agent

## What It Is

`mini-SWE-agent` is an intentionally small coding agent. It is one of the best references for a harness that stays readable and still performs useful software work.

Primary sources:

- https://github.com/SWE-agent/mini-swe-agent
- https://mini-swe-agent.com/latest/usage/mini/
- https://mini-swe-agent.com/latest/faq/
- https://mini-swe-agent.com/latest/advanced/environments/
- https://mini-swe-agent.com/latest/usage/inspector/

## Design Features Worth Studying

### 1. Simple control flow is an explicit product goal

The project is deliberately designed around a very simple agent loop. The docs emphasize:

- no tools other than `bash` in the default setup
- linear history
- actions parsed from fenced command blocks
- `subprocess.run` execution where each action is independent

Why this matters for `cron-bot`:

- This strongly supports your current instinct to keep the harness small and readable.
- The resident supervisor should avoid becoming a complex orchestration engine.
- A small number of reliable execution primitives is likely enough:
  read files, run shell commands, apply bounded edits, submit/query Slurm, post to Slack, persist memory.

### 2. Approval mode is not buried

`mini` exposes distinct operating modes such as `confirm`, `yolo`, and `human`.

Why this matters for `cron-bot`:

- The current plan already calls out approval mode, but the design should make it a top-level runtime state, not a scattered policy flag.
- A useful near-term set for `cron-bot` would be:
  observe-only, ask-before-edit, ask-before-resubmit, and bounded-auto.

### 3. Replayable trajectories are a first-class artifact

`mini-SWE-agent` stores run histories and ships an inspector for browsing trajectory files.

Why this matters for `cron-bot`:

- Campaign supervision needs the same property.
- When a repair happens at 3am, the user should be able to inspect:
  what the agent saw, what it concluded, which commands it ran, what changed, what validation passed or failed, and why it resubmitted or escalated.
- This is not just debugging infrastructure. It is core product behavior for trust.

### 4. Environment abstraction includes HPC-friendly backends

The environment docs explicitly mention local execution plus Docker, Singularity, and Apptainer-style container backends.

Why this matters for `cron-bot`:

- This is directly relevant to clusters where Docker is unavailable but Singularity/Apptainer is normal.
- Even if Slurm is the first scheduler target, environment handling should not assume a normal workstation shell forever.
- A simple execution backend interface is worth having early.

### 5. Stateless actions reduce incidental complexity

The FAQ explicitly calls out why each action being independent avoids many shell-state problems.

Why this matters for `cron-bot`:

- For campaign supervision, long-lived shell state is risky and hard to reason about.
- The default should be stateless command execution plus explicit per-command environment shaping.
- Persistent state should live in structured memory, not in an invisible shell session.

## Relevant Takeaways

- Your “lightweight graduate student” analogy is compatible with a very small harness.
- Approval mode should become a visible runtime concept.
- Action history should be durable and easy to inspect.
- Execution should default to stateless commands with explicit context.
- A backend abstraction is warranted if it stays small and scheduler-aware.

## Things Not To Copy Directly

- `mini-SWE-agent` is optimized for coding-task loops, not background supervision across days.
- Its default interaction pattern is still user-driven rather than watchdog-driven.
- A pure single-action bash interface may be too narrow once `cron-bot` needs Slack, Slurm, memory, and campaign state.
