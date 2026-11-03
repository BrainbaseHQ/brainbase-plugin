# Other access controls: MCP destinations, interface audiences, spend limits, write credentials, protected tasks

Source: docs.brainbaselabs.com/docs/agent/tools (Remote MCP destinations), /tutorials/wire-first-mcp-server (Lock down permissions), /docs/interfaces (Choose who can open it, What a dashboard can do, Roll back or archive), /cli/commands/interface, /docs/monitoring/evaluations (API write credentials, credits), /docs/monitoring/benchmarks (Permissions, limits), /docs/monitoring/tasks (Execution setting credentials), /docs/agent/file-system (Protected hosted tasks, Unavailable task sandbox), /api/machines/delete-machine, /api/alerts/create-alert, /cli/reference/pat-scopes (strict admission), /cli/commands/agent (versions), /docs/aws-marketplace (AppAllowedCidrs, login); changelog 2026-08-25, 2026-09-11, 2026-05-27, 2026-09-28, 2026-10-02.
Snapshot: 2026-11-03

## Contents

1. Remote MCP destination allowlists
2. MCP tool scopes (tutorial)
3. Interface audiences
4. Project spend limits as a control
5. Eval write credentials
6. Benchmark permissions
7. Task execution-setting credentials
8. Protected hosted tasks (Shared snapshots)
9. Machines, versions, alerts
10. Deployment-level controls (AWS Marketplace) and SSO

## 1. Remote MCP destination allowlists

Applies to MCP servers connected by URL; command-based servers inside the sandbox are unaffected.

- "Hosted Brainbase connects only to public HTTPS MCP endpoints. `localhost`, private IP addresses, and internal hostnames are blocked."
- "On-prem operators can approve specific HTTPS URL prefixes or network-and-port rules for their deployment; individual agent editors cannot extend that allowlist."
- DNS is checked again when each connection opens; destination redirects are not followed automatically.
- Changing a server URL clears its stored credentials and requires reconnecting; OAuth servers must publish resource and issuer metadata bound to that MCP destination (changelog 2026-09-11: OAuth credentials "bound to the exact server they were issued for").
- The tutorial repeats it: deploy behind a public HTTPS domain or a tunnel; "On-prem deployments can reach internal addresses, but only ones the operator has explicitly approved."

## 2. MCP tool scopes (tutorial)

The "Wire your first MCP server" tutorial shows restricting which tools an agent may call on your own server with a `scopes` map in `mcp.config.yaml` (for example `inventory:read` listing `inventory.lookup_sku` and `inventory.list_low_stock`, `inventory:write` listing `inventory.adjust_stock`), assigned "per agent in the Dashboard, or via the `POST /v2/agents/{id}/scopes` endpoint", with the MCP server enforcing them per call. That endpoint appears only in the tutorial, not in the API reference; verify against https://docs.brainbaselabs.com/tutorials/wire-first-mcp-server and the live API reference before relying on it. Troubleshooting from the same page: "that tool isn't available" means the agent's scope set lacks the tool's scope; a `401` from the MCP server means the forwarded bearer token lacks access.

## 3. Interface audiences

An interface is a private dashboard for one agent; the audience decides who can open it.

- Two settings: **Everyone in the organisation** (anyone in the org who can use this agent) or **Only chosen people** (up to 2,000; beyond that use Everyone). JSON: `audience_mode: org` or `audience_mode: users`.
- Set it before the first publish; publishing with no audience is refused; a new interface on Only chosen people starts with nobody; include yourself to see it.
- "People in the audience also need access to the agent: an owner or admin of the organization, or a member of a project the agent is in. Anyone else can open the dashboard but cannot start or read conversations in it."
- Sign-in with a Brainbase account is required; access is checked on every request, so removal applies on the next click; sharing the link outside the audience gives nothing.
- "A dashboard grants no access of its own": every call runs as the viewer; no console access, no other rights over the agent. Conversations started from a dashboard never gain build tools; build conversations do not appear in it.
- Editing: "Anyone who can edit the agent can build there"; saving code, opening Preview and the preview link require permission to edit the agent. Rollback and audience changes "are yours alone; the agent has no way to do either."
- Changing the address makes viewers sign in again.

CLI (`brainbase interface …` acts as you; an agent or sandbox credential is refused):

```bash
brainbase interface create --agent <agent-id> --name "Ops" --people me,ana@example.com
brainbase interface create --name "Support queue" --everyone
brainbase interface access <interface-id>                      # show
brainbase interface access <interface-id> --everyone           # keeps the saved people list
brainbase interface access <interface-id> --people <emails>    # exactly these
brainbase interface access <interface-id> --add a@x.com,b@x.com --yes
brainbase interface access <interface-id> --remove a@x.com
brainbase interface threads <interface-id> --shared|--private  # viewers see all conversations or only their own
```

People are emails, user ids or `me`; an email must belong to someone `brainbase member ls` shows in the interface's organisation, else the command refuses and changes nothing. `me` works everywhere with a session; with a token only on `create`, so pass your user id to `access`. `--yes` is required without a terminal; `--json` adds `people: [{ id, email, name }]`. When conversations are shared, widening the audience says so before asking. `interface access`, `threads`, `address`, `archive`, `unarchive`, `publish` and `rollback` are on the destructive-command list.

## 4. Project spend limits as a control

- Changelog 2026-08-25 "Project Spend Limits Replace Team Budgets": the Usage page's "Team budgets" became "Project limits", with a slider up to the org limit and a live marker of current-period spend. The docs mirror has no page on spend limits; fetch the live Usage page and see `brainbase-payments`.
- Effects documented elsewhere: with no credits or a spending limit reached, a model-evaluation judge call "is rejected and the evaluation is recorded as errored with no verdict"; a benchmark run that hits a credit or plan limit pauses and can be resumed (`POST /v2/agents/{agent_id}/benchmarks/runs/{run_id}/resume`; changelog 2026-09-11); a team with no credits is blocked from running tasks even with BYOB.
- Purchases: the wallet owner approves every payment; "Team requests from Slack" is a wallet-owner switch (changelog 2026-10-02, beta).

## 5. Eval write credentials

`POST /v2/agents/{agent_id}/evals`, `PATCH`/`DELETE /v2/agents/{agent_id}/evals/{eval_id}` require permission to manage the agent; a caller without access receives `404`. Sessions, MCP OAuth JWTs and user-wide PATs keep their existing checks; PAT writes follow the publish-scope rules (guard in `enforce` or `shadow` mode). Under strict admission (`INTEGRATION_CONTROL_ENABLED` and `cutover:strict_admission`), sandbox and other resource-scoped PATs and `bb_live_…` keys get `403` `agent_credential_refused`, even with `AUTH_SCOPE_ENFORCEMENT_CONTROL_PLANE=shadow`; `503` `origin_unavailable` with `Retry-After: 5` when the setting cannot be read. Reads are unchanged. Through the CLI, evals are managed declaratively by `agent push` (needs `publish`; `reconcile_evals` requires `base_revision`); `GET /v2/cli/agents/{agent_id}/evals` and `/eval-runs` need no scope. Teammates and shared-group members can view evaluations (changelog 2026-07-18). Judges spend credits.

## 6. Benchmark permissions

Beta, enabled by request (help@brainbaselabs.com). "Any beta-enabled user with access to the agent can view and run its benchmarks. Creating, importing, editing, versioning, archiving, restoring, and pinning baselines require permission to manage the agent. A run can be canceled by the person who started it or by an agent manager." Benchmark mutations check `publish` unconditionally for PATs. Runs consume credits; no execution starts until the run plan is reviewed and confirmed (checkbox confirming cases, variants and credentials). Limits: 200 case runs per run, repetitions 1 to 10, concurrency 1 to 50, up to 10 variants. Cursor, Factory and Qoder agents cannot be benchmarked.

## 7. Task execution-setting credentials

Under strict admission, `PATCH /v2/tasks/{task_id}` changes to `model`, `clear_model`, whole-map `metadata`, or `metadata_patch` keys starting with `brainbase_`, `_` or `orchestration_` require a person's session or user-wide PAT with access to manage the task; sandbox PATs, other resource-scoped PATs and task keys receive `403` `agent_credential_refused` before anything is saved. Task credentials can still set `title` and ordinary labels through `metadata_patch` (`set`, `unset`). Reserved keys are rejected for everyone by existing validation. Off by default; `503` `origin_unavailable` when the setting is unreadable. "Do not put a person's credential in a sandbox; make configuration changes from the console or a trusted controller."

## 8. Protected hosted tasks (Shared snapshots)

Disabled by default; "require operator verification within the internal canary before use."

- An agent manager publishes selected Shared files as an immutable version and adopts it into a fresh task; each adopted task gets its own writable copy at `/workspace/Shared`; edits stay in that task.
- "Publication and adoption use the management API from your own signed-in session. Worker credentials cannot publish or adopt."
- Limits: up to 1,000 regular files and 16 MiB decoded content, relative paths, no hidden directories or links; "exclude credential stores".
- Flow: `POST /v2/tasks` with `{"agent_id": "<agent ID>", "auto_run": false}` (sandbox left unprovisioned), then from the same management session `POST /v2/tasks/{task_id}/shared-snapshot` with `{"snapshot_id": "<published snapshot ID>"}`, then send the first message. Adoption needs a new task that has never created a sandbox; under strict admission a task without a verified private Shared copy stays blocked. A lost sandbox is not replaced with an older copy.
- Unavailable sandbox: file endpoints return `409` with `detail.code: machine_terminal`; "Authentication and task access requirements are unchanged."

## 9. Machines, versions, alerts

- `DELETE /v2/machines/{machine_id}`: "a read/use-only member of the machine's agent can inspect it, but only the machine owner or an agent manager (owner / team owner-admin) may destroy it." Rows are kept DEAD for audit and cost history.
- `brainbase agent versions …` (list, compare, name, restore, pin, unpin) "act as you: a sandbox or agent credential is refused"; `restore`, `pin` and `unpin` need `--yes` without a terminal.
- Alerts: `POST /v2/alerts` takes `scope_level` (`team`, `group`, `orchestration`, `agent`, `thread`), `scope_id`, `event_type`, `webhook.url`, optional `group_id`; returns `signing_secret` once and `created_by`. Alert writes are shadow-guarded for PAT scope and, under strict admission, refuse resource credentials.

## 10. Deployment-level controls (AWS Marketplace) and SSO

- `AppAllowedCidrs` restricts only the web-app host to listed IPv4 ranges (prefixes /8 or /16 through /32); API and auth hosts stay reachable and enforce their own authentication; "This parameter does not make the installation private-only".
- Public self-signup stays disabled; `FirstUserEmail` provisions the first account; later users are provisioned by the deployment administrator. "A SaaS account, Google login, or SSO button is not proof that the equivalent provider is configured on this installation."
- SSO: see `roles-and-scope.md` section 9 (changelog 2026-05-27; Enterprise tier).
