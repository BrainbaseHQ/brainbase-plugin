# Endpoint enforcement table

Source: docs.brainbaselabs.com/cli/reference/pat-scopes (What is actually enforced, Resource scope), /cli/reference/control-plane-api (every table), /docs/monitoring/evaluations (API write credentials), /docs/monitoring/tasks (Execution setting credentials), /docs/orchestrations/secrets (Key names and access), /api/orchestrations/update-orchestration-secrets, /api/agents/get-agent-inherited-secrets, /api/agents/get-agent-inherited-mcp-servers, /docs/agent/file-system (Protected hosted tasks).
Snapshot: 2026-11-03

## Contents

1. The rule for `/v2/cli`
2. Full `/v2/cli` table (43 endpoints)
3. Outside `/v2/cli`: enforced, shadow, and strict admission
4. Strict admission
5. Runtime-event confinement
6. Reading an error against this table

## 1. The rule for `/v2/cli`

"On the CLI control plane at `/v2/cli`, every write requires the publish scope: all 23 mutating endpoints carry the check. Of the 20 read endpoints, 17 require no scope and three — the surface-settings reads behind `agent surface` — require `read`." The same check refuses an agent task key (`bb_live_…`) outright on every endpoint that names a scope, with `CLI task keys cannot manage cloud configuration`. A session token is never scope-checked. Paths are relative to `https://api.brainbaselabs.com/v2/cli`; `/api/cli` serves the same handlers.

## 2. Full `/v2/cli` table

| Endpoint | Used by | Scope | Resource-scope note |
|---|---|---|---|
| `GET /orgs` | `team list`, `agent create`, `agent list`, `orchestration create|list|add-agent`, `template publish`, `skill publish` | none | returns caller's `role` per org |
| `GET /orgs/{org_id}/teams` | `team list`, `agent create|list`, `orchestration create|list|add-agent` | none | |
| `POST /orgs/{org_id}/teams` | `agent create` ("+ Create a new team") | publish | |
| `GET /orgs/{org_id}/teams/{team_id}/agents` | `agent list` | none | refuses resource-scoped credentials: `credential_scope_denied` |
| `GET /orgs/{org_id}/members` | `member ls`, `interface create|access` email lookups | none | refuses resource-scoped credentials: `credential_scope_denied` |
| `POST /agents` | `agent create` | publish | |
| `GET /agents/{agent_id}` | `link`, `sync`, `status`, `agent pull|push|status|connect` | none | |
| `PUT /agents/{agent_id}` | `agent push` (`name`, `tagline`, `entrypoint`, `default_model`, `memory_enabled`, `browser_enabled`; `machine_kind` only as a no-op) | publish | |
| `GET /agents/{agent_id}/manifest` | `agent pull|push|status`, `sync` | none | |
| `PUT /agents/{agent_id}/manifest` | `agent push`, `agent create` (whole-manifest replace; `base_revision`, `reconcile_playbooks`, `reconcile_evals`) | publish | |
| `GET /agents/{agent_id}/revision` | `status` | none | covers secret key names, not values; not integrations |
| `GET /agents/{agent_id}/secrets` | `agent pull|push|status` (plaintext values) | none | |
| `PUT /agents/{agent_id}/secrets` | `agent push` (whole-map replace) | publish | "the only place in the CLI surface where a read and its matching write differ that sharply in consequence" |
| `POST /agents/{agent_id}/keys` | `link`, `agent create` | publish | |
| `GET /agents/{agent_id}/keys` | not called by the CLI today | none | |
| `DELETE /keys/{key_id}` | `link`, `unlink` | publish | |
| `GET /agents/{agent_id}/connections` | `agent connections`, `agent connect` | none | |
| `PUT /agents/{agent_id}/connections/slack` | `agent connect slack` (`bot_token`, `signing_secret`, optional `app_id`, `app_name`) | publish | |
| `DELETE /agents/{agent_id}/connections/slack` | `agent disconnect slack` | publish | |
| `PUT /agents/{agent_id}/connections/meeting` | `agent connect meeting` (`bot_name`, optional `bot_image_url`) | publish | |
| `DELETE /agents/{agent_id}/connections/meeting` | `agent disconnect meeting` | publish | |
| `GET /agents/{agent_id}/mcp-servers` | `mcp list`, `mcp connect` (tokens never returned) | none | |
| `POST /agents/{agent_id}/mcp-connect-links` | `mcp connect` (single-use, ten-minute link bound to the caller) | publish | |
| `GET /mcp-connect-links/{link_id}` | `mcp connect` while waiting | none | |
| `GET /agents/{agent_id}/surfaces/{surface}` | `agent surface <surface> status`, waits and checks | **read** | user-wide or agent-bound; thread-bound refused |
| `PATCH /agents/{agent_id}/surfaces/{surface}` | `agent surface <surface> configure`, `agent connect chat`, `meeting image clear` | publish | same |
| `DELETE /agents/{agent_id}/surfaces/{surface}` | `agent surface <surface> disconnect` (chat, Slack, meeting, GitHub) | publish | same |
| `PUT /agents/{agent_id}/surfaces/slack` | `agent surface slack connect` | publish | same |
| `PUT /agents/{agent_id}/surfaces/meeting` | `agent surface meeting connect` | publish | same |
| `POST /agents/{agent_id}/surfaces/meeting/image` | `agent surface meeting image upload` | publish | same |
| `GET /agents/{agent_id}/surfaces/meeting/calendar` | `agent surface meeting calendar status` | **read** | same |
| `POST /agents/{agent_id}/surfaces/meeting/calendar` | `agent surface meeting calendar create` | publish | same |
| `PATCH /agents/{agent_id}/surfaces/meeting/calendar` | `agent surface meeting calendar configure` | publish | same |
| `GET /agents/{agent_id}/surfaces/phone/whitelist` | `agent surface phone whitelist list` | **read** | same |
| `POST /agents/{agent_id}/surfaces/phone/whitelist` | `agent surface phone whitelist add` | publish | same |
| `DELETE /agents/{agent_id}/surfaces/phone/whitelist/{entry_id}` | `agent surface phone whitelist remove` | publish | same |
| `GET /agents/{agent_id}/evals` | `agent eval list` (`include_archived`) | none | |
| `GET /agents/{agent_id}/eval-runs` | `agent eval runs` (`task_id`, `limit` default 50, max 200) | none | |
| `GET /orgs/{org_id}/teams/{team_id}/orchestrations` | `orchestration list` | none | resource-scoped credentials refused |
| `POST /orchestrations` | `orchestration create` | publish | refused |
| `GET /orchestrations/{orch_id}` | `orchestration status|pull` | none | refused |
| `GET /orchestrations/{orch_id}/manifest` | `orchestration pull` | none | refused |
| `PUT /orchestrations/{orch_id}` | `orchestration push` (`members`, `edges` whole-replace; `base_revision`) | publish | refused |

`{surface}` is one of `chat`, `slack`, `meeting`, `github`, `linear`, `phone`. Provider consent and provisioning (GitHub and Linear setup, Linear manifest and disconnect, phone search, purchase and release) are not on this surface; they go through the web app with a login session.

## 3. Outside `/v2/cli`: enforced, shadow, and strict admission

"Outside `/v2/cli` the rule is patchier."

| Group | Status | Examples |
|---|---|---|
| Writes that check `publish` unconditionally | enforced | agent secrets, file uploads, thread creation, orchestration writes, benchmark mutations |
| Writes covered only by the newer blanket guard | shadow: "gated on a server setting that currently logs a would-be denial and lets the request through" | templates, machines, evals, alerts, orchestration templates, most of `PATCH /v2/agents/{agent_id}` |
| Reads that are gated | enforced | the three `/v2/cli` surface reads (`read`); task code execution (`code:execute` on both `POST /v2/tasks/{task_id}/code/run/sync` and `GET /v2/tasks/{task_id}/code/capabilities`, plus `publish`) |
| Non-`user` message roles | enforced for resource-scoped PATs | `messages:write_roles` |
| Orchestration secret writes `PATCH /v2/orchestrations/{orchestration_id}/secrets` | enforced | `publish` + group membership; agent/task-scoped credentials always refused even with `publish`; "the group gate in front and the kill switch last, so a caller who would have been rejected anyway learns nothing" |
| `GET /v2/agents/{agent_id}/secrets/inherited`, `GET /v2/agents/{agent_id}/mcp-servers/inherited` | enforced | same manage authority as plaintext secrets; session or user-scoped PAT; resource-scoped PAT answers `404` |
| Eval writes `POST /v2/agents/{agent_id}/evals`, `PATCH`/`DELETE /v2/agents/{agent_id}/evals/{eval_id}` | manage permission enforced (`404` otherwise); PAT `publish` per the control-plane guard mode (`enforce` or `shadow`); resource credentials refused only under strict admission | |
| `PATCH /v2/tasks/{task_id}` execution settings | resource credentials refused only under strict admission | |
| Alerts (`/v2/alerts` create, update, delete, `rotate-secret`), agent and orchestration template writes | resource credentials refused only under strict admission | |
| Shared snapshot publish and adopt (`POST /v2/tasks/{task_id}/shared-snapshot`) | management session required; worker credentials cannot | disabled-by-default capability |

The guard mode is exposed as `AUTH_SCOPE_ENFORCEMENT_CONTROL_PLANE=shadow` (evaluations page); strict admission refuses resource credentials "even when" it is `shadow`.

## 4. Strict admission

- Off by default. Requires both `INTEGRATION_CONTROL_ENABLED=true` and `cutover:strict_admission=true`, "independently of tier shadow mode". With either switch off, existing behaviour applies.
- When on, these require a person's session or a user-wide PAT under the existing group or team permissions, and refuse sandbox PATs, other resource-scoped PATs and `bb_live_…` keys with `403` and `detail.code: agent_credential_refused` before anything is saved:
  - eval create, change, delete;
  - alert creation, changes, deletion and signing-secret rotation;
  - agent and orchestration template writes;
  - `PATCH /v2/tasks/{task_id}` when it changes `model`, sets `clear_model`, replaces whole-map `metadata`, or patches metadata keys starting with `brainbase_`, `_` or `orchestration_` (evaluation settings and platform-owned state). Task credentials may still rename a task and edit ordinary labels with `metadata_patch` (`{"metadata_patch":{"set":{"customer":"acme"},"unset":["queue"]}}`). Reserved keys stay rejected for everyone.
  - Shared-snapshot adoption: "a task without a verified private Shared copy stays blocked".
- Reads keep their existing permissions; "strict admission adds no new restriction to those reads".
- If the master switch is on but the strict-admission setting cannot be read, protected resource-credential writes return `503` with `detail.code: origin_unavailable` and `Retry-After: 5`; retry after five seconds.
- "These checks do not grant additional task access or change normal managed messages and delegation." "Do not put a person's credential in a sandbox; make configuration changes from the console or a trusted controller."

## 5. Runtime-event confinement

Under strict admission, runtime-event writes on `/internal/events` and `/v2/internal/events` are confined "to the credential's own task or a task it delegated to in the same context. A sandbox PAT cannot write another context's transcript just because both tasks use the same agent." Applied before saving events or starting terminal-event work; existing exact task-key scope and human/service authorization still apply.

| `detail.code` | Meaning |
|---|---|
| `cross_context` | Cross-context or ambiguous task identifier |
| `not_descendant` | A child writing into its parent |

Strict-off behaviour is unchanged.

## 6. Reading an error against this table

1. `401`: the credential did not resolve; nothing here applies yet.
2. `403 PAT lacks required scope: publish|read`: the row's Scope column; mint with `read,publish`.
3. `403 CLI task keys cannot manage cloud configuration`: the caller is `bb_live_…`; every row with a scope refuses it.
4. `403 credential_scope_denied`, the orchestration string, or the surface string: the Resource-scope column; the caller is a sandbox-minted PAT.
5. `403 agent_credential_refused`: section 4; strict admission is on for this deployment.
6. `403 cross_context` / `not_descendant`: section 5.
7. `404 Agent not found` with a credential that works elsewhere: project membership, not scope.
