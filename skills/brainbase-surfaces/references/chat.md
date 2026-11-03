# Chat surface

Source: https://docs.brainbaselabs.com/docs/agent/surfaces, /docs/quickstart (Chat with your agent), /docs/agent-lifecycle/deploying, /docs/monitoring/tasks (steer a running task, chat attachments, task files), /cli/commands/agent (connect, disconnect, surface), /cli/reference/control-plane-api (Surfaces), /docs/harnesses; changelog 2026-06-16, 2026-06-19, 2026-09-16, 2026-10-09
Snapshot: 2026-11-03

Contents: what chat is · turning it on and off · settings · chatting and steering · attachments and files · mobile · choosing a surface when deploying

## What chat is

Chat lets users start direct conversations with the agent in the Brainbase web app. It is the first surface to use: the quickstart's third step is to start a chat, give the agent a real task, and watch whether it follows the instructions, uses the playbook, and asks for missing information instead of guessing. Chats are tasks: the Tasks view lets you start new chats, add follow-ups to open tasks, and review the timeline, messages, tool calls and result. Chat has no manifest capability flag and no built-in MCP server; `brainbase agent connections` reports it as `✓ chat  connected`.

## Turning it on and off

```bash
brainbase agent connect chat                  # turns chat on (shorthand for agent surface chat connect)
brainbase agent surface chat                  # status
brainbase agent disconnect chat --yes         # turns chat off; --yes required every time, never prompts
```

Control plane: `PATCH /v2/cli/agents/{agent_id}/surfaces/chat` (connect and configure; `publish`), `DELETE .../surfaces/chat` (disconnect), `GET .../surfaces/chat` (`read`). All accept a PAT. Against an older control plane that still reserves a surface for the web app, `agent connections` prints that reason instead of a command.

## Settings

The deploying guide: for chat surfaces, configure the available models, template prompts, and computer panel tabs so the first user experience is focused. The Surfaces page adds: use template prompts to guide first-time users toward good starting tasks, and limit available models when a surface needs predictable cost or behaviour.

```bash
brainbase agent surface chat configure \
  --enabled true \
  --models claude-sonnet-5-5,<another-model-id> \
  --prompts-file prompts.json \
  --computer-panel true \
  --tabs <comma-list>
```

| Flag | Meaning |
| --- | --- |
| `--enabled true|false` | Whether chat is on |
| `--models <comma-list>` | Models offered in the composer; an empty list clears it. Model IDs: see `brainbase-llm-gateway` |
| `--prompts-file <json-file>` | Template prompts: a JSON array of strings or `{ text, icon }` objects |
| `--computer-panel true|false` | The side execution (computer) panel |
| `--tabs <comma-list>` | Computer panel tabs; an empty list clears it. The docs do not list the tab names; read them from `status` or the console |

`configure` saves only the flags you pass and prints the normalized state `{ agent_id, surface, connected, installation_id, config, capabilities, details }`. Model pickers are scoped to the runtime family of the surface, so only models compatible with the agent's harness appear (changelog 2026-07-09), and the model for a follow-up can be changed from the composer (changelog 2026-08-21).

## Chatting and steering a task

- **Add follow-up:** send another message to a task, including while it is still running.
- **Stop:** stops the running agent; the button appears only while there is something to stop. **Stop requested** records the request, not confirmation. If Stop cannot be confirmed the console asks you to try again before sending another message. If the agent later reports success for the same turn, the input shows **Stop requested. The agent later reported success.**
- **Answer:** when a task is **Needs info**, an **Agent needs more info** banner shows the question; **Answer** resumes it.
- Status values: **Running**, **Needs info**, **Success**, **Failed**, **Idle**.
- Cloudflare agents support follow-ups in the same task after the sandbox sleeps; Daytona agents can schedule a later continuation in the same task (timers expire after seven days; Stop cancels pending wakeups).

Starting a new task keeps line breaks, and long unbroken text wraps inside the message (changelog 2026-10-09).

## Attachments and files

- Attach files to a new chat or a follow-up. Hosted agents accept files up to 1 GiB each; videos larger than 25 MiB are added as workspace files.
- Files are uploaded into the task workspace and referenced by workspace path, giving the agent direct context for file and vision tools; uploads wait through sandbox startup for a brand-new chat; a failed upload keeps the text and files for retry; attachments on the first message of a new thread carry through into that thread (changelog 2026-06-19).
- Upload progress appears beside each attachment. Hosted uploads can be cancelled and retried within 24 hours while signed in; after a reload select the original files again (for a new chat, first choose **Resume unfinished upload**); Brainbase checks each entire file before resuming. Signing out clears the recovery information.
- Downloading a hosted attachment from a sent message returns the original upload for as long as the task exists; for the agent's edited version use the task's **Filesystem** tab.
- **Filesystem** tab: browse the workspace and download current contents. Files outside `Shared/` support uploads and downloads up to 1 GiB per file; files under `Shared/...` use the shared-folder limits, uploads up to 25 MiB and downloads up to 50 MiB, and shared uploads do not resume after a reload. Expired attachment images refresh automatically (changelog 2026-10-09). Sandbox file details belong to `brainbase-sandboxes`.

## Mobile

The agent chat surface reflows on phones: the task-list sidebar becomes an off-canvas drawer, the conversation goes full-width, the side execution panel is hidden where it cannot fit, the composer is pinned to the bottom and safe-area aware, header actions collapse to icons, list views become stacked cards, and input fields avoid iOS auto-zoom (changelog 2026-06-16).

## Choosing a surface when deploying

Deploying means making the agent reachable outside the setup flow. The deploying guide's order: choose where the agent should run (chat, Slack, phone, meetings, or an orchestration started by a schedule or app event), connect a trigger when the agent should start automatically, and add it to an orchestration when it is part of a larger process. Start with the channel the team will actually use first and expand once behaviour is stable; test against the examples and evaluations that matter before deploying. Deployment is choosing the surface, audience, permissions, trigger and handoff model that match the risk of the work.

Harness constraints to weigh: Kafka (`kafka_cloud`) is built for production agents that need surfaces, orchestrations, triggers and shared team workflows; GitHub work needs a coding harness (Claude Code, Codex); Linear runs on Kafka, Claude Code, Codex and the other managed harnesses and is hidden for legacy-platform agents; on Slack and Teams, coding harnesses dispatch background tasks that reply in-thread while standard chat agents stream inline. Triggers (app events, schedules, webhooks) and their Off / Test / Live modes are `brainbase-orchestration`'s territory.
