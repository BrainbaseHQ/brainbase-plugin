# Secrets and credential handling

Source: docs.brainbaselabs.com/docs/agent/secrets, /docs/secrets-at-brainbase, /docs/orchestrations/secrets, /docs/agent/scheduled-agents (Store secrets), /docs/harnesses (Cursor, Factory, and Qoder keys), /docs/bring-your-own-bedrock (Where to set it, Credentials), /docs/agent/tools (Remote MCP destinations, inherited servers), /docs/monitoring/benchmarks (Configure the environment), /cli/reference/environment (Authentication, Integration credentials, Built-in MCP overrides), /cli/reference/files, /cli/reference/control-plane-api (Secrets), /cli/reference/agent-manifest (secrets note), /cli/quickstart, /cli/concepts/agents, /api/orchestrations/update-orchestration-secrets, /api/agents/get-agent-inherited-secrets; changelog 2026-07-09, 2026-09-01.
Snapshot: 2026-11-03

## Contents

1. What a secret is and who can set one
2. Key rules and reserved names
3. Storage, injection and safeguards
4. Agent secrets: console, CLI and API
5. Orchestration secrets: inheritance, overrides, who can write
6. Keeping credentials out of argv, prompts and git
7. `BRAINBASE_TOKEN` and the sandbox environment
8. Harness vendor keys (BYOK) and Bedrock credentials (BYOB)
9. Benchmarks and scheduled agents

## 1. What a secret is and who can set one

"Secrets are environment variables and credentials available to an agent at runtime." They belong to a single agent or a single orchestration; "an orchestration's secrets reach only the agents that belong to it", and "nothing is shared implicitly beyond that scope, across teams, or across workspaces". "Only authorized managers can set or read secret values through the API. Everyone else operates without ever receiving them." The changelog of 2026-07-09 describes "non-owner group members whose secret writes were being blocked", so expect a member who is not the agent's owner to be refused on secret writes; the docs do not state the exact rule for agents (for orchestrations, see section 5).

Saved values are never shown again in the app or through the public API; to change one, type a new value over it. Exception: the CLI control plane's `GET /v2/cli/agents/{agent_id}/secrets` returns plaintext, and the public agent object "DOES carry plaintext values" (inherited-secrets endpoint description), which is why both sit behind manage authority.

## 2. Key rules and reserved names

- Keys match `^[A-Z][A-Z0-9_]*$`; duplicates cannot be saved; keys must be valid environment-variable names or the API rejects with `400`.
- Reserved platform names are never injected from secrets even if saved: `BRAINBASE_TOKEN`, `BRAINBASE_TASK_ID`, `BRAINBASE_AGENT_ID`, `BRAINBASE_API_URL`, `BRAINBASE_SHARED_DIR`, `BB_TASK_KEY`, `MEDIA_API_KEY`, `PROXY_BASE_URL`, `IS_SANDBOX`. Orchestration secrets with those names are rejected outright. Use your own prefix and avoid `BRAINBASE_`.
- Not reserved: model-provider overrides such as `ANTHROPIC_BASE_URL` and `OPENAI_BASE_URL`.
- The agent revision hash covers secret key names (adding or removing a key moves it) but not values.

## 3. Storage, injection and safeguards

| Property | What the docs say |
|---|---|
| Storage | Managed, access-controlled secret store, encrypted at rest |
| Delivery | Injected into the run's isolated sandbox as environment variables and nowhere else; each task gets a fresh sandbox; secrets live only for that run |
| Credential used for injection | "a narrow, agent-scoped credential, so a single run can never reach beyond the secrets that agent holds: its own, plus any it inherits from the orchestrations it belongs to" |
| Reading | `process.env.KEY` style, native to the runtime |
| Redaction | Logs, events and transcripts pass through a multi-layer redactor that masks known credential formats and high-entropy values before persistence |
| Third parties | Never sent to outside services |
| Rotation | Applies on the agent's next run; work already running keeps the environment it started with |
| Output risk | "a user could still prompt an agent to print environment variables or write them to a file. Treat secret-bearing agents carefully" |

## 4. Agent secrets: console, CLI and API

Console: agent sidebar **Secrets** area, **Add secret**, key plus value, save. Inherited keys appear with the orchestration they come from and an **Override** action.

CLI: secrets live in `.brainbase/secrets.env` (gitignored, `.env` format). `agent pull` writes it; `agent push` and `brainbase run` read it; `agent env` prints `export` lines; `run` wraps a child command with the file loaded. `agent push` replaces the agent's own secrets from that file and never touches the orchestration's. `brainbase agent status` lists inherited keys by name, flags conflicts and marks overrides; its drift output shows `Secret keys .brainbase/secrets.keys` and `secret_keys_added_since`.

Control plane:

| Endpoint | Scope | Body |
|---|---|---|
| `GET /v2/cli/agents/{agent_id}/secrets` | none | `{"secrets": {"KEY": "value"}}` in plaintext |
| `PUT /v2/cli/agents/{agent_id}/secrets` | publish | Whole-map replace: omitted keys are removed, so read before you write |

Public API: `PATCH /v2/agents/{agent_id}` with `"secrets": {...}` uses whole-replace semantics too ("send the full desired secret object. Omitted keys are removed"). `GET /v2/agents/{agent_id}/secrets/inherited` returns `{ enabled, inherited: [{ key, orchestration_id, orchestration_name }], conflicts: [{ key, orchestration_ids, orchestration_names }] }` and needs the same manage authority as plaintext secrets.

Templates declare secret placeholders only; the caller supplies values at `POST /v2/agents` (`template_slug`).

## 5. Orchestration secrets: inheritance, overrides, who can write

- Defined once on the orchestration's **Secrets** page; injected into every member's sandbox on top of its own secrets; write-only after save; encrypted at rest.
- **Who can write**: "A credential that can publish — a `bbpat_` personal access token with the `publish` scope, an OAuth-connected MCP client, or a signed-in session — plus membership in the orchestration's group. A credential scoped to a single agent or task, such as one planted inside a running sandbox, is always refused, even with `publish`."
- API: `PATCH /v2/orchestrations/{orchestration_id}/secrets` with `set` (object) and `remove` (array); applies `remove` then `set`; incremental because no caller can read values back. Response `{ keys, enabled, updated_at }`. "The gates mirror the agent-level secrets write one for one … with the group gate in front and the kill switch last."
- **Overrides**: an agent's own secret of the same name always wins; the agent's Secrets page offers **Override**.
- **Conflicts**: an agent can belong to one orchestration (`409` on a second); legacy agents in two orchestrations that define the same key with different values get neither injected until an agent-level value is set.
- **Timing**: add, rotate or remove applies the next time the member starts in a fresh sandbox; removing an agent from the orchestration drops inherited keys at its next fresh start.
- **Local runs**: `agent pull` writes only the agent's own secrets; inherited keys are not in `.brainbase/secrets.env` and not available to a local `brainbase run`.
- Inherited MCP servers behave similarly: env and header values are never returned by the API, so an **Override** copy needs them re-entered or referenced as `${NAME}` from orchestration secrets; `brainbase mcp connect` refuses inherited servers.
- Changelog 2026-09-01 "Share Secrets Across an Orchestration's Agents" introduced this.

## 6. Keeping credentials out of argv, prompts and git

- `brainbase.agent.yaml` is committed source: "Never put API keys, tokens, or other secret values in it, including under MCP `env` or `headers`." Reference secrets with placeholders such as `${GITHUB_TOKEN}`.
- The whole `.brainbase/` directory is gitignored (`*` + `!.gitignore`); only the manifest is committed.
- Do not put values in instructions, playbooks, memory, example files, trigger descriptions or `configured_props`. "Store credentials in Secrets, not uploaded files." Exclude credential stores from Shared snapshots.
- Slack and Linear setup read credentials from environment variables or piped stdin "so a script never has to put a credential in `argv`, where any process on the machine can read it through `ps` and where a shell records it in history". A flag still wins; stdin is checked when neither is set.

| Variable | Used by | Overridden by |
|---|---|---|
| `BRAINBASE_SLACK_BOT_TOKEN` (`xoxb-…`) | `agent connect slack` | `--bot-token` |
| `BRAINBASE_SLACK_SIGNING_SECRET` | `agent connect slack` | `--signing-secret` |
| `BRAINBASE_LINEAR_CLIENT_SECRET` | `agent connect linear`, `agent surface linear connect|reconnect` | `--client-secret` |
| `BRAINBASE_LINEAR_WEBHOOK_SIGNING_SECRET` | same | `--webhook-signing-secret` |
| `BRAINBASE_STDIN_TIMEOUT_MS` | how long piped stdin may stay silent (default `5000`, clamped 100 ms to 10 min); silence after some bytes is an error, not a short read | — |

- `PUT /v2/cli/agents/{agent_id}/connections/slack` and `/meeting` are idempotent: re-running with fresh credentials rotates them in place. `GET .../mcp-servers` never returns tokens, only whether one exists and when it lapses. `POST /v2/alerts` returns the signing secret plaintext once (`signing_secret`); rotate later with the alerts rotate-secret endpoint.
- Rotate secrets "when people leave a team or credentials are exposed"; remove unused ones; "use the smallest-scoped credential that lets the agent complete its task".

## 7. `BRAINBASE_TOKEN` and the sandbox environment

- Locally, `BRAINBASE_TOKEN` is a `bbpat_…` PAT that "overrides `~/.brainbase/token.json` and the browser session"; it is first in precedence for every authenticated command, and the session-only commands refuse while it is set.
- In a sandbox, `BRAINBASE_TOKEN` is the resource-scoped PAT Brainbase plants (agent- or thread-bound), alongside `BB_TASK_KEY` (`bb_live_…`), `BRAINBASE_TASK_ID`, `BRAINBASE_AGENT_ID`, `BRAINBASE_API_URL`, `BRAINBASE_SHARED_DIR`, `MEDIA_API_KEY`, `PROXY_BASE_URL`, `IS_SANDBOX`. Secrets cannot shadow them.
- Every built-in MCP entry the CLI writes authenticates as `Authorization: Bearer ${BRAINBASE_TOKEN}`; a `BRAINBASE_*_MCP_URL` override hands the agent's token to whatever host you set, so point those only at hosts you trust.
- GitHub write access: "an agent's sandbox receives short-lived, scoped credentials that can push branches and commits to the connected repository" when turned on (changelog 2026-08-28). Image generation uses "short-lived, task-scoped access while keeping provider credentials out of the sandbox" (changelog 2026-08-21).

## 8. Harness vendor keys (BYOK) and Bedrock credentials (BYOB)

Cursor, Factory and Qoder run on your own vendor account; add the key as an agent secret (or an orchestration secret) before starting a task: `CURSOR_API_KEY` or `CURSOR_AUTH_TOKEN`; `FACTORY_API_KEY`; `QODER_PERSONAL_ACCESS_TOKEN` or `BRAINBASE_QODER_PAT`. A run started without the key returns `422` with `detail.code: missing_required_secret` and `detail.missing` listing accepted names. Details in `brainbase-llm-gateway`.

Bring Your Own Bedrock (Kimi K3 only) has three credential scopes with distinct managers:

| Scope | Where | Who can manage it |
|---|---|---|
| Organization | Settings > Kimi K3 on your AWS account | Org owners and admins |
| User | Settings > Your AWS credential for Kimi K3, for the selected org | You; applies only to tasks you own in that org |
| Agent | The agent's Secrets page | Anyone who can edit the agent |

Most specific wins (agent, then task owner's user credential, then org) with no fallback on failure. Org owners and admins can block member and agent overrides (allowed by default) and see an overrides table (who saved, region, AWS account) without the secret. A user's credential is deleted when they leave the org. Create, replace, delete, test and override-switch changes are audited. Deleting a credential in Brainbase does not revoke it in AWS.

## 9. Benchmarks and scheduled agents

- Benchmarks: Settings can list required credential names, checked before a run starts; values "stay in the agent's credential store, are not saved in the benchmark definition or run plan, and are provided to the agent through its normal runtime environment during execution". The run review shows which credentials are used and you confirm having reviewed them.
- Scheduled agents: secrets are planted into every task sandbox; "Do not put token values in instructions, trigger descriptions, or `configured_props`." When a scheduled trigger fires, Brainbase mints the agent-bound PAT the task uses.
