# Bring your own vendor key: Cursor, Factory and Qoder

Source: https://docs.brainbaselabs.com/docs/harnesses (Cursor, Factory, and Qoder keys), https://docs.brainbaselabs.com/docs/models (Default model), https://docs.brainbaselabs.com/docs/agent/secrets, https://docs.brainbaselabs.com/cli/commands/agent (create), /cli/reference/agent-manifest (`default_model`), /cli/commands/task (update), https://docs.brainbaselabs.com/docs/monitoring/benchmarks, changelog 2026-07-09 "Bring Your Own Key For Cursor, Factory, and Qoder Agents", 2026-07-15 "Choose Your Coding Agent Runtime", 2026-10-30 "Developer Updates".
Snapshot: 2026-11-03

## How these harnesses differ

Cursor (`cursor`), Factory Droid (`factory`) and Qoder (`qoder`) run on your own vendor account. The vendor bills model usage on that account, and the harness picks its own model, so these agents and tasks take no model:

- `GET /v2/models` lists no default for them.
- `brainbase agent create` gives them no `default_model` even when the manifest omits it; the manifest reference says they "start with none".
- `brainbase task update --model <id>` on a Cursor/Factory/Qoder task is refused with the server's reason.
- Benchmarks refuse these agents up front, because a run could not record which model each case ran on.
- Hosted integrations (the `brainbase-apps` managed path) are deferred for them; see `brainbase-tools`.

## Secret names

Add the key to the agent as a secret before starting a task. A secret set on the agent's orchestration also counts.

| Harness | Accepted secret names |
| --- | --- |
| Cursor | `CURSOR_API_KEY` or `CURSOR_AUTH_TOKEN` |
| Factory | `FACTORY_API_KEY` |
| Qoder | `QODER_PERSONAL_ACCESS_TOKEN` or `BRAINBASE_QODER_PAT` |

Changelog 2026-07-09 labels the console fields `CURSOR_API_KEY`, `FACTORY_API_KEY` and `QODER_PERSONAL_ACCESS_TOKEN`; the harness docs add `CURSOR_AUTH_TOKEN` and `BRAINBASE_QODER_PAT` as alternatives. Secret keys must match `^[A-Z][A-Z0-9_]*$`.

## Where to set the key

| Path | How |
| --- | --- |
| Console, new-agent form or runtime switcher | Picking Cursor, Factory or Qoder exposes an inline API key field with a "✓ already set" note when the key is saved (changelog 2026-07-09). |
| Console, agent Secrets page | Open the agent's Secrets area, **Add secret**, enter the key name and value, save. Saved values are never shown again. |
| Console, chat or /dev composer | The composer checks for the required key before starting a run; if missing, a key dialog opens, saves the typed key and resumes the pending message. If the key is removed mid-thread, the next send reopens the dialog with the draft preserved. |
| CLI | Put `CURSOR_API_KEY=...` in the gitignored `.brainbase/secrets.env`, then `brainbase agent push` (secrets sync to the cloud). Never in `brainbase.agent.yaml`. |
| API | `secrets` object on `POST /v2/agents` or `PATCH /v2/agents/{agent_id}`; `agent.secrets` inline on `POST /v2/threads`. |
| Orchestration | An orchestration-level secret is inherited by member agents; an agent-level secret of the same name overrides it (`brainbase-orchestration`). |

Keep the value out of chat, manifests, playbooks, instructions and memory. The model never needs to see it; it only needs to confirm the name is set.

## Error when the key is missing

A request that would start a run without the key returns `422` with `detail.code` set to `missing_required_secret`; `detail.missing` lists the accepted secret names. In the console the specific missing key is surfaced back to the composer instead of a generic failure (this also fixed "silent no-op loops for non-owner group members whose secret writes were being blocked", changelog 2026-07-09).

Model-provider overrides such as `ANTHROPIC_BASE_URL` and `OPENAI_BASE_URL` are not reserved secret names, but the docs give no Cursor/Factory/Qoder behaviour for them; the only documented model-related secrets for these harnesses are the vendor keys above.

## Runtime switching

The coding runtime (Claude Code, Codex, Cursor, Factory, Qoder, OpenCode, Qwen) can be chosen when creating an agent and changed later; "bring-your-own-key settings and model options follow the runtime you select" (changelog 2026-07-15). Over the API, `PATCH /v2/agents/{agent_id}` with `runtime_kind` changes the harness for future tasks; existing tasks keep their runtime. Switching an agent from Cursor/Factory/Qoder to another harness makes it model-bearing again: set `default_model` or accept the platform default.
