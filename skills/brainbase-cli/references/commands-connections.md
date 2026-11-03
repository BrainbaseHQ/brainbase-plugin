Source: https://docs.brainbaselabs.com/cli/commands/agent (connections, connect, disconnect, surface); https://docs.brainbaselabs.com/cli/concepts/connecting; https://docs.brainbaselabs.com/cli/commands/mcp; https://docs.brainbaselabs.com/cli/commands/integrations; https://docs.brainbaselabs.com/docs/agent/integrations-from-code (integrations context, canary)
Snapshot: 2026-11-03

# Connections: `agent connections|connect|disconnect|surface`, `mcp`, `integrations`

## Contents

- Which credential each command accepts
- `agent connections`
- `agent connect <surface>`
- `agent disconnect <surface>`
- `agent surface <surface> <action>`
- Per-surface walkthroughs (Slack, meeting, GitHub, Linear, phone)
- `mcp list` / `mcp connect` / `mcp check`
- `integrations …`
- Asserting connections in CI

What a surface does, and the console side, belongs to `brainbase-surfaces`; MCP servers and Pipedream apps as concepts belong to `brainbase-tools`. Command syntax is here.

## Which credential each command accepts

Most of this group goes through the control plane and accepts a PAT (writes need `publish`; the three surface-settings reads need `read`). These go through the web app and need a `brainbase login` session, refusing a PAT (unset `BRAINBASE_TOKEN` first): `agent connect github`, `agent connect linear`, `agent surface github connect`, `agent surface linear manifest|connect|reconnect|disconnect`, `agent surface phone search|purchase|release`, and every `integrations` command. `BRAINBASE_WEB_URL` picks the web app they call.

## `agent connections`

Read-only. Shows which of the six surfaces (chat, Slack, meeting, GitHub, Linear, phone) the agent is wired to, reading the install records directly (so it can say which workspace or account is behind a `true`). Whether Slack, meeting, GitHub and Linear are connected decides which built-in MCP servers `unpack` installs.

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
| `--agent <id>` | Act on this agent instead of the linked one. |
| `--json` | `{ linked, agent_id, integrations[] }`. An unlinked folder with no `--agent` emits `{ linked: false, integrations: [] }` (no `agent_id`, no `error`) and exits non-zero. |

Each integration carries `name`, `connected`, `detail` (workspace, account, bot name or number) and `manageable_from_cli` (true for all six; an older control plane may send `false` with `unmanageable_reason`, printed in place of a command).

## `agent connect <surface>`

Surfaces: `chat`, `slack`, `meeting`, `github`, `linear`, `phone`. Slack and meeting are handled here; the other four are shorthand for `brainbase agent surface <surface> connect` and take its flags (`chat` turns chat on, `github` and `linear` open provider setup in a browser and wait, `phone` buys a number and needs `--number <number> --yes`).

Slack and meeting are idempotent: re-running rotates stored values (how you refresh a Slack token). Slack credentials are validated against Slack before anything is stored; values you do not pass are preserved. `connect` reads connections first to check the control plane allows the change, so it can fail on an unreachable control plane even with every credential supplied locally.

```bash
vault kv get -format=json -field=data secret/slack | brainbase agent connect slack
brainbase agent connect slack --bot-token xoxb-… --signing-secret …
brainbase agent connect meeting --bot-name "Notetaker"
brainbase agent connect github
brainbase agent connect linear --client-id <client-id>
brainbase agent connect phone --number +14155550123 --yes
```

| Flag | Applies to | Description |
| --- | --- | --- |
| `--bot-token <t>` | slack | Bot token (`xoxb-…`). Also `BRAINBASE_SLACK_BOT_TOKEN`, or stdin. |
| `--signing-secret <s>` | slack | Signing secret. Also `BRAINBASE_SLACK_SIGNING_SECRET`, or stdin. |
| `--app-id <id>` / `--app-name <name>` | slack | Recorded for reference. |
| `--bot-name <name>` | meeting | Display name the agent joins meetings under. Prompted in a terminal; required flag without one. |
| `--bot-image-url <url>` | meeting | Avatar for the meeting bot. |
| `--agent <id>` | all | Act on this agent instead of the linked one. |
| `--json` | all | Emit the resulting state. For `github` and `linear`, print the pending setup link instead of waiting. |

Credentials resolve flag → environment variable → piped stdin → prompt. Piping `{"bot_token":"…","signing_secret":"…"}` keeps both out of `argv` (readable through `ps`); a bare value on stdin fills the single missing field. With no terminal to prompt on, the command exits non-zero naming the other three ways and writes nothing. `BRAINBASE_STDIN_TIMEOUT_MS` (default `5000`, clamped 100ms–10min) bounds how long piped stdin may stay silent; silence after some bytes is an error, never a short read.

Keeping Slack credentials out of history (both are recorded verbatim by a here-string or a typed `export VAR=…`):

```bash
# typed in, without echoing (printf + read -rs is the portable spelling)
printf 'Slack bot token: ' >&2;      read -rs BRAINBASE_SLACK_BOT_TOKEN;      echo >&2
printf 'Slack signing secret: ' >&2; read -rs BRAINBASE_SLACK_SIGNING_SECRET; echo >&2
export BRAINBASE_SLACK_BOT_TOKEN BRAINBASE_SLACK_SIGNING_SECRET
brainbase agent connect slack

# from a secret manager: assign before exporting, so a failed command cannot hand over an empty value
BRAINBASE_SLACK_BOT_TOKEN=$(vault kv get -field=bot_token secret/slack) || exit 1
BRAINBASE_SLACK_SIGNING_SECRET=$(vault kv get -field=signing_secret secret/slack) || exit 1
export BRAINBASE_SLACK_BOT_TOKEN BRAINBASE_SLACK_SIGNING_SECRET
brainbase agent connect slack

# one value as a flag, the other on stdin
brainbase agent connect slack --bot-token xoxb-… < signing-secret.txt
```

## `agent disconnect <surface>`

Revokes an install (for chat, turns chat off). Removes the same record the web app's disconnect removes; idempotent. For `chat`, `github`, `linear`, `phone` it is shorthand for `agent surface <surface> disconnect`. Disconnecting phone releases the number. Disconnecting Slack makes Brainbase forget the credentials but does not revoke them at Slack: rotate a leaked token in Slack.

```bash
brainbase agent disconnect slack
brainbase agent disconnect meeting --yes
brainbase agent disconnect linear --yes
brainbase agent disconnect phone --yes --agent <agent-id>
```

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Slack and meeting: skips the prompt at a terminal, required with no terminal. Chat, GitHub, Linear, phone: required every time. |
| `--agent <id>` | Act on this agent. |
| `--json` | Resulting state only. For Slack and meeting it also authorises the disconnect on its own; the other four still need `--yes`. |

After connecting or disconnecting, run `agent pull` to pick up or drop the matching built-in MCP server locally.

## `agent surface <surface> <action>`

Read and change every setting of one surface and run its provider setup. Action defaults to `status`. Each action prints the surface's state as JSON: `agent_id`, `surface`, `connected`, `installation_id`, `config`, `capabilities`, `details`. `brainbase agent surface --help` prints the full grammar.

```bash
brainbase agent surface slack                     # status
brainbase agent surface github configure --auto-review false --allow-push true
brainbase agent surface meeting image upload avatar.png
brainbase agent surface phone whitelist add +14155550199 --label "On-call"
brainbase agent surface linear status --agent <agent-id>
```

| Action | What it does |
| --- | --- |
| `status` | Effective settings, the safe identity behind the connection, capabilities. GitHub and Linear also take `--installation <id>`. |
| `configure <flags>` | Save only the settings you pass, then show the normalized state. Booleans are `true` or `false`. |
| `connect` | Enable or connect the surface. |
| `disconnect --yes` | Disable or disconnect it. For phone this releases the paid number. |

| Surface | Actions and flags |
| --- | --- |
| `chat` | `configure --enabled true\|false --models <comma-list> --prompts-file <json-file> --computer-panel true\|false --tabs <comma-list>`. An empty list clears it. The prompts file is a JSON array of strings or `{ text, icon }` objects. |
| `slack` | `connect --bot-token <token> --signing-secret <secret> [--app-id <id>] [--app-name <name>]`. `configure --stop-policy task_starter\|any_instructor --tool-approval autonomous\|interactive`. `manifest [--app-name <name>] [--description <text>] [--background-color <hex>] [--output <file>]` prints or writes the Slack app manifest. |
| `meeting` | `connect --bot-name <name> [--bot-image-url <url>]`. `configure --bot-name <name> --bot-image-url <url> --vision true\|false --agent-delegation true\|false`. `image upload <file>` (PNG, JPEG, GIF or WebP, at most 2 MiB) or `image clear`. `calendar status`, `calendar create [--lead-minutes <n>]`, `calendar configure --lead-minutes <n>` (server rounds and clamps to 10–1440 minutes). |
| `github` | `connect [--app-name <name>] [--github-org <slug>]`. `configure --auto-review --mention-chat --review-on-push --blind-to-other-bots --require-posted-review --allow-push`, each `true` or `false`. `wait --installation <id>`. |
| `linear` | `manifest [--output <file>] [--open]`. `connect --client-id <id> [--client-secret <secret>] [--webhook-signing-secret <secret>]`. `reconnect` reuses the stored client id. `configure --respond-to-every-comment true\|false`. `wait --installation <id>`. |
| `phone` | `search [--country <ISO2>] [--area-code <digits>] [--contains <pattern>]` (country defaults to `US`). `purchase <number> --yes`. `release --yes`. `configure --greeting <text>` (empty is valid). `whitelist list`, `whitelist add <number> [--label <text>]`, `whitelist remove <entry-id>`. |

Slack and Linear secrets resolve flag → environment variable (`BRAINBASE_SLACK_BOT_TOKEN`, `BRAINBASE_SLACK_SIGNING_SECRET`, `BRAINBASE_LINEAR_CLIENT_SECRET`, `BRAINBASE_LINEAR_WEBHOOK_SIGNING_SECRET`) → JSON on stdin → masked prompt. Under `--json` there is no prompt and any secret the command saw is redacted from errors.

GitHub and Linear setup: `github connect`, `linear connect`, `linear reconnect` print a setup link and a resume command, open the link, wait until the installation is live, then print its state. Under `--json` they print `{ agent_id, surface, connected: false, pending: true, installation_id, url, next_command }` and exit; run `next_command` (`brainbase agent surface <surface> wait --installation <id>`) to resume, here or elsewhere. `--app-name` and `--github-org` apply only when the agent has no GitHub App yet. An already-connected agent is reported as is.

| Flag | Description |
| --- | --- |
| `--no-open` | Print the link without opening a browser. Implied with no terminal. |
| `--no-wait` | Print the link and the resume command, then exit. |
| `--timeout <seconds>` | How long to wait. Default `600`. Also taken by `wait`. |
| `--installation <id>` | `wait` and `status`: the installation to watch. `wait` defaults to the current one. |

A timed-out wait exits 1, Ctrl-C exits 130; both print the resume command and the browser setup can still finish. A wait also exits 1 if the installation is revoked, disconnected or failed.

Destructive and provider operations: `disconnect`, `phone release`, `phone purchase` need `--yes` every time (terminal, no terminal, `--json`). `phone whitelist remove` is a single step and accepts `--yes` without requiring it. A purchase with an unknown outcome exits 1 with code `purchase_outcome_unknown`; check `brainbase agent surface phone status` before buying again or you may pay for two numbers. An unconfirmed release reports `release_unconfirmed`. Failures: a message on stderr, or `{ "error": "…", "code": "…" }` on stdout under `--json`, exit 1 (130 for an interrupted wait).

## Per-surface walkthroughs

- Slack: a per-agent custom app, no OAuth redirect. (1) `brainbase agent surface slack manifest --app-name "Release Bot" --output slack-manifest.json`, paste into Slack's app builder, install to the workspace. (2) Collect the bot token (OAuth & Permissions) and signing secret (Basic Information). (3) `brainbase agent connect slack` with both. The control plane validates the token against Slack and reads the workspace identity from Slack's answer.
- Meeting: only a display name (and optional avatar). `brainbase agent connect meeting --bot-name "Notetaker"`.
- GitHub: a GitHub App. `brainbase agent connect github [--app-name "Release Bot" --github-org acme]`; in CI, `brainbase agent connect github --json` then `brainbase agent surface github wait --installation <id>`.
- Linear: OAuth app you create in Linear. `brainbase agent surface linear manifest --open`, then `brainbase agent connect linear --client-id <client-id>` (secrets via env or stdin), approve in the browser; `brainbase agent surface linear reconnect` reuses the stored client id.
- Phone: two steps, recurring charges. `brainbase agent surface phone search --area-code 415`, `brainbase agent surface phone purchase +14155550123 --yes`, then `whitelist add`, and `release --yes` to give the number up for good.

## `mcp list` / `mcp connect` / `mcp check`

Inspect and authorize the MCP servers on an agent (the linked one, or `--agent <id>`). `list` reports what the cloud holds; `check` dials the servers now; `connect` runs OAuth for one server. Tokens are never returned, only whether one exists and when it lapses. Declaring an MCP server in the manifest and pushing it configures it; for OAuth-backed servers it does not authorize it.

```bash
brainbase mcp list
brainbase mcp list --agent <agent-id> --json
brainbase mcp connect notion
brainbase mcp connect notion --no-open     # print the link, don't open it
brainbase mcp connect notion --no-wait     # print the link and exit
brainbase mcp connect notion --json        # {link_id, url, expires_at, server}
brainbase mcp check
brainbase mcp check --json
```

```text
✓ linear  remote · authorized · expires in 22h
! notion  remote · needs authorization
✗ sentry  remote · authorization expired — reconnect
! grafana  remote · authorized · unreachable
· filesystem  local · disabled

Run `brainbase mcp connect <name>` to authorize a server.
```

Each line: name, `remote` or `local`, disabled or not, then authorization and reachability as independent facts. A server inherited from an orchestration is marked `inherited from <orchestration>`; the synthesized built-ins (`brainbase-linear`, `brainbase_meeting`, `brainbase_github`) do not appear.

| Authorization state | Meaning |
| --- | --- |
| (none shown) | No OAuth needed: a static header or a local command. |
| `needs authorization` | OAuth-backed and never authorized. |
| `authorized` | A live token, with expiry where known. |
| `authorization expired — reconnect` | The token lapsed or a refresh failed. |

Reachability appears only when the last check did not succeed: `unreachable`, `connection error`, `last check failed to authenticate`, `last check saw an expired token`, `last check inconclusive`, or `last check: <status>`.

`mcp list` flags: `--agent <id>` (given with no value is an error, not a fallback), `--json` (`{ linked, agent_id, servers[] }`; unlinked folder emits `{ linked: false, servers: [] }` and exits non-zero). JSON carries `auth` (`none`, `oauth_required`, `oauth_connected`, `oauth_expired`), `last_status`, `oauth_token_expires_at`. URLs are reduced to origin and path and local commands to the executable; `last_error` is redacted.

`mcp connect <name>` asks Brainbase for a single-use link bound to you and the server, prints it, opens it, and waits while you approve on the provider's consent screen; Brainbase stores the tokens. The server is looked up first, so a typo, a non-OAuth server (`auth: none`), or an inherited server (authorize it in the web app) is refused before a link is minted; an unknown name lists the servers the agent has. Re-running against an authorized server replaces its grant. The link works once and expires after ten minutes; Ctrl-C stops the wait but not the link; a newer authorization for the same server cancels this one. Flags: `--agent`, `--no-open`, `--no-wait` (exit 0, check later with `mcp list`), `--json` (`{ link_id, url, expires_at, server }`, exit 0 at once).

| `mcp connect` exit | Meaning |
| --- | --- |
| `0` | Authorized, or (with `--json` / `--no-wait`) the link was printed. |
| `1` | Failed, declined, superseded, expired, refused, or Brainbase stopped answering. |
| `130` | Ctrl-C. The link keeps working until it expires. |

`mcp check` probes every enabled server through the Brainbase proxy (also runs during sandbox bootstrap; reach for it when a tool call fails rather than a tool being missing). `--json` emits `{ check_status, servers[] }` on one line. Exit code reflects whether the check ran: `0` whenever the probe completed even if every server is unhealthy, `1` only when it could not run. `BRAINBASE_MCP_CHECK_TIMEOUT_MS` (default `8000`) is the per-server wait. It reads `.brainbase/resolved-mcps.json` when no native harness config was written.

## `integrations …`

Manage an agent's Pipedream apps (the Integrations section of the agent's Tools page). Acts on the linked agent unless `--agent <id>`; every subcommand takes `--json`; `integration` is an alias. Needs a login session (refuses with `BRAINBASE_TOKEN` set). Only Kafka agents can use integrations today: on any other agent `list` says so and `--json` carries `permissions_available: false`. The Allow/Ask/Deny model is explained in `brainbase-permissions` and `brainbase-tools`.

```bash
brainbase integrations search gmail            # catalog; needs no linked folder; {apps[]}
brainbase integrations add gmail               # install; an app needing an account runs connect instead
brainbase integrations actions gmail           # action keys and effects: {app, default_effect, app_effect, actions[]}
brainbase integrations deny gmail.send_email   # also allow / ask; bare app name sets the app rule (stored as <app>.*)
brainbase integrations list                    # {agent_id, integrations[], default_effect, permissions_available}
brainbase integrations connect slack [--no-open|--no-wait|--json]
brainbase integrations disconnect gmail --account <account-id> --yes [--json]
brainbase integrations remove gmail            # apps that need no account; {app, removed: true}
```

- `list`: apps, their accounts, the app-level permission; `!` marks an account needing reconnection; `(default)` marks an app with no rule. JSON entries have `app`, `name`, `needs_account`, `accounts[]` (`id`, `name`, `healthy`), `effect` (or `null`).
- `actions <app>`: each action's `key`, `name`, `description`, `effect`, `source` (`action`, `app`, `default`). Use the keys with `allow|ask|deny`.
- `add <app>`: `{ app, name, needs_account: false, added: true }`; apps that need an account go through `connect` with the same flags.
- `connect <app>`: prints a Pipedream Connect link, opens it, waits until a new account appears. Flags `--no-open`, `--no-wait` (exit 0), `--json` (`{ app, url, expires_at }`, exit 0), `--agent`. The wait ends when the account appears (0), the link expires (1), or Brainbase stops answering for five polls in a row (1); Ctrl-C exits 130 and the link keeps working. Treat the link as a credential.
- `disconnect <app>`: deletes the connected account for everyone. `--account <id>` picks one when there are several (otherwise refused with the list); `--yes` required without a terminal; `--json` prints `{ app, account_id, disconnected }` and requires `--yes`.
- `allow|ask|deny <app>[.<action>]`: names are normalized like the web app (lowercased; anything other than letters, digits, `-`, `*` becomes `_`). `--json` prints `{ capability_pattern, effect }`.
- Output and exit codes: `--json` puts every outcome on stdout, failures as `{"error": "…"}`; otherwise failures are a line on stderr. `0` success, `1` any failure, `130` interrupted `connect`. `brainbase integrations --help` exits 0.

Canary only (docs: Integrations from code): CLI 0.54.0 adds `brainbase integrations context create --agent "$AGENT_ID" --application <name> [--max-lifetime 30d] [--json]` and `brainbase integrations context end "$CONTEXT_ID" --reason "…"` for standalone code using an agent's connected apps. Enabled only for selected internal canary agents; requires your own signed-in session (refuses `BRAINBASE_TOKEN` and stored PATs). See `brainbase-tools`.

## Asserting connections in CI

```bash
brainbase agent connections --json \
  | jq -e '.integrations[] | select(.name == "slack") | .connected' \
  || { echo "Slack is not connected"; exit 1; }
```

Do not key a pipeline on `.error` alone: an unlinked folder exits non-zero but prints a normal-looking body with no `error` key. Test the exit code or `.linked`. Two commands sit outside the JSON contract on purpose: `mcp check` prints plain text on stderr with no JSON when the check itself could not run, and an unknown subcommand behaves the same way.
