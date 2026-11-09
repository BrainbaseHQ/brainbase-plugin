# Shared resources across an orchestration

Source: https://docs.brainbaselabs.com/docs/orchestrations/secrets, /docs/orchestrations/tools, /docs/orchestrations/building-an-orchestration, /docs/agent/secrets, /docs/agent/tools, /docs/secrets-at-brainbase, /docs/harnesses, /docs/bring-your-own-bedrock, /cli/reference/environment, /cli/commands/mcp, /api/agents/get-agent-inherited-secrets, /api/agents/get-agent-inherited-mcp-servers; changelog 2026-09-01 "Share Secrets Across an Orchestration's Agents", 2026-07-24 "Shared Memory for Orchestrations", 2026-09-04, 2026-08-21, 2026-06-19
Snapshot: 2026-11-03

Contents: The orchestration MCP and handoffs · Cloudflare file handoffs · Orchestration secrets · Orchestration MCP servers · Shared memory · Membership ambiguity · Bring Your Own Bedrock note

## The orchestration MCP and handoffs

Every member's harness is installed with the orchestration built-in MCP (always installed, unlike memory and browser which an agent can turn off). It exposes one `create_task_for_<recipient>` tool per outgoing edge; the edge `description` tells the source agent what context to pass forward. Calling the tool starts a task on the recipient, authorized by the agent-bound credential planted in the source's sandbox, which reaches "that agent, plus orchestration peers it has an edge to". Orchestration connections can expose multiple dispatch tools to the source agent and run in both directions, drawn as parallel lanes on the canvas (changelog, 2026-06-19), so a two-way handoff is two edges.

Host override: `BRAINBASE_ORCHESTRATION_MCP_URL` (default `https://brainbase-orchestration-mcp.onrender.com`), a base origin to which the CLI appends `/t/<thread_id>/mcp` (the running task's `BRAINBASE_THREAD_ID`); it is written into the harness MCP config on `agent pull` / `unpack` / `sync`, and whatever host you set receives the agent's token.

Design rules from the building page: give each agent one clear role and one testable, evaluatable task; use edge descriptions to explain what context should be passed forward; pass the summary, artifact, or decision the next agent needs instead of the full history; test one handoff at a time before adding external triggers.

## Cloudflare file handoffs

Handoffs to Cloudflare agents can include workspace files. Brainbase prepares the recipient's sandbox, copies the attachments, and then starts the recipient's task. You do not need to send a separate message to start its sandbox first. Cloudflare sleep/resume and other machine kinds are in `brainbase-sandboxes`.

## Orchestration secrets

An orchestration secret is defined once on the orchestration and injected as an environment variable into every member agent's sandbox at runtime, alongside that agent's own secrets. Use one when several agents in the same process need the same credential (a `GITHUB_TOKEN`, a shared API key). Shipped as changelog 2026-09-01.

Console: open the orchestration's Secrets page, click Add secret, enter an uppercase key and the value, save. The value is hidden from then on; only the key name is shown. API: `PATCH /v2/orchestrations/{orchestration_id}/secrets` with `set` / `remove` (see `references/api.md`).

| Rule | Detail |
| --- | --- |
| Every member inherits | Each agent receives the orchestration's secrets in its sandbox environment, on top of its own; read them the normal way (`process.env.GITHUB_TOKEN`). |
| Write-only | After a value is saved, no page, API response, or CLI command returns it again. Only key names come back. Encrypted at rest. |
| Key format | `^[A-Z][A-Z0-9_]*$`. `GITHUB_TOKEN` is valid, `github-token` is not. |
| Reserved names | The platform's provisioning keys (for example `BRAINBASE_TOKEN`, `BB_TASK_KEY`, `MEDIA_API_KEY`) are rejected so a secret cannot shadow them. The agent secrets page lists more reserved platform variables (`BRAINBASE_TASK_ID`, `BRAINBASE_AGENT_ID`, `BRAINBASE_API_URL`, `BRAINBASE_SHARED_DIR`, `PROXY_BASE_URL`, `IS_SANDBOX`); avoid the `BRAINBASE_` prefix. |
| Who can write | A credential that can publish (a `bbpat_` PAT with `publish`, an OAuth-connected MCP client, or a signed-in session) plus membership in the orchestration's group. A credential scoped to a single agent or task, such as one planted inside a running sandbox, is always refused, even with `publish`. |
| Scope | A secret belongs to a single agent or a single orchestration; an orchestration's secrets reach only its members. Nothing is shared implicitly across teams or workspaces. Injection uses a narrow agent-scoped credential: a run can reach only its own secrets plus those it inherits. |

Overrides and conflicts: an agent's own secret always wins. If an agent defines a key with the same name as one of its orchestration's, the agent's value is injected. The agent's Secrets page lists inherited keys with the orchestration they come from and an **Override** action, which writes an agent-level value of that name. `brainbase agent status` lists inherited keys by name, flags a conflicting key, and marks an overridden one inline. `GET /v2/agents/{agent_id}/secrets/inherited` returns `inherited[]` and `conflicts[]`.

When changes take effect:

| Change | Effect |
| --- | --- |
| Adding or rotating a secret | Applies the next time the member starts up in a fresh sandbox. Work already running keeps the environment it started with. |
| Removing a secret | Stops being injected the next time the member starts up in a fresh sandbox. |
| Removing an agent from the orchestration | The agent loses the inherited keys the next time it starts in a fresh sandbox (the changelog phrases it as "starting with the agent's next turn"). |

Local runs: inherited secrets are a cloud-runtime feature. `brainbase agent pull` writes only the agent's own secrets to `.brainbase/secrets.env`, so inherited keys are not available to a local `brainbase run`; set them in your local environment when you need them. `brainbase agent push` replaces the agent's own secrets from that file and never touches the orchestration's.

Vendor keys count too: for Cursor, Factory and Qoder harnesses (`CURSOR_API_KEY` / `CURSOR_AUTH_TOKEN`, `FACTORY_API_KEY`, `QODER_PERSONAL_ACCESS_TOKEN` / `BRAINBASE_QODER_PAT`), a secret set on the agent's orchestration satisfies the `422 missing_required_secret` check. See `brainbase-llm-gateway`.

## Orchestration MCP servers

An orchestration can own custom MCP server definitions of its own, independent of any member agent's tools. Every member agent receives them the next time it bootstraps a task. Use one when several agents need the same tool server (an internal ticketing MCP, a shared search index).

Console: open the orchestration's Tools page, pick a server from the directory or click Add custom server, enter a name, transport (a URL for a remote server or a command for one that runs in the member's own sandbox), and any arguments, headers, or environment variables, then click Add server. API: `/v2/orchestrations/{id}/mcp-servers` (see `references/api.md`).

Composition at each task bootstrap, by name, in priority order:

1. The reserved built-in. When MAS is serving `brainbase-linear` for an agent, it always wins over any row of that name; an orchestration cannot define a same-named server, and even an agent's own row of that name does not override it.
2. The agent's own server of that name. An enabled server on the agent overrides the orchestration's definition and wins over the optional `brainbase_meeting` / `brainbase_github` built-ins; a disabled server on the agent suppresses the orchestration's definition entirely.
3. The orchestration's inherited definition. Used only when neither of the above claims the name.

URLs and secret references:

- `${NAME}` inside an `env` or `header` value references one of the orchestration's own secrets by name. It is validated against the orchestration's current secret keys when you save, and expanded inside the member's sandbox at run time. MAS never stores or returns the referenced value; responses carry only variable names (`env_keys`, `headers_keys`) and the referenced secret's name (`env_refs`, `headers_refs`).
- A server name starting with `brainbase-` or `brainbase_` is rejected.
- A remote server's `url` must be HTTPS, with no userinfo, no dot segments, no fragment, and no loopback, private, link-local, or otherwise reserved destination; checked on save and again by the MCP proxy every time a member connects.

Overrides and suppression on the agent: an inherited server appears on the agent's Tools page as a read-only block naming the orchestration it comes from, with **Override** and **Suppress** actions. Override copies the server's URL or command to the agent as an agent-owned row; environment-variable and header values are never returned by the API, so they are not carried over: enter them again on the override, or reference orchestration secrets as `${NAME}`. Suppress adds a disabled server of the same name to the agent, which stops it receiving the inherited one without giving it a definition of its own. The inherited definition is never copied onto the agent: `brainbase agent status` shows it for visibility, `brainbase agent push` leaves the orchestration's copy unchanged, and a locally edited inherited block produces a warning that the edit was not applied anywhere. `brainbase mcp list` marks such rows `inherited from <orchestration>`; `brainbase mcp connect` refuses them (authorize in the web app).

When changes take effect: adding, editing or removing a server applies the next time the member pulls its manifest, which for most tasks is the next task bootstrap. A task already in progress picks up the edit only if it pulls again, for example after a harness restart or an in-task `brainbase agent pull`. Removing an agent from the orchestration drops the inherited servers on its next manifest pull.

Non-goals for v1: orchestration-level OAuth for MCP servers (every orchestration server authenticates with static headers, environment variables, or secret references); the legacy kafka (KLS-hosted) runtime does not receive orchestration MCP servers; health or connectivity status for an inherited server is not surfaced separately from the agent's own tool status.

Agent-level MCP servers, the directory, and OAuth-backed servers are covered in `brainbase-tools`.

## Shared memory

Documented only in the changelog (2026-07-24 "Shared Memory for Orchestrations"; refined 2026-09-04 and 2026-08-21). The docs memory page does not mention it; fetch the live console for the current switch.

- Turn on shared memory for an orchestration from its settings; since 2026-09-04 orchestration memory has its own row in the sidebar. Every agent that is part of it reads and writes the same memory tables instead of keeping separate private memory.
- A Memory tab on the orchestration gives the same table-editing experience as an agent's private memory: browse, query, and edit rows directly.
- Shared memory follows the orchestration's existing sharing rules, so only its group members and org admins can turn it on or access it.
- Adding rows to an agent or orchestration memory table that has auto-generated columns (like an identity id) works (fixed 2026-08-21).

The `memory_*` tools, `capabilities.memory`, table design and the private-memory editor belong to `brainbase-memory`.

## Membership ambiguity

An agent can belong to only one orchestration at a time; adding it to a second fails with a `409` conflict (clear error since changelog 2026-09-03). Some agents added before this rule still belong to two orchestrations:

- Secrets: if both orchestrations define the same key with different values, neither is injected; the agent's Secrets page and `brainbase agent status` show the conflict until you set an agent-level value for that key. `GET /v2/agents/{agent_id}/secrets/inherited` lists it under `conflicts[]`.
- MCP servers: such an agent inherits nothing from either orchestration; `GET /v2/agents/{agent_id}/mcp-servers/inherited` answers `ambiguous: true` rather than guessing.

## Bring Your Own Bedrock note

Orchestration members and subagents resolve their own credentials. Content passed between them can cross from one AWS account to another. See `brainbase-llm-gateway`.
