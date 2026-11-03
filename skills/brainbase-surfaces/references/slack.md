# Slack surface

Source: https://docs.brainbaselabs.com/docs/agent/surfaces (Set up Slack), /cli/concepts/connecting (Slack, credentials, disconnecting), /cli/commands/agent (connect, surface), /cli/reference/environment (integration credentials, `BRAINBASE_SLACK_MCP_URL`), /docs/agent/workflows (Macro trigger), /docs/aws-marketplace/operations; changelog entries 2026-05-28, 2026-06-04, 2026-06-05, 2026-07-10, 2026-07-18, 2026-07-24, 2026-08-07, 2026-08-21, 2026-08-28, 2026-09-11, 2026-09-18, 2026-09-28, 2026-10-02
Snapshot: 2026-11-03

Contents: what Slack lets people do · setup in the console · setup from the CLI · settings · built-in Slack MCP · behaviour from the changelog · disconnecting · not the Slack surface

## What the Slack surface lets people do

The agent responds in channels, to mentions, and in direct messages. Slack uses a per-agent custom Slack app rather than an OAuth redirect: you create the app in Slack from a manifest Brainbase generates, install it in your workspace, then hand Brainbase the credentials. Each Slack connection reports the workspace behind it (`brainbase agent connections` prints it as `✓ slack  Acme Corp`).

## Setup in the console

1. Open the agent's **Surfaces** area and expand Slack.
2. Create a Slack app at api.slack.com/apps using the agent's manifest (the console shows it; the step-by-step walkthrough names the app, creates it, installs it, then saves credentials, with a note for workspaces that require admin approval; changelog, 2026-07-10).
3. Install the app to your workspace, or request admin approval.
4. Copy the signing secret, bot token, and app ID back into the agent.

The Surfaces page's own advice: enable only channels where the agent should be reachable, use template prompts to guide first-time users, limit available models when a surface needs predictable cost or behaviour, keep high-risk channels off until instructions, tools and permissions are reviewed, and revisit surfaces whenever the audience changes.

## Setup from the CLI

1. Generate the manifest, or copy it from the agent's Slack setup in the web app:

```bash
brainbase agent surface slack manifest --app-name "Release Bot" --output slack-manifest.json
# also: --description <text> --background-color <hex>; without --output it prints the manifest
```

2. Paste the manifest into Slack's app builder and install the app to the workspace. Collect the bot token (`xoxb-…`) from *OAuth & Permissions* and the signing secret from *Basic Information*.

3. Connect. Prefer stdin or environment variables; a command line is readable through `ps` and lands in shell history.

```bash
# both values as JSON on stdin (cleanest for a secret manager)
vault kv get -format=json -field=data secret/slack | brainbase agent connect slack

# environment variables, read without echoing
printf 'Slack bot token: ' >&2;      read -rs BRAINBASE_SLACK_BOT_TOKEN;      echo >&2
printf 'Slack signing secret: ' >&2; read -rs BRAINBASE_SLACK_SIGNING_SECRET; echo >&2
export BRAINBASE_SLACK_BOT_TOKEN BRAINBASE_SLACK_SIGNING_SECRET
brainbase agent connect slack

# one value as a flag, the other on stdin
brainbase agent connect slack --bot-token xoxb-… < signing-secret.txt

# flags (visible in ps and history; avoid outside throwaway shells)
brainbase agent connect slack --bot-token xoxb-… --signing-secret … --app-id <id> --app-name <name>
```

Per value the order is flag, then `BRAINBASE_SLACK_BOT_TOKEN` / `BRAINBASE_SLACK_SIGNING_SECRET`, then stdin, then an interactive prompt; with no terminal the prompt becomes an error naming the other three and nothing is written. The control plane validates the token against Slack before storing anything and reads the workspace identity from Slack's answer. A bad or revoked token fails immediately with the reason. Re-running rotates the stored credentials in place (how you refresh a token); values not passed are preserved, so rotating a token does not blank an `app_id` or `app_name` set in the web app. The equivalent control-plane calls are `PUT /v2/cli/agents/{agent_id}/connections/slack` (body `bot_token`, `signing_secret`, optional `app_id`, `app_name`; `publish` scope) and `PUT .../surfaces/slack` for `agent surface slack connect`.

4. `brainbase agent pull` to install the built-in Slack MCP server locally.

## Settings

```bash
brainbase agent surface slack                      # status: settings, safe identity, capabilities
brainbase agent surface slack configure --stop-policy task_starter|any_instructor --tool-approval autonomous|interactive
```

The CLI reference lists only the flag names and values. The changelog (2026-09-28, beta) describes the behaviours these names line up with: by default only the person who started a task can stop it from Slack, and an optional approval step that pauses a sensitive tool action until someone approves it is off by default. Confirm the exact meaning on the live page before promising a behaviour. The console also has an "instant Slack-reply setting" (changelog, 2026-09-25 mentions it in a bug fix); the docs do not describe it further.

## Built-in Slack MCP

While Slack is connected, `agent pull`, `agent unpack`, `sync` and first install write a built-in Slack connector MCP server into the harness config (host override `BRAINBASE_SLACK_MCP_URL`, default `https://brainbase-slack-mcp.onrender.com`; the CLI appends `/t/${BRAINBASE_THREAD_ID}/mcp` and authenticates with the agent's token). The manifest's `capabilities.slack` is a read-only `true` while the install exists. An agent that cannot see your Slack workspace is usually one with no Slack install rather than a broken harness.

## Behaviour from the changelog

Dates are changelog entries; the docs pages do not describe these in detail.

| Behaviour | Changelog |
| --- | --- |
| Agents in Slack post concise live progress updates, can ask a clarifying question in the thread with a link to the full task, and can be stopped from Slack (by default only by the task starter; an eligible teammate otherwise). Workspaces can turn on an approval step before sensitive tool actions, off by default. **Beta.** | 2026-09-28 |
| Stopping from Slack gives immediate feedback whether it succeeds or is denied; Slack notification links resolve to the correct task | 2026-10-02 |
| Slack and Teams mentions of an agent on Claude Code, Codex or a Brainbase cloud-coding runtime dispatch a background coding task that keeps the thread context and posts results back to the same thread; standard chat agents keep streaming inline | 2026-06-04 |
| The first message in a Slack or Teams thread creates the coding task; later messages in that thread append to and resume the same task; simultaneous follow-ups no longer create duplicates; no orphan threads in Tasks | 2026-06-05 |
| Files attached when kicking off a coding task from Slack are brought into the task workspace | 2026-07-24 |
| Files the agent sends to Slack use the durable delivery pipeline; delegated sub-work finds its way back to the original Slack task and thread | 2026-09-18 |
| Agents read a Slack thread's history once and then follow only new replies, so long threads do not balloon context; Slack macro runs map to a single task and the completion message links to it | 2026-07-18 |
| Replying in a thread the agent started on its own initiative continues the same task | 2026-08-21 |
| Replies are tracked until delivered, with an automatic fallback message if a run fails to reply | 2026-08-28 |
| Replies stay bound to the message that started them across retries; a reply that mentions the app no longer starts extra turns | 2026-09-11 |
| Agents know who sent each message, including across different connected Slack workspaces; agents can open DMs and read thread replies | 2026-08-07 |
| Coding tasks triggered from Slack recover from brief failures instead of dropping or re-running | 2026-09-04 |
| A "Team requests from Slack" switch on the Payments page lets Slack-started conversations request a Link purchase from the wallet owner's wallet (beta; see `brainbase-payments`) | 2026-10-02 |

Slack workflow commands (macros): a workflow's trigger node can be a **Slack Command**, the slash command people type to start it; Kafka-managed Slack apps include the interactivity for input buttons and modals, inputs can be collected inline with a Run button, each run replies exactly once, and modals work for legacy installs without reinstalling (changelog 2026-05-28, 2026-06-05). Workflows belong to `brainbase-orchestration`; the docs' workflows page lists the Macro trigger as "Starts the workflow from a Slack slash command, with optional inputs."

Microsoft Teams appears only in the changelog (2026-06-04, 2026-06-05, "Slack and Teams"). The Surfaces page lists no Teams surface and the CLI has no `teams` surface; check the live docs before promising Teams support.

## Disconnecting

```bash
brainbase agent disconnect slack          # prompts at a terminal
brainbase agent disconnect slack --yes    # no prompt; required with no terminal
brainbase agent disconnect slack --json   # --json authorises it on its own for Slack and meeting
```

Removes the install (`DELETE /v2/cli/agents/{agent_id}/connections/slack`), idempotent. Disconnecting is not revocation: the bot token stays valid at Slack until you revoke it there; if a token has leaked, rotate it in Slack. Run `brainbase agent pull` afterwards to drop the built-in Slack MCP server.

Pinning an agent version never freezes its Slack connection; a revision hash does not change when Slack is connected or disconnected. On an AWS Marketplace appliance the included Slack connector still requires a real Slack app and credentials; a deployed connector is not an installed Slack integration.

## Not the Slack surface

- `brainbase integrations connect slack` connects a Pipedream Slack app account on a Kafka agent's Tools page (actions like `slack.slack-send-message` under Allow/Ask/Deny rules). That is an integration, owned by `brainbase-tools`, not the surface people talk to the agent through.
- A `slack` row in an agent's own MCP list is a custom MCP server, not the built-in connector.
- The tutorials index links a "Slack triage agent" tutorial (`/tutorials/slack-triage-agent`); its page was not in the mirror, so fetch it live if needed.
