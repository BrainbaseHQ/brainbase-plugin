# Evals API: endpoints, fields, statuses, credentials and errors

Snapshot: 2026-11-03
Source: https://docs.brainbaselabs.com/api/evals/create-eval
Source: https://docs.brainbaselabs.com/api/evals/list-evals
Source: https://docs.brainbaselabs.com/api/evals/get-eval
Source: https://docs.brainbaselabs.com/api/evals/update-eval
Source: https://docs.brainbaselabs.com/api/evals/delete-eval
Source: https://docs.brainbaselabs.com/api/evals/list-eval-runs
Source: https://docs.brainbaselabs.com/api/authentication
Source: https://docs.brainbaselabs.com/docs/monitoring/evaluations (API write credentials)
Source: https://docs.brainbaselabs.com/cli/reference/control-plane-api (Evals, Manifest and revision, Errors)
Source: https://docs.brainbaselabs.com/cli/reference/pat-scopes (what is enforced, resource scope)
Source: https://docs.brainbaselabs.com/docs/monitoring/tasks (execution setting credentials)

Contents

1. Two API surfaces
2. Authentication
3. The eval object
4. Create: `POST /v2/agents/{agent_id}/evals`
5. List: `GET /v2/agents/{agent_id}/evals`
6. Get: `GET /v2/agents/{agent_id}/evals/{eval_id}`
7. Update: `PATCH /v2/agents/{agent_id}/evals/{eval_id}`
8. Delete: `DELETE /v2/agents/{agent_id}/evals/{eval_id}`
9. List eval runs: `GET /v2/agents/{agent_id}/eval-runs`
10. The eval run object and what `status` means
11. Write credentials and strict admission
12. Control-plane (`/v2/cli`) eval reads
13. Manifest replacement, `reconcile_evals` and revisions
14. Error reference

## 1. Two API surfaces

| Surface | Base | What it offers for evals | Stability |
| --- | --- | --- | --- |
| Universal Harness API (public) | `https://api.brainbaselabs.com/v2` | Full CRUD on eval definitions plus listing verdicts. | The supported, versioned public API. |
| Control-plane API (what the CLI calls) | `https://api.brainbaselabs.com/v2/cli` | Read-only: list evals, list eval runs; definitions change through whole-manifest `PUT`. | Not a public contract; can change whenever the CLI does. Use it to reproduce a CLI failure with `curl`, not to build integrations. |

## 2. Authentication

Public API requests send a Brainbase API key as a bearer token:

```bash
curl "https://api.brainbaselabs.com/v2/agents/$AGENT_ID/evals" \
  -H "Authorization: Bearer $BRAINBASE_API_KEY"
```

The docs' curl examples write `Authorization: Bearer YOUR_API_KEY`. Never paste a key into chat, a file or an MCP client configuration; keep it in an environment variable. The control-plane prefix accepts a PAT (`bbpat_…`) or a login-session access token; `BRAINBASE_TOKEN` takes priority over a saved PAT and a session.

## 3. The eval object

Every CRUD response returns this shape (list responses wrap it in `items`):

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | The eval id (`eval_id` in paths). |
| `created_at`, `updated_at` | timestamp | |
| `agent_id` | uuid | The judged agent. |
| `slug` | string | Identity within the agent. |
| `criteria` | string | What the judge scores against. |
| `icon` | string | Lucide icon name shown in the web app. |
| `judge_model` | string | LLM that runs the judge. |
| `judge_type` | `model` or `agent` | Who judges. |
| `judge_agent_id` | uuid | The judging agent when `judge_type` is `agent`. |
| `output_shape` | `binary`, `rating` or `classification` | Shape of the verdict. |
| `classification_values` | array of string | Allowed categories for `classification`. |
| `enabled` | boolean | Whether turns are scored against this eval. |
| `created_by` | uuid | The creating user. |

Field constraints (slug format, criteria length, icon length, defaults, classification rules) are stated on the manifest reference, not on the API pages; see `manifest-and-cli.md`. The API examples show `judge_model: "claude-sonnet-4-6"` as the sample value, matching the manifest default.

## 4. Create: `POST /v2/agents/{agent_id}/evals`

Path: `agent_id` (uuid, required).

Request body:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `slug` | string | yes | |
| `criteria` | string | yes | |
| `icon` | string | no | |
| `judge_model` | string | no | "LLM that runs the judge. Must be a model the configured kafka_llm_proxy_base_url accepts on /v1/chat/completions." |
| `enabled` | boolean | no | |
| `judge_type` | `model` or `agent` | no | |
| `judge_agent_id` | uuid | no | |
| `output_shape` | `binary`, `rating` or `classification` | no | |
| `classification_values` | array of string | no | |

```bash
curl --request POST \
  --url "https://api.brainbaselabs.com/v2/agents/$AGENT_ID/evals" \
  --header "Authorization: Bearer $BRAINBASE_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "slug": "asks-for-missing-info",
    "criteria": "Pass when the agent asks for a required field it was not given, instead of guessing a value.",
    "icon": "CircleCheck",
    "judge_model": "claude-sonnet-4-6",
    "enabled": true,
    "judge_type": "model",
    "output_shape": "binary"
  }'
```

Response: the eval object (section 3). Requires permission to manage the agent; see section 11.

## 5. List: `GET /v2/agents/{agent_id}/evals`

Path: `agent_id`. Query: `limit` (integer, optional). Response: `{ "items": [ <eval object>, ... ] }`. The public page does not document an archived filter; the control-plane variant takes `include_archived` (section 12).

## 6. Get: `GET /v2/agents/{agent_id}/evals/{eval_id}`

Path: `agent_id`, `eval_id` (both uuid, required). Response: the eval object.

## 7. Update: `PATCH /v2/agents/{agent_id}/evals/{eval_id}`

Path: `agent_id`, `eval_id`. Every body field is optional: `slug`, `criteria`, `icon`, `judge_model`, `enabled`, `output_shape`, `classification_values`, `judge_type`, `judge_agent_id`. Response: the updated eval object.

```bash
curl --request PATCH \
  --url "https://api.brainbaselabs.com/v2/agents/$AGENT_ID/evals/$EVAL_ID" \
  --header "Authorization: Bearer $BRAINBASE_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{ "enabled": false }'
```

Setting `enabled: false` stops new verdicts while keeping the definition and past verdicts (manifest reference). To switch to an agent judge, send `judge_type: "agent"` with `judge_agent_id`.

## 8. Delete: `DELETE /v2/agents/{agent_id}/evals/{eval_id}`

Path: `agent_id`, `eval_id`. The docs' sample response is a map of booleans (`{"property1": true, "property2": true}`); the page gives no named keys. The manifest reference says removal through `agent push` archives rather than deletes (past verdicts kept, same slug restores the eval); the API page does not say whether `DELETE` archives or hard-deletes. Confirm with the user before calling it, and prefer `PATCH {"enabled": false}` when the intent is only to stop scoring.

## 9. List eval runs: `GET /v2/agents/{agent_id}/eval-runs`

"Verdicts (eval_runs) for an agent, newest-first. Optional `task_id` narrows to one thread. Same agent-ownership gate as the CRUD routes."

Path: `agent_id`. Query: `task_id` (uuid, optional), `limit` (integer, optional). Response: `{ "items": [ <eval run>, ... ] }`.

```bash
curl --request GET \
  --url "https://api.brainbaselabs.com/v2/agents/$AGENT_ID/eval-runs?task_id=$TASK_ID&limit=20" \
  --header "Authorization: Bearer $BRAINBASE_API_KEY"
```

## 10. The eval run object and what `status` means

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | The run (verdict) id. |
| `eval_id` | uuid | Which eval. |
| `task_id` | uuid | The task (thread) that was judged. |
| `turn_id` | uuid | The finished turn that triggered the judge. |
| `status` | string | Whether the judge ran, not what it decided (below). |
| `passed` | boolean | Binary verdict. |
| `rating` | number | Rating verdict (1-5 per the manifest reference). |
| `category` | string | Classification verdict. |
| `reasoning` | string | The judge's reasoning. |
| `cites` | array of object | Quotes the judge cited; the docs do not describe the object's keys. |
| `judge_model` | string | Model that rendered the verdict. |
| `error` | string | Why the judge failed, when it did. |
| `triggered_by` | string | Not described further in the docs. |
| `judge_task_id` | uuid | For agent judges, the judge's own task. |
| `created_at`, `completed_at` | timestamp | |

Status semantics, from the CLI and control-plane pages:

- `status` reports whether the judge ran, not what it decided.
- A binary eval the agent failed comes back as `status: "passed"` with `passed: false`: the judge ran and returned a failing verdict.
- When the judge itself failed, the verdict fields are empty and `error` says why. The CLI page labels that case `status: "errored"`; the control-plane page labels it `status: "failed"`. The two pages disagree on the word, so match on `error` being set, or on `status` not being `"passed"`, rather than on one literal.
- Out of credits or over a spend limit: the judge call is rejected and the evaluation is recorded as errored with no verdict (evaluations page).

## 11. Write credentials and strict admission

From the evaluations page:

- `POST /v2/agents/{agent_id}/evals`, and `PATCH` or `DELETE /v2/agents/{agent_id}/evals/{eval_id}`, require permission to manage the agent.
- Supabase login sessions, MCP OAuth JWTs and user-wide PATs retain their existing access checks. A caller without access receives `404`.
- PAT writes retain the publish scope rules: the control-plane guard enforces them in `enforce` mode and logs a would-be denial in `shadow` mode. (PAT scopes page: outside `/v2/cli`, evals sit in the group covered only by the newer blanket guard that is deployed but not yet enforcing, so a `read`-only PAT may still reach these writes today. Do not rely on `read` as a product-wide read-only credential.)
- When both `INTEGRATION_CONTROL_ENABLED` and `cutover:strict_admission` are enabled, the three write endpoints refuse sandbox and other resource-scoped PATs, plus `bb_live_…` keys, with `403` and `detail.code: agent_credential_refused`. This applies even when `AUTH_SCOPE_ENFORCEMENT_CONTROL_PLANE=shadow`. Use a person's login session or user-wide PAT with permission to manage the agent.
- Strict admission is off by default. With either switch off, the existing write behavior applies.
- If the master switch is on but the strict-admission setting cannot be read, resource-credential writes return `503` with `detail.code: origin_unavailable` and `Retry-After: 5`; retry after five seconds.
- Listing or reading evals and listing eval runs keep their existing read permissions; strict admission adds no new restriction to those reads.

Which credential works for eval writes:

| Credential | Eval writes (`POST`/`PATCH`/`DELETE`) | Eval reads and run listing |
| --- | --- | --- |
| Person's login session (Supabase JWT) | Yes, subject to permission to manage the agent. | Yes. |
| MCP OAuth JWT (Brainbase MCP) | Existing access checks apply. | Yes. |
| User-wide PAT (`bbpat_…` from `brainbase token create` or the dashboard) | Yes with permission to manage the agent; publish-scope rules per guard mode. | Yes. |
| Resource-scoped PAT (one agent or one thread; minted by Brainbase for sandboxes and scheduled triggers) | Refused with `403 agent_credential_refused` under strict admission; may pass in shadow mode. | Unchanged. |
| Agent task key (`bb_live_…`) | Refused with `403 agent_credential_refused` under strict admission. On `/v2/cli` writes always refused: `CLI task keys cannot manage cloud configuration`. | Unchanged. |

Related: under strict admission, `PATCH /v2/tasks/{task_id}` metadata patches that set or remove keys starting with `brainbase_`, `_` or `orchestration_` ("these include evaluation settings and platform-owned state") also require a person's session or user-wide PAT; task credentials get `403 agent_credential_refused`. Do not put a person's credential in a sandbox; make configuration changes from the console or a trusted controller.

## 12. Control-plane (`/v2/cli`) eval reads

Relative to `https://api.brainbaselabs.com/v2/cli` (also served under `/api/cli`):

| Endpoint | Used by | Scope required |
| --- | --- | --- |
| `GET /agents/{agent_id}/evals` | `agent eval list` | none |
| `GET /agents/{agent_id}/eval-runs` | `agent eval runs` | none |

Read-only by design: definitions are managed through the manifest, so these answer "what does the cloud think?" from a terminal. `evals` takes `include_archived` (default `false`) to include definitions a push has archived. `eval-runs` returns verdicts newest first, optionally narrowed with `task_id`, and `limit` (default `50`, max `200`).

```bash
curl "https://api.brainbaselabs.com/v2/cli/agents/$AGENT_ID/eval-runs?limit=20" \
  -H "Authorization: Bearer $BRAINBASE_TOKEN"
```

## 13. Manifest replacement, `reconcile_evals` and revisions

The CLI writes eval definitions through the control plane's manifest routes, not through the public eval CRUD:

| Endpoint | Used by | Scope required |
| --- | --- | --- |
| `GET /agents/{agent_id}/manifest` | `agent pull`, `agent push`, `agent status`, `sync` | none |
| `PUT /agents/{agent_id}/manifest` | `agent push`, `agent create` | publish |
| `GET /agents/{agent_id}/revision` | `status` | none |

- `GET .../manifest` returns the agent's whole content as a list of components (instructions, skills, MCP servers, playbooks, evals), each with its files and a content hash, plus the current `revision`, and possibly `warnings`.
- `PUT .../manifest` is a whole-manifest replacement reconciled per component type: components present are created or updated, components absent are unlinked or archived. Pass `base_revision` so the server refuses with a conflict (`409`) when the cloud moved since you read it.
- Archive-on-absence for playbooks and evals is opt-in per request through `reconcile_playbooks` and `reconcile_evals`. Without the flag, a manifest that omits them is read as "this client does not model them", so an older client cannot silently wipe rows. Send the flag only when your manifest is authoritative for that content.
- `reconcile_evals` requires `base_revision` in the same request; without it the server refuses with `400` rather than let a client that never pulled the evals archive them.
- `GET .../revision` returns `{"revision": <n>}`, a hash over the agent's content (not a counter). It covers instructions, skills, MCP servers, active playbooks, active evals, and secret key names. It does not cover integrations.

These are the server-side reasons behind the CLI's "pull first" refusal described in `manifest-and-cli.md`.

## 14. Error reference

Public eval endpoints (evaluations page):

| Status | `detail.code` or body | Meaning |
| --- | --- | --- |
| `404` | — | Caller lacks access to the agent (deliberately indistinguishable from "no such agent"). |
| `403` | `agent_credential_refused` | Strict admission refused a resource-scoped PAT or `bb_live_…` key on a write. Use a person's session or a user-wide PAT with permission to manage the agent. |
| `503` | `origin_unavailable`, header `Retry-After: 5` | Master switch on but the strict-admission setting could not be read. Retry after five seconds. |

Control-plane `/v2/cli` errors (JSON `detail`, a string or an object with `code` and `message`):

| Status | Body | Meaning |
| --- | --- | --- |
| `401` | `missing bearer token` | No `Authorization` header. |
| `401` | `invalid or expired PAT` | The token does not resolve: revoked, expired, or mistyped. |
| `403` | `PAT lacks required scope: publish` | A read-scoped PAT on a write (for example `PUT .../manifest`). Nothing was modified. |
| `403` | `CLI task keys cannot manage cloud configuration` | An agent task key (`bb_live_…`) on a write or a surface read. |
| `403` | `credential_scope_denied` | A resource-scoped credential listing a team's agents or an organization's members. |
| `404` | `Agent not found` | No such agent, or the caller cannot reach it. |
| `404` | `Not Found` | The path is not routed; usually a control plane older than the command calling it. |
| `409` | — | A `base_revision` conflict: the cloud advanced since you read it. Pull, then push again. |
| `400` | — | `reconcile_evals` sent without `base_revision`; or a body/query validation failure (`422` is also used for validation). |
| `422` | — | The request body or a query parameter failed validation. |
