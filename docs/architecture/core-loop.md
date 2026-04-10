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

The agent should produce declarative planned actions before execution.

Examples:

- inspect log tail
- query scheduler state
- patch file
- run validation
- request approval
- resubmit job
- post Slack summary

Deterministic code then executes those actions, records the results, and emits events.

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
