# cron-bot

Autonomous run supervisor for compute jobs on HPC clusters. Monitors jobs, halts on anomalies, fixes bugs and reruns on crash, communicates with researcher via Slack.

**Status:** Early brainstorming / pre-prototype.

## Pi coding agent (key dependency)

Built on [Pi](https://github.com/badlogic/pi-mono) (`@mariozechner/pi-coding-agent`), a minimal extensible agent harness.

**Key packages:** `pi-agent-core` (runtime with tool calling, event streaming), `pi-ai` (multi-provider LLM API), `pi-mom` (Slack bot bridge), `pi-coding-agent` (CLI).

**Core design:**
- 4 base tools: `read`, `write`, `edit`, `bash`. Everything else via extensions.
- 4 operating modes: Interactive, print/JSON, RPC (stdin/stdout JSONL), SDK.
- Extensions are TypeScript modules adding tools/commands/event handlers. Also supports Skills (markdown), Prompt Templates, and Pi Packages.
- Agent runtime has event hooks (`beforeToolCall`/`afterToolCall`) for gating operations.
- No built-in MCP, sub-agents, or permission popups — all added through extensions.

**How we use Pi:**
- RPC/SDK mode to run headless as a subprocess.
- Fork/adapt `pi-mom` for Slack integration.
- Custom extensions for Slurm tools and log monitoring.
- `beforeToolCall` hooks to gate dangerous operations (human approval).

## Architecture

Target: HPC clusters (Slurm and PBS). Key constraints: login node policies, shared filesystem, compute node networking restrictions.

**Deployment model (under evaluation):**
- Primary approach: long-running lightweight process on login node (needs outbound HTTPS for Slack + LLM APIs, minimal CPU/RAM).
- Persistence options: user systemd, cron heartbeat, tmux/screen — depends on cluster policy.
- Alternative: lightweight scheduler jobs for the agent itself, but likely blocked by compute node network restrictions.
- Hybrid possible: agent on login node, heavy work (log parsing, analysis) submitted as short jobs.
- Must be portable across clusters with different schedulers and policies.

**Cluster assessment tooling:** `scripts/check-cluster-env.sh` — run on each cluster login node to probe scheduler, networking, persistence options, and resource limits. Sysadmin email template at `scripts/sysadmin-email-draft.md`.
