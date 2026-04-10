# Core Loop

This note records the core execution boundary for `cron-bot`.

The goal is to keep the project near the agentic end of the autonomy spectrum without making timekeeping or safety depend on a fragile model-held control loop.

## Ownership Split

- scheduler owns when the agent runs
- agent owns what the wake means and what to do next
- policy owns what actions are allowed
- memory owns what persists across wakes

This is the core boundary for the system.

## Scheduler

The scheduler is deterministic infrastructure.

It is responsible for:

- heartbeat wakeups
- delayed follow-ups
- retry timing and backoff
- recovering missed wakeups after restart
- waking the agent with an explicit reason

The scheduler should not encode detailed campaign judgment. It should decide when to wake the supervisor, not how to interpret the campaign.

## Agent

The agent is the supervisory reasoning loop.

It is responsible for:

- deciding what evidence to inspect
- interpreting job, log, and output state
- deciding whether to continue watching, intervene, summarize, or escalate
- proposing concrete actions
- proposing deferred follow-ups

The model should own supervisory judgment, not the wall clock.

One wake should usually contain a bounded inner agent loop rather than a single LLM turn. A realistic wake may inspect several files, logs, and scheduler views before it decides what happened.

The intended shape is:

- scheduler wakes the supervisor with a reason
- the agent runs a bounded inner reasoning loop with Pi tools
- policy gates risky tool calls and side effects during that loop
- the wake ends with recorded events, structured action records, and any deferred follow-ups

This keeps the system agentic without requiring the scheduler to encode campaign judgment.

## Policy

Policy is the deterministic gate for risky behavior.

It is responsible for:

- approval modes
- editable path limits
- retry and resubmission budgets
- destructive command policy
- validation requirements before risky actions

The agent may propose an action. Policy decides whether it can run immediately, requires approval, or must be rejected.

## Memory

Memory provides continuity across wakes.

It is responsible for:

- campaign profile
- active jobs and recent observations
- pending follow-ups
- intervention trajectories
- recent summaries and user-facing narrative state

Persistent state should live here, not in a long-lived mutable shell session.

Memory is not one blob. Treat it as three related storage shapes:

- append-only event log as the main audit trail
- mutable campaign profile as the current working view
- trajectory records as compact per-incident intervention histories

The event log should be the source of truth. The campaign profile and trajectories can be treated as materialized views derived from it and from lightweight summarization.

## Wake Model

Every supervisor run starts from a `WakeReason`.

Useful wake reasons include:

- heartbeat
- delayed follow-up
- user message
- job-state change
- validation completion

This keeps wakeups auditable and replayable.

## Action Model

The agent should produce structured action records during and after a wake.

These records are not meant to be a closed replacement for Pi's open tool surface. The model may use Pi tools freely within policy during the inner wake loop.

The action records exist to support:

- approvals
- replay
- summaries
- audits
- downstream deterministic handling for especially important side effects

Examples:

- inspect log tail
- query scheduler state
- patch file
- run validation
- request approval
- resubmit job
- post Slack summary

Some of these may correspond to direct execution during the wake. Others may remain as explicit proposals that require approval or later handling. Either way, they should be recorded in a structured form.

Stateless execution still applies, but executor ergonomics matter on HPC systems. Prefer campaign-scoped command prefixes or bootstrap snippets over hidden shell state when repeated environment setup is expensive.

## Scheduling Stance

Do not make long-lived supervision depend primarily on the model invoking a `sleep` tool.

Instead:

- store deferred intent as a follow-up record
- let the scheduler wake the system later
- pass the wake reason back into the supervisor

This preserves:

- robustness across crashes and restarts
- clean audit trails
- explicit retry semantics
- clear separation between timekeeping and reasoning

## Degraded Mode

The scheduler-owned clock should continue to behave predictably even when the agent cannot complete a normal wake.

At minimum, the system should have a degraded-mode story for:

- LLM provider failures
- quota exhaustion
- malformed model output
- Slack delivery failures
- transient executor failures

The preferred near-term behavior is:

- record the wake failure
- preserve pending follow-ups
- fall back to observe-only behavior for risky actions
- surface a degraded-status message to Slack when possible
- retry with bounded backoff rather than silently stalling

## Scope Decision

Version one should assume one resident process per campaign.

That keeps scheduling, memory, and Slack routing simple. Multi-campaign supervision can be added later as an explicit higher-level orchestration concern rather than being baked into the first process model.
