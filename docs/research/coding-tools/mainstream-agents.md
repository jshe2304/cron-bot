# Mainstream Agent Influence

This note covers three mainstream agent products that are directly relevant to the control-loop question for `cron-bot`:

- Claude Code
- OpenClaw
- Codex

I did not use leaked Claude Code source. This note relies on public documentation and public product descriptions.

## Why These Matter

The project is choosing where to sit on a spectrum:

- deterministic supervisor: fixed checks, fixed thresholds, fixed responses
- agentic supervisor: the model decides what to inspect, how to interpret state, when to intervene, and what to report

The current direction should be much closer to the agentic side.

The key question is not whether the model is autonomous. It should be.

The key question is which parts of autonomy should remain model-driven, and which parts should remain deterministic infrastructure.

## Claude Code

Primary sources:

- https://code.claude.com/docs/en/overview
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/settings
- https://www.anthropic.com/product/claude-code

### What Seems Important

#### 1. The product is unapologetically agentic

Claude Code presents itself as an agentic coding tool, not as a “test runner plus patch suggester.” It searches, edits, runs commands, and coordinates across tools and files.

That matters because it reinforces the desired posture for `cron-bot`:

- the model should decide what to inspect next
- the model should decide whether the run looks healthy
- the model should decide what the likely failure mode is
- the model should decide what small repair is worth trying

#### 2. Deterministic hooks exist to shape the agent loop

Claude Code has a deep hook system around session lifecycle, prompts, tool calls, permission requests, file changes, and subagent lifecycle.

That is a useful pattern for `cron-bot`:

- keep the main behavior model-driven
- use deterministic hooks and policies to enforce non-negotiable rules

Examples for `cron-bot`:

- deny edits outside approved paths
- force validation after certain file changes
- require approval before canceling a job
- automatically snapshot incident context before resubmission

#### 3. Memory is layered and local

Claude Code distinguishes stable instruction files from machine-local auto memory. It also keeps an index-like memory entrypoint concise and loads topic files on demand.

That maps cleanly to `cron-bot`:

- stable repo guidance
- dynamic campaign profile
- local intervention memory
- detailed incident notes loaded only when relevant

#### 4. Permissions are a real control plane

Claude Code does not treat approval as a side note. Permissions are configurable and scoped to tools and patterns.

That supports your direction:

- the supervisor should be agentic
- the safety model should still be explicit and deterministic

## OpenClaw

Primary sources:

- https://docs.openclaw.ai/automation/hooks
- https://docs.openclaw.ai/concepts/memory
- https://docs.openclaw.ai/automation/tasks
- https://docs.openclaw.ai/webhook
- https://docs.openclaw.ai/automation/cron-vs-heartbeat
- https://docs.openclaw.ai/concepts/session-tool

### What Seems Important

#### 1. OpenClaw separates scheduling from agent reasoning

This is the single most useful lesson for `cron-bot`.

OpenClaw has explicit scheduling concepts:

- cron for exact scheduled execution
- heartbeat for periodic awareness
- tasks as the ledger of detached work

The model is still highly agentic, but it is not responsible for being its own wall clock.

That is exactly the right stance for `cron-bot`.

The model should decide:

- what periodic checks mean
- what counts as suspicious
- whether to watch, intervene, summarize, or escalate

The deterministic scheduler should decide:

- when to wake the agent
- when a deferred follow-up is due
- how missed wakeups are handled
- how retries and backoff are applied

#### 2. Sessions, memory, and background work are explicit

OpenClaw treats sessions, background tasks, and memory as real first-class objects.

That matters because `cron-bot` is not a one-shot CLI assistant. It is a resident supervisor that must survive:

- long idle periods
- many small observations
- occasional incidents
- deferred follow-ups
- user interactions over Slack

`cron-bot` should therefore store:

- standing campaign state
- queued follow-ups
- intervention trajectories
- periodic summaries
- detached analysis tasks

#### 3. Hooks provide deterministic glue around an agentic core

OpenClaw’s hooks are small pieces of deterministic automation triggered by lifecycle events.

This fits `cron-bot` very well. The project should avoid turning hooks into a second orchestration language, but they are useful for invariant behavior:

- log command executions
- snapshot incident state
- save memory on session reset or compaction
- run a known formatter or syntax check after edits

## Codex

Primary sources:

- https://help.openai.com/en/articles/11096431-openai-codex-ci-getting-started
- https://openai.com/index/introducing-codex/
- https://developers.openai.com/api/docs/models/gpt-5.3-codex
- https://developers.openai.com/api/docs/models/gpt-5.2-codex
- https://developers.openai.com/api/docs/models/gpt-5.1-codex-max

### What Seems Important

#### 1. Locality and approval are central product features

Codex CLI is explicitly positioned as a local coding agent with approval modes ranging from suggestive to full auto in a sandbox.

That reinforces two useful product instincts for `cron-bot`:

- locality matters
- autonomy should be tunable, visible, and boring

For an HPC supervisor, local execution on the login node is not just a privacy feature. It is the environment where reality is visible:

- scheduler state
- shared filesystem outputs
- local cluster config
- site-specific command behavior

#### 2. Long-horizon coding models are a good fit for campaign supervision

OpenAI’s Codex model family is explicitly described as optimized for agentic and long-horizon coding tasks.

That is a strong conceptual match for your project. Campaign supervision is not a tiny classification task. It is a long-horizon loop that benefits from:

- persistent state
- revisiting prior conclusions
- changing plans after new evidence
- carrying work across many turns and time gaps

#### 3. Approval modes are a better framing than detector thresholds

Codex’s mainstream product framing is not “define exact anomaly metrics and let the tool react.” It is “choose how autonomous the agent is allowed to be.”

That is a better framing for `cron-bot` too.

The product should primarily expose:

- what the agent is allowed to do
- what it should watch
- how often it should wake
- what validation is required before risky actions

It should not force users to front-load a large policy of brittle anomaly rules.

## What This Means For The Spectrum

The project should sit near the autonomous end of the spectrum, but not in the naive “let the model call `sleep` and hope for the best” sense.

The right split is:

- deterministic infrastructure owns time, wakeups, persistence, and hard limits
- the model owns interpretation, prioritization, diagnosis, repair choice, and communication

That means `cron-bot` should not primarily be:

- a metrics engine that occasionally calls an LLM
- a fixed anomaly detector with a patch generator attached
- a monolithic agent loop that keeps time by sleeping inside the model’s own action sequence

It should instead be:

- a resident agent supervisor awakened by a robust scheduler
- with standing memory and deferred intents
- using the model to decide what periodic checks mean and what to do next

## Recommended Scheduling Stance

Do not make the model’s main scheduling primitive a `sleep` tool.

Why:

- sleeping ties liveness to one fragile in-process turn
- it is hard to recover cleanly after crashes, restarts, or cluster disconnects
- it makes missed wakeups and long idle periods harder to reason about
- it obscures the audit trail of why the agent woke up and what it intended to do

Instead:

- use a deterministic heartbeat or cron-like scheduler outside the model
- persist deferred follow-ups as structured state
- wake the model with the reason for waking:
  periodic check, delayed follow-up, user message, job-state change, validation completion
- let the model decide what to do on each wake

This keeps the product near the agentic end while preserving robust time semantics.

## Proposed Product Stance

`cron-bot` should be described as:

"An agentic HPC campaign supervisor with deterministic timekeeping and safety boundaries."

That is closer to Claude Code, OpenClaw, and Codex than to a rigid monitoring daemon.

In practical terms:

- the model should own the supervisory judgment
- the scheduler should own wakeups and retries
- policy should own permissions and limits
- memory should own continuity
- Slack should be the human checkpoint and narrative surface

## Changes Worth Making To The Plan

In addition to the earlier six tightening points, make these two stance changes explicit:

### 1. State that the project is intentionally near the agentic end of the autonomy spectrum

This sounds obvious in the current docs, but it is not explicit enough. Write down that the agent is expected to decide what periodic supervision means, not merely evaluate fixed predicates.

### 2. State that scheduling is deterministic infrastructure, not model-held sleep

The scheduler should wake the model. The model should not be responsible for remaining alive by sleeping and reawakening itself.

That separation preserves:

- locality
- robustness
- auditability
- crash recovery
- clear user control
