# MCP servers: agent-owned, orchestration-owned, manifest, CLI and API

Source: https://docs.brainbaselabs.com/docs/agent/tools
Source: https://docs.brainbaselabs.com/docs/orchestrations/tools
Source: https://docs.brainbaselabs.com/cli/reference/agent-manifest (mcp), https://docs.brainbaselabs.com/cli/commands/mcp, https://docs.brainbaselabs.com/cli/concepts/connecting (OAuth-backed MCP servers), https://docs.brainbaselabs.com/cli/reference/control-plane-api (Connections and MCP), https://docs.brainbaselabs.com/cli/concepts/harnesses, https://docs.brainbaselabs.com/cli/reference/files, https://docs.brainbaselabs.com/cli/reference/environment
Source: https://docs.brainbaselabs.com/api (mcp_servers), https://docs.brainbaselabs.com/api/agents/create-agent, https://docs.brainbaselabs.com/api/agents/update-agent, https://docs.brainbaselabs.com/api/orchestrations/{list,create,update,delete}-orchestration-mcp-server(s), https://docs.brainbaselabs.com/api/agents/get-agent-inherited-mcp-servers, https://docs.brainbaselabs.com/docs/agent/versions, https://docs.brainbaselabs.com/docs/agent/linear
Source: changelog 2026-07-14 "A Curated Directory Of Verified MCP Servers"; 2026-09-11, 2026-06-25, 2026-06-18, 2026-08-26, 2026-10-22, 2026-08-21 entries
Snapshot: 2026-11-03

## Contents

1. Remote vs command-based servers
2. Destination rules for remote servers; OAuth binding
3. The curated directory of verified MCP servers
4. The manifest `mcp` block and where config lands per harness
5. `brainbase mcp list | connect | check`
6. Control-plane endpoints behind the CLI
7. Public API: `mcp_servers` on agents, threads and templates
8. Orchestration MCP servers: composition, overrides, suppression
9. Orchestration MCP API and error codes
10. Startup, health and resilience notes

## 1. Remote vs command-based servers

An MCP server entry has either a `url` (remote, reached over the network through the Brainbase MCP proxy) or a `command` with `args` (stdio, spawned inside the agent's own sandbox). Remote servers can carry `headers`; command servers carry `env`. Either `url` or `command` must be set; `brainbase agent push` validates and emits a clear error otherwise. `mcp list` prints `remote` or `local` per server.

Use MCP servers for specialized, structured access (internal databases, product APIs, code search, analytics) where tool names, schemas and returned data need to be precise. Use integrations for broad OAuth access to common apps, and functions for deterministic steps (see `functions-browser-appfactory.md`).

## 2. Destination rules for remote servers; OAuth binding

Applies to servers connected by URL; command-based servers in the sandbox are unaffected.

- Hosted Brainbase connects only to public HTTPS MCP endpoints. `localhost`, private IP addresses and internal hostnames are blocked. On-prem operators can approve specific HTTPS URL prefixes or network-and-port rules; individual agent editors cannot extend that allowlist.
- DNS is checked again when each connection opens, and destination redirects are not followed automatically.
- Changing a server URL clears its stored credentials and requires reconnecting.
- OAuth servers must publish resource and issuer metadata bound to that MCP destination. Changelog 2026-09-11: custom MCP server connections are restricted to public HTTPS destinations and OAuth credentials are bound to the exact server they were issued for.
- Orchestration servers: `url` must be HTTPS with no userinfo, no dot segments, no fragment, and no loopback, private, link-local or otherwise reserved destination; checked on save and again by the MCP proxy every time a member connects.

## 3. The curated directory of verified MCP servers

Changelog 2026-07-14: Agent Tools has a searchable directory of verified OAuth MCP providers, launching with seven entries including Datadog. Provider metadata, setup guidance and the exact OAuth callback are prefilled. Custom MCP server setup is unchanged and sits alongside the directory. OAuth discovery must succeed before a directory server is added; transient provider errors surface as retryable failures instead of leaving empty rows. The orchestration Tools page also offers "Pick a server from the directory, or click Add custom server". The docs do not list the directory's entries beyond Datadog; check the live Tools page.

## 4. The manifest `mcp` block

`brainbase.agent.yaml` carries MCP server definitions but never credentials. Keep API keys and tokens out of it, including under `env` and `headers`; agent secrets live in the gitignored `.brainbase/secrets.env` (written by `agent pull`, synced by `agent push`), and MCP config may reference them as `${GITHUB_TOKEN}`.

```yaml
mcp:
  - name: github
    url: https://api.githubcopilot.com/mcp/
    is_enabled: true
```

| Field | Type | Meaning |
| --- | --- | --- |
| `mcp[].name` | string, required | Server name. Non-empty. |
| `mcp[].url` | string | Remote MCP endpoint URL. |
| `mcp[].command` | string | Command to launch a stdio MCP server. |
| `mcp[].args` | array of string | Arguments passed to `command`. |
| `mcp[].env` | object | Environment variables (string to string) for a stdio server. |
| `mcp[].headers` | object | HTTP headers (string to string) for a remote server. |
| `mcp[].is_enabled` | boolean | Whether the server is active. |
| `mcp[].runtime_meta` | object | Do not edit. State the control plane records about the server (today: a server it switched off for the length of a native Linear task). `agent pull` writes it and `agent push` sends it back unchanged. Removing the block makes a pushed `is_enabled` apply as written; adding one to a server the control plane did not touch stops `is_enabled` from being taken from the manifest at all. |

Declaring and pushing a server configures it; for OAuth-backed servers it does not authorize it (section 5). `agent push` sends instructions, entrypoint, playbooks, skills, MCP servers, evals and `default_model`. The agent revision hash covers MCP servers. Agent versions record tools (MCP url, command, arguments, enabled) but not tool credentials (MCP env and headers, matched by tool name); `agent versions restore` warns about MCP server credentials that will need setting again.

Where `agent unpack` writes MCP config, by harness: Claude Code `.mcp.json` (project) or `~/.claude.json` → `mcpServers` (global); Codex `~/.codex/config.toml` `[mcp_servers.<slug>]`; Kafka `.kafka/kafka.json`. The seven newer harnesses (`qwen-code`, `opencode`, `openclaw`, `cursor`, `factory`, `qoder`, `pi`) get no MCP config written by the CLI; MCP components are skipped there. `.brainbase/resolved-mcps.json` lists every server the last unpack resolved (own and built-in); `.brainbase/installed-mcps.json` records what unpack wrote into harness config so a later unpack removes only its own entries.

## 5. `brainbase mcp list | connect | check`

All act on the agent linked in the folder, or the one `--agent <id>` names (given with no value, `--agent` is an error).

### `brainbase mcp list`

Read-only. Shows every configured server with authorization and health state; tokens are never returned, only whether one exists and when it lapses.

```text
✓ linear  remote · authorized · expires in 22h
! notion  remote · needs authorization
✗ sentry  remote · authorization expired — reconnect
! grafana  remote · authorized · unreachable
· filesystem  local · disabled

Run `brainbase mcp connect <name>` to authorize a server.
```

Each line: name, `remote` or `local`, disabled or not, then authorization and reachability as independent facts. An inherited server is marked `inherited from <orchestration>`. The synthesized built-ins (`brainbase-linear`, `brainbase_meeting`, `brainbase_github`) do not appear.

| Authorization state | Meaning |
| --- | --- |
| (none shown) | Needs no OAuth: a static header, or a local command. |
| `needs authorization` | OAuth-backed and never authorized. |
| `authorized` | A live token, with its expiry where known. |
| `authorization expired — reconnect` | The token lapsed, or a refresh failed. |

Reachability appears only when the last check did not succeed: `unreachable`, `connection error`, `last check failed to authenticate`, `last check saw an expired token`, `last check inconclusive`, or `last check: <status>`.

`--json` emits `{ linked, agent_id, servers[] }` with `auth` (`none`, `oauth_required`, `oauth_connected`, `oauth_expired`), `last_status` and `oauth_token_expires_at`. An unlinked folder with no `--agent` emits `{ linked: false, servers: [] }` (no `agent_id`, no `error`) and exits non-zero, so test the exit code or `.linked`. URLs are reduced to origin and path and local commands to the executable; `last_error` is redacted.

### `brainbase mcp connect <name>`

Authorizes an OAuth-backed server from the terminal: asks Brainbase for a single-use link bound to you and that server, prints it, opens it, and waits while you approve on the provider's consent screen. Tokens are stored by Brainbase; the terminal never sees them.

```bash
brainbase mcp connect notion
brainbase mcp connect notion --agent <agent-id>
brainbase mcp connect notion --no-open     # print the link, don't open it
brainbase mcp connect notion --no-wait     # print the link and exit
brainbase mcp connect notion --json        # {link_id, url, expires_at, server}
```

- The server is looked up first: a typo, a server that needs no OAuth (`auth: none`), or one the agent cannot authorize is refused without minting a link. An unknown name lists the servers the agent has. An already-authorized server is allowed: that replaces its grant.
- Refused: a server inherited from an orchestration (authorize it in the web app) and a server without OAuth.
- The link works once and expires ten minutes after it is made. Ctrl-C stops the wait but not the link. If another authorization for the same server starts first, this one is cancelled.

| Exit code | Meaning |
| --- | --- |
| `0` | Authorized, or with `--json`/`--no-wait` the link was printed. |
| `1` | Failed, declined, superseded, expired, refused, or Brainbase stopped answering. |
| `130` | Interrupted with Ctrl-C; the link keeps working until it expires. |

### `brainbase mcp check`

Probes every enabled server through the Brainbase proxy and reports whether it answers. Runs automatically during sandbox bootstrap; reach for it when a tool call fails rather than a tool being missing. `--json` emits `{ check_status, servers[] }` on one line. Exit code reflects whether the check ran: `0` whenever the probe completed, even if every server is unhealthy; `1` only when the check could not run (then plain text on stderr, no JSON, which the platform reads as `check_status: failed`). URLs are stripped and known credential shapes redacted. `BRAINBASE_MCP_CHECK_TIMEOUT_MS` (default `8000`) bounds the per-server wait.

`list` reports what the cloud holds; `check` dials the servers from inside the sandbox. A server can be authorized and unreachable, or reachable and unauthorized.

## 6. Control-plane endpoints behind the CLI

Relative to `https://api.brainbaselabs.com/v2/cli` (not the public API; it changes with the CLI).

| Endpoint | Used by | Scope |
| --- | --- | --- |
| `GET /agents/{agent_id}/mcp-servers` | `mcp list`, `mcp connect` | none |
| `POST /agents/{agent_id}/mcp-connect-links` | `mcp connect` | publish |
| `GET /mcp-connect-links/{link_id}` | `mcp connect`, while it waits | none |

`GET .../mcp-servers` returns each server's transport, enabled state, authorization state (`none`, `oauth_required`, `oauth_connected`, `oauth_expired`) and last connectivity result. `POST .../mcp-connect-links` takes the server's name and returns `{ link_id, url, expires_at, server }`; `GET /mcp-connect-links/{link_id}` reports `status`: `pending`, `opened`, `connected`, `failed` (with `error_code`) or `expired`. An unrouted `404` means an older control plane without these routes; a `404` with `{"detail":"Agent not found"}` is a real answer.

## 7. Public API: `mcp_servers`

`POST /v2/agents`, `PATCH /v2/agents/{agent_id}`, `POST /v2/threads` (inline `agent.mcp_servers`), `POST /v2/templates` and orchestration templates all accept `mcp_servers`, an array of objects; omit or `null` for none. Each entry: `name`, `url` (remote) or `command` (local to the sandbox), `args[]`, `env{}`, `headers{}`, `is_enabled`.

```json
"agent": {
  "harness": "claude_code",
  "instructions": "You are a research assistant.",
  "mcp_servers": [{ "name": "search", "url": "https://mcp.example.com/sse" }]
}
```

- `PATCH /v2/agents/{agent_id}`: HTTP 409 with a string `detail` means `mcp_servers` omits a server that has a connected OAuth session. Send that server again to keep it, or pass `expected_revision` to confirm its removal. 409 with `detail.code=revision_conflict` means the agent changed since `expected_revision`.
- A template supplies instructions, runtime, model, `mcp_servers` and skills; fields set explicitly on the body override it.
- Changelog 2026-08-26: MCP servers added through the API that were saved but never delivered to the running agent are now delivered for new and existing agents.
- `GET /.well-known/oauth-protected-resource` (RFC 9728) names the OAuth server guarding the Brainbase MCP resource; clients fetch it via the `resource_metadata` pointer in the 401 challenge.

## 8. Orchestration MCP servers

An orchestration can own custom MCP server definitions independent of any member's tools; every member receives them the next time it bootstraps a task. Use one when several agents in the same process need the same tool server.

Console: open the orchestration's Tools page; pick a server from the directory or click Add custom server; enter a name, transport (a URL, or a command that runs in the member's sandbox), and any arguments, headers or environment variables; click Add server.

Composition by name at each task bootstrap, in priority order:

1. The reserved built-in. When `brainbase-linear` is being served, it always wins over any row of that name; an orchestration cannot define a same-named server, and an agent's own row does not override it.
2. The agent's own server of that name. An enabled server on the agent overrides the orchestration's definition and wins over the optional `brainbase_meeting` / `brainbase_github` built-ins; a disabled server on the agent suppresses the orchestration's definition entirely.
3. The orchestration's inherited definition, only when neither of the above claims the name.

Rules:

- Secret references: `${NAME}` inside an `env` or `header` value references one of the orchestration's own secrets by name. Validated against current secret keys on save; expanded inside the member's sandbox at run time. API responses carry only variable names and, for a referenced value, the secret's name.
- Reserved names: a server name starting with `brainbase-` or `brainbase_` is rejected.
- Destination validation as in section 2.
- Edits land on the next manifest pull (for most tasks, the next task bootstrap). A running task picks up a change only if it pulls again (harness restart or in-task `brainbase agent pull`). Removing a server, or removing an agent from the orchestration, takes effect on the next manifest pull.
- One orchestration per agent: adding an agent already in another orchestration fails with `409`. An agent that still belongs to more than one (added before this rule) inherits nothing from either; the inherited-tools read reports the condition.
- Non-goals for v1: no orchestration-level OAuth (every orchestration server authenticates with static headers, env or secret references); the legacy kafka (KLS-hosted) runtime does not receive orchestration MCP servers; no separate health status for inherited servers.

On the agent's Tools page an inherited server shows as a read-only block naming the source orchestration with **Override** and **Suppress**. Override copies the server's URL or command to the agent as an agent-owned row, where it wins the normal way; env and header values are never returned by the API, so enter them again or reference orchestration secrets as `${NAME}`. Suppress adds a disabled row of the same name so the agent stops receiving it. The inherited definition is never copied onto the agent: `brainbase agent status` shows it for visibility, `brainbase mcp list` prints it as inherited, but `brainbase agent push` leaves the orchestration's copy unchanged and warns if you edited the inherited block locally. Inherited servers are delivered only to sandboxes; a stale local `brainbase.agent.yaml` never contains them.

## 9. Orchestration MCP API

| Endpoint | Behavior |
| --- | --- |
| `GET /v2/orchestrations/{id}/mcp-servers` | Returns `{enabled, servers[]}`. A deployment without the feature answers `enabled: false` with an empty list rather than 503; a missing or inaccessible orchestration still answers `404`. |
| `POST /v2/orchestrations/{id}/mcp-servers` | Creates a server; `201`. Body `{name, url, command, args, env, headers, is_enabled, icon, icon_color}`; at least one of `url` or `command`, otherwise only `name` required. |
| `PUT /v2/orchestrations/{id}/mcp-servers/{name}` | Partial update; the name cannot change. `env` and `headers` are write-only and merge by omission: omitted keeps, `null` clears, `{}` is a no-op, a non-empty object replaces entirely. `args: null` clears to `[]`. `is_enabled: null` is rejected with `400`. |
| `DELETE /v2/orchestrations/{id}/mcp-servers/{name}` | Removes by name; `204`. |
| `GET /v2/agents/{id}/mcp-servers/inherited` | Returns `{enabled, source, ambiguous, degraded, warnings[], servers[]}`; `source` is `{kind, id, name}` or `null`; each server carries `status: inherited \| overridden \| suppressed`. Takes a session or user-scoped PAT; a resource-scoped PAT (agent, thread or task) answers `404`. |

A server object: `{id, name, url, command, args, is_enabled, icon, icon_color, env_refs, env_keys, headers_refs, headers_keys, created_at, updated_at}` (plus `status` on the inherited read). Values are write-only: `env_keys`/`headers_keys` list variable names; `env_refs`/`headers_refs` name the orchestration secret a `${NAME}` value points at.

Auth follows orchestration secrets: a member with manage access can read; a PAT needs the `publish` scope to write. All five endpoints answer `404` for an orchestration or agent that does not exist or the caller cannot reach; `PUT` and `DELETE` also `404` for an unknown name.

| Status | Code | Meaning |
| --- | --- | --- |
| `400` | `invalid_name` / `reserved_name` | Malformed name, or starts with `brainbase-` / `brainbase_`. |
| `400` | `transport_required` | Neither `url` nor `command`. |
| `400` | `reference_not_allowed` | A `${` in `url`, `command` or `args` (in `name` it answers `invalid_name`; `icon` and `icon_color` are not checked). |
| `400` | `invalid_value` | A field failed validation. |
| `400` | `invalid_secret_reference` / `unknown_secret_reference` | A `${NAME}` reference is malformed, or names a key the orchestration does not have. |
| `400` | `invalid_destination` | The URL failed the HTTPS / userinfo / dot-segment / fragment / loopback / private / link-local / reserved checks. |
| `409` | `scoped_mcp_server_exists` | A server with that name already exists. |
| `503` | `orchestration_mcp_servers_disabled` | Feature off for this deployment. |
| `503` | `orchestration_secrets_unavailable` | A `${NAME}` reference could not be validated. |
| `503` | `mcp_destination_policy_unavailable` | The destination URL could not be validated. |
| `404` | — | Unknown or inaccessible orchestration, server name or agent, or a credential not allowed to read the topology. |

`400`, `409` and `503` bodies are `{"detail": {"code": "...", "message": "..."}}`; a `404` carries a plain string `detail` (for example `{"detail": "MCP server not found"}`).

## 10. Startup, health and resilience notes

- Kafka waits up to 2 seconds for MCP servers at startup, then starts with the tools already available; servers still connecting get up to 30 seconds total including tool discovery, and their tools become available on a later model turn. A server that misses the deadline is reported as failed and not retried automatically. Other runtimes have their own startup behavior (tutorial page). Changelog 2026-10-22: Kafka agents connect to all their MCP servers at once.
- The Tools page and per-run task detail show live health per MCP server: connected, not yet checked, and "couldn't verify this run" (changelog 2026-06-18). The `mcp.status` event type appears on the thread event stream.
- If an MCP server returns a server error or drops mid-call, the run fails that one tool call within milliseconds and reconnects for the next call (changelog 2026-09-11). OAuth-backed connections refresh credentials and reconnect during long sessions (2026-06-25).
- Linear surface: if the agent also has a generic Linear MCP server configured, the built-in Linear tools take over while the surface is connected; the generic server stays configured and is used again if you disconnect the surface.
