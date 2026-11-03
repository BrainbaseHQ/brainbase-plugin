# `brainbase orchestration` CLI

Source: https://docs.brainbaselabs.com/cli/commands/orchestration, /cli/concepts/orchestrations, /cli/commands (global flags), /cli/reference/exit-codes, /cli/reference/control-plane-api, /cli/reference/pat-scopes, /cli/reference/environment, /cli/reference/files, /cli/commands/mcp, /cli/commands/agent; changelog 2026-06-04, 2026-07-10, 2026-09-01, 2026-10-30
Snapshot: 2026-11-03

Contents: Overview · init · create · list · pull · push · add-agent · delete · status · Exit codes · Control-plane endpoints · Scopes and credentials · Environment variables · Inherited resources in agent commands · Changelog notes

## Overview

The CLI treats the orchestration and its member agents as one unit: a single `pull` recursively fetches the graph plus every member agent, and a single `push` updates each member before updating the graph itself. `orch` is an alias for `orchestration`; `add` is an alias for `add-agent`.

```bash
brainbase orchestration init             # write a starter manifest, offline
brainbase orchestration create           # claim the local manifest
brainbase orchestration list             # list orchestrations under a team
brainbase orchestration pull <id>        # fetch the graph + every member agent
brainbase orchestration push             # push each member, then the graph
brainbase orchestration status           # preview what would push / pull
brainbase orchestration add-agent <name> # create + wire + push a new member
brainbase orchestration delete <id>      # permanently delete the graph
```

Agent and orchestration control-plane operations use MAS at `https://api.brainbaselabs.com/v2/cli` by default. Registry and model-proxy traffic go elsewhere and are unaffected.

## `brainbase orchestration init`

Write a starter `brainbase-orchestration.yaml` in the current folder and stop. It needs no login and makes no network calls, so it works offline, in CI, and inside a sandbox. The file is valid input to `orchestration create` as written. It has no members, because `create` requires a local checkout for every member; add members after creating the orchestration with `orchestration add-agent`.

```bash
brainbase orchestration init --name "Support Flow"
brainbase orchestration create
brainbase orchestration add-agent triage
```

| Flag | Description |
| --- | --- |
| `--name <name>` | Orchestration name. Defaults to the folder name. |
| `--full` | Write a commented template documenting every optional block: icon, colour, credit limit, members, edges, and schedule triggers. |
| `--minimal` | Write the starter manifest. This is the default. Passing both `--minimal` and `--full` is an error. |
| `--force` | Overwrite an existing `brainbase-orchestration.yaml`. Without it, `init` exits 1 and leaves the file alone. A folder linked to an orchestration is always refused: edit its manifest and run `orchestration push` instead. |
| `--json` | Print `{ path, created, name, template }`, or `{ path, created: false, reason }` when it refuses. |

## `brainbase orchestration create`

Claim a local `brainbase-orchestration.yaml` and create the orchestration in the cloud. Every declared member must already have a linked checkout under `agents/<slug>/`. The command resolves those links to cloud agent IDs, validates the graph and schedule triggers, creates it under the selected org and team, attaches the existing members, creates edges, edge settings, and schedule triggers, then writes gitignored link and sync state.

```bash
brainbase orchestration create
brainbase orchestration create --org <org-id-or-slug> --team <team-id> --yes
```

| Flag | Description |
| --- | --- |
| `--org <id-or-slug>` | Create in this organization. |
| `--team <id>` | Create in this team. Team ids are unique, so this works without `--org`. |
| `--yes`, `-y` | Skip the creation confirmation. |

Precondition: a `brainbase-orchestration.yaml` and no existing link (otherwise exit 1).

## `brainbase orchestration list`

List orchestrations under a team. `--org` accepts an organization ID or slug; `--team` accepts a team ID. Note the CLI's vocab inversion: `--org` maps to the DB `teams.id` and `--team` maps to the DB `groups.id`. In API terms, the CLI's `--team` is the `group_id` that `/v2/orchestrations` requires, and the CLI's `--org` is the `team_id` that `/v2/orchestrations/templates` requires.

```bash
brainbase orchestration list
brainbase orchestration list --org <org-id-or-slug> --team <team-id>
brainbase orchestration list --team <team-id> --json | jq -r '.[].id'
```

| Flag | Description |
| --- | --- |
| `--org <id-or-slug>` | List within this organization. Omitted, the CLI selects a lone one automatically and otherwise asks. |
| `--team <id>` | List within this team. |
| `--json` | Print the orchestration array and nothing else. Never prompts; pass `--team <id>` when the choice is ambiguous. |

## `brainbase orchestration pull <id>`

Recursively fetch an orchestration plus every member agent. Pull preserves edge `settings`, materializes member runtime configuration, writes schedule triggers in their writable normalized form, and retains non-schedule app triggers as read-only context.

```bash
brainbase orchestration pull <orchestration-id>
brainbase orchestration pull <orchestration-id> --harness codex --yes
```

| Flag | Description |
| --- | --- |
| `--harness <id>` | Harness for newly-created member folders (default `claude-code`). |
| `--yes`, `-y` | Skip confirmation prompts. |

Precondition: a link, or an orchestration id as an argument. Partial outcome: some members materialise and others do not; the CLI prints how many of how many landed, the missing members by name, and a note that `orchestration push` will refuse until they are pulled, and exits 1. Organization administrators can pull orchestration manifests even for groups they are not a direct member of (changelog, 2026-07-10). Orchestrations created in the UI pull and push cleanly, including members that did not start from a local checkout (changelog, 2026-06-04).

## `brainbase orchestration push`

Recursively push each member agent, then update the graph: membership, edges, edge `settings`, and schedule triggers. Use `--graph-only` to update that graph without pushing member-agent content. Non-schedule triggers are preserved in YAML but ignored by push.

```bash
brainbase orchestration push
brainbase orchestration push --graph-only
brainbase orchestration push --force
```

| Flag | Description |
| --- | --- |
| `--graph-only` | Push members, edges, edge settings, and schedule triggers, but not member-agent content. |
| `--force` | Settle every conflict in the local manifest's favour. See below. |
| `--yes` | Skip confirmation prompts. |

Conflict rules: push refuses, and names each conflict, when the cloud holds schedule triggers this checkout has never pulled or that were edited in the cloud since, or when orchestration metadata (`name`, `description`, `icon`, `icon_color`, `credit_limit`) changed both locally and in the cloud. Run `orchestration pull` to take the cloud's side, or `--force` to take yours. One flag settles both kinds: the cloud's conflicting schedule triggers are deleted and the metadata fields are overwritten with the file's values. A field only the cloud changed is never reverted. The flag applies to the graph only: member agents are still pushed without it, so a member's own conflict is settled with `agent push --force` in that member's folder. `--force` cannot change a member's `machine_kind`.

Member rules: every member is checked first; a reserved block in any member manifest refuses the whole run before the first member is pushed, and any member push failure stops the graph update.

Precondition: the folder is linked to an orchestration.

## `brainbase orchestration add-agent <name>`

Create a new member agent, wire its edges into the graph, and push. `add` is an alias.

```bash
brainbase orchestration add-agent researcher --from planner --to writer
brainbase orch add researcher --to writer --no-push    # stage without pushing
```

| Flag | Description |
| --- | --- |
| `--from <agent>` | Source edge into the new agent (repeatable). |
| `--to <agent>` | Edge out of the new agent (repeatable). |
| `--description <text>` | Description for the new member agent. |
| `--schema <json>` | Edge payload schema. |
| `--harness <id>` | Target harness for the new member agent. |
| `--org <id>` | Scope to an org. |
| `--no-push` | Create and wire locally but skip the push. |
| `--yes` | Skip confirmation prompts. |

Precondition: the folder is linked to an orchestration.

## `brainbase orchestration delete <id>`

Permanently delete an orchestration graph. Its member agents are kept. The id is required and never taken from the linked folder. Find ids with `orchestration list`.

```bash
brainbase orchestration delete <orchestration-id>
brainbase orchestration delete <orchestration-id> --yes --json
```

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Delete without the confirmation prompt. Required with no terminal. |
| `--json` | Print `{ id, kind, name, deleted }` and nothing else. Requires `--yes`, because `--json` never prompts. |

If the folder you run it in is linked to the deleted orchestration, the command says so: delete `.brainbase/orchestration-link.json` before recreating it with `orchestration create`. Deleting an agent deletes its tasks; deleting an orchestration keeps its member agents (changelog, 2026-10-30).

## `brainbase orchestration status`

Preview membership, edge description/payload/settings, and schedule trigger drift. Status also reports missing or stale member checkouts and cloud revision drift since the last pull. Schedule drift compares the UUID node, active state, normalized config, and target edges; non-schedule triggers are not diffed.

```bash
brainbase orchestration status
```

Precondition: the folder is linked to an orchestration.

## Exit codes

| Situation | Code |
| --- | --- |
| Precondition not met (`push`/`status`/`add-agent` without a link; `pull` without a link or id; `create` without a manifest or with an existing link) | `1`, printed as a warning |
| `pull` materialises only some members | `1`, output names what landed and what did not |
| `init` refusing to overwrite | `1` |
| Declining an interactive confirmation | `0` (nothing happened because you said so) |

Under `--json`, destructive commands (`delete`) need `--yes` as well, because `--json` never prompts.

## Control-plane endpoints (`/v2/cli`)

| Endpoint | Used by | Scope required |
| --- | --- | --- |
| `GET /orgs` | `orchestration create`, `orchestration list`, `orchestration add-agent` (and the agent commands) | none |
| `GET /orgs/{org_id}/teams` | `orchestration create`, `orchestration list`, `orchestration add-agent` | none |
| `GET /orgs/{org_id}/teams/{team_id}/orchestrations` | `orchestration list` | none |
| `POST /orchestrations` | `orchestration create` | publish |
| `GET /orchestrations/{orch_id}` | `orchestration status`, `orchestration pull` | none |
| `GET /orchestrations/{orch_id}/manifest` | `orchestration pull` | none |
| `PUT /orchestrations/{orch_id}` | `orchestration push` | publish |

The bare `GET` returns the orchestration with its members and edges but no per-member manifests. The `/manifest` variant inlines every member's full agent manifest under `members[].manifest`, which is what `orchestration pull` consumes in a single round trip.

`PUT` is a partial update, with one exception: `members` and `edges` are whole-replace. Omit them to leave them unchanged; send `[]` to clear them. Pass `base_revision` for the same conflict protection the agent manifest has. Every declared member must already have access to the parent team, or the request is refused with `400`.

MAS also serves this router under `/api/cli` (one implementation, two prefixes). Setting `BRAINBASE_API_URL` is different: it means the legacy KLS control plane, and on that path the CLI refuses orchestration creation and schedule-trigger writes (and declarative `machine_kind` / `default_model` writes) before sending. Use `BRAINBASE_CONTROL_PLANE_URL` to point at another MAS host.

Errors on this surface:

| Status | Body | Meaning |
| --- | --- | --- |
| `401` | `missing bearer token` / `invalid or expired PAT` | No or bad credential. |
| `403` | `PAT lacks required scope: publish` | Read-scoped PAT on a write; nothing was modified. |
| `403` | `CLI task keys cannot manage cloud configuration` | An agent task key (`bb_live_…`) on a write. |
| `403` | `agent-scoped PATs cannot access orchestration configuration` | A resource-scoped credential on any of the five orchestration endpoints. Reads `thread-scoped` for a thread-bound token. |
| `400` | — | A declared member lacks access to the parent team. |
| `404` | `Not Found` | The path is not routed; usually a control plane older than the command. |
| `409` | — | A `base_revision` conflict: the cloud advanced since you read it. Pull, then push again. |
| `422` | — | Request body or query parameter failed validation. |

## Scopes and credentials

- `POST /v2/cli/orchestrations` and `PUT /v2/cli/orchestrations/{orch_id}` require the `publish` scope on a PAT. A browser login session carries no scope list and is never scope-checked.
- Outside `/v2/cli`, orchestration writes check `publish` unconditionally; orchestration template writes are covered only by a newer blanket guard that is deployed but not yet enforcing (shadow mode). With strict admission enabled, agent and orchestration template writes require a person's session or user-wide PAT; resource credentials receive `403` with `detail.code: agent_credential_refused`.
- The five orchestration endpoints refuse resource-scoped credentials unconditionally, unlike most routes that are still in shadow mode.
- An agent-bound credential (minted by Brainbase when a sandbox starts or a scheduled trigger fires) reaches that agent plus the orchestration peers it has an edge to. You cannot mint one from the CLI.
- Saved PAT fallback: control-plane commands use the PAT saved by `token create` when the login session cannot be used; `BRAINBASE_TOKEN` takes priority over both.

## Environment variables

| Variable | Effect |
| --- | --- |
| `BRAINBASE_CONTROL_PLANE_URL` | Base for agent and orchestration control-plane operations (`+ /v2/cli`). Wins over `BRAINBASE_API_URL`. Required for orchestration creation and schedule-trigger writes. |
| `BRAINBASE_API_URL` | Legacy KLS control plane (`+ /api/cli`); refuses orchestration creation and schedule-trigger writes. |
| `BRAINBASE_ORCHESTRATION_MCP_URL` | Override the orchestration MCP host, which exposes one `create_task_for_<recipient>` tool per outgoing edge (default `https://brainbase-orchestration-mcp.onrender.com`). A base origin: the CLI appends `/t/${BRAINBASE_THREAD_ID}/mcp` itself. |
| `BRAINBASE_TOKEN` | Credential with top priority for control-plane calls. |

The orchestration built-in MCP is always installed alongside an agent's own MCPs. Overrides are read when the CLI writes harness MCP config (`agent pull`, `agent unpack`, `sync`, first install) and land in the generated `.mcp.json` / `mcp.json`; re-run `brainbase agent pull` after changing one. An override receives the agent's token (`Authorization: Bearer ${BRAINBASE_TOKEN}`), so point it only at hosts you trust.

## Inherited resources in agent commands

- `brainbase agent status` lists inherited secret keys by name (with the orchestration they come from), flags a conflicting key, marks an overridden one inline, and shows inherited MCP servers with override or suppression flags.
- `brainbase agent pull` writes only the agent's own secrets to `.brainbase/secrets.env`; inherited keys are not in that file and are not available to a local `brainbase run`. `brainbase agent push` replaces the agent's own secrets from that file and never touches the orchestration's.
- `brainbase mcp list` prints the agent's own rows plus inherited entries marked `inherited from <orchestration>`; the synthesized built-ins (`brainbase-linear`, `brainbase_meeting`, `brainbase_github`) do not appear.
- `brainbase mcp connect` refuses a server the agent inherits from an orchestration, because it is the orchestration's to authorize; do that in the web app. (Orchestration-level OAuth is a v1 non-goal, so such servers use static headers, env or secret references.)
- An inherited server edited locally before `agent push` produces a warning that the edit was not applied anywhere; the inherited definition is never part of the agent's manifest.

## Changelog notes

- 2026-06-04 "Developer Updates": the CLI shows orchestration triggers, including app triggers such as Linear issue updates; UI-built orchestrations pull and push cleanly.
- 2026-07-10 "Fixes and Improvements": org admins can pull orchestration manifests for groups they are not direct members of.
- 2026-09-01 "Share Secrets Across an Orchestration's Agents": `brainbase agent status` lists inherited secrets and conflicts; the local secrets file never receives inherited values.
- 2026-10-30 "Developer Updates": `orchestration delete` asks for confirmation (scripts pass `--yes`) and keeps member agents; `orchestration init` writes a starter manifest.
