# Coding Tool Research

This directory distills a small set of existing coding agents that are useful reference points for `cron-bot`.

The goal is not to copy a full product. The goal is to understand which design choices are worth borrowing for a lightweight HPC campaign supervisor.

## Selected Examples

- [`aider.md`](/Users/jshe/Code/cron-bot/docs/research/coding-tools/aider.md): strong reference for minimal repo-grounded coding, bounded context selection, and automatic validation loops
- [`mini-swe-agent.md`](/Users/jshe/Code/cron-bot/docs/research/coding-tools/mini-swe-agent.md): strong reference for a very small, readable LM-first harness with explicit approval modes and replayable trajectories
- [`openhands.md`](/Users/jshe/Code/cron-bot/docs/research/coding-tools/openhands.md): strong reference for evented runtime design, environment abstraction, and reusable repository guidance
- [`mainstream-agents.md`](/Users/jshe/Code/cron-bot/docs/research/coding-tools/mainstream-agents.md): notes from Claude Code, OpenClaw, and Codex on agentic control loops, hooks, memory, and scheduling
- [`synthesis.md`](/Users/jshe/Code/cron-bot/docs/research/coding-tools/synthesis.md): what seems worth changing in `cron-bot` after comparing these tools to the current plan

## Why These Three

- `aider` shows how far a coding tool can go with a narrow surface area, strong repo context selection, and disciplined git-backed edits.
- `mini-SWE-agent` shows that a small agent loop can remain capable if the harness is simple, approval modes are explicit, and every action is observable.
- `OpenHands` shows what becomes useful once you need a more production-oriented runtime with event streaming, sandboxes, and reusable repo-specific guidance.

Together they cover the design space from minimal local coding assistant to full agent runtime.

## Note On OpenClaw

`OpenClaw` was not one of the first three core references because the initial pass focused on a tighter coding-agent comparison set. It is still relevant, especially for hooks, memory, sessions, and built-in scheduling, so it is covered in [`mainstream-agents.md`](/Users/jshe/Code/cron-bot/docs/research/coding-tools/mainstream-agents.md).
