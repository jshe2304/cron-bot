# Operating Model

`cron-bot` is a lightweight resident process for one HPC campaign.

It runs near the cluster, usually on a login node. It is meant to behave like an agentic research assistant, not a fixed monitoring daemon.

## Startup

On startup, it:

- learns the campaign goal from conversation and local context
- inspects the repo, job scripts, logs, outputs, and cluster environment
- builds an initial campaign profile
- loads memory and approval mode
- starts the scheduler loop

## Wakeups

The bot is awakened by deterministic infrastructure, not by the model sleeping in its own loop.

Typical wake reasons:

- heartbeat
- delayed follow-up
- user message
- job-state change
- validation completion
- wake retry after a degraded run

The scheduler owns the clock.

## What Happens On A Wake

Each wake is a bounded supervision session.

The agent may:

- inspect job state
- read logs
- inspect a small set of source or config files
- interpret what is happening
- decide to watch, intervene, summarize, escalate, or ask the user something

At the end of the wake, it records what it observed, what it did or proposed, and any future follow-ups it wants scheduled.

## Permissions

Permissions are explicit runtime modes:

- `observe_only`
- `ask_before_edit`
- `ask_before_resubmit`
- `bounded_auto`

The bot can reason freely, but risky actions go through policy checks. Depending on mode, the action is allowed, blocked, or sent to the user for approval.

## User Interaction

Slack is the main human interface.

The bot uses it to:

- send progress updates
- report incidents
- ask for approval
- ask for clarification
- explain repairs and outcomes
- report degraded operation

## Memory

The bot keeps:

- a campaign profile
- pending follow-ups
- recent incidents and summaries
- replayable intervention history
- an append-only event log

The event log is the main audit trail.

## Core Principle

The scheduler owns time.

The agent owns judgment.

Policy owns limits.

Memory owns continuity.
