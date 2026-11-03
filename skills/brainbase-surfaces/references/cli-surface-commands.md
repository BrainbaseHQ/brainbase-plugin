# CLI surface commands

Source: https://docs.brainbaselabs.com/cli/commands/agent (connections, connect, disconnect, surface), /cli/concepts/connecting, /cli/reference/control-plane-api (Connections and MCP, Surfaces, Errors), /cli/reference/pat-scopes, /cli/reference/environment, /cli/commands (global flags, destructive commands), /cli/reference/exit-codes, /cli/authentication, /cli/reference/agent-manifest (capabilities)
Snapshot: 2026-11-03

Contents: credentials per command · `agent connections` · `agent connect` · `agent disconnect` · `agent surface` · GitHub and Linear setup · destructive actions · environment variables · control-plane endpoints and scopes · errors · manifest flags and built-in MCP servers · exit codes

## Which credential each command needs

| Commands | Goes through | Accepts |
| --- | --- | --- |
| `agent connections`, `agent surface <s> status|configure`, `agent connect chat|slack|meeting`, `agent disconnect` for every surface except Linear, `phone whitelist *`, `phone configure`, `phone status`, `meeting image|calendar *`, `slack manifest` | Control plane (`/v2/cli`) | PAT (`bbpat_…`) or login session. Writes need `publish`; the three surface reads need `read` |
| `agent connect github`, `agent surface github connect`, `linear manifest`, `linear connect`, `linear reconnect`, `linear disconnect` (and `agent disconnect linear`), `phone search`, `phone purchase`, `phone release` | Web app (`BRAINBASE_WEB_URL`) | `brainbase login` session only; refuses while `BRAINBASE_TOKEN` is set. Unset it first |

An agent task key (`bb_live_…`) is refused on every surface read and write with `CLI task keys cannot manage cloud configuration`. A browser session carries no scope list and is never scope-checked.

Credential precedence for every authenticated command: `BRAINBASE_TOKEN`, then a valid or renewable session in `~/.brainbase/auth.json`, then the PAT saved by `token create` in `~/.brainbase/token.json` (same account only).

## `brainbase agent connections`

Read-only. Shows which of the six surfaces (chat, Slack, meeting, GitHub, Linear, phone) the agent is wired to and the identity behind each: the Slack workspace, the GitHub account, the Linear workspace, the meeting bot's name, the phone number. It reads the installation records directly, not the `*_connected` flags on the agent payload, which is why it covers `chat` and `phone` (no capability flag) and omits `memory` and `browser` (not integrations).

```bash
brainbase agent connections
brainbase agent connections --agent <agent-id>
brainbase agent connections --json
```

```text
✓ chat  connected
    brainbase agent disconnect chat
✓ slack  Acme Corp
    brainbase agent disconnect slack
· meeting  not connected
    brainbase agent connect meeting
· github  not connected
    brainbase agent connect github
· linear  not connected
    brainbase agent connect linear
· phone  not connected
    brainbase agent surface phone search; then brainbase agent surface phone purchase <number> --yes
```

| Flag | Description |
| --- | --- |
| `--agent <id>` | Act on this agent instead of the one linked in this folder. |
| `--json` | Emit `{ linked, agent_id, integrations[] }` and nothing else. An unlinked folder with no `--agent` emits `{ linked: false, integrations: [] }` (no `agent_id`, no `error`) and exits non-zero. |

Each integration carries `name`, `connected`, `detail` and `manageable_from_cli` (true for all six; an older control plane may send `false` with an `unmanageable_reason`, printed in place of a command).

CI assertion:

```bash
brainbase agent connections --json \
  | jq -e '.integrations[] | select(.name == "slack") | .connected' \
  || { echo "Slack is not connected"; exit 1; }
```

Do not key a pipeline on `.error` alone: test the exit code or `.linked`. Under `--json` the connection commands print their result on stdout on success and `{"error": "…"}` on failure, exit non-zero on failure, and never prompt (an automated run fails naming the flag it needed).

## `brainbase agent connect <surface>`

Surfaces: `chat`, `slack`, `meeting`, `github`, `linear`, `phone`. Slack and meeting are handled by this command; the other four are shorthand for `brainbase agent surface <surface> connect` and take its flags: `chat` turns chat on, `github` and `linear` open the provider's setup in a browser and wait, `phone` buys a number and needs `--number <number> --yes`.

```bash
vault kv get -format=json -field=data secret/slack | brainbase agent connect slack
brainbase agent connect slack --bot-token xoxb-… --signing-secret …
brainbase agent connect meeting --bot-name "Notetaker"
brainbase agent connect meeting --bot-name "Notetaker" --bot-image-url https://…
brainbase agent connect github
brainbase agent connect github --app-name "Release Bot" --github-org acme
brainbase agent connect linear --client-id <client-id>
brainbase agent connect phone --number +14155550123 --yes
```

| Flag | Applies to | Description |
| --- | --- | --- |
| `--bot-token <t>` | slack | Bot token (`xoxb-…`). Also `BRAINBASE_SLACK_BOT_TOKEN`, or stdin. |
| `--signing-secret <s>` | slack | Signing secret. Also `BRAINBASE_SLACK_SIGNING_SECRET`, or stdin. |
| `--app-id <id>` | slack | Slack app id, recorded for reference. |
| `--app-name <name>` | slack | Slack app name, recorded for reference. |
| `--bot-name <name>` | meeting | Display name the agent joins meetings under. Prompted at a terminal; without one the command exits non-zero naming the flag. |
| `--bot-image-url <url>` | meeting | Avatar for the meeting bot. |
| `--agent <id>` | all | Act on this agent instead of the one linked in this folder. |
| `--json` | all | Emit the resulting state and nothing else. For `github` and `linear`, print the pending setup link instead of waiting. |

- Resolution per value: **flag, then environment variable, then piped stdin, then an interactive prompt**. With no terminal the prompt becomes an error naming the other three, and nothing is written.
- Stdin: a JSON object `{"bot_token":"…","signing_secret":"…"}` supplies both; a bare value fills the single field still missing (`brainbase agent connect slack --bot-token xoxb-… < signing-secret.txt`). `BRAINBASE_STDIN_TIMEOUT_MS` (default `5000`, clamped 100 ms–10 min) bounds a silent pipe; silence after some bytes is an error, not a short read.
- Slack and meeting `connect` are idempotent: re-running rotates stored values (how you refresh a Slack token). Slack credentials are validated against Slack before storage; the workspace identity is read from Slack's answer. Values you do not pass are preserved (rotating a token keeps `app_id`/`app_name`).
- `connect` reads `connections` first to check the control plane allows the change, so it can fail on an unreachable control plane even with every credential supplied locally.
- GitHub, Linear and phone need a login session (see above).

History-safe forms for Slack (from the docs):

```bash
# typed without echoing (printf is the portable prompt; bash's read -rsp is rejected by zsh)
printf 'Slack bot token: ' >&2;      read -rs BRAINBASE_SLACK_BOT_TOKEN;      echo >&2
printf 'Slack signing secret: ' >&2; read -rs BRAINBASE_SLACK_SIGNING_SECRET; echo >&2
export BRAINBASE_SLACK_BOT_TOKEN BRAINBASE_SLACK_SIGNING_SECRET
brainbase agent connect slack

# from a secret manager: assign before exporting so a failed command cannot pass an empty value
BRAINBASE_SLACK_BOT_TOKEN=$(vault kv get -field=bot_token secret/slack) || exit 1
BRAINBASE_SLACK_SIGNING_SECRET=$(vault kv get -field=signing_secret secret/slack) || exit 1
export BRAINBASE_SLACK_BOT_TOKEN BRAINBASE_SLACK_SIGNING_SECRET
brainbase agent connect slack
```

A here-string is recorded in history verbatim, same as a flag; `export VAR=xoxb-…` typed at a prompt lands in history too.

## `brainbase agent disconnect <surface>`

Revokes an install, or for chat turns chat off. Removes the same record the web app's disconnect removes; idempotent, so disconnecting something never connected still succeeds. For `chat`, `github`, `linear`, `phone` it is shorthand for `brainbase agent surface <surface> disconnect`. Disconnecting phone releases the agent's number.

```bash
brainbase agent disconnect slack
brainbase agent disconnect meeting --yes
brainbase agent disconnect linear --yes
brainbase agent disconnect phone --yes --agent <agent-id>
brainbase agent disconnect slack < /dev/null   # no terminal, no --yes: exits non-zero, install untouched
```

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Confirm. Slack and meeting: skips the prompt at a terminal; required with no terminal. Chat, GitHub, Linear, phone: required every time, terminal or not. |
| `--agent <id>` | Act on this agent instead of the one linked in this folder. |
| `--json` | Emit the resulting state and nothing else. For Slack and meeting it also authorises the disconnect on its own; the other four still need `--yes`. |

Disconnecting Slack makes Brainbase forget the credentials; it does not revoke them at Slack. Run `brainbase agent pull` afterwards to drop the matching built-in MCP server.

## `brainbase agent surface <surface> <action>`

Reads and changes every setting of one surface and runs its provider setup. Action defaults to `status`. Each action prints the surface's resulting state as JSON: `agent_id`, `surface`, `connected`, `installation_id`, `config`, `capabilities`, `details`. `brainbase agent surface --help` prints the full grammar.

```bash
brainbase agent surface slack                     # status
brainbase agent surface github configure --auto-review false --allow-push true
brainbase agent surface meeting image upload avatar.png
brainbase agent surface phone whitelist add +14155550199 --label "On-call"
brainbase agent surface linear status --agent <agent-id>
```

| Action | What it does |
| --- | --- |
| `status` | Effective settings, the safe identity behind the connection, and capabilities. GitHub and Linear also take `--installation <id>`. |
| `configure <flags>` | Save only the settings you pass, then show the normalized state. Booleans are spelled `true` or `false`. |
| `connect` | Enable or connect the surface. |
| `disconnect --yes` | Disable or disconnect it. For phone this releases the paid number. |

| Surface | Actions and flags |
| --- | --- |
| `chat` | `configure --enabled true|false --models <comma-list> --prompts-file <json-file> --computer-panel true|false --tabs <comma-list>`. An empty list clears it. The prompts file is a JSON array of strings or `{ text, icon }` objects. |
| `slack` | `connect --bot-token <token> --signing-secret <secret> [--app-id <id>] [--app-name <name>]`. `configure --stop-policy task_starter|any_instructor --tool-approval autonomous|interactive`. `manifest [--app-name <name>] [--description <text>] [--background-color <hex>] [--output <file>]` prints the Slack app manifest or writes it to a file. |
| `meeting` | `connect --bot-name <name> [--bot-image-url <url>]`. `configure --bot-name <name> --bot-image-url <url> --vision true|false --agent-delegation true|false`. `image upload <file>` (PNG, JPEG, GIF or WebP, at most 2 MiB) or `image clear`. `calendar status`, `calendar create [--lead-minutes <n>]`, `calendar configure --lead-minutes <n>`; the server rounds and clamps lead time to 10–1440 minutes. |
| `github` | `connect [--app-name <name>] [--github-org <slug>]`. `configure --auto-review --mention-chat --review-on-push --blind-to-other-bots --require-posted-review --allow-push`, each `true` or `false`. `wait --installation <id>`. |
| `linear` | `manifest [--output <file>] [--open]`. `connect --client-id <id> [--client-secret <secret>] [--webhook-signing-secret <secret>]`. `reconnect` reuses the stored client id. `configure --respond-to-every-comment true|false`. `wait --installation <id>`. |
| `phone` | `search [--country <ISO2>] [--area-code <digits>] [--contains <pattern>]` (country defaults to `US`). `purchase <number> --yes`. `release --yes`. `configure --greeting <text>` (an empty greeting is valid). `whitelist list`, `whitelist add <number> [--label <text>]`, `whitelist remove <entry-id>`. |

Slack and Linear secrets resolve flag, then environment variable (`BRAINBASE_SLACK_BOT_TOKEN`, `BRAINBASE_SLACK_SIGNING_SECRET`, `BRAINBASE_LINEAR_CLIENT_SECRET`, `BRAINBASE_LINEAR_WEBHOOK_SIGNING_SECRET`), then JSON on stdin, then a masked prompt. Under `--json` there is no prompt, and a secret the command saw is redacted from any error it prints.

## GitHub and Linear setup

`github connect`, `linear connect` and `linear reconnect` print a setup link and a resume command, open the link in your browser, and wait until the installation is live, then print its state. Under `--json` they print `{ agent_id, surface, connected: false, pending: true, installation_id, url, next_command }` and exit without waiting; run `next_command` (`brainbase agent surface <surface> wait --installation <id>`) to pick the wait up again, here or on another machine.

```bash
brainbase agent connect github --json
brainbase agent surface github wait --installation <installation-id>
brainbase agent surface linear manifest --open
brainbase agent connect linear --client-id <client-id>
brainbase agent surface linear reconnect
```

| Flag | Description |
| --- | --- |
| `--no-open` | Print the link without opening a browser. Implied when there is no terminal. |
| `--no-wait` | Print the link and the resume command, and exit. |
| `--timeout <seconds>` | How long to wait. Default `600`. Also taken by `wait`. |
| `--installation <id>` | `wait` and `status`: the installation to watch. `wait` defaults to the agent's current one. |

A timed-out wait exits 1 and Ctrl-C exits 130; both print the resume command, and the browser setup can still finish. A wait also ends with exit 1 if the installation is revoked, disconnected or failed. `--app-name` and `--github-org` apply only when the agent has no GitHub App yet; once it has one, the link goes straight to that App's install page, and an already-connected agent is reported as is with nothing started.

## Destructive actions and provider operations

- `disconnect`, `phone release` and `phone purchase` need `--yes` every time: at a terminal, with no terminal, and with `--json`. They never prompt. `phone whitelist remove` is a single step and accepts `--yes` without requiring it.
- `agent disconnect` for Slack and meeting prompts at a terminal; `--yes` skips it; `--json` authorises it on its own. The general rule (`/cli/commands#destructive-commands`): with no terminal, destructive commands exit non-zero naming `--yes` rather than reading the absent terminal as agreement. `BRAINBASE_NON_INTERACTIVE=1` or any non-empty `CI` forces that behaviour inside a real terminal.
- Provider operations go through the web app, need a `brainbase login` session and refuse a PAT: `github connect`, `linear manifest`, `linear connect`, `linear reconnect`, `linear disconnect`, `phone search`, `phone purchase`, `phone release`. `BRAINBASE_WEB_URL` picks the web app they use.
- A purchase whose result is unclear makes the command check the agent's phone status; if the number did not appear it exits 1 with code `purchase_outcome_unknown` (provisioning may still be running). A release that cannot be confirmed reports `release_unconfirmed`. Reconcile with `brainbase agent surface phone status` before buying again.
- Failures print a message on stderr, or `{ "error": "…", "code": "…" }` on stdout under `--json`, and exit 1; 130 for an interrupted wait.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `BRAINBASE_SLACK_BOT_TOKEN` | Slack bot token (`xoxb-…`) for `agent connect slack`. Overridden by `--bot-token`. |
| `BRAINBASE_SLACK_SIGNING_SECRET` | Slack signing secret for `agent connect slack`. Overridden by `--signing-secret`. |
| `BRAINBASE_LINEAR_CLIENT_SECRET` | Linear OAuth app client secret for `agent connect linear` and `agent surface linear connect` / `reconnect`. Overridden by `--client-secret`. |
| `BRAINBASE_LINEAR_WEBHOOK_SIGNING_SECRET` | Linear webhook signing secret for the same commands. Overridden by `--webhook-signing-secret`. |
| `BRAINBASE_STDIN_TIMEOUT_MS` | How long a piped stdin may stay silent before `agent connect` stops waiting (default `5000`; clamped to 100 ms–10 min). |
| `BRAINBASE_WEB_URL` | Web app used by the provider operations (default `https://app.brainbaselabs.com`; after a login, the console you logged in through). |
| `BRAINBASE_CONTROL_PLANE_URL` | MAS control-plane host; the CLI appends `/v2/cli` (default `https://api.brainbaselabs.com`). |
| `BRAINBASE_TOKEN` | A PAT; overrides the saved session and token file. Unset it for provider operations. |
| `BRAINBASE_NON_INTERACTIVE`, `CI` | Force non-interactive mode: prompts take defaults, destructive commands refuse and name `--yes`. |
| `BRAINBASE_SLACK_MCP_URL` | Override the Slack connector MCP host (default `https://brainbase-slack-mcp.onrender.com`). |
| `BRAINBASE_MEETING_MCP_URL` | Override the meeting connector MCP host (default `https://meeting.mcp.brainbaselabs.com`). |
| `BRAINBASE_GITHUB_MCP_URL` | Override the GitHub connector MCP host (default `https://brainbase-github-mcp.onrender.com`). |
| `BRAINBASE_LINEAR_MCP_URL` | Override the Linear connector MCP host, installed while Linear is connected (default `https://brainbase-linear-mcp.onrender.com`). |

The MCP overrides are base origins; the CLI appends `/t/${BRAINBASE_THREAD_ID}/mcp` itself. They are read when the CLI writes harness MCP config (`agent pull`, `agent unpack`, `sync`, first install), so changing one needs a new `brainbase agent pull`. Every built-in MCP entry authenticates as `Authorization: Bearer ${BRAINBASE_TOKEN}` and the host is not validated: point them only at hosts you trust.

## Control-plane endpoints and scopes

All relative to `https://api.brainbaselabs.com/v2/cli` (also served under `/api/cli`). Not part of the versioned public API; it can change with the CLI. Bearer token: PAT or session access token.

| Endpoint | Used by | Scope |
| --- | --- | --- |
| `GET /agents/{agent_id}/connections` | `agent connections`, `agent connect` | none |
| `PUT /agents/{agent_id}/connections/slack` | `agent connect slack` | publish |
| `DELETE /agents/{agent_id}/connections/slack` | `agent disconnect slack` | publish |
| `PUT /agents/{agent_id}/connections/meeting` | `agent connect meeting` | publish |
| `DELETE /agents/{agent_id}/connections/meeting` | `agent disconnect meeting` | publish |
| `GET /agents/{agent_id}/surfaces/{surface}` | `agent surface <surface> status`, and the waits and checks of other actions | read |
| `PATCH /agents/{agent_id}/surfaces/{surface}` | `agent surface <surface> configure`, `agent connect chat`, `meeting image clear` | publish |
| `DELETE /agents/{agent_id}/surfaces/{surface}` | `agent surface <surface> disconnect` for chat, Slack, meeting and GitHub | publish |
| `PUT /agents/{agent_id}/surfaces/slack` | `agent surface slack connect` | publish |
| `PUT /agents/{agent_id}/surfaces/meeting` | `agent surface meeting connect` | publish |
| `POST /agents/{agent_id}/surfaces/meeting/image` | `agent surface meeting image upload` | publish |
| `GET /agents/{agent_id}/surfaces/meeting/calendar` | `agent surface meeting calendar status` | read |
| `POST /agents/{agent_id}/surfaces/meeting/calendar` | `agent surface meeting calendar create` | publish |
| `PATCH /agents/{agent_id}/surfaces/meeting/calendar` | `agent surface meeting calendar configure` | publish |
| `GET /agents/{agent_id}/surfaces/phone/whitelist` | `agent surface phone whitelist list` | read |
| `POST /agents/{agent_id}/surfaces/phone/whitelist` | `agent surface phone whitelist add` | publish |
| `DELETE /agents/{agent_id}/surfaces/phone/whitelist/{entry_id}` | `agent surface phone whitelist remove` | publish |

- `GET .../connections` reports all six surfaces with `manageable_from_cli` (and `unmanageable_reason` on an older control plane). The `connections/slack` and `connections/meeting` routes back `agent connect` / `disconnect` for those two; the other four go through the surface routes.
- Both connection `PUT`s are idempotent and rotate credentials in place. Slack takes `bot_token` and `signing_secret` (plus optional `app_id`, `app_name`); meeting takes `bot_name` and optional `bot_image_url`. `DELETE` removes the install rather than deactivating it.
- Surface state: `{ agent_id, surface, connected, installation_id, config, capabilities, details }`. `GET` takes `installation_id` for GitHub and Linear; `PATCH` saves only the fields sent and, for GitHub and Linear, needs the `installation_id` it applies to.
- Surface routes accept a user-wide or agent-bound credential and refuse a thread-bound one with `Surface settings require a user or agent credential`. Provider consent and provisioning are not on the control plane.
- `PUT /agents/{agent_id}` deliberately cannot write `slack_connected`, `meeting_connected`, `github_connected`; `GET .../revision` does not cover integrations, so connecting or disconnecting Slack leaves the revision unchanged.
- The connection routes shipped after the commands: the CLI translates an unrouted `404` into "this control plane does not support reading or changing connections yet"; a `404` with `{"detail":"Agent not found"}` is passed through.

## Errors

| Status / code | Meaning |
| --- | --- |
| `401` `missing bearer token` | No `Authorization` header. |
| `401` `invalid or expired PAT` | Token revoked, expired or mistyped. |
| `403` `PAT lacks required scope: publish` | Read-scoped PAT on a write; nothing modified. |
| `403` `PAT lacks required scope: read` | PAT without `read` on one of the three surface reads. |
| `403` `CLI task keys cannot manage cloud configuration` | Agent task key (`bb_live_…`) on a write or surface read. |
| `403` `Surface settings require a user or agent credential` | Thread-bound credential on a surface route. |
| `404` `Agent not found` | No such agent, or the caller cannot reach it (indistinguishable by design). |
| `404` `Not Found` | Path not routed: usually a control plane older than the command. |
| `422` | Body or query parameter failed validation. |
| `purchase_outcome_unknown`, `release_unconfirmed` | Phone purchase or release result unclear; exit 1; check `phone status`. |

## Manifest flags and built-in MCP servers

`brainbase.agent.yaml` `capabilities` has six fields of two kinds: `memory` and `browser` are settings (edit, then `agent push`); `slack`, `meeting`, `github`, `linear` are read-only reports that an active install exists (default off), changed only by `agent connect` / `disconnect`. `agent pull` refreshes them; `agent push` refuses if what is on disk disagrees with the live connection. They stay in the file because `unpack` runs offline in a sandbox. While `linear` is on, `unpack` installs the built-in Linear MCP server; the Slack, meeting and GitHub built-ins appear only while that connection is active. Run `brainbase agent connections` to see which. The synthesized built-ins (`brainbase-linear`, `brainbase_meeting`, `brainbase_github`) do not appear in `brainbase mcp list`; `brainbase-linear` always wins over any same-named server, and an agent's own enabled server of the same name overrides the optional `brainbase_meeting` / `brainbase_github` built-ins. A pin freezes the agent's definition, not its Slack, GitHub and meeting connections.

## Exit codes

`0` success or nothing to do (disconnecting something never connected is success); `1` failure, including unmet preconditions such as an unlinked folder, a timed-out wait, a revoked or failed installation, `purchase_outcome_unknown`; `130` Ctrl-C during `agent connect github|linear`, `agent surface github|linear connect|reconnect|wait` (the setup in the browser keeps going and the resume command is printed). `--json` changes the shape, never the outcome: stdout is valid JSON or empty on failure.
