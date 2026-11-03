# The Universal Harness API

Source: https://docs.brainbaselabs.com/api · /api/authentication · /api/threads/* (create-thread, get-thread,
interrupt-thread, list-thread-events, list-thread-messages, post-thread-messages, stream-thread-events) ·
/api/tasks/* (create-task, get-task, list-tasks, update-task, delete-task, interrupt-task, interrupt-task-turn) ·
/api/messages/* (list-messages, post-messages, submit-task-input, list-task-inputs, get-task-input) ·
/api/events/* (list-events, stream-events) · /api/agents/* (create, list, get, update, delete,
pin-agent-version, unpin-agent, get-agent-inherited-mcp-servers, get-agent-inherited-secrets) ·
/api/templates/* · /api/alerts/* · /api/scope/* · /api/meta/* · /api/usecases/fix-failing-tests ·
/docs/harnesses · /docs/models (model fields) · /docs/monitoring/tasks (credentials) ·
/cli/reference/pat-scopes · changelog 2026-07-14, 2026-07-17, 2026-08-06, 2026-10-30
Snapshot: 2026-11-03

## Contents

1. Base URL and authentication
2. Threads (`/v2/threads`) and the inline agent spec
3. Thread status and the two ways to watch
4. Tasks (`/v2/tasks`)
5. Messages and follow-up inputs
6. Interrupt (Stop)
7. Events: list and stream
8. Agents, pins, versions and inheritance
9. Templates
10. Alerts
11. Scope and meta
12. Sandbox providers in the agent spec (summary)
13. Walkthrough: fix a failing test suite
14. Error code index

## 1. Base URL and authentication

Base `https://api.brainbaselabs.com`. Every request sends a Brainbase API key as a bearer token:
`Authorization: Bearer $BRAINBASE_API_KEY`. Create keys at `app.brainbaselabs.com` (keys can be named and
renamed, changelog 2026-06-18). Other credential classes you will meet in errors: personal access tokens
`bbpat_…` (CLI; `read`/`publish`/`admin` scopes; outside `/v2/cli` the docs say thread creation, agent
secrets, file uploads, orchestration writes and benchmark mutations check `publish` unconditionally while
templates, machines, evals, alerts and most of `PATCH /v2/agents/{agent_id}` sit behind a non-enforcing
guard), browser session JWTs (never scope-checked), agent task keys `bb_live_…` and resource-scoped PATs
that Brainbase plants in sandboxes (bound to one agent or one thread). `messages:write_roles` is required
for a resource-scoped PAT to append a message whose `role` is not `user`. Details: `brainbase-permissions`.

The Brainbase MCP (`https://api.brainbaselabs.com/mcp`) authenticates through Brainbase OAuth with scope
`mcp:all`; keep REST keys out of MCP URLs, headers and installer config. `GET /.well-known/oauth-protected-resource`
publishes RFC 9728 metadata naming the OAuth server (reached via the `resource_metadata` pointer in the 401
challenge). Changelog 2026-07-17: a model not available on Brainbase returns an explicit "model not
available" error; agents created through the API land in a group in your workspace automatically.

## 2. Threads and the inline agent spec

`POST /v2/threads` — describe the agent inline and pass the first input; Brainbase creates the agent, boots
a sandbox and starts the first turn. Response `201` `{"thread_id", "agent_id", "status": "running"}`.
Threads title themselves from the conversation.

Body:

| Field | Type | Notes |
| --- | --- | --- |
| `agent` | object | Inline spec (below). Mirrors AgentCreate's functional fields; `harness` is the public name for `runtime_kind`. |
| `agent_id` | uuid | Use an existing agent instead of `agent`. |
| `input` | string | The first user message; the turn starts immediately. |
| `messages` | array | In place of `input`: `{role, content, name, tool_calls, tool_call_id, metadata}` items. |
| `title` | string | Thread title. |
| `metadata` | object | string→string labels. |
| `group_id` | uuid | Group (Project) to place it in. |

Inline `agent` spec:

| Field | Notes |
| --- | --- |
| `harness` | `claude_code` \| `codex` \| `cursor` \| `factory` \| `kafka_cloud` \| `opencode` \| `qoder` \| `qwen`. Defaults to `claude_code`. |
| `instructions` | System instructions. |
| `model` | e.g. `claude-sonnet-5`, `claude-opus-4-8`; omit for the harness default. |
| `machine_kind` | `daytona` \| `e2b` \| `modal` \| `bbsandbox` \| `aws_microvm` \| `cloudflare`; omit for the deployment default; fixed once the agent exists. |
| `mcp_servers[]` | `{name, url | command, args[], env{}, headers{}, is_enabled}`; `url` is remote, `command` runs in the sandbox. |
| `skills[]` | `{source}`, e.g. `registry:creator/slug` with optional `@version`. |
| `secrets` | Key–value map planted as plain env vars, visible to the harness and the entrypoint. Inline API keys are validated up front (changelog 2026-07-14). |
| `entrypoint` | Bash run in the sandbox before the agent launches, `cwd=/workspace`; non-zero exit is logged and the agent still starts; running past 10 minutes fails the task. |
| `title` | Display title; derived if omitted. |

Spec dedupe: the same spec returns the same `agent_id` and a new thread (Brainbase hashes the spec);
change anything except `title` and you get a new agent. Idempotency: send `Idempotency-Key` (8–200 chars);
reuse with the same request returns the same thread with `Idempotency-Replayed: true`; reuse with a
different request → `409 detail.code=idempotency_key_reused`; `409 idempotency_request_in_progress` with
`Retry-After: 1` while the original is processing (changelog 2026-08-06: create task/thread is safe to
retry).

Example:

```bash
curl https://api.brainbaselabs.com/v2/threads \
  -H "Authorization: Bearer $BRAINBASE_API_KEY" -H "Content-Type: application/json" \
  -d '{"agent": {"harness": "claude_code",
                 "instructions": "You are a concise research assistant.",
                 "model": "claude-sonnet-5"},
       "input": "In two sentences, what is the Model Context Protocol (MCP)?"}'
```

Thread routes: `GET /v2/threads/{thread_id}` · `POST /v2/threads/{thread_id}/interrupt` (no documented body;
returns the thread) · `GET /v2/threads/{thread_id}/messages` · `POST /v2/threads/{thread_id}/messages` ·
`GET /v2/threads/{thread_id}/events` · `GET /v2/threads/{thread_id}/events/stream`. Their bodies and
parameters are identical to the `/v2/tasks/{task_id}` equivalents in sections 5–7.

Thread/task object (`GET`): `id`, `agent_id`, `owner_user_id`, `parent_task_id`, `title`, `status`,
`status_info` (object), `metadata`, `sandbox_id` (provider-side), `machine_id` (Brainbase; use this for
`DELETE /v2/machines/{id}`), `machine_size`, `model`, `benchmark_attempt_id`, `created_at`.

## 3. Thread status and the two ways to watch

`running` while a turn executes, then `success` or `fail` (finished turn), `need_more_info` (waiting on your
answer), or `idle` (turn ended without reporting an outcome). Terminal set used by the walkthroughs:
`{"success", "fail", "need_more_info", "idle"}`.

- Poll `GET /v2/threads/{thread_id}` → `{"id", "agent_id", "title", "status", "created_at", …}`.
- Transcript `GET /v2/threads/{thread_id}/messages` → `{"items": [{"role", "content", "metadata": {"model"}}]}`.
- Live SSE `GET /v2/threads/{thread_id}/events/stream` (`curl -N`). Typed events: `user.message`,
  `assistant.message.chunk` (streaming text), `assistant.message`, `tool_call.start`, `mcp.status`, `idle`
  (`data.status`, `data.summary`), with comment keepalives between; the connection stays open across turns.

## 4. Tasks

`POST /v2/tasks` (supports `Idempotency-Key` as above):

| Field | Notes |
| --- | --- |
| `agent_id` | uuid, required. |
| `title` | optional. |
| `parent_task_id` | uuid; nests the task. |
| `metadata` | string→string labels; filter the list with repeated `?metadata=key:value`. |
| `initial_messages[]` | message objects. |
| `auto_run` | boolean (MCP-created tasks run automatically by default, changelog 2026-08-06). |
| `default_model` | catalog model id for this task. |
| `machine_size` | `xs` \| `s` \| `m` \| `l` \| `xl`; all five labels are public contract, only sizes in `SIZE_RESOURCES` are provisionable; `XS` and `XL` reserved (XL blocked on Daytona's 4 vCPU / 8 GiB cap, XS on demand). |
| `agent_version_id` | run this saved version (overrides a pin for this task). |

`GET /v2/tasks` query: `agent_id`, `parent_task_id`, `limit`, `metadata[]` (`key:value`),
`include_interface_threads` (console only; a dashboard session is refused). `GET /v2/tasks/{task_id}`.
`DELETE /v2/tasks/{task_id}` → map of booleans.

`PATCH /v2/tasks/{task_id}`: `title`; `metadata` (whole-map replace); `metadata_patch` `{set: {...}, unset:
[...]}` (unknown unset keys ignored); `model` (next turn runs it; the turn in progress keeps its model);
`clear_model: true` (back to the agent's default; cannot combine with `model`). Under strict admission,
`model`, `clear_model`, whole-map `metadata`, and patches touching keys starting `brainbase_`, `_` or
`orchestration_` require a person's session or user-wide PAT; task credentials get `403
agent_credential_refused` before anything is saved, but may still rename and edit ordinary labels, e.g.
`{"metadata_patch":{"set":{"customer":"acme"},"unset":["queue"]}}`. If the strict-admission setting cannot
be read: `503 origin_unavailable`, `Retry-After: 5`.

## 5. Messages and follow-up inputs

Message object: `id`, `task_id`, `role`, `content`, `name`, `tool_calls`, `tool_call_id`, `metadata`,
`created_at`.

`GET /v2/tasks/{task_id}/messages` (and `/v2/threads/{thread_id}/messages`): `limit`; `order` `asc`
(default: oldest `limit`, oldest first) or `desc` (newest `limit`, newest first — how a reader shows the end
of a long conversation). A metadata-filtered listing is newest first either way.

`POST /v2/tasks/{task_id}/messages` (and the thread route): `messages[]` required; `run` boolean, default
`true` (posting answers the agent and resumes the turn, so a `need_more_info` thread settles fresh); `false`
appends context without a run. Response `{"messages": [...], "run_started": bool}`. `Idempotency-Key`
covers one plain-text user message with no `model_options`; any other body → `422
message_idempotency_shape_unsupported`; same key with same content, metadata and run → replay with
`Idempotency-Replayed: true`; changed → `409 idempotency_key_reused`; `409 idempotency_request_in_progress`
+ `Retry-After: 1`. The POST can briefly return `409` while the previous turn settles: retry it. After
acceptance the thread can still report the previous terminal status for a moment, so wait for the transcript
to grow and the status to be terminal.

`POST /v2/tasks/{task_id}/inputs` — durable follow-up with steering. When the active harness supports native
steering the input can join the current turn; otherwise it queues and an idle task starts a new turn.

| Field | Notes |
| --- | --- |
| `input_id` | uuid, required; new for each deliberate follow-up, identical on retries. |
| `messages[]` | required; each needs `content`; `role` must be `user` when supplied. |
| `expected_generation` | from `GET /v2/tasks/{task_id}/inputs`; fences against a concurrent Stop; omitted = current generation at admission. Does not change request identity. |
| `require_host_turn_id` | boolean; does not change request identity. |
| `model_options` | provider-neutral per-turn controls: `thinking` (object), `effort` (string), `reasoning` (object), `fast` (boolean). |

Response `201` = durable receipt, not delivery:
`{"input": {id, task_id, message_ids[], status, turn_id, generation, sequence, reason, created_at,
updated_at, messages[]}, "messages": [...], "run_started": bool, "accepted_turn_id": uuid|null}`. Input
`status`: `queued` (waiting), `submitted` (assigned to a turn that may still be starting; not proof the
runtime consumed it), `unconfirmed` (native delivery may have occurred; keep the receipt, a new id can
duplicate the instruction). Replies arrive in the transcript and event stream. Read inputs with
`GET /v2/tasks/{task_id}/inputs` (`limit`, `before_sequence`, `include_messages`; returns `{"inputs": [...],
"generation"}`) and `GET /v2/tasks/{task_id}/inputs/{input_id}`. Receipts stay readable and replayable when
admission is disabled; disabling admission does not disable Stop. A Linear-created task continued over the
API does not post the prompt or reply back to Linear.

Example:

```bash
curl "https://api.brainbaselabs.com/v2/tasks/$THREAD_ID/inputs" \
  -H "Authorization: Bearer $BRAINBASE_API_KEY" -H "Content-Type: application/json" \
  -d '{"input_id": "11111111-1111-4111-8111-111111111111",
       "messages": [{"role": "user", "content": "Now name three popular MCP servers, one line each."}],
       "expected_generation": 0}'
```

Follow-up errors (none carry `Retry-After` unless stated):

| Response | Meaning / action |
| --- | --- |
| `409 input_id_reused` | `input_id` belongs to different messages or `model_options`; retry the original payload or use a new id for a different request. |
| `400 invalid_input_generation` | `expected_generation` is ahead of the stream; nothing admitted; read the current generation, retry same id and payload. |
| `409 task_unavailable` | Task cannot accept instructions; resolve its state, do not retry automatically. |
| `409 task_recovery_required` | Quarantined or retired; messages retained; operator recovery; continue in `detail.replacement_task_id` when non-null. |
| `409` string `task is busy (active run lease); wait for it to finish` | Expired lease inside the 180-second adoption window after a control-plane restart; nothing admitted; retry the same id, payload and generation after the earlier turn is adopted or settles. Native steering still accepted while a lease is live; after 180 s normal admission resumes and a still-running sandbox can reject the turn naming the earlier `active_run_id`. |
| `503 task_inputs_disabled` | Follow-up admission disabled; retry same id and payload later. |
| `503 task_input_recovery_unavailable` | Durable run recovery unavailable; retry later. |
| `503 <provider>_unavailable` (e.g. `aws_microvm_unavailable`) | Fresh sandbox provisioning disabled or provider access unverified; read `detail.message`, retry later. |
| `503` string detail | Authorization temporarily unavailable; `Retry-After: 2`; keep the same `input_id`. |
| `422` array detail | Request validation; fix fields. |
| `422` string detail | Unsupported model, runtime or content requirement. |
| `422 runner_turn_id_unsupported` | Runner cannot satisfy `require_host_turn_id`. |
| `422 missing_required_secret` | Add an agent secret from each group in `detail.missing`, then retry. |

## 6. Interrupt (Stop)

`POST /v2/tasks/{task_id}/interrupt` body `{"expected_generation": n}` → the task object plus `generation`
and `cancelled_inputs[]` (input objects with `reason`). `POST /v2/tasks/{task_id}/turns/{turn_id}/interrupt`
same body → `{"turn_id", "cancelled", "generation", "cancelled_inputs"}`; turn-scoped Stop requires
host-turn support. `POST /v2/threads/{thread_id}/interrupt` returns the thread.

Rules: read `generation` from `GET /v2/tasks/{task_id}/inputs`; keep the same `expected_generation` and
endpoint on every retry, including after a lost HTTP response, so a retry never targets newer work.
Omitting it selects the current generation each time and can hit newer work. Cancellation may already have
happened before an error; queued inputs can be cancelled even when native cancellation is unconfirmed, and
an error does not roll that back. Task-wide Stop cancels an older runner only via its recorded physical
run; retries never fall back to cancelling every active run.

| Response | Meaning / action |
| --- | --- |
| `400 invalid_input_generation` | Generation ahead of the stream; no cancellation initiated; read it again. |
| `409 turn_interrupt_pending` | Original execution still starting or finalizing; retry same request after `Retry-After: 1`. |
| `409 task_recovery_required` | Quarantined/retired; operator recovery; `detail.replacement_task_id`. |
| `503 turn_interrupt_unconfirmed` | Cancellation or its durable acknowledgement unconfirmed (DB failure); not a success; retry after `Retry-After: 1`. |
| `503 turn_interrupt_recovery_required` | Runtime needs operator recovery (authority expired or lost); wait, do not auto-retry. |
| `422 turn_interrupt_unsupported` | Runtime cannot safely interrupt; do not auto-retry or cancel a newer execution; retry manually once the original finishes, else operator recovery or a compatible runtime. |
| `422` array detail | Validation. |
| `503` string detail | Authorization temporarily unavailable; `Retry-After: 2`. |

## 7. Events: list and stream

Event object: `id`, `received_at`, `event_id`, `ts`, `started_at`, `ended_at`, `type`, `tool_id`,
`subagent_id`, `session_id`, `turn_id`, `agent_id`, `task_id`, `thread_id`, `team_id`, `group_id`,
`orchestration_id`, `data`.

`GET /v2/tasks/{task_id}/events` (and `/v2/threads/{thread_id}/events`): one page per call, `items[]`.
Query: `limit`, `desc`, `turn_id`, `order_by_received` (order by `received_at` then `id`; required for the
arrival cursor), `after_received_at` + `after_id` (the last event of the previous page; pass with
`order_by_received=true` and `desc=false`). To read a whole transcript: page in arrival order until a page
is shorter than `limit`; a `ts` cursor can skip events written at turn end with an earlier `ts`. Sort by `ts`
for display.

`GET /v2/tasks/{task_id}/events/stream` (and the thread route): SSE until the client disconnects. `backfill=N`
sends the oldest N events in arrival order, then continues live; on a long task a reconnect without a cursor
starts from the beginning. Send `Last-Event-ID` (EventSource does this automatically) to resume strictly
after the last event: backfill skipped, nothing duplicated or missed. Events arrive in arrival order, not
`ts` order.

```text
event: assistant.message.chunk
data: {"type":"assistant.message.chunk","thread_id":"…","data":{"content":[{"type":"text","content":"…"}]}}

event: idle
data: {"type":"idle","thread_id":"…","data":{"status":"success","summary":"…"}}
```

## 8. Agents, pins, versions and inheritance

`POST /v2/agents`:

| Field | Notes |
| --- | --- |
| `title` | required. |
| `instructions`, `description` | strings. |
| `runtime_kind` | harness value (same enum as `harness`). |
| `machine_kind` | provider; omit for the deployment default; fixed at creation. |
| `mcp_servers[]`, `skills[]`, `secrets` | as in the inline spec; secrets are "the same store the CLI syncs via `brainbase agent pull`". |
| `metadata` | string→string; filter list with `?metadata=key:value`. |
| `default_model` | stored in `kafka_profiles.preferences.default_model`; overrides a template's `source_model`. `default_model: null` creates an agent with no model of its own (`/docs/models`). |
| `shared_folder_enabled` | mount the agent's shared folder at `/workspace/Shared` in future cloud-runtime sandboxes. |
| `machine_size` | `xs`–`xl` rules as for tasks. |
| `group_id` | also grants the agent to that group; caller must be a member. |
| `template_slug` | `"creator/slug"`; the template supplies instructions, runtime, model, `mcp_servers`, `skills`; caller supplies `title`, `group_id`, secret values; explicit fields override; this is the only instantiate path. |
| `entrypoint` | bash run after env vars load and `brainbase agent pull` completes, before the runner; sandbox user, `cwd=/workspace`; output to `/workspace/.brainbase/entrypoint.log`; failures logged, agent still starts. |

Agent object: `id`, `owner_user_id`, `title`, `instructions`, `runtime_kind`, `machine_kind`, `machine_size`,
`default_model`, `accelerator` `{kind: "gpu", count, models[]}`, `mcp_servers[]`, `skills[]`, `secrets`
(plaintext), `metadata`, `shared_folder_enabled`, `entrypoint`, `pinned_version_id`, `pinned_at`,
`pinned_by`, `template_warnings[]`, `created_at`.

`GET /v2/agents` (`limit`, `group_id`, `metadata[]`) · `GET /v2/agents/{agent_id}` ·
`DELETE /v2/agents/{agent_id}` (deletes its tasks too) · `PATCH /v2/agents/{agent_id}`: `title`,
`instructions`, `runtime_kind` (future tasks only; existing tasks keep theirs), `mcp_servers`,
`expected_revision` (as `GET /v2/cli/agents/{agent_id}/revision` returns it; `409 revision_conflict` with
`detail.expected`/`detail.current` if the agent moved), `skills`, `secrets`, `metadata`, `default_model`,
`shared_folder_enabled`, `machine_size`, `entrypoint`. `409` with a string detail: `mcp_servers` omitted a
server with a connected OAuth session; resend it or pass `expected_revision` to confirm removal.
`machine_kind` cannot be changed by update.

Pins: `PUT /v2/agents/{agent_id}/pin` `{"version_id": uuid, "expected_version_id": uuid|null?}` — new tasks
run that version until the pin moves; with `expected_version_id` the pin moves only if it is still that
(`409 pin_changed`); omit the field (do not send null) to move it regardless; 404 before any write for a
version the caller cannot read. `DELETE /v2/agents/{agent_id}/pin?expected_version_id=` clears it (`409
pin_changed` if another version is pinned, `409 not_pinned` if none). Versions listing (changelog
2026-10-30): `GET /v2/agents/{agent_id}/versions`, `GET /v2/agents/{agent_id}/versions/{version_id}`, plus a
`/diff` route per version; MCP clients have matching tools. Not in the docs snapshot; fetch the live reference.

Inheritance (orchestration members): `GET /v2/agents/{agent_id}/mcp-servers/inherited` →
`{enabled, source, ambiguous, servers[{id, name, url, command, args, is_enabled, icon, icon_color,
env_keys, headers_keys, env_refs, headers_refs, status: "inherited", …}], degraded, warnings[]}` (session or
user-scoped PAT; resource-scoped PATs and inaccessible agents get 404). `GET /v2/agents/{agent_id}/secrets/inherited`
→ `{enabled, inherited[{key, orchestration_id, orchestration_name}], conflicts[{key, orchestration_ids,
orchestration_names}]}` — names only, same manage authority as the plaintext `secrets` field.

## 9. Templates

`POST /v2/agents/templates`: `team_id`, `creator`, `slug`, `name` required; `description`,
`source_runtime`, `source_model`, `instructions`, `mcp_servers[]`, `skills[]`, `secrets[]` as
`{name, description, required}` placeholders (values are supplied at instantiate). Object adds `id`,
`created_by`, `created_at`, `updated_at`. `GET /v2/agents/templates?team_id=` (required; `limit`) ·
`GET|PATCH|DELETE /v2/agents/templates/{creator}/{slug}` (PATCH takes every field except the identifiers).
Instantiate with `POST /v2/agents` + `template_slug`. Under strict admission template writes need a person's
session or user-wide PAT. CLI equivalents (`brainbase template …`) are in `brainbase-cli`; orchestration
templates are `brainbase-orchestration`.

## 10. Alerts

Signed webhook deliveries for platform events. `POST /v2/alerts`: `scope_level` (`team` | `group` |
`orchestration` | `agent` | `thread`), `scope_id`, `event_type` (string; the docs do not enumerate values),
`action_type` (`webhook`), `webhook: {url}` (required), `name`, `enabled`, `group_id`. The response includes
`signing_secret` in plaintext this one time only, plus `webhook.secret_prefix`. `GET /v2/alerts?group_id=`
(required; `limit`) · `GET|PATCH|DELETE /v2/alerts/{alert_id}` (PATCH: `name`, `enabled`, `webhook.url`) ·
`GET /v2/alerts/{alert_id}/fires` (`limit`; most recent first; items: `id`, `created_at`, `alert_id`,
`event_id`, `event_type`, `event_ts`, `team_id`, `group_id`, `orchestration_id`, `agent_id`, `task_id`,
`thread_id`, `status` e.g. `pending`, `attempts`, `last_attempt_at`, `next_attempt_at`, `response_code`,
`response_body`, `error`, `request_body`) · `POST /v2/alerts/{alert_id}/rotate-secret` (old signatures stop
validating immediately; coordinate the receiver first). Agent-declared task failures do not raise alerts;
runtime failures remain alertable. Strict admission: alert writes and secret rotation need a person's
session or user-wide PAT (`403 agent_credential_refused`).

## 11. Scope and meta

`GET /v2/teams` → `{items: [{id, name, slug, avatar_url}]}`. `GET /v2/groups?team_id=` (required) → groups
the caller can act in: every group for org owners/admins, membership groups for everyone else; `{id,
team_id, name, description, icon, icon_color}`. `GET /healthz` → map of strings.
`GET /.well-known/oauth-protected-resource` (section 1). Vocabulary note: the console calls groups
"Projects"; the CLI docs call the unit inside an organization a "team" (`brainbase team list`,
`--team`). Which API object maps to which console noun is not stated in one place; see `brainbase-permissions`.

## 12. Sandbox providers in the agent spec (summary)

| Provider | Sizes | Runtimes | Shared folders | Notes |
| --- | --- | --- | --- | --- |
| `daytona` | S, M, L | All | Yes | The default. |
| `e2b` | L | All | No |  |
| `cloudflare` | S, M, L | Coding agents only | Yes | Sleeps when idle and resumes with its workspace intact. |
| `modal` | L | Coding agents only | No | Short-lived: 24 hours maximum; a task does not resume afterwards. |
| `bbsandbox` | L | Coding agents only | No | Self-hosted. |
| `aws_microvm` | L | Coding agents only | No |  |

"Coding agents only" = `claude_code`, `codex`, `qwen`, `opencode`, `cursor`, `factory`, `qoder`; those
providers refuse `kafka_cloud` at agent create. `GET /v2/machines/capabilities` reports sizes, shared-folder
support and accelerators but not runtimes, and is not an availability check (`503` switched off, `403`
outside rollout). Machines, files, previews and pricing: `brainbase-sandboxes`.

## 13. Walkthrough: fix a failing test suite (`/api/usecases/fix-failing-tests`)

1. Seed via `entrypoint` (bash with `set -e`, writes `/workspace/roman.py` and `test_roman.py`, `python3 -m
   pip install -q pytest`), then `POST /v2/threads` with `agent: {harness: "claude_code", model:
   "claude-sonnet-5", instructions, entrypoint}` and `input`. Python: `requests.post(f"{BASE}/v2/threads",
   headers=HEADERS, json=…)`, `thread_id = resp.json()["thread_id"]`.
2. Stream `GET /v2/threads/{thread_id}/events/stream?backfill=100` with `stream=True`; parse `data:` lines;
   print `tool_call.start` names and `assistant.message` text; return at `idle`.
3. Follow-up on the same warm sandbox: `POST /v2/threads/{thread_id}/messages` `{"messages": [{"role":
   "user", "content": …}], "run": true}`; retry on `409`; then wait until the message count grew by more
   than one and `status` is terminal.
4. Clean up: read `machine_id` from the thread and `DELETE /v2/machines/{machine_id}` (not `sandbox_id`);
   skip when `machine_id` is null. Sibling use cases: `/api/usecases/live-preview`
   (`brainbase-sandboxes`), `/api/usecases/harness-bakeoff` (`brainbase-benchmarks`).

## 14. Error code index

| Code | Where | Meaning |
| --- | --- | --- |
| `idempotency_key_reused` 409 | threads, tasks, message posts | Same `Idempotency-Key`, different request. |
| `idempotency_request_in_progress` 409 | same | Original still processing; `Retry-After: 1`. |
| `message_idempotency_shape_unsupported` 422 | message posts | Key only covers one plain-text user message without `model_options`. |
| `input_id_reused` 409 | inputs | Id bound to other messages/options. |
| `invalid_input_generation` 400 | inputs, interrupt | `expected_generation` ahead of the stream. |
| `task_unavailable` 409 | inputs | Task cannot accept instructions. |
| `task_recovery_required` 409 | inputs, interrupt | Quarantined/retired; `detail.replacement_task_id`. |
| `turn_interrupt_pending` 409 | interrupt | Starting/finalizing; `Retry-After: 1`. |
| `turn_interrupt_unconfirmed` 503 | interrupt | Not a success; `Retry-After: 1`. |
| `turn_interrupt_recovery_required` 503 | interrupt | Operator recovery; no auto-retry. |
| `turn_interrupt_unsupported` 422 | interrupt | Runtime cannot safely interrupt. |
| `task_inputs_disabled` 503 | inputs | Admission disabled. |
| `task_input_recovery_unavailable` 503 | inputs | Durable recovery unavailable. |
| `<provider>_unavailable` 503 | inputs, agent create | e.g. `aws_microvm_unavailable`. |
| `runner_turn_id_unsupported` 422 | inputs | `require_host_turn_id` unsatisfiable. |
| `missing_required_secret` 422 | inputs, thread/task start | Vendor key absent; `detail.missing`. |
| `revision_conflict` 409 | agent update | `detail.expected` / `detail.current`. |
| `pin_changed` / `not_pinned` 409 | pin / unpin | Pin moved or absent versus `expected_version_id`. |
| `pinned_harness_unavailable` 422 | task start | Pinned version's harness is legacy `kafka`. |
| `agent_credential_refused` 403 | task PATCH, alerts, templates (strict admission) | Person credential required. |
| `origin_unavailable` 503 | strict-admission reads | Setting unreadable; `Retry-After: 5`. |
| `credential_scope_denied` 403 | `/v2/cli` listings | Resource-scoped credential on a team/org listing. |
| `cross_context` / `not_descendant` 403 | runtime event writes | Sandbox credential writing outside its context. |
| 401 `missing bearer token` / `invalid or expired PAT` | any | No or bad token. |
| 403 `PAT lacks required scope: publish` | writes | Read-only PAT. |
