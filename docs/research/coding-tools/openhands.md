# OpenHands

## What It Is

`OpenHands` is a larger agent runtime and product surface than `cron-bot` likely needs, but it is useful as a reference for the parts that become important once agents must run reliably in broader environments.

Primary sources:

- https://docs.all-hands.dev/index
- https://docs.all-hands.dev/sdk
- https://docs.all-hands.dev/usage/agents
- https://docs.all-hands.dev/usage/runtimes
- https://docs.all-hands.dev/usage/runtimes/local
- https://docs.all-hands.dev/openhands/usage/configuration-options
- https://docs.all-hands.dev/openhands/usage/microagents/microagents-overview

## Design Features Worth Studying

### 1. Runtime is a formal concept

OpenHands explicitly separates the agent from the runtime where commands and file edits happen. It supports multiple runtime backends and treats isolation as a configurable system boundary.

Why this matters for `cron-bot`:

- This maps cleanly onto cluster reality.
- The project should distinguish:
  the reasoning loop, the execution backend, and the policy guardrails.
- In HPC, “where the command runs” is often as important as “which command runs”.

### 2. Security and confirmation are explicit configuration surfaces

OpenHands exposes confirmation mode and security-related settings as real runtime configuration, not hidden implementation details.

Why this matters for `cron-bot`:

- This reinforces the need to keep approval policy visible and boring.
- Dangerous actions should go through one obvious gate:
  code edits, destructive shell commands, job cancellation, and job resubmission.

### 3. Repository guidance is reusable and layered

OpenHands uses microagents and repo guidance files to inject project-specific instructions in a reusable way.

Why this matters for `cron-bot`:

- This is close to your existing use of `AGENTS.md`.
- The project should probably standardize two layers of guidance:
  repo-level operating guidance and campaign-level generated context.
- Repo guidance stays relatively static; campaign guidance evolves as the agent learns the workload.

### 4. Evented runtime design supports observability

OpenHands has SDK and headless surfaces built for automation, not only an interactive terminal loop.

Why this matters for `cron-bot`:

- This is consistent with the plan to use Pi in RPC or SDK mode.
- Slack reporting, approvals, and summaries become much easier if the internal runtime is evented from the start.
- The resident process should emit typed events for observation, diagnosis, repair, validation, approval request, resubmission, and summary.

### 5. Rich runtime options are useful, but can become product drag

OpenHands demonstrates the value of runtime flexibility, but also illustrates how quickly the surface area grows.

Why this matters for `cron-bot`:

- You should borrow the separation of concerns, not the overall weight.
- `cron-bot` does not need a broad end-user platform, browser automation stack, or general app integration layer in the first version.

## Relevant Takeaways

- Separate execution backend from reasoning loop and from policy.
- Make risky actions pass through one explicit approval layer.
- Treat repo guidance and evolving campaign context as distinct inputs.
- Emit typed events so Slack, memory, and audits all consume the same internal record.

## Things Not To Copy Directly

- The overall product breadth is too large for the current scope.
- Heavy sandbox infrastructure is likely the wrong first move for login-node supervision.
- `cron-bot` should prefer a smaller local-first runtime with HPC-aware backends over a general-purpose agent platform.
