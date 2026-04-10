# Pi API Surface For cron-bot

This file tracks the Pi features that matter to this repo.

It is intentionally narrow. If `cron-bot` does not use a Pi feature, it does not need to be documented here.

## Current Version

- `@mariozechner/pi-coding-agent`: `0.62.0`
- Transitively present in the lockfile:
  - `@mariozechner/pi-agent-core`
  - `@mariozechner/pi-ai`
  - `@mariozechner/pi-tui`

## What We Expect To Use

### 1. SDK Session Creation

Current local example:

- `node_modules/@mariozechner/pi-coding-agent/examples/sdk/01-minimal.ts`

Observed API shape:

- `createAgentSession(...)`
- returned object includes `session`
- `session.subscribe(...)`
- `session.prompt(...)`
- `session.state.messages`

Why it matters here:

- headless campaign supervision
- named LLM tasks for diagnosis, summaries, and repair planning
- local session lifecycle owned by our supervisor

### 2. Extensions

Current local example:

- `node_modules/@mariozechner/pi-coding-agent/examples/sdk/06-extensions.ts`

Observed API shape:

- `DefaultResourceLoader`
- `SessionManager`
- `additionalExtensionPaths`
- `extensionFactories`
- extension factory receives `pi`
- extension can call `pi.on(...)`
- extension can call `pi.registerTool(...)`
- extension can call `pi.registerCommand(...)`

Why it matters here:

- custom Slurm tools
- log and campaign inspection helpers
- safety hooks around edits and execution
- Slack-facing operations and approval flows

### 3. Event Interception

Current local references:

- `examples/sdk/06-extensions.ts`
- `examples/extensions/tool-override.ts`
- `examples/extensions/git-checkpoint.ts`

Observed event names in local examples:

- `agent_start`
- `tool_call`
- `tool_result`
- `agent_end`

Relevant design use in this repo:

- gate dangerous tool calls
- record audit history
- attach campaign metadata to runs
- collect traces for later analysis

Note:

Earlier project notes mention `beforeToolCall` and `afterToolCall`. Before implementing against those names, verify the exact current hook surface in the installed Pi version.

### 4. RPC Mode

Current local example:

- `node_modules/@mariozechner/pi-coding-agent/examples/rpc-extension-ui.ts`

Observed use:

- spawn the Pi CLI as a subprocess
- run with `--mode rpc`
- communicate over stdin/stdout JSON messages
- handle streaming updates and extension UI requests

Why it matters here:

- long-running headless supervision process
- Slack bridge or other external controller
- separation between our orchestration code and the Pi runtime

### 5. Built-In Coding Tools

Current local references:

- `examples/sdk/05-tools.ts`
- package docs and project notes

Expected built-ins from current project notes:

- `read`
- `write`
- `edit`
- `bash`

Why it matters here:

- surgical fixes inside mature codebases
- lightweight local debugging without inventing our own tool framework first

### 6. Skills And Prompt Assets

Current local references:

- `examples/sdk/04-skills.ts`
- package-level `piConfig`

Why it matters here:

- keep task prompts small and reusable
- preserve domain-specific operating instructions
- support campaign-specific behavior without deep code changes

## Usage Guidance

Prefer this order when learning or checking Pi behavior:

1. Read the installed example closest to the feature you need.
2. Check the exported type declarations in `dist/*.d.ts`.
3. Capture only the project-relevant conclusion in this file.

Do not write large speculative summaries here. Keep the notes anchored to code that exists locally.
