Source: https://docs.brainbaselabs.com/cli/commands/auth; https://docs.brainbaselabs.com/cli/commands/token; https://docs.brainbaselabs.com/cli/authentication; https://docs.brainbaselabs.com/cli/commands/team; https://docs.brainbaselabs.com/cli/commands/member; https://docs.brainbaselabs.com/cli/commands/machine; https://docs.brainbaselabs.com/cli/commands/interface; https://docs.brainbaselabs.com/cli/commands/orchestration; https://docs.brainbaselabs.com/cli/concepts/orchestrations
Snapshot: 2026-11-03

# Auth, tokens, teams, members, machines, interfaces, orchestrations

## Contents

- `login` / `logout` / `whoami`
- `token create|list|rename|revoke|clear`
- `team list`
- `member ls`
- `machine ls|rm`
- `interface …` (summary; detail in `brainbase-interfaces`)
- `orchestration …` (summary; concepts in `brainbase-orchestration`)

## `login` / `logout` / `whoami`

```bash
brainbase login                                   # opens the web app, connects this device
brainbase login --web https://app.brainbaselabs.com
brainbase whoami
brainbase whoami --json
brainbase logout                                  # clears ~/.brainbase/auth.json
```

`login` stores the session at `~/.brainbase/auth.json` (mode `0600`) with full scopes; expired access tokens are renewed with the stored refresh token. The CLI has its own session, so browser refreshes do not consume its refresh token and the two never sign each other out (run `brainbase login` once to switch over; changelog, 2026-10-24). Sign-in uses a short code you approve in the browser, so it works on Safari, over SSH and inside containers (changelog, 2026-08-21). Ctrl-C during login saves nothing. `--web <url>` defaults to `https://app.brainbaselabs.com`.

`whoami` shows which credential is active and the current user; an expired session is renewed first, and if renewal fails a usable saved PAT can take over. Exits non-zero when no usable credential remains.

| `whoami --json` field | Meaning |
| --- | --- |
| `credential` | `env_pat`, `session`, `stored_pat`, or `null`. |
| `authenticated` | Whether the active credential can authenticate (false for a malformed or rejected PAT, which is still reported as `credential`). |
| `control_plane` | Whether the active credential is usable against the control plane. |
| `email` / `user_id` | Who it belongs to; `null` when unknown. |
| `expires_at` | Session access-token expiry; `null` unless `credential` is `session`. |
| `token_prefix` | Leading characters of the PAT in use; `null` for a session. |
| `control_plane_url` | Base URL requests go to (with a PAT: the default host or your override). |
| `session.present` / `session.expired` | Whether a session is saved and whether its access token is expired. |
| `session.refreshable` | True only for an expired session that can be renewed and has no recorded permanent refusal. |
| `session.refresh_error` | The last renewal failure, or `null`. |
| `stored_pat` | `{ present, name }` for the saved PAT, even when another credential wins. |
| `reason` | Explanation and next step when a credential cannot be used, else `null`. |

Auth-gated commands include `template`, `skill`, `link`, `unlink`, `sync`, `status`, `token`. `agent env`, `agent init`, `orchestration init` and `run` need no auth. `BRAINBASE_SKIP_AUTH=1` bypasses the local auth gate for development against a stubbed backend (server calls still fail without a credential).

## `token create|list|rename|revoke|clear`

Long-lived personal access tokens (`bbpat_…`) for CI and unattended scripts. Set one as `BRAINBASE_TOKEN` and the CLI skips the on-disk session. Scope semantics in depth: `references/control-plane-api.md` and `brainbase-permissions`.

```bash
brainbase token create --name ci                 # scopes read,publish (the default)
brainbase token create --name ci-readonly --scopes read
brainbase token create --scope publish           # --scope is an accepted alias
brainbase token list
brainbase token rename <token-id> --name ci-deploy
brainbase token revoke <token-id>
brainbase token revoke <token-id> --yes          # required in CI and pipes
brainbase token clear                            # forget the local PAT; does not revoke
```

| Command | Flags and behaviour |
| --- | --- |
| `create` | `--name <label>` (alias `-n`); `--scopes <list>` comma-separated from `read`, `publish`, `admin`, default `read,publish` (`--scope` alias; `--scope=<v>` and `--scopes=<v>` forms parse correctly and malformed input is rejected). Prints the token and saves it to `~/.brainbase/token.json` with the minting account id; if the signed-in account changes mid-creation the token is shown but not saved. |
| `list` | Shows active tokens with scopes. Works with a session or a user-level PAT. |
| `rename <id>` | `--name <label>` (alias `-n`), at most 128 characters, unique among active tokens; prompts without it, exits non-zero naming the flag with no terminal. Revoked and expired tokens cannot be renamed. `--scope`/`--scopes` are refused: scopes are fixed at mint time, so mint a replacement. |
| `revoke <id>` | `--yes`, `-y` confirm without a prompt (required without a terminal). If `~/.brainbase/token.json` holds the revoked key it is cleared too; a different local key is left alone; if the server says the token was already gone while it looked live a moment earlier, the local copy is kept. |
| `clear` | Forget the locally stored PAT without revoking it. |

Creating, renaming and revoking need a login session (a PAT gets `jwt_required`); listing accepts a user-level PAT. `admin` grants nothing today; a token minted with `--scopes admin` alone is refused on writes. The raw mint endpoint defaults to `read` alone, so tokens created outside the CLI may be read-only.

## `team list`

Read-only. Prints every organization you belong to with its teams and their ids (`teams list` is an alias). Every agent lives in a team; this is where `--team <id>` values come from.

```bash
brainbase team list
brainbase team list --org <org-id-or-slug>
brainbase team list --json        # [{ org, teams, error? }]
```

An organization whose teams cannot be loaded is reported in place (on stderr under `--json`) with an `error` field, and the exit is 0 unless no organization could be read at all; check that field when a pipeline needs every organization. Teams are created in the web app; the CLI creates one only through `agent create`'s interactive "+ Create a new team" option.

## `member ls`

Read-only. Each person's email, name, role and teams (`member list` and `members ls` are aliases); the emails `interface access` takes.

```bash
brainbase member ls --org <org-id-or-slug>
brainbase member ls --org <org-id-or-slug> --json   # { org, members: [{ id, email, name, role, teams }] }
```

`--org` is picked automatically when you belong to one organization; otherwise required without a terminal. Owners and admins see everyone; anyone else sees owners, admins, themselves and people who share a team, with teams limited to their own. `email` is null for a member whose sign-in account no longer exists.

## `machine ls|rm`

A machine is the sandbox a task runs in. It bills while it exists, so a sandbox left behind keeps costing until torn down. Providers, sizes and prices: `brainbase-sandboxes`.

```bash
brainbase machine ls             # live machines, newest first (alias: machine list)
brainbase machine ls --all       # include torn-down machines
brainbase machine ls --json
brainbase machine rm <machine-id>
brainbase machine rm <machine-id> --yes
```

Columns: `ID`, `KIND`, `STATUS`, `SIZE`, `AGENT` (name, id, or `-` when unassigned), `AGE`. Age is the number to scan: a days-old sandbox with no task attached is the one costing money.

| Command | Flags |
| --- | --- |
| `ls` | `--all` include torn-down machines (records are kept as cost history and marked dead); `--limit <n>` 1–200, default 50; `--json` raw machine objects. |
| `rm <id>` | `--yes`, `-y` skip the prompt; `--json` the resulting machine object. Confirms unless `--yes` or no terminal. Tearing down a dead machine reports the existing teardown rather than failing. |

Teardown cannot be undone: the environment is destroyed and anything not copied out is gone; if the task is still running, tearing down its machine ends it. Check `brainbase task logs <task-id>` first.

## `interface …`

An interface is a private dashboard for one agent. The CLI does what the agent's Interfaces tab does; commands act as you (agent or sandbox credentials refused). Every subcommand takes `--json` (JSON only, never prompts, refusals as `{"error": {code, reason, message, details}}` with the server's own codes). Commands that change what viewers see or who can see it ask first and need `--yes` without a terminal. Exit codes: `0` done, `1` refused or failed, `130` interrupted (the server keeps working). Full behaviour: `brainbase-interfaces`.

```bash
brainbase interface create --agent <agent-id> --name "Support queue" --people me
brainbase interface build <interface-id> "Show open tickets, oldest first"
brainbase interface preview <interface-id>
brainbase interface publish <interface-id>
brainbase interface open <interface-id>
```

| Subcommand | Flags and notes |
| --- | --- |
| `ls` (alias `list`) | `--agent <id>`; `--archived`; `--only-archived`; `--json`. State is `draft`, `live`, `building` or `archived`; audience "everyone" or "chosen people" (JSON `audience_mode: org` or `users`); JSON includes `org_id` (and `team_id` with the same value). |
| `get <id>` | Address, audience, shared/private threads, live release, draft version, running build conversation. `open <id>` prints the live address (exit 1 when nothing is live). `versions <id>`, `builds <id>`, `releases <id>` list history newest first. |
| `create` | `--name <name>` required; `--agent <id>` (defaults to the claimed manifest); `--address <slug>`; `--everyone` or `--people <emails>` (comma-separated emails, user ids, or `me`); `--idempotency-key <key>`. A new interface opens for nobody until its audience is set; if setting it fails the id is printed and the exit is 1. |
| `access <id>` | No flag shows the audience; `--everyone`; `--people <emails>`; `--add` / `--remove <emails>`; `--yes`. Emails must match `brainbase member ls`; `me` works everywhere with a session but on `create` only with a token (pass your user id). `threads <id> --shared` or `--private` sets whether viewers see every conversation. |
| `build <id> "<message>"` | `--timeout <seconds>` (default 900); `--idempotency-key`; `--json` streams events then one `{"type": "result", ...}` line. Harnesses that can build: Kafka, Claude Code, Codex, Qwen Code, OpenCode. One conversation per interface at a time; answer questions with `brainbase task send`; follow an interrupted run with `brainbase task logs <task-id> --follow`. |
| `preview <id>` | `--task <id>`; `--no-wait`; `--timeout <seconds>` (default 300); `--json` (`{ task_id, preview_url, serving, source, restored, ... }`). Served from the conversation's sandbox at `https://<address>-preview.<domain>` for people who can edit the agent. Sandboxes on Modal cannot show previews. |
| `publish <id>` | `--build <id>`; `--yes`; `--no-wait`; `--timeout <seconds>` (default 300); `--idempotency-key`. Without `--build`, the newest successful build (refused if rolled back or older than the live one). `rebuild <id> [--version <id>]` takes the same wait flags; accepts `--yes` but never asks. |
| `rollback <id> --release <release-id>` | Republish an earlier release as a new one; asks first; `--yes` without a terminal. |
| `rename <id> <name>`, `address <id> <slug>` (confirms; viewers sign in again), `archive <id>`, `unarchive <id>` | Destructive ones need `--yes` without a terminal. |

## `orchestration …`

Create, pull and push multi-agent graphs; `orch` is an alias. Members live under `agents/<slug>/` with their own `brainbase.agent.yaml`. What an orchestration is, edges, triggers and the console: `brainbase-orchestration`. Manifest fields: `references/orchestration-manifest.md`.

```bash
brainbase orchestration init --name "Support Flow"
brainbase orchestration create [--org <id-or-slug> --team <team-id> --yes]
brainbase orchestration list [--org <id-or-slug>] [--team <team-id>] [--json]
brainbase orchestration pull <orchestration-id> [--harness codex --yes]
brainbase orchestration push [--graph-only] [--force] [--yes]
brainbase orchestration status
brainbase orchestration add-agent researcher --from planner --to writer
brainbase orch add researcher --to writer --no-push
brainbase orchestration delete <orchestration-id> [--yes --json]
```

| Subcommand | Flags and behaviour |
| --- | --- |
| `init` | Writes a starter `brainbase-orchestration.yaml` with no members (valid input to `create`); no login, no network. `--name <name>` (defaults to the folder name); `--full` commented template (icon, colour, credit limit, members, edges, schedule triggers); `--minimal` (default); `--force` overwrite (a folder linked to an orchestration is always refused: edit and `push` instead); `--json` prints `{ path, created, name, template }` or `{ path, created: false, reason }`. |
| `create` | Claims the local manifest. Every member needs a linked checkout under `agents/<slug>/`; validates the graph and schedule triggers, attaches members, creates edges, edge settings and schedule triggers, writes gitignored link and sync state. `--org`, `--team`, `--yes`. Requires the MAS `/v2/cli` control plane. |
| `list` | `--org <id-or-slug>`, `--team <id>`, `--json` (array; never prompts, so pass `--team` when ambiguous). The docs note a vocab inversion: `--org` maps to the DB `teams.id`, `--team` to `groups.id`. |
| `pull <id>` | Recursively fetches the graph plus every member. Preserves edge `settings`, materializes member runtime config, writes schedule triggers in normalized form, keeps non-schedule app triggers as read-only context. `--harness <id>` for newly created member folders (default `claude-code`); `--yes`. Partial outcome: how many members landed, the missing ones by name, and push refuses until they are pulled. Org admins can pull manifests for groups they are not direct members of (changelog, 2026-07-10). |
| `push` | Pushes each member (same rules as `agent push`; a member with a reserved block refuses the whole run before anything is pushed; a failed member stops the graph update), then membership, edges, edge settings, schedule triggers. `--graph-only` skips member content; `--force` settles conflicts in the file's favour (cloud's conflicting schedule triggers deleted, metadata `name`, `description`, `icon`, `icon_color`, `credit_limit` overwritten; a field only the cloud changed is never reverted; members still need `agent push --force` in their own folders); `--yes`. Refuses and names each conflict when the cloud holds schedule triggers never pulled or edited since, or metadata changed on both sides. Non-schedule triggers are ignored by push. |
| `status` | Previews membership, edge description/payload/settings and schedule drift (UUID node, active state, normalized config, target edges); reports missing or stale member checkouts and cloud revision drift since the last pull. |
| `add-agent <name>` (alias `add`) | Creates a member agent, wires edges, pushes. `--from <agent>` / `--to <agent>` (repeatable); `--description <text>`; `--schema <json>`; `--harness <id>`; `--org <id>`; `--no-push`; `--yes`. |
| `delete <id>` | Deletes the graph; member agents are kept. Id required, never from the folder. `--yes` required without a terminal; `--json` prints `{ id, kind, name, deleted }` and requires `--yes`. Afterwards delete `.brainbase/orchestration-link.json` before `orchestration create` in that folder. |

Preconditions (exit 1): `push`, `status`, `add-agent` need a folder linked to an orchestration; `pull` needs a link or an id; `create` needs a manifest and no existing link.
