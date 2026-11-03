Source: https://docs.brainbaselabs.com/cli/reference/control-plane-api; https://docs.brainbaselabs.com/cli/reference/pat-scopes; https://docs.brainbaselabs.com/cli/authentication
Snapshot: 2026-11-03

# The `/v2/cli` control-plane API and PAT scopes

## Contents

- Host, prefix and authentication
- Organizations and teams
- Agents, manifest, revision, secrets, keys
- Connections, MCP, surfaces
- Evals and orchestrations
- Errors
- PAT permission scopes: what is enforced
- Resource scope
- Which credential each surface accepts

This is the surface the CLI itself talks to, documented so you can read a CLI failure, reproduce a command with `curl`, or wire the same operations into CI. It is not the public API: `/v2/cli` serves the shipped CLI, carries no independent version, and can change whenever the CLI does. Integrations should use the Universal Harness API under `/v2` (`brainbase-platform`). Roles and the full access-control model: `brainbase-permissions`.

## Host, prefix and authentication

Every path is relative to `https://api.brainbaselabs.com/v2/cli`; `BRAINBASE_CONTROL_PLANE_URL` points elsewhere and the CLI appends `/v2/cli` itself. MAS also serves the same router under `/api/cli`. Setting `BRAINBASE_API_URL` is not the same as using that prefix: it means "legacy KLS control plane", on which the CLI refuses declarative `machine_kind` / `default_model` writes, orchestration creation and schedule-trigger writes.

```bash
curl "https://api.brainbaselabs.com/v2/cli/orgs" \
  -H "Authorization: Bearer $BRAINBASE_TOKEN"
```

Send a bearer token: a PAT (`bbpat_…`) or the access token from a browser login session; both are accepted on every endpoint. Every write (23 endpoints) requires the `publish` scope; three surface reads require `read`; the other 17 reads require none. A session token carries no scope list and is never scope-checked. Control-plane commands fall back to the PAT saved by `token create` when the session cannot be used and its account matches; `BRAINBASE_TOKEN` takes priority over both.

## Organizations and teams

| Endpoint | Used by | Scope |
| --- | --- | --- |
| `GET /orgs` | `team list`, `agent create`, `agent list`, `orchestration create`, `orchestration list`, `orchestration add-agent`, `template publish`, `skill publish` | none |
| `GET /orgs/{org_id}/teams` | `team list`, `agent create`, `agent list`, `orchestration create`, `orchestration list`, `orchestration add-agent` | none |
| `POST /orgs/{org_id}/teams` | `agent create` ("+ Create a new team" in the interactive picker; nowhere else) | publish |
| `GET /orgs/{org_id}/teams/{team_id}/agents` | `agent list` | none |
| `GET /orgs/{org_id}/members` | `member ls`, and the email lookups of `interface create` and `interface access` | none |

`GET /orgs` returns every organization the caller belongs to with the caller's `role`. The agents listing returns everything granted to the team (including other members' agents), newest grant first, capped by `limit` (default `200`, no cursor); group membership is checked on top of organization membership. `GET .../members` pages with `cursor` and `limit`; a resource-scoped credential is refused with `credential_scope_denied`.

## Agents, manifest, revision, secrets, keys

| Endpoint | Used by | Scope |
| --- | --- | --- |
| `POST /agents` | `agent create` | publish |
| `GET /agents/{agent_id}` | `link`, `sync`, `status`, `agent pull`, `agent push`, `agent status`, `agent connect` | none |
| `PUT /agents/{agent_id}` | `agent push` | publish |
| `GET /agents/{agent_id}/manifest` | `agent pull`, `agent push`, `agent status`, `sync` | none |
| `PUT /agents/{agent_id}/manifest` | `agent push`, `agent create` | publish |
| `GET /agents/{agent_id}/revision` | `status` | none |
| `GET /agents/{agent_id}/secrets` | `agent pull`, `agent push`, `agent status` | none |
| `PUT /agents/{agent_id}/secrets` | `agent push` | publish |
| `POST /agents/{agent_id}/keys` | `link`, `agent create` | publish |
| `GET /agents/{agent_id}/keys` | not called by the CLI today | none |
| `DELETE /keys/{key_id}` | `link`, `unlink` | publish |

- `PUT /agents/{agent_id}` updates `name`, `tagline`, `entrypoint`, `default_model`, `memory_enabled`, `browser_enabled`; omitted fields are left alone. `slack_connected`, `meeting_connected`, `github_connected` are not writable here. `machine_kind` is accepted only as the value the agent already has; anything else is `409 machine_kind is immutable after agent creation`. The public API updates agents with `PATCH /v2/agents/{agent_id}` and a different body: pick one surface and stay on it.
- `GET .../manifest` returns the whole content as components (instructions, skills, MCP servers, playbooks, evals) each with files and a content hash, plus `revision`, and possibly `warnings`. `PUT .../manifest` is a whole-manifest replacement reconciled per component type; pass `base_revision` so the server can refuse with a conflict when the cloud moved. Archive-on-absence for playbooks and evals is opt-in per request with `reconcile_playbooks` and `reconcile_evals`; `reconcile_evals` requires `base_revision` in the same request or the server answers `400`.
- `GET .../revision` returns `{"revision": <n>}`, a hash over instructions, skills, MCP servers, active playbooks, active evals and secret key names (not values, not integrations).
- Secrets carry `{"secrets": {"KEY": "value"}}`; the `GET` returns plaintext; the `PUT` is a whole-map replace (omitted keys are removed), keys must be valid environment-variable names (`400` otherwise). Rotating secrets needs `publish`; reading does not.
- Agent keys (`bb_live_…`) are a third credential class: `POST` returns the plaintext key once with `id` and `prefix`; `GET` lists by prefix; `DELETE` is idempotent (`404` for a key already gone).

## Connections, MCP, surfaces

| Endpoint | Used by | Scope |
| --- | --- | --- |
| `GET /agents/{agent_id}/connections` | `agent connections`, `agent connect` | none |
| `PUT /agents/{agent_id}/connections/slack` | `agent connect slack` | publish |
| `DELETE /agents/{agent_id}/connections/slack` | `agent disconnect slack` | publish |
| `PUT /agents/{agent_id}/connections/meeting` | `agent connect meeting` | publish |
| `DELETE /agents/{agent_id}/connections/meeting` | `agent disconnect meeting` | publish |
| `GET /agents/{agent_id}/mcp-servers` | `mcp list`, `mcp connect` | none |
| `POST /agents/{agent_id}/mcp-connect-links` | `mcp connect` | publish |
| `GET /mcp-connect-links/{link_id}` | `mcp connect`, while it waits | none |
| `GET /agents/{agent_id}/surfaces/{surface}` | `agent surface <surface> status`, waits and checks | read |
| `PATCH /agents/{agent_id}/surfaces/{surface}` | `agent surface <surface> configure`, `agent connect chat`, `meeting image clear` | publish |
| `DELETE /agents/{agent_id}/surfaces/{surface}` | `agent surface <surface> disconnect` for chat, Slack, meeting, GitHub | publish |
| `PUT /agents/{agent_id}/surfaces/slack` | `agent surface slack connect` | publish |
| `PUT /agents/{agent_id}/surfaces/meeting` | `agent surface meeting connect` | publish |
| `POST /agents/{agent_id}/surfaces/meeting/image` | `meeting image upload` | publish |
| `GET /agents/{agent_id}/surfaces/meeting/calendar` | `meeting calendar status` | read |
| `POST /agents/{agent_id}/surfaces/meeting/calendar` | `meeting calendar create` | publish |
| `PATCH /agents/{agent_id}/surfaces/meeting/calendar` | `meeting calendar configure` | publish |
| `GET /agents/{agent_id}/surfaces/phone/whitelist` | `phone whitelist list` | read |
| `POST /agents/{agent_id}/surfaces/phone/whitelist` | `phone whitelist add` | publish |
| `DELETE /agents/{agent_id}/surfaces/phone/whitelist/{entry_id}` | `phone whitelist remove` | publish |

- `GET .../connections` reports all six surfaces with `manageable_from_cli` (true for all six; `unmanageable_reason` from an older control plane). Both connection `PUT`s are idempotent and rotate credentials in place: Slack takes `bot_token`, `signing_secret`, optional `app_id`, `app_name`; meeting takes `bot_name`, optional `bot_image_url`. `DELETE` removes the install. The CLI translates an unrouted `404` on these routes into "this control plane does not support connections yet"; a `404` carrying `{"detail":"Agent not found"}` is passed through.
- `GET .../mcp-servers` returns transport, enabled state, authorization (`none`, `oauth_required`, `oauth_connected`, `oauth_expired`) and last connectivity result; never tokens. `POST .../mcp-connect-links` takes the server name and returns `{ link_id, url, expires_at, server }` (single-use, ten minutes); `GET /mcp-connect-links/{link_id}` reports `status`: `pending`, `opened`, `connected`, `failed` (with `error_code`) or `expired`.
- A surface's state is `{ agent_id, surface, connected, installation_id, config, capabilities, details }`; `{surface}` is `chat`, `slack`, `meeting`, `github`, `linear` or `phone`. `GET` takes `installation_id` for GitHub and Linear; `PATCH` saves only sent fields and needs `installation_id` for those two. Thread-bound credentials are refused with `Surface settings require a user or agent credential`. Provider consent and provisioning (GitHub/Linear setup, Linear manifest and disconnect, phone search/purchase/release) go through the web app with a login session, not here.

## Evals and orchestrations

| Endpoint | Used by | Scope |
| --- | --- | --- |
| `GET /agents/{agent_id}/evals` | `agent eval list` (`include_archived`, default `false`) | none |
| `GET /agents/{agent_id}/eval-runs` | `agent eval runs` (`task_id`, `limit` default `50`, max `200`) | none |
| `GET /orgs/{org_id}/teams/{team_id}/orchestrations` | `orchestration list` | none |
| `POST /orchestrations` | `orchestration create` | publish |
| `GET /orchestrations/{orch_id}` | `orchestration status`, `orchestration pull` | none |
| `GET /orchestrations/{orch_id}/manifest` | `orchestration pull` | none |
| `PUT /orchestrations/{orch_id}` | `orchestration push` | publish |

A run's `status: "passed"` with `passed: false` is a failing verdict from a judge that ran; `status: "failed"` means the judge errored (`error` says why). The bare orchestration `GET` has members and edges but no member manifests; `/manifest` inlines each under `members[].manifest`. `PUT` is partial except `members` and `edges` (whole-replace; `[]` clears); pass `base_revision`; every member must already have access to the parent team (`400` otherwise).

## Errors

Errors are JSON with `detail`, a string or an object with `code` and `message`.

| Status | Body | Meaning |
| --- | --- | --- |
| `401` | `missing bearer token` | No `Authorization` header. |
| `401` | `invalid or expired PAT` | Revoked, expired or mistyped token. |
| `403` | `PAT lacks required scope: publish` | A read-scoped PAT on a write; nothing modified. |
| `403` | `PAT lacks required scope: read` | A PAT without `read` on one of the three surface reads. |
| `403` | `CLI task keys cannot manage cloud configuration` | An agent task key (`bb_live_…`) on a write or surface read. |
| `403` | `credential_scope_denied` | A resource-scoped credential listing a team's agents or an organization's members. |
| `403` | `Surface settings require a user or agent credential` | A thread-bound credential on a surface route. |
| `403` | `agent-scoped PATs cannot access orchestration configuration` | A resource-scoped credential on any orchestration endpoint (`thread-scoped` for a thread token). |
| `404` | `Agent not found` | No such agent, or the caller cannot reach it (indistinguishable by design). |
| `404` | `Not Found` | The path is not routed: usually a control plane older than the command. |
| `409` | — | `base_revision` conflict: the cloud advanced. Pull, then push again. |
| `409` | `machine_kind is immutable after agent creation` | `PUT /agents/{agent_id}` with a different `machine_kind`. |
| `422` | — | Body or query parameter failed validation. |
| `403` | `detail.code: agent_credential_refused` | Under strict admission, a resource credential on a protected write (alerts, templates, evals). |
| `503` | `detail.code: origin_unavailable`, `Retry-After: 5` | Strict-admission setting unreadable while the master switch is on. |

## PAT permission scopes: what is enforced

`brainbase token create --scopes` accepts `read`, `publish`, `admin` (default `read,publish`); anything else is rejected locally and by the server. Scopes are immutable; `token rename` changes only the label.

| Scope | What it grants |
| --- | --- |
| `read` | Every read endpoint, no writes. Most reads do not check for it; the three surface-settings reads on `/v2/cli` do. |
| `publish` | Every write endpoint. Alone it does not pass the three surface reads. |
| `admin` | Nothing today; no endpoint requires it. `--scopes admin` alone is refused on writes like a read-only token. |

Two further scopes exist but cannot be minted (issued to sandbox credentials): `code:execute` (required with `publish` by `POST /v2/tasks/{task_id}/code/run/sync` and `GET /v2/tasks/{task_id}/code/capabilities`) and `messages:write_roles` (appending a non-`user` role message as a resource-scoped PAT). The raw mint endpoint defaults to `read` alone, so a token created outside the CLI may be read-only.

On `/v2/cli` a read-scoped PAT is read-only with no exceptions. Outside `/v2/cli` the rule is patchier: agent secrets, file uploads, thread creation, orchestration writes and benchmark mutations check `publish` unconditionally; templates, machines, evals, alerts, orchestration templates and most of `PATCH /v2/agents/{agent_id}` are covered only by a blanket guard that is deployed but not yet enforcing (logs a would-be denial and lets the request through). Treat `read` as a guardrail for CLI use, not a product-wide read-only credential. The check applies to PATs only; a login session (Supabase JWT) is never scope-checked and can write whatever the user's role allows.

## Resource scope

Independently of permission scope, a credential is user-wide or bound to one resource.

| Binding | Minted by | Reaches |
| --- | --- | --- |
| User-wide | `brainbase token create`, or the dashboard | Everything the user can reach. |
| One agent | Brainbase, when a sandbox starts or a scheduled trigger fires | That agent, plus orchestration peers it has an edge to. |
| One thread | Brainbase, per running thread | That thread. |

Most of this boundary is in shadow mode (logs would-be denials, allows the request). Unconditional refusals on `/v2/cli` today: listing a team's agents, listing an organization's members, the five orchestration endpoints, and surface-settings endpoints for thread-bound credentials. Strict admission (`INTEGRATION_CONTROL_ENABLED=true` plus `cutover:strict_admission=true`, off by default) additionally refuses resource credentials on protected writes with `agent_credential_refused`, and confines runtime-event writes to the credential's own task or a task it delegated to (`cross_context`, `not_descendant`). You cannot mint a resource-scoped PAT from the CLI and do not need to; a `403 credential_scope_denied` came from a sandbox-minted token.

## Which credential each surface accepts

- Minting or changing PATs needs a login session: `token create`, `rename`, `revoke` reject a PAT with `jwt_required`; `token list` accepts a user-level PAT.
- Everything else on the control plane accepts a PAT with the right scopes or a session.
- Commands that call the web app need a session and refuse while `BRAINBASE_TOKEN` is set: `brainbase integrations`, GitHub and Linear setup, the Linear manifest and disconnect, phone search, purchase and release.
- Saved PATs are a fallback for every authenticated command, after `BRAINBASE_TOKEN` and a valid or renewable session.
