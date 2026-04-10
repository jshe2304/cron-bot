# Implementation Roadmap

This document records the recommended implementation order and testing strategy for `cron-bot`.

The goal is to reach a trustworthy end-to-end slice early, then expand without accumulating hidden control-flow bugs.

## Build Order

### 1. Core contracts

Stabilize the shared types and interfaces first:

- wake reasons
- campaign state
- event log records
- action records
- follow-ups
- policy decisions
- supervisor input and output

This is the narrowest place to catch architectural drift.

### 2. Memory

Implement the persistence layer next:

- append-only event log
- mutable campaign profile
- pending follow-ups
- intervention trajectories

Keep the event log as the main audit trail.

### 3. Scheduler

Implement a deterministic scheduler that can:

- emit heartbeat wakes
- enqueue delayed follow-ups
- recover follow-ups after restart
- retry degraded wakes with bounded backoff

The scheduler should know when to wake the agent, not how to interpret the campaign.

### 4. Supervisor skeleton

Implement the wake lifecycle before any real agent behavior:

- load state
- record wake start and wake end
- call a stub supervisor
- persist resulting events and follow-ups

This gives the system a real spine early.

### 5. Policy

Implement approval and safety gating before real mutation:

- allow
- approval required
- deny

Apply this consistently to risky actions such as edits, job cancellation, and resubmission.

### 6. Executor

Add deterministic executor primitives:

- stateless shell command execution
- log inspection
- scheduler query wrappers
- bounded file editing hooks
- action result recording

### 7. Validation

Add cheap validation paths:

- shell syntax checks
- config parsing
- import or startup smoke tests
- `sbatch --test-only` where available
- user-defined smoke commands

Support explicit skipped validation with a recorded reason.

### 8. Slack

Wire Slack as:

- a source of user-message wakes
- a sink for summaries, approvals, clarification requests, and degraded-mode notices

Slack should not own core state.

### 9. LLM supervision

Only after the deterministic skeleton is working, add the bounded inner agent loop that:

- inspects evidence
- interprets campaign state
- proposes actions
- schedules follow-ups
- decides when to watch, intervene, ask, or escalate

## Testing Strategy

Most tests should run locally.

The project should use a testing pyramid:

### 1. Unit tests

Pure deterministic logic:

- scheduler timing and retry rules
- policy decisions
- event-log append behavior
- follow-up loading and pruning
- campaign profile reducers and loaders

These should be fast and run constantly.

### 2. Fixture-based integration tests

Use local fixtures for:

- fake log files
- fake job scripts
- fake scheduler command output
- fake validation results
- fake Slack responses

This is where most behavior testing should happen.

### 3. Scenario tests

Write a few concrete end-to-end stories:

- healthy campaign heartbeat
- failed job with bounded repair
- suspicious log with no permission to act
- degraded wake and retry
- clarification request due to ambiguous goal

These should exercise the real wake loop with mocked integrations.

### 4. Real-cluster compatibility checks

Keep this layer thin and infrequent.

Real-cluster checks should verify:

- scheduler command wrappers still match the site environment
- login-node execution assumptions still hold
- environment bootstrap commands still work
- submission dry-run behavior is correct
- persistence model works on the shared filesystem

This should be a compatibility pass, not the main regression suite.

## How To Avoid Constant Cluster Testing

Do not make the real cluster the default test environment.

Instead, isolate cluster-specific behavior behind narrow seams:

- scheduler adapter
- environment bootstrap or command prefix builder
- filesystem path conventions
- submission and query wrappers

Then test in three layers:

### Local default

Most development should run against:

- fixture logs
- fixture scheduler output
- fake job-state transitions
- fake validation outcomes

This should cover most regressions.

### Cluster-profile tests

Use checked-in cluster profiles and canned command output from real sites to test parser and adapter behavior locally.

This is the right place to catch:

- `squeue` output format differences
- `sacct` quirks
- path assumptions
- module or environment bootstrap expectations

### Occasional real-cluster smoke tests

Run a small smoke suite only when needed:

- new scheduler adapter
- major executor change
- cluster onboarding
- changes to environment bootstrap logic

These smoke tests should be short and operational, not exhaustive.

## Recommended Test Artifacts

Create and maintain:

- sample log bundles
- sample submission scripts
- sample scheduler outputs from multiple clusters
- expected event-log traces for scenario tests
- expected approval and degraded-mode flows

If a bug comes from a real cluster, capture it as a local fixture before fixing it.

That is the rule that keeps cluster debugging from becoming repetitive.

## Guiding Rule

Every important behavior should be testable locally from fixtures plus deterministic adapters.

The real cluster should validate assumptions, not carry the full burden of regression testing.
