# Credentials: sessions, PATs, API keys, task keys, grants

Source: docs.brainbaselabs.com/cli/authentication, /cli/commands/auth, /cli/commands/token, /cli/reference/pat-scopes, /cli/reference/environment, /cli/reference/files, /cli/reference/control-plane-api (Authentication, Agent keys, Errors), /api/authentication, /docs/mcp, /docs/agent/integrations-from-code, /docs/agent/tools (Standalone SDK connection errors), /docs/agent/secrets (reserved names), /api/agents/get-agent-inherited-mcp-servers; changelog 2026-07-17, 2026-07-22, 2026-08-21, 2026-08-28, 2026-10-24.
Snapshot: 2026-11-03

## Contents

1. Credential classes
2. Browser login session
3. Personal access tokens: lifecycle
4. Permission scopes
5. Resource scope
6. Credential precedence and `whoami`
7. Which credential each surface accepts
8. Error table: scope failure versus auth failure
9. API keys and Brainbase MCP OAuth
10. Agent task keys
11. Integration contexts and grants
12. Service routing and host variables

## 1. Credential classes

| Class | Prefix / form | Minted by | Scope checked? | Reaches |
|---|---|---|---|---|
| Browser login session | Supabase JWT in `~/.brainbase/auth.json` | `brainbase login` | Never ("carries no scope list") | Everything the person's role allows, including token minting and the web-app-only commands |
| User-wide PAT | `bbpat_…` | `brainbase token create` or the dashboard | Permission scopes `read`/`publish`/`admin` | Everything the user can reach, subject to scopes; cannot mint tokens or call web-app-only commands |
| Agent-bound PAT | `bbpat_…` planted as `BRAINBASE_TOKEN` in a sandbox | Brainbase, when an agent's sandbox starts or a scheduled trigger fires | Permission scopes plus internal `code:execute`, `messages:write_roles` | That agent plus orchestration peers it has an edge to |
| Thread-bound PAT | `bbpat_…` | Brainbase, per running thread | As above | That thread only |
| API key | Bearer token, `$BRAINBASE_API_KEY` | Console ("Create a key from your Brainbase settings") | Docs say only "subject to your normal Brainbase access" | Public `/v2` API |
| Agent task key | `bb_live_…`, `BB_TASK_KEY` in sandbox | `brainbase link`, `agent create` (`POST /v2/cli/agents/{agent_id}/keys`) | Refused on every scoped `/v2/cli` route | Sandbox call-backs to Brainbase |
| Brainbase MCP OAuth | OAuth JWT, scope `mcp:all` | OAuth consent in the MCP client | "Remains bounded by your normal Brainbase access" | The Brainbase MCP at `https://api.brainbaselabs.com/mcp` |
| Integration renewal handle | `bbir_` + 64 hex | `brainbase integrations context create` or `POST /v2/integration-contexts` | n/a | Only `POST /v2/integration-grants/renew` |
| Integration access grant | `bbig_…`, about 15 minutes | `POST /v2/integration-grants/renew` | Allow/Ask/Deny rules of the agent | The `brainbase-apps` MCP server |
| Provider credentials | Slack `xoxb-…` bot token and signing secret; Linear client secret and webhook signing secret | You, in Slack/Linear | n/a | Stored by Brainbase; read by `agent connect` from env or stdin |
| Short-lived scoped credentials | GitHub push credentials; task-scoped image-generation access | Brainbase, into the sandbox | n/a | The connected repository; Brainbase image models (changelog 2026-08-28, 2026-08-21) |

## 2. Browser login session

`brainbase login` opens the web app (`--web <url>`, default `https://app.brainbaselabs.com`), connects the device with a short code you approve in the browser (changelog 2026-08-21) and stores the session at `~/.brainbase/auth.json` (mode `0600`). It "carries full scopes". Expired access tokens are refreshed with the stored refresh token; the CLI keeps its own session so browser refreshes do not consume it. `brainbase logout` clears the file. When renewal fails the CLI explains why and, if a saved PAT for the same account exists, falls back to it with a one-line notice on stderr (changelog 2026-10-24).

## 3. Personal access tokens: lifecycle

```bash
brainbase token create --name ci                       # scopes: read, publish (default)
brainbase token create --name ci-readonly --scopes read
brainbase token create --scope publish                 # --scope is an alias of --scopes
brainbase token list                                   # scopes per token; session or user-level PAT
brainbase token rename <token-id> --name ci-deploy
brainbase token revoke <token-id> --yes
brainbase token clear                                  # forget ~/.brainbase/token.json, no revoke
```

| Command | Flags | Notes |
|---|---|---|
| `token create` | `--name <label>` (`-n`), `--scopes <list>` (`--scope`) | Prints the key once; saves it to `~/.brainbase/token.json` with the minting account id. If the signed-in account changes mid-creation the token is shown but not saved. Allowed scopes `read`, `publish`, `admin`; anything else is rejected locally and by the server. |
| `token list` | — | Works with a login session or a user-level PAT. |
| `token rename <id>` | `--name <label>` (`-n`), at most 128 characters, unique among active tokens | Keeps key, scopes and expiry. Prompts without `--name`; non-zero without a terminal. Revoked and expired tokens cannot be renamed. `--scope`/`--scopes` are refused, not ignored. |
| `token revoke <id>` | `--yes`, `-y` | Irreversible; refuses without a terminal unless `--yes`. Clears `token.json` when it holds the revoked key; leaves a different key alone. If the server says the token is already gone while it looked live a moment earlier, the local copy is kept. |
| `token clear` | — | Local only. |

Scopes are immutable; to change what a token can do, mint a replacement and revoke the old one. The changelog of 2026-08-21 notes that `--scope=<value>`/`--scopes=<value>` once granted broader access than requested and that `token create --scope publish` now scopes exactly as requested.

Files: `~/.brainbase/auth.json` (session, JWT + user), `~/.brainbase/token.json` (PAT), both mode `0600`; `BRAINBASE_HOME` relocates the directory. Older token files without an account id are still accepted.

## 4. Permission scopes

| Scope | Grants |
|---|---|
| `read` | Every read endpoint, no writes. Most reads do not check it; the three surface-settings reads on `/v2/cli` do. |
| `publish` | Every write endpoint. Alone, it fails the three surface reads that need `read`. |
| `admin` | Nothing. Accepted at mint time; no endpoint requires it. An `admin`-only token gets `lacks required scope: publish` on writes and `lacks required scope: read` on surface reads. |

Internal scopes you cannot mint (the mint endpoint rejects them) but may see in errors:

| Scope | Required by |
|---|---|
| `code:execute` | `POST /v2/tasks/{task_id}/code/run/sync` and `GET /v2/tasks/{task_id}/code/capabilities`, in addition to `publish` |
| `messages:write_roles` | Appending a message whose `role` is not `user`, when the caller is a resource-scoped PAT rather than an agent manager |

Default mismatch: `brainbase token create` with no `--scopes` sends `read,publish`; the underlying mint endpoint defaults to `read` alone when the field is omitted, so a token minted outside the CLI may be read-only.

"A read-scoped PAT is not read-only across the whole product": on `/v2/cli` it is; elsewhere it can still reach writes covered only by the non-enforcing guard. The scope check applies to PATs only; a session is never scope-checked. See `endpoint-scope-table.md`.

## 5. Resource scope

| Binding | Minted by | Reaches |
|---|---|---|
| User-wide | `brainbase token create`, or the dashboard | Everything the user can reach |
| One agent | Brainbase, when an agent's sandbox starts or a scheduled trigger fires | That agent, plus orchestration peers it has an edge to |
| One thread | Brainbase, per running thread | That thread |

Unconditional refusals today: listing a team's agents and an organization's members (`credential_scope_denied`), the five orchestration endpoints (`agent-scoped PATs cannot access orchestration configuration`, reads `thread-scoped` for a thread token), surface-settings endpoints for thread-bound credentials (`Surface settings require a user or agent credential`), orchestration secret writes, inherited MCP/secret routes (`404` for a resource-scoped PAT), `brainbase interface …` and `agent versions` commands ("a sandbox or agent credential is refused"), integration-context creation (`human_credential_required`), acknowledging unknown outcomes. Everything else is shadow mode unless strict admission is on. "Do not treat resource binding alone as a security boundary you can rely on."

A `403` naming `credential_scope_denied` "came from a token Brainbase minted for a sandbox, not from a token you created".

## 6. Credential precedence and `whoami`

Control-plane, runtime and registry commands resolve credentials in this order:

1. `BRAINBASE_TOKEN` (a `bbpat_…` PAT); the CLI skips the on-disk session entirely.
2. `~/.brainbase/auth.json`: a valid session, or an expired one the CLI can renew.
3. `~/.brainbase/token.json`: the saved PAT, when the session cannot be used and its account id matches.

A saved PAT belonging to a different account from the login session is not used. `BRAINBASE_SKIP_AUTH=1` bypasses the local auth gate for development; server calls still fail without a credential. Auth-gated commands include `template`, `skill`, `link`, `unlink`, `sync`, `status` and `token`; purely local commands such as `agent env` and `run` work with an expired session.

`brainbase whoami --json` fields: `credential` (`env_pat`, `session`, `stored_pat`, `null`), `authenticated`, `control_plane`, `email`/`user_id`, `expires_at` (session only), `token_prefix` (PATs only), `control_plane_url`, `session.present`, `session.expired`, `session.refreshable`, `session.refresh_error`, `stored_pat` (`{ present, name }`), `reason`. Exits non-zero when no usable credential remains.

## 7. Which credential each surface accepts

| Operation | Session | User-wide PAT | Agent/thread PAT | `bb_live_…` | API key |
|---|---|---|---|---|---|
| `token create`, `rename`, `revoke` | yes | no (`jwt_required`) | no | no | — |
| `token list` | yes | yes (user-level) | — | — | — |
| `/v2/cli` reads (17 of 20) | yes | yes | mostly shadow; listing refused | yes | — |
| `/v2/cli` three surface reads | yes | needs `read` | agent-bound yes, thread-bound no | no | — |
| `/v2/cli` writes (23) | yes | needs `publish` | shadow, except orchestration routes | no | — |
| `brainbase integrations …`, GitHub/Linear setup, Linear manifest and disconnect, phone search/purchase/release | yes | no (refuses while `BRAINBASE_TOKEN` set) | no | no | — |
| `brainbase integrations context create|end` | yes | no (refuses `BRAINBASE_TOKEN`, ignores stored PAT) | no | no | no |
| `brainbase interface …`, `agent versions …` | yes | yes (`me` on `access` needs a user id) | refused | refused | — |
| Public `/v2` API | yes (session token) | yes | per-route | per-route | yes |
| Eval writes `POST/PATCH/DELETE /v2/agents/{agent_id}/evals…` | yes | yes | refused under strict admission (`agent_credential_refused`) | refused under strict admission | MCP OAuth JWTs keep existing checks |
| Orchestration secret writes | yes | needs `publish` + group | refused | refused | OAuth-connected MCP client accepted |
| Acknowledge unknown outcome, answer Ask | own session | refused | refused | refused | refused |
| Meeting MCP | OAuth | yes, with explicit profile selection | — | "live API keys" accepted | yes (changelog 2026-07-17) |

## 8. Error table: scope failure versus auth failure

Errors are JSON with `detail`, either a string or `{ code, message }`.

| Status | Body | Meaning | Kind |
|---|---|---|---|
| `401` | `missing bearer token` | No `Authorization` header | auth |
| `401` | `invalid or expired PAT` | Token does not resolve: revoked, expired, mistyped | auth |
| `403` | `PAT lacks required scope: publish` | Read-scoped PAT on a write; nothing modified, check runs before the handler | permission scope |
| `403` | `PAT lacks required scope: read` | PAT without `read` on one of the three surface reads | permission scope |
| `403` | `CLI task keys cannot manage cloud configuration` | `bb_live_…` on a write or surface read; needs a PAT or session | credential class |
| `403` | `credential_scope_denied` | Resource-scoped PAT listing a team's agents or an org's members | resource scope |
| `403` | `Surface settings require a user or agent credential` | Thread-bound credential on a surface route | resource scope |
| `403` | `agent-scoped PATs cannot access orchestration configuration` | Resource-scoped credential on an orchestration endpoint | resource scope |
| `403` | `detail.code: agent_credential_refused` | Strict admission refusing sandbox PATs, other resource-scoped PATs or `bb_live_…` on protected writes | resource scope (strict) |
| `403` | `detail.code: cross_context` / `not_descendant` | Runtime-event write outside the credential's own task chain | resource scope (strict) |
| `403` | `jwt_required` | PAT on token create/rename/revoke | credential class |
| `403` | `human_credential_required` | Recognised non-session credential on `POST /v2/integration-contexts` | credential class |
| `404` | `Agent not found` | No such agent, or caller cannot reach it; deliberately indistinguishable | access |
| `404` | `Not Found` | Path not routed, usually an older control plane | n/a |
| `409` | — | `base_revision` conflict | n/a |
| `409` | `machine_kind is immutable after agent creation` | `PUT /v2/cli/agents/{agent_id}` with a different `machine_kind` | n/a |
| `422` | — | Body or query validation | n/a |
| `503` | `detail.code: origin_unavailable`, `Retry-After: 5` | Strict-admission master switch on, setting unreadable | infra |

Rule of thumb: `401` means the server did not accept the credential at all; `403` with `lacks required scope` means it did, but the token's permission scopes are short; `403` with a `code` or a sentence naming a binding means the token resolved and has the scopes but is the wrong class or bound to one resource; `404` on an agent you expect to exist is an access problem, not a credential problem.

## 9. API keys and Brainbase MCP OAuth

- "Brainbase API requests use API keys." Create one in the console, then `curl "https://api.brainbaselabs.com/v2/agents" -H "Authorization: Bearer $BRAINBASE_API_KEY"`. The docs do not describe scopes, expiry or rotation for API keys; they show them as the public API's bearer token and say they appear in Settings.
- The Brainbase MCP at `https://api.brainbaselabs.com/mcp` uses a separate OAuth connection and requests `mcp:all`. "Do not paste an API key into an MCP client": keep REST keys out of MCP URLs, headers and installer configuration. Codex reauthenticates with `codex mcp login brainbase --scopes mcp:all`. RFC 9728 metadata is at `GET /.well-known/oauth-protected-resource`.
- Evaluations: "Supabase login sessions, MCP OAuth JWTs and user-wide PATs retain their existing access checks."

## 10. Agent task keys

"Agent keys (`bb_live_…`) are a third credential class, distinct from PATs and sessions. `link` mints one so an agent's sandbox can call back to Brainbase; `unlink` revokes it."

| Endpoint | Used by | Scope |
|---|---|---|
| `POST /v2/cli/agents/{agent_id}/keys` | `link`, `agent create` | publish |
| `GET /v2/cli/agents/{agent_id}/keys` | not called by the CLI today | none |
| `DELETE /v2/cli/keys/{key_id}` | `link`, `unlink` | publish |

The `POST` returns the plaintext key once with `id` and `prefix`; only a hash is stored. `GET` lists keys by prefix. `DELETE` is idempotent (`404` when already gone). In the sandbox the key is `BB_TASK_KEY`, a reserved name that secrets cannot shadow. On `/v2/cli` a task key is refused on every scoped route with `CLI task keys cannot manage cloud configuration`; under strict admission it is also refused on eval writes and task execution settings.

## 11. Integration contexts and grants

Canary only. A person with management rights creates a **context** (one program's access to an agent's apps, at most 30 days); it returns a **renewal handle** (`bbir_…`), traded for 15-minute **access grants** (`bbig_…`), each trade returning a replacement handle.

```bash
brainbase integrations context create --agent "$AGENT_ID" --application nightly-report
#   --max-lifetime 30d   60s to 30d (default 7d)
#   --json               {context_id, renewal_handle, renewal_expires_at, max_expires_at}
brainbase integrations context end "$CONTEXT_ID" --reason "job retired"
```

- `--application`: up to 120 characters of `a-z`, `0-9`, `.`, `_`, `:`, `/`, `-`, starting with a letter or digit.
- The CLI requires your own session: it refuses `BRAINBASE_TOKEN` and does not use a stored PAT. Task keys and integration grants cannot create contexts. CLI 0.54.0 or later.
- API: `POST /v2/integration-contexts` with `agent_id`, `application`, `max_lifetime_s` (60 to 2592000) using a session token; `POST /v2/integration-contexts/{context_id}/end` with `reason` (1 to 200 characters); `POST /v2/integration-grants/renew` with the handle as bearer and an empty JSON body.
- Keep both tokens secret: "Never put them in a prompt, a log or source control." The SDK expects `bbir_` + 64 hex characters with no whitespace and strips bearer values from its error output.
- Ending a context revokes handle and grants; it cannot undo an action already dispatched. A grant "never past the context's end". Renewing never changes the agent, extends the context, or clears a Deny or a waiting approval.

| Response | Meaning |
|---|---|
| `401 unauthorized` | No credential, or one the server does not recognise |
| `401 grant_invalid` | Grant expired, revoked, or context ended; `reason` in the body |
| `401 renewal_invalid` (renew endpoint) | Handle unknown, expired, replaced, or context ended; use the newest saved handle, else a person creates a new context |
| `403 grant_required` | Only `list_apps`, `search_actions`, `get_action` work without a grant |
| `403 flag_off` | Integrations off for this kind of access |
| `403 human_credential_required` | Context management needs a person's session |
| `404 agent_required` | Credential not tied to an agent; discovery via `/p/{agent_id}/mcp` or `/t/{task_id}/mcp` |
| `404` | Agent or task not reachable by this credential, feature off, or outside the canary |
| `405` / `413` | GET not allowed; request body over the server limit (files have a separate 25 MiB limit) |
| `503 unavailable` / `503 renewal_unavailable` | Auth check unavailable; retry with the same operation id or handle |

## 12. Service routing and host variables

Authentication is shared across three surfaces: control plane at `https://api.brainbaselabs.com/v2/cli` (override `BRAINBASE_CONTROL_PLANE_URL`; the same router is served under `/api/cli`); registry and model proxy at `https://api.v1.brainbaselabs.com` (`BRAINBASE_REGISTRY_URL`, `BRAINBASE_PROXY_URL`, legacy `BRAINBASE_API_URL`); the web app for `integrations` and surface provider operations (`BRAINBASE_WEB_URL`, default `https://app.brainbaselabs.com` or the console you logged in through). Every built-in MCP entry the CLI writes authenticates as `Authorization: Bearer ${BRAINBASE_TOKEN}`, and the CLI does not validate the host in a `BRAINBASE_*_MCP_URL` override, so point those only at hosts you trust.
