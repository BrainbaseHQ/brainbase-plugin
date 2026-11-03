Source: https://docs.brainbaselabs.com/cli/commands/interface (Command Reference → brainbase interface, condensed in full)
Source: https://docs.brainbaselabs.com/cli/commands/task (`--interface` flags, `task send`), https://docs.brainbaselabs.com/cli/commands (command index, shared flags, confirmation rule), https://docs.brainbaselabs.com/cli/commands/member, https://docs.brainbaselabs.com/cli/reference/exit-codes, https://docs.brainbaselabs.com/cli/reference/control-plane-api
Snapshot: 2026-11-03

# brainbase interface: command reference

Contents: Conventions · Command index · ls, get, open, versions, builds, releases · create · access and threads · build · preview · publish and rebuild · rollback · rename, address, archive, unarchive · Related task commands · member ls · Waits and exit codes · Control-plane note

## Conventions

These commands do from the terminal what the agent's **Interfaces** tab does in the web app: create an interface, build it in a conversation with the agent, publish it, choose who can open it, and roll it back. They act as you; an agent or sandbox credential is refused.

```bash
brainbase interface create --agent <agent-id> --name "Support queue" --people me
brainbase interface build <interface-id> "Show open tickets, oldest first"
brainbase interface preview <interface-id>
brainbase interface publish <interface-id>
brainbase interface open <interface-id>
```

- Every subcommand takes `--json`, which prints only JSON on stdout and never prompts. Under `--json` a refusal prints `{"error": {code, reason, message, details}}`, where `code` and `reason` are the server's own.
- Commands that change what viewers see or who can see it ask first, and need `--yes` when there is no terminal. The command index lists `interface access`, `threads`, `address`, `archive`, `unarchive`, `publish` and `rollback` among the commands that confirm; under `--json`, which never prompts, they need `--yes` as well.
- Exit codes are `0` done, `1` refused or failed, and `130` interrupted; the server keeps working on anything already started.
- `--agent <id>` on `interface ls` and `interface create` filters to, or acts on, that agent; `create` otherwise uses the claimed `brainbase.agent.yaml` in the folder.

## Command index

| Group | Subcommands |
| --- | --- |
| Interfaces | `interface ls` · `get` · `create` · `access` · `build` · `preview` · `publish` · `rollback` · `archive` (command index); also `list`, `open`, `versions`, `builds`, `releases`, `threads`, `rebuild`, `rename`, `address`, `unarchive` (interface page) |

## ls, get, open, versions, builds, releases

`brainbase interface ls` lists the interfaces you can see, with their address, state (`draft`, `live`, `building` or `archived`) and audience. `brainbase interface list` is an alias. Audience is shown as "everyone" or "chosen people"; JSON retains `audience_mode: org` or `audience_mode: users`. Interface JSON includes `org_id`; `team_id` is retained and carries the same organization id. If an empty listing has hidden archived interfaces, the output suggests `--archived`.

```bash
brainbase interface ls
brainbase interface ls --agent <agent-id> --json
```

| Flag | Description |
| --- | --- |
| `--agent <id>` | Only this agent's interfaces. |
| `--archived` | Include archived interfaces. |
| `--only-archived` | Show only archived interfaces. |
| `--json` | Emit the interface objects. |

| Command | What it shows |
| --- | --- |
| `brainbase interface get <id>` | One interface: its address, who can open it, whether viewers see every conversation on the agent, the live release, the draft version, and the conversation building it if one is running. |
| `brainbase interface open <id>` | Prints the live address; exits 1 when nothing is live. |
| `brainbase interface versions <id>` | Version history, newest first. |
| `brainbase interface builds <id>` | Build history, newest first. |
| `brainbase interface releases <id>` | Release history, newest first (release ids for `rollback`). |

## create

Create an interface on an agent. A new interface opens for nobody, and publishing it is refused, until its audience is set, so set it here.

```bash
brainbase interface create --name "Support queue" --everyone
brainbase interface create --agent <agent-id> --name "Ops" --people me,ana@example.com
```

| Flag | Description |
| --- | --- |
| `--name <name>` | Required. |
| `--agent <id>` | The agent. Defaults to the claimed `brainbase.agent.yaml` in this folder. |
| `--address <slug>` | The address. Omitted, the server picks one. |
| `--everyone` | Everyone in the organisation who can use the agent can open it. |
| `--people <emails>` | Only these people: comma-separated emails, user ids, or `me`. |
| `--idempotency-key <key>` | Replay a create whose answer was lost, without creating a second interface. |

If the interface is created but setting its audience fails, the command prints the new id and exits 1, so you can finish with `brainbase interface access`.

## access and threads

With no flag, `access` shows who can open the interface. With a flag, it changes the audience after a confirmation. People in the audience also need access to the agent itself.

```bash
brainbase interface access <interface-id>
brainbase interface access <interface-id> --everyone
brainbase interface access <interface-id> --add ana@example.com,ben@example.com
```

| Flag | Description |
| --- | --- |
| `--everyone` | Open it to the whole organisation. The saved list of people is kept for later. |
| `--people <emails>` | Exactly these people. |
| `--add <emails>` / `--remove <emails>` | Edit the current list. |
| `--yes`, `-y` | Skip the confirmation. Required without a terminal. |

- People are named by email, by user id, or as `me`.
- An email must belong to someone `brainbase member ls` shows you in the interface's organisation; an email that matches nobody is refused and nothing changes.
- The audience is shown as emails where the member list knows them, and `--json` adds a `people` array of `{ id, email, name }`.
- `me` is you. Signed in with `brainbase login` it works everywhere; with a token it works on `create` only, so pass your user id to `access`.
- `brainbase interface threads <id> --shared` or `--private` sets whether viewers see every conversation on the agent or only their own. When it is shared, widening the audience says so before asking.

## build

Start a build conversation on the interface's agent, stream it, then wait for the build of the version that conversation committed. The agent must run a harness that can build interfaces: Kafka, Claude Code, Codex, Qwen Code or OpenCode.

```bash
brainbase interface build <interface-id> "Add a column for the ticket owner"
```

| Flag | Description |
| --- | --- |
| `--timeout <seconds>` | How long to wait for the build. Default 900. |
| `--idempotency-key <key>` | Replay a build whose answer was lost, without opening a second conversation. |
| `--json` | The conversation's events, one per line, then one `{"type": "result", ...}` line. |

- The conversation id prints first, so an interrupted run can be followed with `brainbase task logs <task-id> --follow`.
- Only one conversation can work on an interface at a time; if another holds it, the command names it and stops.
- If the agent stops to ask a question, the command prints it with the `brainbase task send` command to answer.
- `brainbase task create --interface <id>` opens the same kind of conversation without waiting, and `brainbase task list --interface <id>` lists an interface's conversations (see Related task commands).

## preview

See the unpublished draft before publishing, as the **Preview** tab of a build conversation shows it in the web app. The interface is served from the conversation's sandbox, unsaved edits included, at its preview address, `https://<address>-preview.<domain>`. That address opens for people who can edit the agent, after they sign in. Nothing is published, and viewers of the live dashboard see no change.

```bash
brainbase interface preview <interface-id>
brainbase interface preview <interface-id> --task <task-id> --json
```

| Flag | Description |
| --- | --- |
| `--task <id>` | The build conversation to preview. Default: the one running now, else the most recent. |
| `--no-wait` | Print the address at once instead of waiting for the dev server to answer. |
| `--timeout <seconds>` | How long to wait for the dev server. Default 300. |
| `--json` | Emit `{ task_id, preview_url, serving, source, restored, ... }`. |

- The preview address shows whichever conversation was previewed last, so running this moves it.
- A sleeping sandbox is woken first.
- If the conversation's working copy is no longer in its sandbox, the last saved version is shown instead and the command says so.
- Sandboxes on Modal cannot show previews.

## publish and rebuild

Make a build live and wait until it is. With no `--build`, publish the newest build that succeeded. The command warns when that build is not of the current draft, and refuses, asking for `--build`, when that build was rolled back or is older than the one live. Publishing a build that is already live is not an error.

```bash
brainbase interface publish <interface-id>
brainbase interface publish <interface-id> --build <build-id> --yes
```

| Flag | Description |
| --- | --- |
| `--build <id>` | Publish this build. |
| `--yes`, `-y` | Skip the confirmation. Required without a terminal. |
| `--no-wait` | Return the operation at once. |
| `--timeout <seconds>` | How long to wait. Default 300. |
| `--idempotency-key <key>` | Replay a publish whose answer was lost. |

`brainbase interface rebuild <id>` builds the draft again, or a named version with `--version <id>`. It takes `--no-wait`, `--timeout` and `--idempotency-key` the same way. It also accepts `--yes` and `-y` for scripts, though rebuild never asks for confirmation.

## rollback

Republish an earlier release as a new release with a new id. Find release ids with `brainbase interface releases <id>`. The command asks first and needs `--yes` without a terminal.

```bash
brainbase interface rollback <interface-id> --release <release-id>
```

## rename, address, archive, unarchive

| Command | Effect |
| --- | --- |
| `brainbase interface rename <id> <name>` | Changes the name. |
| `brainbase interface address <id> <slug>` | Changes the address after a confirmation; viewers sign in again at the new one. |
| `brainbase interface archive <id>` | Hides an interface (takes it offline and out of the list; see the console reference). |
| `brainbase interface unarchive <id>` | Brings it back as it was. |

## Related task commands

From the `brainbase task` page:

| Command or flag | Description |
| --- | --- |
| `brainbase task create --interface <id> --message "<text>"` | Open the task as a build conversation for this interface. Without `--agent`, the interface's agent is used. `--message` is required; `--wait`, `--timeout <secs>`, `--json`, `--title`, `--model`, `--version` and `--metadata` apply as on any task. |
| `brainbase task list --interface <id>` (alias `task ls`) | Only this interface's build conversations. A plain list hides them. |
| `brainbase task send <task-id> "<text>"` | Send a follow-up message, including while the agent is still running. This is how you answer an agent that stopped to ask a question, for example a build conversation started by `brainbase interface build`. Exits 0 when the message was queued, dispatched, submitted or completed; 1 when unconfirmed, cancelled, failed, or the request errored. Takes `--input-id <uuid>`, `--generation <n>` and `--json`. |
| `brainbase task logs <task-id> --follow` | Follow a build conversation after an interrupted `interface build`. |
| `brainbase task update` metadata | The keys `brainbase_interface_id` and `brainbase_interface_viewer` belong to Brainbase. Setting or removing one is refused with the key named, and nothing is changed. |

## member ls

`brainbase member ls` lists the people in an organization you can see, with the emails `brainbase interface access` takes. Read-only. Aliases: `brainbase member list`, `brainbase members ls`.

```bash
brainbase member ls --org <org-id-or-slug>
brainbase member ls --org <org-id-or-slug> --json
```

| Flag | Description |
| --- | --- |
| `--org <id-or-slug>` | Which organization. Picked automatically when you belong to one; otherwise required without a terminal. |
| `--json` | Emit `{ org, members: [{ id, email, name, role, teams }] }` and nothing else. |

Who is listed matches the web app's member list: owners and admins see everyone; anyone else sees the owners, the admins, themselves and the people who share a team with them. `email` is null for a member whose sign-in account no longer exists.

## Waits and exit codes

| Code | Meaning |
| --- | --- |
| `0` | Done. |
| `1` | Refused or failed (including `open` when nothing is live, `create` when the audience step fails, `build` or `publish` past `--timeout`). |
| `130` | Interrupted with Ctrl-C while waiting. |

From the exit-codes reference, stopping a wait never cancels the work:

| Command | What keeps going after Ctrl-C |
| --- | --- |
| `interface build`, `rebuild`, `publish`, `preview` | The build, publish or preview on the server. |

Default waits: `build` 900 s, `preview` 300 s, `publish` 300 s. `--no-wait` is available on `preview`, `publish` and `rebuild`.

## Control-plane note

The control-plane API page (`/v2/cli`, not the public API) names only one interface touchpoint: `GET /orgs/{org_id}/members` backs the email lookups of `interface create` and `interface access` and requires no scope. It does not document the endpoints the interface commands themselves call; read a failure from the `--json` error object instead. The PAT scopes page names no interface endpoint or scope. The one public-API interface endpoint the docs name is `PUT /v2/interfaces/{interface_id}/address` (see the console reference).
