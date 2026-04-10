# Pi Smoke Test Plan

This is the minimum verification we should keep in mind as `cron-bot` grows around Pi.

The tests below are intentionally small. They exist to catch API drift early, not to prove full correctness.

## Smoke Targets

### 1. Session Boot

Verify that a local Pi session can be created with the pinned package version.

Success criteria:

- session creation succeeds
- a prompt can be issued
- streamed output can be observed

### 2. Extension Registration

Verify that an extension can be loaded and can register at least one tool or event handler.

Success criteria:

- extension factory runs
- custom tool registration succeeds
- tool call events can be observed

### 3. RPC Spawn

Verify that the Pi CLI can be launched in RPC mode as a subprocess.

Success criteria:

- process starts cleanly
- RPC messages are readable on stdout
- a prompt or control message can be sent over stdin

### 4. Safety Hook Path

Verify that our integration can observe or gate tool activity before unsafe actions are executed.

Success criteria:

- tool-related event hook fires
- the integration can log or block an action

### 5. Minimal Coding Flow

Verify that the built-in coding tools we rely on are present.

Success criteria:

- `read` works
- `edit` or equivalent write path is available
- `bash` can be observed or gated through our integration

## When To Run These Checks

- after changing the Pi version
- after changing the local Pi adapter
- after changing how Slack or supervision code talks to Pi

## Implementation Guidance

Once `src/pi/` exists, turn these checks into a small automated smoke script or example program.

Keep it simple:

- one file
- one session
- one tiny extension
- one short prompt

The point is to verify the integration surface, not to simulate the whole supervisor.
