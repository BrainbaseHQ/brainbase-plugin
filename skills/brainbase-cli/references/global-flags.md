Source: https://docs.brainbaselabs.com/cli/commands (command groups, global flags, destructive commands); https://docs.brainbaselabs.com/cli/reference/environment (non-interactive mode); https://docs.brainbaselabs.com/cli/installation
Snapshot: 2026-11-03

# Command groups, global flags, `--json`, and destructive-command rules

## Contents

- Install and version
- Command groups and aliases
- Global flags
- The `--json` contract
- Destructive commands and non-interactive mode

## Install and version

```bash
npm install -g @brainbase-labs/cli     # pnpm add -g @brainbase-labs/cli also works
brainbase --version                    # also: brainbase -v, brainbase version
brainbase help
```

Requirements: Node.js 18 or newer, and a supported harness in the folder you manage (Claude Code, Codex, Kafka, Qwen Code, OpenCode, OpenClaw, Cursor, Factory Droid, Qoder, Pi). The binary is always named `brainbase`. Mistyped commands get a suggestion (changelog, 2026-10-30: Developer Updates).

## Command groups and aliases

`brainbase <command> [options]`. `brainbase help` prints this same summary.

| Group | Commands |
| --- | --- |
| Auth | `login` · `logout` · `whoami` |
| Teams | `team list` |
| Members | `member ls` |
| Agent | `agent list` · `init` · `create` · `pull` · `push` · `delete` · `unpack` · `status` · `eval` · `env` · `link` · `unlink` · `sync` · `run` |
| Connections | `agent connections` · `agent connect` · `agent disconnect` · `agent surface` |
| Agent versions | `agent versions list` · `show` · `diff` · `label` · `restore` · `pin` · `unpin` |
| Tasks | `task create` · `list` · `get` · `logs` · `send` · `update` · `stop` · `delete` |
| Interfaces | `interface ls` · `get` · `create` · `access` · `build` · `preview` · `publish` · `rollback` · `archive` |
| MCP | `mcp list` · `mcp check` · `mcp connect` |
| Integrations | `integrations list` · `search` · `actions` · `add` · `connect` · `disconnect` · `remove` · `allow` · `ask` · `deny` |
| Templates | `template pack` · `publish` · `search` · `info` · `onboard` · `list` · `remove` |
| Skills | `skill add` · `list` · `update` · `remove` · `search` · `info` · `publish` |
| Orchestrations | `orchestration init` · `create` · `list` · `pull` · `push` · `status` · `add-agent` · `delete` |
| Sandboxes | `machine ls` · `machine rm` |
| Tokens | `token create` · `list` · `rename` · `revoke` · `clear` |

Aliases the docs name: `orch` for `orchestration`; `add` for `orchestration add-agent`; `integration` for `integrations`; `task ls`; `machine list`; `interface list`; `member list` and `members ls`; `teams list`; `agent versions ls` (and bare `agent versions`) for `agent versions list`. `brainbase publish` was removed: the name still resolves, points you to `agent push`, and exits non-zero.

The exit-codes page also names `benchmark run --watch` / `benchmark run watch`, but the command reference documents no `benchmark` group. For benchmark commands open the `brainbase-benchmarks` skill and the live docs.

## Global flags

| Flag | Applies to | Description |
| --- | --- | --- |
| `--yes`, `-y` | most commands | Skip confirmations / auto-overwrite. Required by destructive commands when there is no terminal. |
| `--harness <id>` | onboard, sync, agent init / create / unpack, orchestration pull / add-agent | Force the harness (e.g. `claude-code`). `agent pull` ignores it: the harness comes from the cloud agent. |
| `--scope <s>` | onboard, sync, skill, agent pull / unpack | Force install scope: `global` or `project`. |
| `--agent <id>` | link, task create / list, interface ls / create, mcp list / connect, integrations, agent connections / connect / disconnect / surface, agent versions | On `link`, attach this folder to an existing agent non-interactively. On `task list` and `interface ls`, filter to that agent. Everywhere else, act on that agent instead of the one linked in this folder. |
| `--no-tracking` | link, agent create, agent pull --link | Skip routing LLM traffic through Brainbase. |
| `--link` | agent pull | Link this folder to the agent first, as `brainbase link --agent <id> --yes` would, then pull. |
| `--track` | agent create | Route LLM traffic through Brainbase (off without a TTY). |
| `--shell <sh\|fish>` | agent env | Output format (auto-detected from `$SHELL`). |
| `--all` | template list, machine ls | Include more: other folders' installs, or torn-down machines. |
| `--force` | agent init, orchestration init, agent pull, agent push, orchestration push | On init, overwrite an existing manifest (`orchestration init` still refuses a folder linked to an orchestration); on pull, take cloud runtime/content changes; on push, keep local conflicts (for `orchestration push`, the graph's schedule triggers and metadata). It cannot change `machine_kind`. |
| `--minimal` / `--full` | agent init, orchestration init | Starter manifest (default) or a commented template covering every block. Passing both is an error. |
| `--run-entrypoint` | agent pull | Execute the agent entrypoint after pulling. |
| `--graph-only` | orchestration push | Push members, edges, edge settings and schedule triggers without member-agent content. |
| `--no-push` | orchestration add-agent | Create / wire locally but skip the push. |
| `--web <url>` | login | Web app URL. |
| `--org <id-or-slug>` | team list, member ls, agent list / create, orchestration create / list | Scope to an organization. Omitted, `team list` shows every organization you belong to; the others select a lone one automatically and otherwise ask. |
| `--team <id>` | agent list / create, orchestration create / list | Scope to a team. Team ids are unique, so this works without `--org`. |
| `--json` | whoami, team list, member ls, agent init / list / status / delete / eval / connections / connect / disconnect / surface / versions, orchestration init / list / delete, mcp list / check / connect, integrations, machine ls / rm, task, interface | Machine-readable output and nothing else on stdout. Never prompts: an ambiguous choice or missing value errors instead, and a destructive command needs `--yes` alongside it. On the connection, MCP and integrations commands, failures print `{"error": "…"}`. |
| `--wait` / `--timeout <secs>` | task create, agent versions list | On `task create`, block until the task settles and exit 0 only when it succeeded. On `agent versions list`, wait until the latest edit is saved as a version. `--timeout` bounds the wait and needs `--wait`. |
| `--timeout <secs>` | agent connect github / linear, agent surface github / linear connect / reconnect / wait | How long to wait for provider setup (default `600`). |
| `--no-open` | mcp connect, integrations connect, agent connect github / linear, agent surface github / linear connect | Print the link without opening a browser. Implied when there is no terminal. |
| `--no-wait` | mcp connect, integrations connect, agent connect github / linear, agent surface github / linear connect | Print the link and exit instead of waiting for the outcome. |
| `--account <id>` | integrations disconnect | Which connected account to remove when the app has more than one. |
| `--limit <n>` | task list, task logs, machine ls, agent eval runs | `task list` and `machine ls`: cap the page (1–200). `agent eval runs`: verdicts to fetch (1–200, default 50). `task logs`: stop after `<n>` events, or with `--follow` size the first page before tailing. |
| `--follow`, `-f` | task logs | Stay attached and print events as they land until the task reaches a terminal state. |
| `--bot-token <t>` | agent connect slack | Slack bot token. Also `BRAINBASE_SLACK_BOT_TOKEN`, or piped on stdin. |
| `--signing-secret <s>` | agent connect slack | Slack signing secret. Also `BRAINBASE_SLACK_SIGNING_SECRET`, or piped on stdin. |
| `--app-id <id>` / `--app-name <name>` | agent connect slack | Slack app metadata, recorded for reference. |
| `--bot-name <name>` | agent connect meeting | Display name the agent joins meetings under. |
| `--bot-image-url <url>` | agent connect meeting | Avatar for the meeting bot. |
| `--name` | agent init / create, orchestration init, skill publish, token create / rename | Name / label (alias `-n` for `token create` and `token rename`). |
| `--tagline` | agent init / create | Agent tagline. |
| `--from <agent>` | orchestration add-agent | Source edge into the new agent (repeatable). |
| `--to <agent>` | orchestration add-agent | Edge out of the new agent (repeatable). |
| `--description <text>` | orchestration add-agent | Description for the new member agent. |
| `--schema <json>` | orchestration add-agent | Edge payload schema. |
| `--visibility <s>` | template publish, skill publish | `public`, `unlisted`, or `private`. |
| `--category <s>` | template search, skill search | Filter by category (ignored by `publish`). |
| `--target <id>` | template search | Filter search results by target. |
| `--page <n>` | template search, skill search | Page through search results. |
| `--as <slug>` | skill add | Install the skill under a different slug. |
| `--skill-version <v>` | skill publish | Version to publish (`MAJOR.MINOR.PATCH`). |

## The `--json` contract

- `--json` changes the shape of the output, not the outcome: stdout is valid JSON or empty on failure, and it never turns a failure into a success. Branch on the exit code first, then read the payload.
- `--json` never prompts, even at a real terminal. An ambiguous choice or missing value errors; a destructive command needs `--yes` alongside it.
- Where the reason lands differs per command: many print a plain message on stderr with empty stdout; some exit non-zero and still print a normal payload with a field carrying the answer (`agent status --json` on an unlinked folder, `whoami --json` with no credential); the connection, MCP and integrations commands print `{"error": "…"}`; task, versions and interface commands print `{"error": {code, reason, message, details}}`.
- An unlinked folder with no `--agent` makes `agent connections --json` print `{"linked": false, "integrations": []}` and `mcp list --json` print `{"linked": false, "servers": []}`, with no `agent_id` and no `error` key, and exit non-zero. Test the exit code or `.linked`, never `.error` alone.
- `mcp check` exits `0` whenever the probe ran, even if every server is unhealthy; read `check_status`. When the check itself could not run it prints plain text on stderr with no JSON.
- Piped output drops spinners and colour codes, and most commands share one error shape under `--json`; large output piped into `jq` is no longer cut at 64 KB under Bun (changelog, 2026-10-30: Developer Updates).

## Destructive commands and non-interactive mode

Ordinary confirmation prompts exist to slow a human down; with no terminal (a pipe, a CI job, an agent-driven shell) they resolve to their defaults and carry on. Commands that destroy something do not: without a terminal they need an explicit `--yes` and otherwise exit non-zero naming the flag, rather than reading the absent terminal as a yes.

```bash
$ brainbase token revoke tok_abc123 < /dev/null
Revoking ci-runner (tok_abc123) is destructive and needs confirmation, but
there is no interactive terminal to ask. Pass --yes to revoke it without a
prompt.
$ echo $?
1
```

Covered: `token revoke`, `unlink`, `link` (its unlink and re-link paths), `agent delete`, `orchestration delete`, `task delete`, `agent disconnect`, `integrations disconnect`, `agent versions restore`, `pin` and `unpin`, `interface access`, `threads`, `address`, `archive`, `unarchive`, `publish` and `rollback`, `template remove`, `skill remove`, and `skill add` when it would overwrite an existing skill. In a real terminal nothing changes: you still get the prompt and `--yes` still skips it. Under `--json` the delete, integrations, versions and interface commands need `--yes` as well.

A few never prompt and need `--yes` every time, at a terminal too: `agent surface <surface> disconnect`, `agent disconnect` for `chat`, `github`, `linear` and `phone`, and `agent surface phone purchase` / `phone release` (they start and end recurring charges).

Exception: `agent disconnect --json` for Slack and meeting still goes ahead on its own, because `--json` is a flag you typed and it never prompted at a terminal either. The other four surfaces need `--yes` with `--json` too.

Forcing non-interactive mode: `BRAINBASE_NON_INTERACTIVE=1`, or any non-empty `CI`, makes ordinary prompts auto-resolve to their defaults and destructive commands refuse and name `--yes`, exactly as if no terminal were attached. `machine rm` is the odd one out in the docs: it "confirms before destroying anything unless `--yes` is passed or it is running without a terminal".
