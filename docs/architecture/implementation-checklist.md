# Implementation Checklist

This checklist turns the roadmap into the recommended build order.

## Phase 1: Core contracts

- [x] Add explicit policy decision types
- [x] Add supervisor interface and wake lifecycle contract
- [x] Add memory interfaces for event log, campaign profile, and trajectory store
- [x] Add scheduler interfaces for heartbeat and delayed follow-ups
- [x] Add serialization tests for core types

## Phase 2: Memory

- [x] Implement append-only event log storage
- [ ] Implement mutable campaign profile storage
- [ ] Implement pending follow-up storage
- [ ] Implement trajectory storage for interventions
- [ ] Add local tests for load, append, replay, and restart recovery

## Phase 3: Scheduler

- [ ] Implement heartbeat wake generation
- [ ] Implement delayed follow-up enqueue and delivery
- [ ] Implement degraded wake retry with bounded backoff
- [ ] Implement restart recovery for pending follow-ups
- [ ] Add deterministic scheduler tests

## Phase 4: Supervisor skeleton

- [ ] Implement wake start and wake end flow
- [ ] Load campaign state on wake
- [ ] Persist event and follow-up output on wake completion
- [ ] Add a stub supervisor implementation
- [ ] Add scenario tests for simple wake flows

## Phase 5: Policy

- [ ] Implement allow / approval-required / deny decisions
- [ ] Enforce approval mode consistently across risky actions
- [ ] Add clarification path for ambiguous goals
- [ ] Add tests for approval and denial behavior

## Phase 6: Executor

- [ ] Implement stateless command execution
- [ ] Implement campaign-scoped command prefix support
- [ ] Implement log inspection helpers
- [ ] Implement scheduler query wrappers
- [ ] Implement bounded edit hooks
- [ ] Add fixture-based executor tests

## Phase 7: Validation

- [ ] Implement validation result recording
- [ ] Support explicit skipped validation with reason
- [ ] Add shell syntax and dry-run submit validation
- [ ] Add user-defined smoke command support
- [ ] Add validation scenario tests

## Phase 8: Slack

- [ ] Implement progress and incident summaries
- [ ] Implement approval requests
- [ ] Implement clarification requests
- [ ] Implement degraded-mode notices
- [ ] Add Slack adapter tests with fake responses

## Phase 9: LLM supervision

- [ ] Implement bounded inner wake loop using Pi
- [ ] Record structured action records during wake execution
- [ ] Support follow-up scheduling from model decisions
- [ ] Add mocked scenario tests for healthy, incident, and degraded wakes

## Cluster compatibility

- [ ] Add local fixtures for scheduler output from supported clusters
- [ ] Add local fixtures for sample log bundles and job scripts
- [ ] Add a thin real-cluster smoke checklist
- [ ] Capture real-cluster bugs as local fixtures before fixing them

## Working rule

- [ ] When a change affects the operating model, update the architecture docs in the same change
