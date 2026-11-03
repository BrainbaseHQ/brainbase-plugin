Source: https://docs.brainbaselabs.com/cli/commands/agent; https://docs.brainbaselabs.com/cli/concepts/agents; https://docs.brainbaselabs.com/cli/concepts/syncing; https://docs.brainbaselabs.com/cli/quickstart; https://docs.brainbaselabs.com/docs/orchestrations/secrets (agent status and inherited secrets); https://docs.brainbaselabs.com/docs/orchestrations/tools (inherited MCP servers)
Snapshot: 2026-11-03

# `brainbase agent`, `link`, `sync`, `run`, `agent versions`

## Contents

- The lifecycle
- `agent list`
- `agent init`
- `agent create`
- `agent pull [<id>]`
- `agent push`
- `agent delete <id>`
- `agent status`
- `agent eval list|runs`
- `agent unpack`
- `agent env` and `brainbase run`
- `link` / `unlink` / `status`
- `sync` and tracking
- Runtime configuration (`machine_kind`, `default_model`)
- The entrypoint
- `agent versions` (list, show, diff, label, restore, pin, unpin)
- Removed: `brainbase publish`
- Changelog notes

The committed `brainbase.agent.yaml` is the source of truth; these commands create it in the cloud and keep the two in sync. `agent list` and `agent delete` are the exceptions: one reads a whole team, the other names its agent by id. Connection commands and `agent surface` are in `references/commands-connections.md`.

## The lifecycle

| Command | What it does |
| --- | --- |
| `agent init` | Write an unclaimed manifest into this folder. Offline: no login, no cloud writes. |
| `agent create` | Claim an unclaimed manifest and create the cloud agent, including authored runtime config. Scaffolds the manifest first if the folder has none. |
| `agent push` | Send local manifest changes, including writable `default_model`, to the cloud. |
| `agent pull [<id>]` | Bring cloud content and runtime config into this folder. |
| `agent pull --run-entrypoint` | Pull, then execute the declared entrypoint. |
| `agent status` | Preview content, metadata, secrets and runtime-config drift. |
| `agent unpack` | Install the claimed agent into a harness layout (CLAUDE.md, `.claude/`, etc.). |
| `agent env` | Print export lines for `eval $(brainbase agent env)`. |
| `agent delete <id>` | Permanently delete the cloud agent and every task it has run. Takes the id explicitly, never from the folder. |

A manifest with no `id` is unclaimed; `agent create` claims it by creating the cloud agent and writing `id` back into the file. Once `id` is set, `pull` / `push` / `unpack` operate on that exact agent. `--force` applies to both `pull` (cloud overrides local edits) and `push` (local overwrites cloud); it never makes `machine_kind` writable on an existing agent.

## `agent list`

Read-only. Lists the agents in a team with the ids `link` and `--agent` take.

```bash
brainbase agent list
brainbase agent list --team <team-id>
brainbase agent list --org <org-id-or-slug> --team <team-id>
brainbase agent list --all-teams
brainbase agent list --json
```

Output: first line is the count (`216 agents in Acme → Core`), then per agent: name and slug, tagline, `harness · sandbox provider · default_model` where set, and the id. Ordered by when each agent was granted to the team, newest first.

| Flag | Description |
| --- | --- |
| `--org <id-or-slug>` | Organization to look in. |
| `--team <id>` | Team to look in. Team ids are unique, so this works without `--org`. |
| `--all-teams` | Every team in the selected organization. Cannot be combined with `--team`. |
| `--json` | Emit the agent array and nothing else. Each row has `team_id` and `url` (absolute console link `<console>/agents/<agent>` when the console is known; set `BRAINBASE_WEB_URL` on a token-only on-prem run to get absolute links). |

Without `--team`, `--all-teams` is the default under `--json` or with no interactive terminal (including piped output). Interactive runs select the only team or offer a picker. Pass `--org` when the organization is ambiguous.

## `agent init`

Writes a starter `brainbase.agent.yaml` and stops. No authentication, no API calls, no cloud writes, never prompts: same flags in the same folder always write the same file.

```bash
brainbase agent init
brainbase agent init --name "Repo Assistant" --harness codex
brainbase agent init --full          # commented template, every block
brainbase agent init --json          # print the path and nothing else
```

Starter file: `schema: 1`, `harness: claude-code`, `agent.name` (defaults to the folder name), `agent.tagline: A starter agent.`, `instructions.text: You are a helpful Claude Code agent.`

Harness detection order: the folder (a `.claude` directory, say), then what is installed on the machine, then `claude-code`; the command says which it used.

| Flag | Description |
| --- | --- |
| `--name <name>` | Agent name. Defaults to the folder name. |
| `--tagline <text>` | Short tagline. |
| `--harness <id>` | Target harness instead of detecting one. An unknown id is rejected locally. |
| `--minimal` | The starter manifest (default). |
| `--full` | Commented template covering every block the CLI syncs, optional ones commented out. |
| `--force` | Overwrite an existing manifest. Without it an existing manifest (including legacy `brainbase.yaml`) is refused with a non-zero exit. |
| `--json` | Emit the resulting path and nothing else. |

## `agent create`

Claims an unclaimed manifest, creates the cloud agent, stamps `id` back into the file. Top-level `machine_kind` and `default_model` are applied at creation; `machine_kind` is immutable afterwards. The CLI verifies the control plane applied both; on a mismatch it still writes the new `id` (to prevent a duplicate retry) and exits non-zero with recovery guidance.

Without `default_model` the agent gets the platform default for its harness (the same one the console picks) and the result card shows it; Cursor, Factory and Qoder agents get none. The manifest is not rewritten, so `default_model` stays unmanaged until you add it.

With no manifest in the folder, `create` scaffolds the same starter file `init` writes and carries on (confirms first in a terminal; goes ahead without a TTY).

```bash
brainbase agent create
brainbase agent create --name "Repo Assistant" --tagline "Reviews PRs"
brainbase agent create --org <org-id-or-slug> --team <team-id> --yes
```

| Flag | Description |
| --- | --- |
| `--name <name>` | Agent name (otherwise prompted / read from the manifest). |
| `--tagline <text>` | Short tagline. |
| `--org <id-or-slug>` / `--team <id>` | Create under a specific organization / team. The interactive team picker also offers "+ Create a new team" (the only place the CLI creates teams). |
| `--harness <id>` | Target harness (e.g. `claude-code`). |
| `--track` | Enable tracking non-interactively (off without a TTY). |
| `--no-tracking` | Opt out of routing LLM traffic through Brainbase. |
| `--yes`, `-y` | Skip prompts. Does not decide whether a manifest gets written. |

Partial outcome: `CREATED (NO CONTENT)` means the agent exists and the folder is linked but local content did not upload; the retry is `brainbase agent push`, not `create` again.

## `agent pull [<id>]`

Bring cloud changes into this folder. Pass `<id>` to pull a specific agent into an empty folder; omit it to pull the folder's claimed agent. Pull materializes the reported cloud `machine_kind` and non-null `default_model`; an authored `default_model: null` stays explicit when the cloud model is unset; older control planes that omit these fields do not erase authored values. Pull refuses to overwrite locally edited runtime config unless `--force` is passed. The harness comes from the cloud agent: pull ignores `--harness` and rewrites the manifest's `harness` on every pull.

```bash
brainbase agent pull
brainbase agent pull <agent-id> --force
brainbase agent pull <agent-id> --link --no-tracking
brainbase agent pull --run-entrypoint
```

| Flag | Description |
| --- | --- |
| `--force` | Overwrite local changes with the cloud version. |
| `--run-entrypoint` | Run the entrypoint after pulling (also `BRAINBASE_RUN_ENTRYPOINT=1`). |
| `--link` | Link this folder to the agent first, as `brainbase link --agent <id> --yes` would, then pull, in one process. |
| `--no-tracking` | With `--link`, link without routing LLM traffic through Brainbase. |
| `--scope <s>` | Install scope for the harness files: `global` or `project`. |
| `--yes`, `-y` | Skip confirmation prompts. |

Pull writes `.brainbase/secrets.env` (the agent's own secrets only; inherited orchestration secrets are never written locally), `.brainbase/instructions.md`, `.brainbase/playbooks/`, `.brainbase/entrypoint.sh`, and the harness MCP config including built-ins (so run `agent pull` after connecting or disconnecting a surface to pick up or drop its built-in MCP server). While Linear is connected, pull installs the built-in Linear MCP server alongside the agent's own.

## `agent push`

Send local manifest changes (instructions, entrypoint, playbooks, skills, MCP servers, evals, `default_model`) to the cloud. `default_model: null` clears the override. A changed `machine_kind` is always blocked. Push also stops if the active control plane does not expose an authored runtime field.

```bash
brainbase agent push
brainbase agent push --force
```

| Flag | Description |
| --- | --- |
| `--force` | Overwrite cloud-side content and `default_model` conflicts with local values, and archive cloud evals missing from the manifest even when they have not been pulled; never overrides `machine_kind` immutability. |
| `--yes`, `-y` | Skip confirmation prompts. |

Rules push applies:

- The playbooks and evals lists are authoritative: push sends the whole list, so an entry deleted from the manifest is archived in the cloud. For evals, push names what it will archive, asks first when interactive, and refuses outright if the cloud holds an eval this checkout never pulled (or one edited in the cloud since): run `agent pull` first, or `--force` to make the local list win. A manifest with no `evals` block (or `evals: []`) asserts nothing and leaves cloud evals alone, even under `--force`.
- `capabilities.slack|meeting|github|linear` are reported state; push refuses if what is on disk disagrees with the live connection (pull first).
- A manifest declaring a non-empty `commands`, `hooks` or `files` block is refused before contacting the control plane (reserved fields).
- Inherited orchestration MCP servers are not part of the agent's manifest; push leaves them unchanged and warns if you edited one locally. Push replaces the agent's own secrets from `.brainbase/secrets.env` and never touches the orchestration's.
- A pinned agent keeps running its pinned version; push says so after success. Move the pin with `agent versions pin <version>` or `agent versions unpin`.
- Nothing to push prints `Nothing to push — local is in sync with the cloud.` and exits 0.
- A `409` from the control plane is a `base_revision` conflict: pull, then push again.

## `agent delete <id>`

Permanently deletes a cloud agent and every task it has run. Cannot be undone. The id is required and never taken from the linked folder. Find ids with `agent list`.

```bash
brainbase agent delete <agent-id>
brainbase agent delete <agent-id> --yes
brainbase agent delete <agent-id> --yes --json
```

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Delete without the prompt. Required with no terminal; without it the command exits 1 naming the flag. |
| `--json` | Print `{ id, kind, name, deleted }` and nothing else. Requires `--yes`. |

Tasks are deleted one at a time and deletion stops at the first still-running task (the ones reached before it are already gone). Find running tasks with `brainbase task list --agent <id>` and stop each with `brainbase task stop <task-id>` first; deleting never stops a task. An agent with a benchmark run in progress is refused. If the folder you ran in is linked to the deleted agent, run `brainbase unlink`, after which `brainbase agent create` can recreate the agent from `brainbase.agent.yaml`.

## `agent status`

Preview what would push and what would pull, changing nothing. Distinguishes a blocked `machine_kind` mismatch, cloud provider drift, local or cloud `default_model` drift, and a two-sided model conflict. Lists the evals a push would archive and whether a push would be refused because of unpulled cloud eval changes. Also lists inherited orchestration secrets (by name) with conflicts and overrides flagged, inherited orchestration MCP servers (flagging an override or suppression), and reserved blocks as `ignored`. A judge named by name in `evals` reads as locally modified until the first push rewrites it to an id.

```bash
brainbase agent status
brainbase agent status --json
```

| Flag | Description |
| --- | --- |
| `--json` | Machine-readable report. `evals.archive` lists what a push would archive; `evals.pushBlocked` is true when a push would be refused; `ignored` lists reserved blocks. |

Exits 1 when it cannot reach the control plane, with `--json` or without, so an unreachable control plane never reads as "in sync". Precondition: the folder is linked.

## `agent eval list|runs`

Read-only. `list` shows the eval definitions the cloud holds; `runs` shows verdicts newest first with the judge's reasoning, quotes and task. Definitions are declarative (edit `evals` in the manifest, then `agent push`); there is no run command, the platform scores each finished turn. Model-based evals spend credits (see `brainbase-evals`).

```bash
brainbase agent eval list
brainbase agent eval list --archived
brainbase agent eval runs --limit 20
brainbase agent eval runs --task-id <task-id> --json
```

| Flag | Description |
| --- | --- |
| `--archived` | `list` only. Also show archived evals, marked `(archived)`, `status: archived` in JSON. |
| `--task-id <id>` | `runs` only. Narrow to one task. |
| `--limit <n>` | `runs` only. 1–200, default 50. |
| `--json` | Machine-readable output. |

In `--json`, a verdict's `status` reports whether the judge ran, not what it decided: a failed binary eval is `status: "passed"` with `passed: false`; `status: "errored"` means the judge itself failed and verdict fields are empty.

## `agent unpack`

Install the claimed agent into a harness layout, writing CLAUDE.md, `.claude/`, playbooks and the rest into the paths the harness reads at runtime (see `references/harnesses-and-sync.md`). Runs offline inside a sandbox, which is why connection flags stay in the manifest. Writes `.brainbase/resolved-mcps.json` and `.brainbase/installed-mcps.json`. Precondition: a manifest with an `id`.

```bash
brainbase agent unpack --harness claude-code
brainbase agent unpack --scope project
```

| Flag | Description |
| --- | --- |
| `--harness <id>` | Target harness (e.g. `claude-code`, `codex`, `kafka`). |
| `--scope <s>` | `global` or `project`. |

## `agent env` and `brainbase run`

Both work from `.brainbase/secrets.env` and need no Brainbase auth (they work with an expired session).

```bash
eval $(brainbase agent env)          # load secrets into this shell
brainbase agent env --shell fish
brainbase run npm test               # run a command with secrets loaded
brainbase run -- python main.py --verbose
```

| Flag | Description |
| --- | --- |
| `--shell <sh\|fish>` | `agent env` output format; auto-detected from `$SHELL`. |

`run` passes every argument after the command through verbatim and forwards the child's exit code (`2` no command given, `127` not found on PATH, `1` could not start; signals are re-raised). Inherited orchestration secrets are not in `secrets.env`, so set them yourself for local runs.

## `link` / `unlink` / `status`

`link` attaches the current folder to an existing cloud agent (interactive by default); `status` shows what it is linked to and says when the cloud has changed since your last sync; `unlink` disconnects. `link` and `status` print the console link `<console>/agents/<agent>`. `link` mints an agent key (`bb_live_…`) so the sandbox can call back; `unlink` revokes it. Tracking is on by default at link time.

```bash
brainbase team list                  # which teams can I use?
brainbase agent list --team <id>     # which agents are in one?
brainbase link                       # interactive
brainbase link --agent <id> --yes    # non-interactive
brainbase link --agent <id> --no-tracking
brainbase status
brainbase unlink
```

| Flag | Applies to | Description |
| --- | --- | --- |
| `--agent <id>` | link | Attach to this agent non-interactively. |
| `--no-tracking` | link | Do not route LLM traffic through Brainbase. |
| `--yes`, `-y` | link, unlink | Skip confirmations. Required without a terminal (unlink, and link's unlink / re-link paths are destructive). |

## `sync` and tracking

`sync` reconciles a linked folder with the cloud, pulling skills and instructions a teammate updated while preserving local edits, using the per-component hashes in `.brainbase/sync-state.json`. Nothing new to bring in exits 0 with an informational line. Precondition: the folder is linked.

```bash
brainbase sync
brainbase sync --harness claude-code --scope project
```

Tracking is opt-in routing of a harness's LLM traffic through Brainbase so sessions are searchable and attributed to the agent. Only `claude-code` and `codex` can be tracked; other harnesses reroute nothing even with tracking on. Opt in with `agent create --track` or at `link` (on by default; `--no-tracking` skips). The proxy host is `BRAINBASE_PROXY_URL`; see `brainbase-llm-gateway` for the model proxy itself.

After `agent versions restore` the cloud moves and the folder does not: run `agent pull` before editing or pushing again.

## Runtime configuration (`machine_kind`, `default_model`)

```yaml
schema: 1
machine_kind: daytona
default_model: gpt-5.6-terra
agent:
  name: Repo Assistant
```

Both optional. `machine_kind` selects the sandbox provider at `agent create` (non-empty string; omit to let the platform choose) and is immutable afterwards: a local change blocks push, pull refuses to discard the edit without `--force`, and a cloud-side provider change is pull drift to accept. `default_model`: omit to leave unmanaged, set a model id to create or update the override, `null` to clear it. Ids: up to 128 characters of letters, digits, `.`, `_`, `-`, `:`, `/`. If local and cloud both changed, push stops unless `--force`. Both writes require the MAS `/v2/cli` control plane; the legacy `BRAINBASE_API_URL` path refuses them. Schedules are not agent-level: declare them in `brainbase-orchestration.yaml`. Model ids and defaults per harness: `brainbase-llm-gateway`. Providers: `brainbase-sandboxes`.

## The entrypoint

`entrypoint` (`file`, `commands`, or `text`) is bash that runs in the sandbox after secrets load and `agent pull` completes, before the in-VM runner launches. `agent pull` resolves it into `.brainbase/entrypoint.sh` (0755) and only writes it; `--run-entrypoint` or `BRAINBASE_RUN_ENTRYPOINT=1` executes it during the pull with output in `.brainbase/entrypoint.log`.

## `agent versions`

Brainbase saves a version a few seconds after each change (web app, `agent push`, or API). These commands act on the linked agent unless `--agent <id>`, and act as you: a sandbox or agent credential is refused. A version is named by number (`12` or `v12`) or id. Every subcommand takes `--json` (JSON only, never prompts; human guidance goes in a `notes` array; failures are `{"error": {code, reason, message, details}}` where `details` holds `status`, `retry_after`, and for a partial restore `sections` and `warnings`; local refusals have code `invalid_input` with reasons such as `confirmation_required`, `agent_not_specified`, `invalid_version_ref`).

```bash
brainbase agent versions list
brainbase agent versions list --wait --timeout 120
brainbase agent versions show v12
brainbase agent versions diff v12
brainbase agent versions diff v11 v12
brainbase agent versions diff v11 --current
brainbase agent versions label v12 "baseline" --description "Before the escalation rewrite"
brainbase agent versions restore v12 --dry-run
brainbase agent versions restore v12 --yes
brainbase agent versions pin v12 --yes
brainbase agent versions unpin --yes
```

### list

Every version newest first: number, kind (`auto`, or `rollback` for one made by a restore), label, age, summary. Header names the pinned version; the pinned row is marked `*`. Whole history, no paging; `--json` emits `{ items, pin, capture_pending }`. A version is saved once an edit settles (a few seconds, up to a minute when playbooks change); until then the list says an edit is still being saved. After a push, run `list --wait` before pinning the version you just made.

| Flag | Description |
| --- | --- |
| `--agent <id>` | The agent. Defaults to the linked one. |
| `--wait` | First wait until the latest edit is saved as a version. |
| `--timeout <seconds>` | With `--wait`, default 120. Exits 1 if still saving. |
| `--json` | JSON only. |

`show <version>` prints number, id, kind, label, description, summary, when and by whom (`user`, `agent` or `service`, plus id), where the change came from, and whether it is pinned.

### diff <version> [<version>]

Section by section as the web app shows it: text line by line, configuration field by field, lists entry by entry. `diff v12` compares with the version before; the first version reads as all added. `diff v11 v14` is v11 to v14. `--current` compares one version with the newest. Unchanged text folds to three lines around each change; identical configurations print `none` (a version saved only because a secret value changed looks like this, since secret values are never part of a version); text too long to compare prints line counts. `--json` carries `from`, `to`, `diff.sections`, `totals`, `identical`, `initial`.

### label <version> [<label>]

Name or describe a version; omitted parts stay. Never asks. Label 1–120 characters, description at most 500. Flags: `--description <text>`, `--clear-label`, `--clear-description`.

### restore <version>

Puts the agent back the way it was in that version, for everyone. Saved as a new `rollback` version, so restoring the previously newest version undoes it. Previews warnings first (secrets added since, MCP credentials that need setting again), then asks.

| Flag | Description |
| --- | --- |
| `--dry-run` | Print the warnings and stop. Writes nothing, needs no `--yes`. |
| `--yes`, `-y` | Skip confirmation. Required with no terminal and with `--json`. |
| `--json` | JSON only. |

Result lists each section applied with rows created, updated, deleted, skipped. A restore that stops partway exits 1 naming the applied sections; run it again to finish. If Brainbase asks to retry later, the wait is printed and the command does not retry on its own. If no answer arrives, run `agent versions list` and look for a new rollback version before trying again. Restore changes the cloud, not the folder: `agent pull` afterwards. A pinned agent keeps running the pinned version until unpinned.

### pin <version> / unpin

Pin makes new tasks run that version until unpinned. A pin freezes instructions, entrypoint, installed skills, tools, playbooks, harness and default model; secrets, credentials, machine settings, permission rules, connections and skill contents stay current. Running tasks keep their version. Both ask first and need `--yes` with no terminal or `--json`; both name the current pin and change it only while it is still that version (if someone moved it, nothing changes and the exit is 1; from CLI v0.53.0 per changelog, 2026-10-30). Unpinning an unpinned agent exits 0 with `changed: false` in JSON. `task create --version` overrides a pin for one task.

## Removed: `brainbase publish`

Use `brainbase agent push`. The old name resolves only to point you there and exits non-zero.

## Changelog notes

- 2026-10-30, Developer Updates: `agent versions` family, `task create --version`, `agent list --all-teams`, `brainbase status` reports cloud changes since last sync, confirmations on `agent delete`.
- 2026-09-03, Developer Updates: `agent init` scaffolding, `capabilities.memory`/`browser` pushable, evals block synced by push/pull/status, no silent confirmations without a terminal, no pushing over unseen cloud data.
- 2026-09-01, Share Secrets Across an Orchestration's Agents: `agent status` lists inherited secrets and conflicts.
- 2026-08-21, Developer Updates: push refuses manifests with `commands`/`hooks`/`files` instead of dropping them; `team list` and `agent list` added; browser login via short code (works over SSH and in containers).
- 2026-06-12, Developer Updates: `agent push` writes playbooks; unpinned registry skills resolve to latest on push.
