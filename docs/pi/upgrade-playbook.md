# Pi Upgrade Playbook

Use this checklist whenever changing the pinned Pi version.

## Goals

- keep `cron-bot` on a known Pi API surface
- preserve working examples of how we use Pi
- avoid quiet drift between our docs and the installed package

## Upgrade Steps

1. Change the pinned version in [`package.json`](/Users/jshe/Code/cron-bot/package.json).
2. Refresh dependencies and confirm the lockfile matches the new version.
3. Read these files in the installed package:
   - `node_modules/@mariozechner/pi-coding-agent/package.json`
   - `node_modules/@mariozechner/pi-coding-agent/examples/sdk/01-minimal.ts`
   - `node_modules/@mariozechner/pi-coding-agent/examples/sdk/06-extensions.ts`
   - `node_modules/@mariozechner/pi-coding-agent/examples/rpc-extension-ui.ts`
4. Check whether the APIs we rely on still exist:
   - `createAgentSession`
   - session subscription and prompt flow
   - extension loading
   - tool registration
   - event hooks
   - RPC mode
5. Update [`api-surface.md`](/Users/jshe/Code/cron-bot/docs/pi/api-surface.md) with any changed names, behaviors, or examples.
6. Run the Pi smoke checks described in [`smoke-test-plan.md`](/Users/jshe/Code/cron-bot/docs/pi/smoke-test-plan.md).
7. If the upgrade required code changes, record the migration notes in the relevant source file near the adapter or integration boundary.

## What To Record

Record only the information that will help the next person integrate or debug Pi in this repo:

- renamed exports
- changed event names
- changed extension loading behavior
- changed CLI flags for RPC mode
- any new constraint that affects login-node use

## What Not To Record

- broad upstream release summaries
- features `cron-bot` does not use
- speculative notes that are not grounded in local package files

## Integration Boundary

As the codebase grows, keep Pi-specific code behind a thin local boundary such as `src/pi/`.

That boundary should be the first place to look when a Pi upgrade breaks behavior.
