Source: https://docs.brainbaselabs.com/cli/concepts/harnesses; https://docs.brainbaselabs.com/cli/concepts/syncing; https://docs.brainbaselabs.com/cli/reference/environment (built-in MCP servers, global roots); https://docs.brainbaselabs.com/cli/concepts/connecting (which built-ins install)
Snapshot: 2026-11-03

# Harnesses, where components land, syncing and tracking

## Contents

- Supported harnesses and component types
- Where each component lands (Claude Code, Codex, Kafka)
- The seven newer harnesses
- Marker-based instruction blocks
- Built-in MCP servers
- Syncing
- Tracking

What a harness is as a platform concept, and model defaults per harness, belong to `brainbase-platform` and `brainbase-llm-gateway`. This file is the install layout the CLI writes.

## Supported harnesses and component types

A harness is the coding agent the CLI installs into. Each component lands where that harness already reads at runtime; the CLI never imposes its own layout. The harness is auto-detected in the current folder; override with `--harness <id>`. The first three take every component type; the other seven take skills, instructions and files only (MCP config, commands, sub-agents and playbooks are skipped when installed into them).

| Harness | Component types |
| --- | --- |
| `claude-code` (Claude Code) | skills, mcps, agents, commands, playbooks, instructions, files |
| `codex` (Codex) | skills, mcps, commands, playbooks, instructions, files |
| `kafka` (Kafka) | skills, mcps, agents, commands, playbooks, instructions, files |
| `qwen-code` (Qwen Code) | skills, instructions, files |
| `opencode` (OpenCode) | skills, instructions, files |
| `openclaw` (OpenClaw) | skills, instructions, files |
| `cursor` (Cursor) | skills, instructions, files |
| `factory` (Factory Droid) | skills (inlined into `AGENTS.md`), instructions, files |
| `qoder` (Qoder) | skills, instructions, files |
| `pi` (Pi) | skills, instructions, files |

## Where each component lands

| Component | Claude Code | Codex | Kafka |
| --- | --- | --- | --- |
| Skill | `.claude/skills/<slug>/` | `~/.codex/skills/<slug>/` or `.agents/skills/<slug>/` | `.kafka/skills/<slug>/` |
| MCP server | `.mcp.json` (project) / `~/.claude.json` → `mcpServers` (global) | `~/.codex/config.toml` `[mcp_servers.<slug>]` | `.kafka/kafka.json` |
| Command | `.claude/commands/<slug>.md` | `~/.codex/prompts/<slug>.md` | `.kafka/commands/<slug>.md` |
| Sub-agent | `.claude/agents/<slug>.md` | — | `.kafka/agents/<slug>.md` |
| Playbook | `.claude/playbooks/<slug>.md` + table in `CLAUDE.md` | `.codex/playbooks/<slug>.md` + table in `AGENTS.md` | `.kafka/playbooks/<slug>.md` + table in `KAFKA.md` |
| Instruction | Block in `CLAUDE.md` | Block in `AGENTS.md` | Block in `KAFKA.md` |
| File | Arbitrary copy to a target path | Same | Same |

Install scope is `project` or `global` (`--scope`). The Codex global root is `CODEX_HOME` (default `~/.codex`).

## The seven newer harnesses

Project scope first, global scope second; each global root can be moved with the variable in the last column.

| Harness | Skill | Instructions | Global root |
| --- | --- | --- | --- |
| `qwen-code` | `.qwen/skills/<slug>/` · `~/.qwen/skills/<slug>/` | Block in `QWEN.md` · `~/.qwen/QWEN.md` | `QWEN_HOME` |
| `opencode` | `.opencode/skills/<slug>/` · `~/.opencode/skills/<slug>/` | Block in `AGENTS.md` · `~/.opencode/AGENTS.md` | `OPENCODE_HOME` |
| `openclaw` | `skills/<slug>/` at the folder root · `~/.openclaw/skills/<slug>/` | Block in `AGENTS.md` · `~/.openclaw/AGENTS.md` | `OPENCLAW_HOME` |
| `cursor` | `.cursor/rules/<slug>.mdc` · `~/.cursor/rules/<slug>.mdc` | Block in `AGENTS.md` · `~/.cursor/AGENTS.md` | `CURSOR_HOME` |
| `factory` | Inlined as a block in the instructions file | Block in `AGENTS.md` · `~/.factory/AGENTS.md` | `FACTORY_HOME` |
| `qoder` | `.qoder/skills/<slug>/` · `~/.qoder/skills/<slug>/` | Block in `AGENTS.md` · `~/.qoder/AGENTS.md` | `QODER_HOME` |
| `pi` | `.pi/skills/<slug>/` · `~/.pi/agent/skills/<slug>/` | Block in `AGENTS.md` · `~/.pi/agent/AGENTS.md` | `PI_CODING_AGENT_DIR` |

## Marker-based instruction blocks

Instruction and playbook blocks are bracketed by `<!-- brainbase:start … -->` / `:end` markers in the harness's instructions file, and the playbook table is regenerated on every pull, so removed playbooks drop out automatically and hand-written prose outside the markers is never clobbered.

## Built-in MCP servers

`agent unpack` (and `pull`, `sync`, first install) writes built-in MCP servers beside the agent's own: orchestration always; memory and browser unless `capabilities.memory` / `capabilities.browser` is `false`; Slack, meeting, GitHub and Linear only while that surface is connected. Each entry's URL is `<base>/t/${BRAINBASE_THREAD_ID}/mcp` with `Authorization: Bearer ${BRAINBASE_TOKEN}`; the bases are the `BRAINBASE_*_MCP_URL` variables in `references/environment-and-files.md`. After connecting or disconnecting a surface, re-run `agent pull` to add or drop its built-in. `.brainbase/resolved-mcps.json` lists what the last unpack resolved; `.brainbase/installed-mcps.json` records what it wrote into native config so a later unpack removes only its own entries.

## Syncing

Once a folder is linked, `brainbase sync` reconciles it with the cloud: it computes drift between the checkout and the cloud using per-component hashes in `.brainbase/sync-state.json` (gitignored, per checkout, never committed; two clones track drift independently), pulls skills and instructions a teammate updated, and preserves local edits. Force a harness or scope when the folder supports more than one:

```bash
brainbase sync
brainbase sync --harness claude-code
brainbase sync --scope project
```

`agent versions restore` rolls the agent back in the cloud and leaves the folder alone; run `agent pull` before editing or pushing again.

## Tracking

Tracking routes a harness's LLM traffic through Brainbase so sessions are searchable and attributed to the agent. Opt-in: `agent create --track`, or at `link` time (on by default; `--no-tracking` skips; also `agent pull --link --no-tracking`). Only `claude-code` and `codex` can be tracked; for every other harness no traffic is rerouted even with tracking on. The proxy host comes from `BRAINBASE_PROXY_URL`, then `BRAINBASE_API_URL`, the login server, then `https://api.v1.brainbaselabs.com`. The tracking config is cached in `.brainbase/state.json`. The model proxy itself and harness tracking on the platform side: `brainbase-llm-gateway`.
