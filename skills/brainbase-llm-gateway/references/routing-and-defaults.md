# Routing and defaults: how a model is chosen, set and switched

Source: https://docs.brainbaselabs.com/docs/models (Default model, Auto), https://docs.brainbaselabs.com/api (agent spec), https://docs.brainbaselabs.com/api/threads/create-thread, /api/agents/create-agent, /api/agents/update-agent, /api/tasks/create-task, /api/tasks/update-task, https://docs.brainbaselabs.com/cli/commands/agent (create, pull, push, status, Runtime configuration, versions), /cli/commands/task (create, get, update), /cli/reference/agent-manifest (`default_model`), /cli/concepts/agents, /cli/reference/environment (Host resolution), /cli/reference/control-plane-api, https://docs.brainbaselabs.com/docs/monitoring/tasks (Execution setting credentials), /docs/monitoring/benchmarks, changelog 2026-10-27, 2026-10-30, 2026-07-09, 2026-08-03.
Snapshot: 2026-11-03

## Contents

1. Default model per harness
2. `GET /v2/models`
3. Auto routing
4. Where a model can be set (precedence by object)
5. Agent: console, manifest and CLI, API
6. Thread spec and task creation
7. Switching a task's model
8. Credentials for task model updates
9. Version pins and benchmarks

## 1. Default model per harness

Docs (docs/models, snapshot 2026-11-03): an agent created without a model, from the console, the CLI, or `POST /v2/agents`, gets the platform default for its harness: Claude Opus 5 (`claude-opus-5`) on Claude Code and GPT-5.6 Sol (`gpt-5.6-sol`) on the other harnesses. Cursor, Factory and Qoder choose their own model, so they have no default, and a task on one of them cannot be given a model. A task created with no model on an agent that has none records the same default, so the task always shows the model it runs.

Changelog, later than the docs text:

- 2026-10-27 "New Agents Start on GPT-6 Sol, and Model Pickers Show Current Models": new agents and tasks that don't name a model start on GPT-6 Sol, or Claude Opus 5.5 on Claude Code agents; the same default applies in the console, `brainbase agent create` and the API; `GET /v2/models` lists the default for each harness; agents that already have a model keep it.
- 2026-10-30 "New Accounts Get $25 in Free Credits Automatically": on accounts running on free signup credits, new agents and tasks default to a model the credits can run (open models in the web app) until the first top-up.
- 2026-07-09: GPT-5.6 Sol became the default for new agents and flows at that time.

Treat the docs page as stale on this point and read the default from `GET /v2/models` or the result card `brainbase agent create` prints.

`default_model: null`: send it on `POST /v2/agents` to create an agent with no model of its own. In `brainbase.agent.yaml`, `default_model: null` explicitly clears the override on push; omitting the field leaves the cloud value unmanaged.

## 2. `GET /v2/models`

Lists the available model IDs and the default for each harness. `auto` and `auto:open` are not listed (they are routing modes). Cursor, Factory and Qoder have no default. The docs mirror has no separate reference page for this endpoint beyond the sentence on docs/models; call it with the user's API key (`Authorization: Bearer $BRAINBASE_API_KEY`) against `https://api.brainbaselabs.com/v2/models` and treat the response as the authority on availability for that workspace.

## 3. Auto routing

| ID | Behaviour |
| --- | --- |
| `auto` | Auto (All): picks a model for the task from its first message and keeps it for the rest of the task. Does not expose which model ran (changelog 2026-08-03). |
| `auto:open` | Auto (Open): same, restricted to open-weight models. |

Rules: Kafka and OpenCode only; any other harness returns `400` when an agent or task selects it. `brainbase task update --model auto` on another harness is refused with the server's reason. If model resolution cannot complete, the run fails visibly rather than silently continuing on another model. When Auto picks Kimi K3 and a Bring Your Own Bedrock credential applies, the call runs on your AWS account. The AWS Marketplace appliance offers Auto (All) only, because its catalog is entirely closed-weight.

## 4. Where a model can be set

| Object | Field | Effect |
| --- | --- | --- |
| Agent | `default_model` (console picker, manifest, `POST`/`PATCH /v2/agents`) | Model for the agent's tasks unless a task sets its own. Stored, per the API docs, in `kafka_profiles.preferences.default_model`. Overrides a template's `source_model` when both are set. |
| Thread spec | `agent.model` on `POST /v2/threads` | Model for the inline agent; omit to use the harness default. |
| Task | `default_model` on `POST /v2/tasks`; `brainbase task create --model <id>` | Model override for this task only. |
| Running task | `model` / `clear_model` on `PATCH /v2/tasks/{task_id}`; `brainbase task update --model` / `--clear-model` | Changes the model from the next turn. |

`brainbase task get` prints `model` as the ID set on the task, or `agent default` when the task follows its agent's default. The task record (`GET /v2/tasks/{task_id}`, `POST /v2/tasks`, `PATCH /v2/tasks/{task_id}`) carries `model`. Assistant messages in a thread carry `metadata.model` (API overview example: `{"model": "claude-sonnet-5"}`).

## 5. Agent: console, manifest and CLI, API

Console: the agent's model picker shows a short Featured list and a **More models** menu; models marked unavailable in the workspace cannot be selected. Any member of the agent's team can change the model (changelog 2026-07-18). Fetch the live docs for click paths.

Manifest (`brainbase.agent.yaml`, top level):

```yaml
schema: 1
harness: codex
machine_kind: daytona
default_model: gpt-5.6-terra
agent:
  name: Repo Assistant
```

- `default_model` (string | null, optional): omit to leave the cloud value unmanaged; set a model ID to create or update the override; `null` to explicitly clear it. IDs may contain letters, digits, `.`, `_`, `-`, `:` and `/`, up to 128 characters.
- `brainbase agent create`: applies top-level `machine_kind` and `default_model` during creation and verifies the control plane applied both; on mismatch the new `id` is still written (to prevent a duplicate retry) and the command exits non-zero with recovery guidance. With no `default_model`, the control plane gives the platform default for the harness (the same the console picks) and the result card shows it; Cursor, Factory and Qoder agents get none. The manifest is not rewritten, so `default_model` stays unmanaged until you add it. `--harness <id>` picks the harness.
- `brainbase agent push`: sends a `default_model` edit; `default_model: null` clears the override; `--force` keeps the local side of a two-sided model conflict. Push stops if the active control plane does not expose an authored runtime field.
- `brainbase agent pull`: materializes the cloud's non-null `default_model`; an authored `null` stays explicit when the cloud model is unset; older control planes that omit the field do not erase authored values; refuses to overwrite a locally edited runtime config without `--force`.
- `brainbase agent status`: distinguishes local or cloud `default_model` drift and a two-sided model conflict, plus blocked and unsupported states; `--json` for pipelines.
- `brainbase agent list`: each entry shows harness, sandbox provider and `default_model` where set (example line: `claude-code · daytona · claude-sonnet-5`).
- Control plane: declarative `machine_kind` / `default_model` writes require the MAS `/v2/cli` control plane (`BRAINBASE_CONTROL_PLANE_URL`, default `https://api.brainbaselabs.com/v2/cli`). With only legacy `BRAINBASE_API_URL` set, the CLI routes to `<value>/api/cli` and refuses these writes before sending. The CLI control-plane `PUT /agents/{agent_id}` body accepts `default_model` among `name`, `tagline`, `entrypoint`, `memory_enabled`, `browser_enabled`.

API:

```bash
# create with a model (or "default_model": null for no model of its own)
curl -X POST https://api.brainbaselabs.com/v2/agents \
  -H "Authorization: Bearer $BRAINBASE_API_KEY" -H "Content-Type: application/json" \
  -d '{"title": "Repo Assistant", "runtime_kind": "codex", "default_model": "gpt-6-sol"}'

# change it later; omitted fields are left unchanged
curl -X PATCH https://api.brainbaselabs.com/v2/agents/$AGENT_ID \
  -H "Authorization: Bearer $BRAINBASE_API_KEY" -H "Content-Type: application/json" \
  -d '{"default_model": "claude-opus-5-5"}'
```

`runtime_kind` values: `claude_code | codex | cursor | factory | kafka_cloud | opencode | qoder | qwen`. `PATCH /v2/agents/{agent_id}` changes the harness for future tasks only; existing tasks keep their runtime. `template_slug` on create supplies instructions, runtime, model, MCP servers and skills; fields set explicitly on the body override the template. `GET /v2/agents/{agent_id}` and `GET /v2/agents` return `default_model`. A `409` with `detail.code=revision_conflict` means the agent changed since `expected_revision`; read it again and retry.

## 6. Thread spec and task creation

```bash
curl -X POST https://api.brainbaselabs.com/v2/threads \
  -H "Authorization: Bearer $BRAINBASE_API_KEY" -H "Content-Type: application/json" \
  -d '{"agent": {"harness": "claude_code", "instructions": "You are a concise research assistant.", "model": "claude-sonnet-5"},
       "input": "In two sentences, what is MCP?"}'
```

`agent.harness` is the public name for `runtime_kind`; `agent.model` is optional ("Model the harness runs, e.g. `claude-sonnet-5` or `claude-opus-4-8`. Omit to use the harness default."). Change only `harness` to run the same spec on another harness; the model carries over unchanged, subject to the per-harness rules in `model-catalog.md`. Pass `agent_id` instead of `agent` to use an existing agent.

```bash
curl -X POST https://api.brainbaselabs.com/v2/tasks \
  -H "Authorization: Bearer $BRAINBASE_API_KEY" -H "Content-Type: application/json" \
  -d '{"agent_id": "'"$AGENT_ID"'", "default_model": "gpt-6-luna", "initial_messages": [{"role": "user", "content": "triage the open PRs"}], "auto_run": true}'

brainbase task create --message "triage the open PRs" --model gpt-6-luna
brainbase task create --message "replay yesterday's ticket" --version v11   # runs that version's default model
```

Harness bake-off recipe (api/usecases/harness-bakeoff): one `POST /v2/threads` per harness with `{"agent": {"harness": h, "model": m}}`, `None` for the harness default; the docs' example matrix is `claude_code: claude-sonnet-5`, `codex: None`, `opencode: zai-org/GLM-5.2`, `qwen: claude-sonnet-5`; "not every harness runs on every provider; an unavailable one shows up as an error row". Files download under `/v2/tasks/{id}/files/download?path=solution.py`; delete machines with `DELETE /v2/machines/{machine_id}` afterwards so idle sandboxes stop spending credits.

## 7. Switching a task's model

`PATCH /v2/tasks/{task_id}` body fields:

| Field | Meaning |
| --- | --- |
| `model` (string) | Model the task's next turn runs on, as a catalog model ID. The turn in progress keeps its model. Omit or `null` to leave unchanged. |
| `clear_model` (boolean) | `true` returns the task to its agent's default model from its next turn. Cannot be combined with `model`. |
| `title`, `metadata`, `metadata_patch.set`, `metadata_patch.unset` | Unrelated label edits, same endpoint. |

CLI (`brainbase task update <task-id>`, works on a running task, never prompts, at least one change flag required):

| Flag | Meaning |
| --- | --- |
| `--model <id>` | Switch the model the task's next turn runs on. Trimmed; a blank or malformed ID is refused before any request. |
| `--clear-model` | Return the task to its agent's default model from its next turn. Not with `--model`. |
| `--json` | Print the full task record (as `task get --json` returns under `task`) and nothing else. |

Refusals: the server decides whether a model fits the task. An unknown model ID, `auto` on a harness other than Kafka or OpenCode, or any model on a Cursor, Factory or Qoder task is refused with the server's reason; exit 1 with the reason on stderr. The summary shows the task's model, or `agent default` when none is set on the task. Changelog 2026-10-30 ("Developer Updates") introduced `task update --model` / `--clear-model` and the API's `model`, `clear_model`, `metadata_patch`.

In chat, changing the model mid-conversation saves the choice on the conversation and applies on the next turn (changelog 2026-07-03); the composer can set the model for a follow-up message (2026-08-21).

## 8. Credentials for task model updates

- CLI: updating a task needs edit access to its agent; with a PAT that means the `publish` scope (`brainbase token create` defaults to `read,publish`).
- API, strict admission (docs/monitoring/tasks, "Execution setting credentials"): when strict admission is enabled, changing a task's model or replacing its metadata through `PATCH /v2/tasks/{task_id}` requires a person's session or user-wide PAT with access to manage the task. Sandbox PATs, other resource-scoped PATs and task keys receive `403` with `detail.code: agent_credential_refused` before any part of the update is saved. This covers `clear_model` and metadata patches that set or remove keys starting with `brainbase_`, `_` or `orchestration_`. Task credentials can still rename a task and edit ordinary labels with `metadata_patch`; whole-map `metadata` replacement needs the person credential.
- Strict admission requires both `INTEGRATION_CONTROL_ENABLED=true` and `cutover:strict_admission=true` and is off by default. If the master switch is on but the setting cannot be read, protected updates return `503` with `detail.code: origin_unavailable` and `Retry-After: 5`.
- Do not put a person's credential in a sandbox; make configuration changes from the console or a trusted controller.

## 9. Version pins and benchmarks

- A pin (`brainbase agent versions pin <version>`, `POST /v2/agents/{agent_id}/pin`-style endpoints in the agents API) freezes the version's instructions, entrypoint, installed skills, tools, playbooks, harness and default model; secrets, credentials, machine settings, permission rules, connections and skill contents stay current. Tasks already running keep the version they started with. `brainbase task create --version <v>` freezes the same set for one task and overrides a pin.
- After `agent push` to a pinned agent, new tasks keep the pinned model until you move or remove the pin.
- Benchmarks (beta): each variant's model and each model judge's model must be an available model ID; a mistyped one stops the review. Agents on Cursor, Factory or Qoder cannot be benchmarked because the run could not record which model each case ran on. Evals: `judge_model` defaults to `claude-sonnet-4-6` and must be a model the configured proxy accepts on `/v1/chat/completions`; details in `brainbase-evals` and `brainbase-benchmarks`.
