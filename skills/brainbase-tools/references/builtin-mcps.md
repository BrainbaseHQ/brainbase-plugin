# Built-in MCP servers the CLI installs

Source: https://docs.brainbaselabs.com/cli/reference/environment (Built-in MCP overrides)
Source: https://docs.brainbaselabs.com/cli/reference/agent-manifest (capabilities), https://docs.brainbaselabs.com/cli/concepts/connecting, https://docs.brainbaselabs.com/cli/commands/agent (connections, unpack), https://docs.brainbaselabs.com/cli/reference/control-plane-api
Source: https://docs.brainbaselabs.com/docs/orchestrations/tools (composition), https://docs.brainbaselabs.com/docs/agent/github (Tools), https://docs.brainbaselabs.com/docs/agent/linear, https://docs.brainbaselabs.com/docs/agent/memory
Source: changelog 2026-06-12 "Developer Updates"; 2026-07-17 "Developer Updates"; 2026-06-19 and 2026-07-10 "Fixes and Improvements"
Snapshot: 2026-11-03

## Which built-ins exist and when they are installed

The CLI installs built-in MCP servers alongside an agent's own MCPs when it writes harness MCP config (`agent pull`, `agent unpack`, `sync`, first install). Orchestration is always installed; memory and browser are on unless the agent turns them off; Slack, meeting, GitHub and Linear appear only while the agent has that connection active. Run `brainbase agent connections` to see which connections are live. The same six capability flags decide what `unpack` lays into the harness.

| Built-in | Installed when | Default host | Override variable |
| --- | --- | --- | --- |
| Orchestration | Always | `https://brainbase-orchestration-mcp.onrender.com` | `BRAINBASE_ORCHESTRATION_MCP_URL` |
| Memory | `capabilities.memory` not `false` (default on) | `https://brainbase-memory-mcp.onrender.com` | `BRAINBASE_MEMORY_MCP_URL` |
| Browser (headless browser) | `capabilities.browser` not `false` (default on) | `https://brainbase-browser-mcp.onrender.com` | `BRAINBASE_BROWSER_MCP_URL` |
| Slack connector | While a Slack install is active | `https://brainbase-slack-mcp.onrender.com` | `BRAINBASE_SLACK_MCP_URL` |
| Meeting connector | While a meeting install is active | `https://meeting.mcp.brainbaselabs.com` | `BRAINBASE_MEETING_MCP_URL` |
| GitHub connector | While a GitHub install is active | `https://brainbase-github-mcp.onrender.com` | `BRAINBASE_GITHUB_MCP_URL` |
| Linear connector | While Linear is connected | `https://brainbase-linear-mcp.onrender.com` | `BRAINBASE_LINEAR_MCP_URL` |

The orchestration MCP exposes one `create_task_for_<recipient>` tool per outgoing edge. Changelog 2026-06-19: orchestration connections can expose multiple dispatch tools to the source agent and run in both directions; 2026-07-10: "Send a message" is the first tool listed for a new connection and messaging tools are enabled by default. For edges and triggers, open `brainbase-orchestration`.

Names used by composition (docs/orchestrations/tools): `brainbase-linear` (reserved; always wins over any same-named row), `brainbase_meeting` and `brainbase_github` (optional built-ins that an enabled agent-owned server of the same name wins over). These synthesized built-ins do not appear in `brainbase mcp list`. `brainbase-apps` (integrations) is a separate reserved name that Brainbase adds per enabled turn rather than through the CLI; see `integrations.md`.

## URL overrides and the token warning

Each override value is a base origin, not a full endpoint. The CLI appends the per-thread path itself, producing `<base>/t/${BRAINBASE_THREAD_ID}/mcp`; the placeholder stays literal in the generated config and is resolved by the harness when it connects. Passing a complete URL doubles the path. Trailing slashes are stripped; an empty value counts as unset and falls back to the default.

These variables are read only when the CLI writes harness MCP config, and the resolved URL lands in the generated `.mcp.json` / `mcp.json`. Setting or unsetting one has no effect on an agent already pulled: re-run `brainbase agent pull`.

Every built-in MCP entry authenticates as `Authorization: Bearer ${BRAINBASE_TOKEN}`, and the CLI does not validate the host you supply. Whatever URL you set is handed the agent's token when the harness connects, so point these only at hosts you trust (staging, or a self-hosted deployment).

## Capabilities in the manifest

`capabilities` in `brainbase.agent.yaml` decides which built-ins `unpack` lays into the harness; omit the block for defaults.

| Field | Kind | Default | Changed by |
| --- | --- | --- | --- |
| `capabilities.memory` | Writable setting | on; only an explicit `false` turns it off | Edit, then `agent push` |
| `capabilities.browser` | Writable setting | on; only an explicit `false` turns it off | Edit, then `agent push` |
| `capabilities.slack` | Read-only connection state | off | `brainbase agent connect slack` |
| `capabilities.meeting` | Read-only connection state | off | `brainbase agent connect meeting` |
| `capabilities.github` | Read-only connection state | off | `brainbase agent connect github` |
| `capabilities.linear` | Read-only connection state | off | `brainbase agent connect linear`; while on, `unpack` installs the built-in Linear MCP server |

The read-only four report whether an active install exists; no value written there can conjure one. `agent pull` refreshes them, and `agent push` refuses if what is on disk disagrees with the live connection (pull first). They stay in the file because `unpack` runs offline inside a sandbox. The control plane's `PUT /v2/cli/agents/{agent_id}` takes `memory_enabled` and `browser_enabled`; the integration flags are not writable there. After connecting or disconnecting a surface, run `brainbase agent pull` to pick up or drop the matching built-in locally. `brainbase agent connections` reads installation records directly (it covers `chat` and `phone`, which have no capability flag, and omits `memory` and `browser`, which are not integrations).

Agent versions and pins: memory/browser toggles and Slack/GitHub/meeting connections are operational state, not part of a pinned version (docs/agent/versions; changelog 2026-08-28).

## What each built-in gives the agent

- Memory: the `memory_*` tools (`memory_tables`, `memory_schema`, `memory_sql`); `capabilities.memory: false` removes them. Tables, shared memory and usage belong to `brainbase-memory`.
- Browser: a managed browsing session; see `functions-browser-appfactory.md`.
- GitHub (`brainbase_github`): installed automatically when GitHub is connected, nothing to add on the Tools page. Tools: `github_get_pull_request`, `github_get_pr_diff`, `github_list_pr_files`, `github_get_file_contents`, `github_list_comments`, `github_list_reviews`, `github_compare`, `github_create_review`, `github_create_issue_comment`, `github_reply_to_review_comment`, `github_update_comment`, `github_add_reaction`, `github_create_branch` and `github_create_pull_request` (both require **Push branches and open pull requests**, the "Git access" capability that is off by default per changelog 2026-08-28), `github_whoami`, `github_api_call` (read-only escape hatch to the GitHub REST API). Disconnecting detaches the tools.
- Linear (`brainbase-linear`): built-in tools to read issues (fetch by identifier, search, list comments), understand the workspace (workflow states, people, own session activity), comment with real mentions, change status, update fields (title, description, priority, due date, assignee, delegate, project, cycle, labels) and ask for input. The agent cannot create, delete or archive issues. A generic Linear MCP server on the agent is overridden while the surface is connected.
- Meeting: the Meeting MCP installs automatically for agents whose workspace has an active meeting integration (changelog 2026-06-12) and accepts Brainbase PATs and live API keys with an explicit profile selection alongside OAuth (2026-07-17).
- Slack: the Slack connector MCP, installed while a Slack install is active. The docs do not list its tools.

Connecting and configuring Slack, meetings, GitHub and Linear as surfaces (manifests, credentials, triggers, settings) belongs to `brainbase-surfaces`; this skill covers only that the connection installs a built-in MCP server and how its host is overridden.
