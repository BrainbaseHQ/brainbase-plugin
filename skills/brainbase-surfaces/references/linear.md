# Linear surface

Source: https://docs.brainbaselabs.com/docs/agent/linear, /docs/agent/surfaces (Set up Linear), /cli/concepts/connecting (Linear, provider setup), /cli/commands/agent (connect, surface, GitHub and Linear setup), /cli/reference/environment, /api (Linear follow-up note), /docs/orchestrations/tools (reserved `brainbase-linear`), /cli/reference/agent-manifest (`capabilities.linear`); changelog 2026-09-10, 2026-09-11
Snapshot: 2026-11-03

Contents: how it works · before you start · connect in the console · connect from the CLI · working with the agent · what the agent can do · settings · connection status · troubleshooting · disconnecting

## How it works

The Linear surface lets a team hand work to an agent without leaving Linear. Connecting installs a private Linear app that acts as a workspace agent and appears in Linear as its own user, so people can delegate issues to it, mention it, and read its updates like a teammate's. Generally available since changelog 2026-09-10 (no beta gate).

1. **You delegate or mention.** Assigning the agent as an issue's delegate, or mentioning it in a comment, opens an agent session on that issue.
2. **Brainbase starts a task.** The issue's title, description and the triggering comment are sent as the first message of a Brainbase task. One issue maps to one task; later sessions on the same issue continue the same conversation.
3. **The agent works and reports.** The session shows a running log; tool calls appear as actions and long steps post a short progress note.
4. **The answer lands in the issue.** The final response is posted into the session; if the agent needs something it asks a question in the session and waits.

One app, one workspace: each agent connects to exactly one Linear workspace through its own private app. For several agents in Linear, connect each separately; each shows up under its own name.

## Before you start

- A **Linear workspace admin** (creating a private app and authorizing it are admin actions).
- Access to edit the agent in Brainbase.
- A supported harness: Linear runs issues on the agent's current harness (Kafka, Claude Code, Codex and the other managed harnesses). The Linear card is hidden for agents still on the legacy platform; migrate first.

## Connect in the console

Open the agent, go to **Surfaces**, expand **Linear**, choose **Set up Linear for <agent name>** to open the **Connect Linear** page. If setup was started but not authorized the link reads **Finish setup**; for an app that needs connecting again it reads **Reconnect** (reconnect defaults to reusing the existing app, showing the previously connected workspace and prefilling the client ID; changelog 2026-09-10).

1. **Create the private app in Linear.** Click **Prepare the app** (Brainbase generates an application manifest: name, icon, callback and webhook addresses, subscribed events), then **Open Linear's application form** (every field prefilled). Review and create; you may change the name or icon. Linear does not allow the word *Linear* in an app name.
2. **Paste what Linear shows you.** Linear shows the **Client ID**, **Client secret** and **Webhook signing secret**; the two secrets are shown only once. Paste all three into the Connect Linear page and click **Save and authorize**. Secrets are encrypted on save and never shown again, in the app or through the API; the fields are excluded from analytics and session replay and not stored in the browser. If you lose a secret, rotate it in Linear and run setup again.
3. **Authorize the app into the workspace.** Saving sends you to Linear's authorization screen; approving installs the app as a workspace agent with permission to read and write issues and to be assigned and mentioned. Back in Brainbase the surface shows **Connected, awaiting the first webhook**; the first event Linear sends (such as your first delegation) switches it to **Connected**.

## Connect from the CLI

Linear has a credentials step like Slack and a browser step like GitHub. The manifest, connect, reconnect and disconnect steps go through the web app and need a `brainbase login` session; unset `BRAINBASE_TOKEN`.

```bash
brainbase agent surface linear manifest --open        # prints the app settings and the Linear page; --output <file> writes them
brainbase agent connect linear --client-id <client-id> # opens Linear's authorization page and waits
brainbase agent surface linear reconnect              # reuse the stored client id
brainbase agent surface linear wait --installation <id>
brainbase agent surface linear status [--installation <id>] [--agent <agent-id>]
brainbase agent surface linear configure --respond-to-every-comment true|false
```

- The client secret and webhook signing secret resolve flag (`--client-secret`, `--webhook-signing-secret`), then `BRAINBASE_LINEAR_CLIENT_SECRET` / `BRAINBASE_LINEAR_WEBHOOK_SIGNING_SECRET`, then JSON on stdin, then a masked prompt. Under `--json` there is no prompt and a secret the command saw is redacted from errors.
- `connect` and `reconnect` print a setup link and a resume command, open the link, and wait (`--timeout <seconds>`, default `600`; `--no-open`; `--no-wait`). Under `--json` they print `{ agent_id, surface, connected: false, pending: true, installation_id, url, next_command }` and exit; run `next_command` to resume, here or on another machine. A timed-out wait exits 1, Ctrl-C 130, both printing the resume command; a revoked, disconnected or failed installation also ends the wait with exit 1.
- `agent connect linear` is shorthand for `agent surface linear connect`.
- While Linear is connected, `agent pull` installs the built-in Linear MCP server alongside the agent's own (host override `BRAINBASE_LINEAR_MCP_URL`, default `https://brainbase-linear-mcp.onrender.com`), and the manifest's `capabilities.linear` reads `true`.

## Working with the agent

**Delegate an issue.** Set the agent as the issue's **delegate**; the human assignee stays. If the issue is in a backlog or to-do state, Brainbase moves it to the team's first in-progress state; issues already in progress, done or canceled keep their state. Put the ask in the issue description (it is the agent's brief); delegating an issue with an empty description makes the agent ask what you want.

**Mention the agent.** Mention it by name in a comment to give an instruction without delegating the whole issue. A mention opens a session in that comment's thread and the agent replies there; mentions inside an existing discussion thread post the answer in that thread and in the agent's own session.

**Continue the conversation.**
- Reply in the session: a follow-up prompt with the full history of the issue's task.
- Several prompts are handled one at a time in order; a prompt sent while the agent works waits for the current turn.
- Answer its questions in the same thread.
- Ordinary comments that do not mention the agent are added as context but do not start a run; the agent sees them next time it works. Turn on **Respond to every comment** to run on every comment.

**Pause and resume.** Remove the agent as delegate to pause it: work already asked for finishes, nothing new starts. Mention it again to continue with the same task and history.

**See the work in Brainbase.** Each session has an **Open in Brainbase** link to the task (full transcript, tool calls, continue from the app). Tasks created from Linear are titled with the issue identifier.

**Where follow-up replies appear.** Follow-ups started from the Brainbase app, API (`POST /v2/tasks/{task_id}/...` input), CLI or MCP continue the same task but are not automatically posted to Linear. Reply in the Linear session to keep the conversation visible there; the agent can still use its Linear tools when asked to make an explicit change or post a comment.

## What the agent can do in Linear

Built-in Linear tools work on any issue in a team the app can access, not only the issue that started the session.

| Capability | What the agent can do |
| --- | --- |
| Read issues | Fetch an issue by identifier, search issues, and list an issue's comments. |
| Understand the workspace | List a team's workflow states, look up people to mention, and see its own activity in the current session. |
| Comment | Post comments on issues and reply in discussion threads, with real @mentions. |
| Change status | Move an issue to any of the team's workflow states, for example to Done when the work is finished. |
| Update fields | Change the title, description, priority, due date, assignee, delegate, project, cycle, and labels. |
| Ask for input | Ask you a question inside the session and wait for the answer. |

The agent cannot create, delete or archive issues, and cannot change team, workspace or app settings. Every write is attributed to the app in Linear's history. Finishing a task does not close the issue: the agent moves an issue to Done only when asked; Brainbase moves an issue on its own only once, from backlog/to-do into progress on first delegation.

## Settings

- **Respond to every comment.** Off by default. Delegations, mentions and session replies always run the agent; ordinary comments are context. On: every human comment on a delegated issue starts a run. CLI: `agent surface linear configure --respond-to-every-comment true|false`.
- **Generic Linear MCP.** If the agent also has a generic Linear MCP server configured, the built-in Linear tools take over while the surface is connected and the surface card says which server is overridden; the generic server stays in the configuration and is used again after disconnecting. (The control plane records the switched-off server in the manifest's do-not-edit state block for the length of a native Linear task; `brainbase-linear` is a reserved built-in name that always wins over any same-named server.)
- **Disconnect.** Removes the app from this agent and stops new work from Linear immediately; run setup again to reconnect.

## Connection status

| Status | Meaning |
| --- | --- |
| Not connected | No Linear app is set up for this agent yet. |
| Waiting for the Linear admin | Credentials are saved; the app has not been authorized into a workspace yet. |
| Connected, awaiting the first webhook | Authorization succeeded. Brainbase is waiting for the first event from Linear, which confirms the webhook is wired correctly. |
| Connected | Linear events are reaching this agent. |
| No recent Linear events | The app is authorized, but nothing has arrived from Linear for a while. Check the app's webhook settings in Linear if you expect traffic. |
| Revoked in Linear | A Linear admin removed the app's authorization. Run setup again to reconnect. |
| Disconnected | The surface was disconnected from Brainbase. |

The console calls out an unfinished OAuth setup separately from a fully connected app (changelog 2026-09-10). `brainbase agent surface linear status` prints `{ agent_id, surface, connected, installation_id, config, capabilities, details }`.

## Troubleshooting

- **"Awaiting the first webhook" for a while.** Brainbase confirms the webhook only when a signed event arrives. In the app's settings in Linear, check that the webhook URL matches the one shown during setup and that the Agent session, App user notification, Permission change, and OAuth authorization categories are enabled. Then delegate a test issue.
- **The agent did not react to my comment.** Comments without a mention are context only. Mention the agent, reply in its session thread, or turn on **Respond to every comment**. Check the agent is still the issue's delegate; removing it pauses the agent until mentioned again.
- **Lost the client secret or webhook signing secret.** Brainbase never shows saved secrets again. Rotate in the app's settings in Linear, then open Connect Linear and run setup again with the new values.
- Stopping a Linear-triggered run cancels it and messages are attributed to their real source (changelog 2026-09-11 fix).

## Disconnecting

```bash
brainbase agent disconnect linear --yes               # --yes required every time; login session, not PAT
brainbase agent surface linear disconnect --yes
```

Never prompts. Stops new work from Linear immediately; run `brainbase agent pull` afterwards to drop the built-in Linear MCP server. Reconnect later with `brainbase agent surface linear reconnect` (stored client id) or a fresh `connect`.

## Best practices (from the docs)

Write the issue description as the brief you would give a teammate, with the outcome and constraints. Keep one piece of work per issue. Use the session thread for follow-ups; mention from a discussion thread when those readers need the answer. Ask the agent to move the issue to Done if it should close the loop. Leave **Respond to every comment** off unless every comment is an instruction. Review the agent's instructions and tools before connecting a workspace where many people can delegate to it.
