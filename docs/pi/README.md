# Pi Knowledge Pack

This directory is the project's local memory for Pi.

The goal is not to mirror all upstream documentation. The goal is to keep a small, curated record of:

- which Pi APIs `cron-bot` depends on
- which examples are worth copying from
- what changed when Pi was upgraded
- how to verify that our understanding is still correct

## Principles

- Keep this small and project-specific.
- Prefer local examples from `node_modules` over handwritten summaries when possible.
- Record only the integration surface that matters for `cron-bot`.
- Update these notes whenever the Pi version changes.

## File Layout

- [`api-surface.md`](/Users/jshe/Code/cron-bot/docs/pi/api-surface.md): the Pi features and entrypoints we expect to rely on
- [`upgrade-playbook.md`](/Users/jshe/Code/cron-bot/docs/pi/upgrade-playbook.md): how to upgrade Pi without losing project knowledge
- [`smoke-test-plan.md`](/Users/jshe/Code/cron-bot/docs/pi/smoke-test-plan.md): the minimum checks that should pass after an upgrade or integration change

## Source Of Truth

The primary source of truth is the installed package and its examples:

- `node_modules/@mariozechner/pi-coding-agent/package.json`
- `node_modules/@mariozechner/pi-coding-agent/examples/sdk/`
- `node_modules/@mariozechner/pi-coding-agent/examples/extensions/`
- `node_modules/@mariozechner/pi-coding-agent/examples/rpc-extension-ui.ts`

These local files matter more than memory.

## Maintenance Rule

If the pinned Pi version changes in [`package.json`](/Users/jshe/Code/cron-bot/package.json), update this directory in the same change.
