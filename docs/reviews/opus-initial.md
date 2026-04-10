# Initial Design Review — Opus

Reviewer: Claude Opus 4.6
Date: 2026-04-10
Project version: `cron-bot` 0.0.1
Reviewed commit: `0491ebe` ("design commitments and core types")
Pi dependency: `@mariozechner/pi-coding-agent@0.62.0`
Scope: `CLAUDE.md`, `AGENTS.md`, `docs/research/coding-tools/*`, `docs/architecture/core-loop.md`, `src/core/types.ts`
Project stage: pre-prototype

This is an outside read of the current design, philosophy, and architecture commitments. It is not a code review — most of the code does not exist yet. The goal is to surface the load-bearing questions to resolve before writing much more of it.

## Overall

The design is in a genuinely good place for a pre-prototype. The synthesis in `docs/research/coding-tools/synthesis.md` is real synthesis rather than a summary, and the four-way split in `docs/architecture/core-loop.md:7-14` (scheduler owns time, agent owns judgment, policy owns limits, memory owns continuity) is the kind of boundary most projects only find after shipping something painful. The research notes pull the right lessons from each reference tool rather than defaulting to "do what OpenHands does." The grad-student analogy in `AGENTS.md:46-57` is the best design test in the repo and worth reaching for repeatedly.

## What's load-bearing and right

- **Scheduler-owns-the-clock, model-owns-the-wake.** `docs/architecture/core-loop.md:102-117` and the `WakeReason` type in `src/core/types.ts:1-20` are the single most important commitment in the project. Most "agentic supervisor" attempts die on `sleep`-in-the-loop. Ruled out in code already.
- **Declarative `PlannedAction` before execution.** `docs/architecture/core-loop.md:86-100` + the action union in `src/core/types.ts:165-210` gives approval, replay, audit, and dry-run for free. Right shape.
- **Approval as a runtime state machine, not a flag.** `AGENTS.md:114-121` and `ApprovalMode` in `src/core/types.ts:22-26`. The four modes are the right resolution of the `mini-SWE-agent` lesson.
- **Event spine.** The 11 event types are consistent across `CLAUDE.md`, `AGENTS.md:226-238`, `docs/research/coding-tools/synthesis.md:27`, and `src/core/types.ts:152-163`.
- **Two-layer context (stable repo guidance vs. dynamic campaign profile).** `AGENTS.md:138-143`. The thing that will keep prompts from bloating in month three.

## Tensions worth resolving before writing much more code

### 1. Pi's open tool model vs. the closed `PlannedAction` enum — the biggest unresolved question

`CLAUDE.md` says Pi gives `read`/`write`/`edit`/`bash` plus extensions and "the model should do most of the thinking." But `src/core/types.ts:203-210` defines a closed 7-variant `PlannedAction` union. These are two very different architectures:

- If `PlannedAction` is the execution boundary, the model *cannot* do anything outside this menu, and a fixed-predicate supervisor has been quietly rebuilt — exactly what `docs/research/coding-tools/mainstream-agents.md:217-222` warns against.
- If the model calls Pi tools freely and `PlannedAction` is a *summary* emitted for audit/approval, then `PlannedAction` is observational, not prescriptive, and should not be typed as "what will be executed."

Pick one. Reading the rest of the docs, the second interpretation fits: the model reasons freely with Pi tools within a wake, and `PlannedAction` + the event spine are what gets *recorded*. If so, the types in `src/core/types.ts` need to say so — rename to `RecordedAction`, or separate `ProposedAction` (pre-approval) from `ExecutedAction` (post-hoc) — because right now the type names imply a narrow command palette.

### 2. What does "one wake" actually contain?

`SupervisorInput → SupervisorDecision` at `src/core/types.ts:212-222` reads as single-shot: one wake, one decision. Realistic supervision is "tail log → notice weird line → grep source → check another job's output → decide," which is 4+ tool calls of inner reasoning per wake. The docs never say whether a wake is a single LLM turn or a bounded inner agent loop. Probably the latter, but it changes how `memory`, `policy` (token budget enforcement), and `executor` are shaped — worth writing down.

### 3. Stateless execution is right in principle and expensive in practice on HPC

`AGENTS.md:212` and `docs/research/coding-tools/synthesis.md:85-91` commit to stateless commands. Correct goal. On a real cluster a single action may need `module load`, `source activate env`, `export PYTHONPATH=...`, which can be 15-60s of startup per command. If every log inspection pays that cost, the supervisor feels sluggish and burns login-node CPU.

Compromise: stateless *actions* but campaign-scoped *command prefixes* (env bootstrap snippet) that the executor prepends. Keeps the "no hidden shell state" invariant without paying full env cost per command.

### 4. Validation-before-resubmit is harder on HPC than the doc implies

`AGENTS.md:160-167` and `docs/research/coding-tools/synthesis.md:93-104` lean heavily on cheap checks: config parse, import smoke, dry-run submit. In practice:

- Dry-run `sbatch --test-only` is cheap; real submission smoke tests cost queue time.
- Import checks need the *compute-node* env, which login nodes often do not have.
- Config schema checks assume a schema exists.

The validation module should acknowledge that "cheap" is cluster-dependent, and there should be an explicit `validation_skipped` outcome *with a recorded reason*. `ValidationResultEvent` at `src/core/types.ts:113-119` already has `skipped` — good — but no reason field.

### 5. No degraded-mode story

A resident supervisor will experience: LLM API quota exhausted, provider outage, malformed model output, Slack webhook 500s. The docs do not mention what the scheduler-owned clock should do when the agent cannot wake successfully. Options: observe-only fallback, post "supervisor degraded" to Slack, stop posting and queue incidents. Pick one — this is the failure mode a grad student would handle gracefully and the one most agentic systems get wrong.

### 6. No structured "I don't understand the goal" output

The grad student analogy includes asking questions when unsure (`AGENTS.md:57`). The event spine only has `approval_requested` (risky action gating), not `clarification_requested` (ambiguous goal / low confidence). For a long-horizon campaign these are distinct: the first blocks an *action*, the second blocks the *interpretation*. Worth adding before the event set is committed.

## Smaller gaps

- **Git / repair artifact.** `docs/research/coding-tools/aider.md:51-60` flagged git as part of the safety model. `RepairAppliedEvent` at `src/core/types.ts:106-111` has `changedPaths` but no commit ref. For auditable replay, record a commit hash (even on a sidecar branch) as part of the event. Cheap; closes the loop between "something changed" and "show me what."
- **Memory shape is three things at once.** `AGENTS.md:71` names memory as "persistent campaign history, event log, campaign profile, and prior repair trajectories." At least three different storage shapes (append-only log, mutable profile, structured trajectory records). A one-paragraph commitment on how they relate — e.g., "event log is source of truth, profile and trajectories are materialized views" — will save pain later.
- **`CampaignState` will bloat.** `src/core/types.ts:68-76` holds `activeJobs`, `pendingFollowups`, `recentIncidents`, `recentSummaries`. "Recent" has no bound in the type. For a months-long campaign this becomes the prompt-bloat risk the context doc was specifically designed to avoid. Bound it in the type (`last N`) or in the loader.
- **Single-campaign vs. multi-campaign.** The docs assume one campaign implicitly. If a user wants the supervisor watching two unrelated campaigns in different repos on the same login node, does that mean two processes or one process multiplexing? Affects scheduler, memory, and Slack routing. Decide now while it is free.
- **`InspectLogTailAction`** at `src/core/types.ts:165-169` has no `jobId`, which disconnects log inspection from job context. Probably an oversight.
- **"Keep the harness minimal" vs. the growing module list.** 8 modules, 11 events, 4 approval modes, 5 wake reasons, 7 planned actions. Each individually justified. Collectively: `docs/research/coding-tools/synthesis.md:142` warned against "Pi integration becoming the design center instead of the campaign supervisor." The equivalent risk here is harness-design becoming the design center instead of *what the supervisor does on a real failing job*. Consider writing one concrete end-to-end story ("job X stalls at step Y, agent notices Z, does A, B, C, reports back") to pressure-test whether all this structure is load-bearing or speculative.

## Bottom line

The philosophy is coherent and unusually well-grounded. The architecture doc is the weakest link only because it is terser than the thinking behind it — the tensions above are solvable with a few sentences each, not redesigns.

The one thing to stop and resolve before writing more code is **tension 1** (open Pi tools vs. closed `PlannedAction` enum), because everything downstream — policy gating, executor shape, replay format — depends on which answer you pick.
