# Architecture Guide

Read these files before making architectural changes or adding new runtime behavior:

1. [`operating-model.md`](/Users/jshe/Code/cron-bot/docs/architecture/operating-model.md)
2. [`core-loop.md`](/Users/jshe/Code/cron-bot/docs/architecture/core-loop.md)
3. [`implementation-roadmap.md`](/Users/jshe/Code/cron-bot/docs/architecture/implementation-roadmap.md)
4. [`implementation-checklist.md`](/Users/jshe/Code/cron-bot/docs/architecture/implementation-checklist.md)

These files are the current source of truth for:

- how the bot is expected to operate
- how scheduling, agent judgment, policy, and memory are separated
- what order to implement things in
- how to test changes without depending on a real cluster

## Working Rule

Future coding agents should read these files before:

- changing core control flow
- adding new wake reasons, event types, or approval logic
- changing scheduler or memory behavior
- adding executor or validation behavior
- changing the testing strategy

If a code change materially changes the operating model, update these docs in the same change.
