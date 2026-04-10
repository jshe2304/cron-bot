# Aider

## What It Is

`aider` is a terminal coding assistant that works directly in a local git repository. It is strong as a reference because it is opinionated about a few high-value things and avoids a large runtime.

Primary sources:

- https://aider.chat/docs/usage.html
- https://aider.chat/docs/repomap.html
- https://aider.chat/docs/more/edit-formats.html
- https://aider.chat/docs/usage/lint-test.html
- https://aider.chat/docs/usage/modes.html
- https://aider.chat/docs/git.html

## Design Features Worth Studying

### 1. Repository map instead of raw repository stuffing

Aider sends a compact repository map rather than dumping large file sets into context. The map includes important symbols, definitions, and relationships, then expands or trims based on token budget and relevance.

Why this matters for `cron-bot`:

- The supervisor should not shovel entire repos or long logs into the model.
- We want a campaign map, not just a repo map.
- The map should include the minimum useful structure:
  job scripts, recent log tails, active outputs, relevant source files, failure signatures, and the most recent repair history.

### 2. Edit formats are treated as a first-class systems concern

Aider does not assume all models edit well in the same way. It explicitly chooses edit formats such as whole-file replacement or search/replace diffs based on what works reliably.

Why this matters for `cron-bot`:

- We should treat patch application as an explicit subsystem.
- Pi gives us `write` and `edit`, but we still need a house policy for when to prefer narrow diffs versus broader rewrites.
- For campaign supervision, we should bias toward the smallest mechanically applicable patch and record it cleanly.

### 3. Validation is built into the normal edit loop

Aider can run linting and tests automatically after edits, and then feed failures back into the model for repair.

Why this matters for `cron-bot`:

- This matches the project’s “smallest plausible fix first” philosophy.
- For HPC work, validation should include more than unit tests:
  config parse checks, dry-run submission checks, script syntax checks, import smoke tests, and short local repros.
- Validation should be cheap by default and escalate only when needed.

### 4. Git is part of the safety model

Aider uses git as operational scaffolding. It commits edits, separates dirty worktree changes from agent changes, and makes undo/review natural.

Why this matters for `cron-bot`:

- The current plan mentions recording what changed and why, but it does not yet clearly say how.
- Even if the first version does not auto-commit every repair, it should at least produce a precise repair artifact:
  changed files, patch summary, validation results, and resubmission reason.
- Git is useful for local source changes; a parallel structured event log is needed for job and log actions that are not git-backed.

### 5. Modes stay simple and legible

Aider has a small number of modes such as `ask`, `code`, and `architect`. That keeps behavior explicit.

Why this matters for `cron-bot`:

- The supervisor should also have a small set of crisp task entrypoints.
- Good candidates:
  assess run health, diagnose incident, propose repair, apply repair, validate repair, summarize progress.

## Relevant Takeaways

- A compact synthesized context object is more important than a large toolset.
- Automatic cheap validation should be part of the default repair loop.
- Edit reliability is a systems problem, not just a prompting problem.
- Git-backed traceability is valuable, but must be complemented by structured non-git memory for jobs and logs.

## Things Not To Copy Directly

- Aider is repo-centric, while `cron-bot` is campaign-centric.
- Its context model is mostly about source code, not long-running external processes.
- Its normal user flow assumes an active terminal user, while `cron-bot` needs long-lived unattended supervision with Slack as the human checkpoint.
