# Orchestrations API

Source: https://docs.brainbaselabs.com/api/orchestrations/create-orchestration, get-orchestration, list-orchestrations, update-orchestration, delete-orchestration, get-orchestration-secrets, update-orchestration-secrets, list-orchestration-mcp-servers, create-orchestration-mcp-server, update-orchestration-mcp-server, delete-orchestration-mcp-server; /api/orchestration-templates/create-, get-, list-, update-, delete-orchestration-template; /api/agents/get-agent-inherited-secrets, get-agent-inherited-mcp-servers; /docs/orchestrations/tools (API section); /docs/orchestrations/secrets; /cli/reference/pat-scopes
Snapshot: 2026-11-03

Contents: Base and auth · Orchestration object · Create · Get · List · Update · Delete · Secrets · MCP servers · Inherited reads on agents · Templates · Error envelopes

## Base and auth

Base URL `https://api.brainbaselabs.com`, header `Authorization: Bearer <token>` (a `bbpat_…` PAT, an API key, or a session token; the scheduled-agents page uses `$BRAINBASE_MAS_URL` and `$BRAINBASE_TOKEN` in its examples). Writes need `publish` on a PAT; orchestration writes check it unconditionally. A member with manage access can read. Resource-scoped credentials (agent, thread, task) are refused on orchestration configuration, and the inherited reads on an agent answer `404` to them. All of these endpoints answer `404` for an orchestration or agent that does not exist or that the caller cannot reach (cannot-confirm-existence rule).

The CLI's own control plane (`/v2/cli/orchestrations…`, `PUT` with `base_revision`, `/manifest`) is a different surface; see `references/cli.md`.

## Orchestration object

```json
{
  "id": "uuid", "group_id": "uuid", "name": "string", "description": "string",
  "icon": "string", "icon_color": "string", "credit_limit": 0,
  "metadata": {"key": "value"},
  "members": ["<agent_id>"],
  "edges": [{"id": "uuid", "orchestration_id": "uuid", "from_agent_id": "uuid",
             "to_agent_id": "uuid", "description": "string", "payload_schema": {},
             "settings": {}, "created_at": "ts"}],
  "triggers": [{"id": "uuid", "orchestration_id": "uuid", "node_id": "uuid",
                "trigger_type": "schedule", "is_active": true, "state": "live",
                "cron_expression": "string", "configured_props": {},
                "last_run_at": "ts", "trigger_count": 0,
                "edges": [{"id": "uuid", "trigger_id": "uuid", "to_agent_id": "uuid",
                           "description": "string", "payload_schema": {}, "created_at": "ts"}],
                "created_at": "ts", "updated_at": "ts"}],
  "created_at": "ts", "updated_at": "ts"
}
```

`group_id` is the group (what the CLI calls `--team`) the orchestration lives in. The docs show only `trigger_type: "schedule"` on this object; app and webhook triggers are managed on the canvas and the docs do not give their API shape here (the templates API does show an `app` trigger shape).

## Create

`POST /v2/orchestrations`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `group_id` | uuid | yes | Group the orchestration belongs to. |
| `name` | string | yes | |
| `description` | string | no | |
| `icon` | string | no | |
| `icon_color` | string | no | |
| `credit_limit` | number | no | |
| `metadata` | object | no | Freeform string-to-string labels. Filter the list endpoint with repeated `?metadata=key:value`. Omit or `null` for none. |
| `members` | array of agent ids | no | Each must have access to the group; an agent already in another orchestration returns `409`. |
| `edges` | array | no | `{from_agent_id, to_agent_id, description, payload_schema, settings}` |
| `triggers` | array | no | `{trigger_type: "schedule", node_id, cron_expression, is_active, configured_props, edges: [{to_agent_id, description, payload_schema}]}` |

```bash
curl --request POST --url https://api.brainbaselabs.com/v2/orchestrations \
  --header "Authorization: Bearer $BRAINBASE_TOKEN" --header 'Content-Type: application/json' \
  --data '{
    "group_id": "<group-uuid>", "name": "Daily repository digest",
    "members": ["<agent-uuid>"],
    "triggers": [{"trigger_type": "schedule", "cron_expression": "30 1 * * 2-6",
                  "is_active": false, "configured_props": {"watched_repos": ["acme/web"]},
                  "edges": [{"to_agent_id": "<agent-uuid>",
                             "description": "Run the scheduled repository digest using the trigger payload."}]}]
  }'
```

Response: the orchestration object. Note the scheduled-agents example omits `node_id`; the create and update pages list it on the trigger, and the manifest requires it. Pass a UUID when you want a stable node identity.

## Get

`GET /v2/orchestrations/{orchestration_id}` returns the full orchestration object including members, edges and triggers (with `state`, `last_run_at`, `trigger_count`).

## List

`GET /v2/orchestrations?group_id=<uuid>&limit=<int>&metadata=key:value&metadata=key2:value2`

| Query | Required | Notes |
| --- | --- | --- |
| `group_id` | yes | No global "all my orchestrations" view in v1; the access answer is per-group. |
| `limit` | no | |
| `metadata` | no | Repeated `key:value` params, ANDed into a JSONB-containment filter. |

Response: `{"items": [ ...orchestration objects... ]}`. The endpoint description says members, edges and triggers are not inlined here (to avoid an N+1 fetch) and to call `GET /{id}` for them; the sample response on the same page shows them inlined. Treat the list as summary data and fetch each id when you need the graph.

## Update

`PATCH /v2/orchestrations/{orchestration_id}` with any subset of `name`, `description`, `icon`, `icon_color`, `credit_limit`, `metadata`, `members`, `edges`, `triggers` (same shapes as create). Response: the orchestration object. The docs do not say whether `members`, `edges` and `triggers` merge or replace on this endpoint; the CLI control plane's `PUT` is documented as whole-replace for `members` and `edges`, so send the full arrays and read the response back. Activating a schedule is "patch the orchestration with the same trigger and `is_active: true`".

## Delete

`DELETE /v2/orchestrations/{orchestration_id}`. Response body is a map of booleans (`{"property1": true, ...}` in the docs). Member agents are kept. Destructive; confirm first.

## Secrets

`GET /v2/orchestrations/{orchestration_id}/secrets` returns the names only:

```json
{"keys": ["GITHUB_TOKEN"], "enabled": true, "updated_at": "ts"}
```

A deployment without the feature answers `200` with `enabled: false` rather than `404`, so an empty state is distinguishable from a mistyped id.

`PATCH /v2/orchestrations/{orchestration_id}/secrets` applies `remove` then `set` to the orchestration's map (incremental, because no caller can read values back to construct a full map):

```json
{"set": {"GITHUB_TOKEN": "<value>", "SHARED_API_KEY": "<value>"}, "remove": ["OLD_KEY"]}
```

Response: the same `{keys, enabled, updated_at}` shape. Gates mirror the agent-level secrets write: group gate first, publish scope, kill switch last. Key rules: `^[A-Z][A-Z0-9_]*$`; the platform's provisioning keys (`BRAINBASE_TOKEN`, `BB_TASK_KEY`, `MEDIA_API_KEY` and similar) are rejected. Contrast with agent secrets on `PATCH /v2/agents/{agent_id}`, which are whole-replace.

## MCP servers

Server object (all responses): `{id, name, url, command, args, is_enabled, icon, icon_color, env_refs, env_keys, headers_refs, headers_keys, created_at, updated_at}`. `env_keys` / `headers_keys` list configured variable names; `env_refs` / `headers_refs` map a variable to the orchestration secret a `${NAME}` value references. Values are never returned.

| Endpoint | Behavior |
| --- | --- |
| `GET /v2/orchestrations/{id}/mcp-servers` | Returns `{enabled, servers[]}`. Feature off answers `enabled: false` with an empty list, not `503`; a missing or inaccessible orchestration still answers `404`. |
| `POST /v2/orchestrations/{id}/mcp-servers` | Creates a server; `201`. Body `{name, url, command, args, env, headers, is_enabled, icon, icon_color}`; `name` required plus at least one of `url` or `command`. |
| `PUT /v2/orchestrations/{id}/mcp-servers/{name}` | Partial update, named by the path; the name cannot change. `env` and `headers` are write-only and merge by omission: omitted keeps the stored value, `null` clears it, `{}` is a no-op, a non-empty object replaces it entirely. `args: null` clears args to `[]`. `is_enabled: null` is rejected with `400`. |
| `DELETE /v2/orchestrations/{id}/mcp-servers/{name}` | Removes by name; `204`. Members stop receiving it on their next manifest pull, usually the next task bootstrap. |

Validation on save: `${NAME}` in `env` or `headers` must name a current orchestration secret; `${` anywhere in `url`, `command` or `args` is refused; names starting `brainbase-` or `brainbase_` are refused; a remote `url` must be HTTPS with no userinfo, dot segments, fragment, loopback, private, link-local or reserved destination (checked again by the MCP proxy on every connect).

| Status | Code | Meaning |
| --- | --- | --- |
| `400` | `invalid_name` / `reserved_name` | Malformed name, or starts with `brainbase-` / `brainbase_`. A `${` in `name` answers `invalid_name`. |
| `400` | `transport_required` | Neither `url` nor `command` given. |
| `400` | `reference_not_allowed` | A `${` appeared in `url`, `command`, or `args` (`icon` and `icon_color` are not checked). |
| `400` | `invalid_value` | A field failed validation. |
| `400` | `invalid_secret_reference` / `unknown_secret_reference` | A `${NAME}` is malformed, or names a key the orchestration does not currently have. |
| `400` | `invalid_destination` | URL failed the destination checks. |
| `409` | `scoped_mcp_server_exists` | A server with that name already exists on this orchestration. |
| `503` | `orchestration_mcp_servers_disabled` | Feature off for this deployment. |
| `503` | `orchestration_secrets_unavailable` | A `${NAME}` reference could not be validated. |
| `503` | `mcp_destination_policy_unavailable` | The destination URL could not be validated. |
| `404` | — | Unknown or inaccessible orchestration, unknown server name, unknown or inaccessible agent, or a credential not allowed to read this topology. |

## Inherited reads on agents

`GET /v2/agents/{agent_id}/secrets/inherited` — names of the secrets this agent inherits and any conflicts. Behind the same manage authority as the plaintext `secrets` field even though it returns no values.

```json
{"enabled": true,
 "inherited": [{"key": "GITHUB_TOKEN", "orchestration_id": "uuid", "orchestration_name": "string"}],
 "conflicts": [{"key": "string", "orchestration_ids": ["uuid"], "orchestration_names": ["string"]}]}
```

`GET /v2/agents/{agent_id}/mcp-servers/inherited` — the servers this agent inherits and how each composes with its own. Takes a session or a user-scoped PAT; a resource-scoped PAT (agent, thread, task) or a missing agent answers `404`.

```json
{"enabled": true, "source": {"kind": "...", "id": "uuid", "name": "string"},
 "ambiguous": false, "degraded": false, "warnings": ["string"],
 "servers": [{ "...server object...": "", "status": "inherited" }]}
```

`source` is `null` when the agent has no orchestration; `ambiguous: true` means the agent belongs to more than one orchestration and inherits nothing; each server's `status` is `inherited`, `overridden` or `suppressed`.

## Templates

Templates carry a reusable graph in `config` and are addressed by `{creator}/{slug}`. Writes are covered only by the non-enforcing blanket guard today; under strict admission they require a person's session or user-wide PAT (`403 agent_credential_refused` otherwise).

| Endpoint | Notes |
| --- | --- |
| `POST /v2/orchestrations/templates` | Body: `team_id` (uuid, required), `creator` (required), `slug` (required), `name` (required), `description`, `config`. |
| `GET /v2/orchestrations/templates?team_id=<uuid>&limit=<int>` | `team_id` required. Returns `{"items": [...]}`. |
| `GET /v2/orchestrations/templates/{creator}/{slug}` | One template. |
| `PATCH /v2/orchestrations/templates/{creator}/{slug}` | Any of `name`, `description`, `config`. |
| `DELETE /v2/orchestrations/templates/{creator}/{slug}` | Response is a map of booleans. |

Template object: `{id, team_id, creator, slug, name, description, config, created_by, created_at, updated_at}`. Note `team_id` here is the organization-level id (the CLI's `--org`), not the `group_id` orchestrations use.

`config` (the graph carried in `orchestration_templates.config`):

| Field | Shape |
| --- | --- |
| `config.icon`, `config.icon_color` | strings |
| `config.nodes[]` | `{key, name, source_runtime (e.g. "claude_code"), source_model, instructions, mcp_servers: [{name, url, command, args, env, headers, is_enabled}], skills: [{source}], secrets: [{name, description, required}], position: {x, z}}` |
| `config.edges[]` | `{from_key, to_key, description, payload_schema}` |
| `config.triggers[]` | `{key, trigger_type (e.g. "app"), app_slug, app_name, app_icon, trigger_key, trigger_name, trigger_version, configured_props, cron_expression, position: {x, z}, edges: [{to_node_key, description, payload_schema}]}` |

Template node `secrets` declare required names and descriptions, not values. The docs do not describe an endpoint that instantiates an orchestration from a template; the building page says to "save a proven setup as a template for future teams or projects", which is a console action.

## Error envelopes

A `400`, `409`, or `503` body is `{"detail": {"code": "...", "message": "..."}}`. A `404` carries a plain string `detail` (for example `{"detail": "MCP server not found"}`). Strict-admission refusals are `403` with `detail.code: agent_credential_refused`; if the strict-admission setting cannot be read, protected writes return `503` with `detail.code: origin_unavailable` and `Retry-After: 5`.
