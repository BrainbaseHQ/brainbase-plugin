# Monitoring: tasks, steering, diagnoses, files, tags, alerts

Source: https://docs.brainbaselabs.com/docs/monitoring/tasks · /docs/monitoring/tags · /docs/agent/integrations
(Needs info for approvals) · /docs/agent/linear (where follow-ups appear) · /api/alerts/* · /api/tasks/* ·
/cli/commands/task · changelog 2026-09-22 "Steer Running Agent Tasks with Follow-Ups and Stop",
2026-09-16 "Attach and Download Files Up to 1 GB", 2026-10-30 "Developer Updates"
Snapshot: 2026-11-03

## Contents

1. The Tasks view
2. Status semantics
3. Steering a running task (follow-up, Stop, Answer)
4. Scheduled continuations (wakeups)
5. Failed task diagnoses and recovery
6. Attachments and task files
7. Execution-setting credentials (strict admission)
8. Tags
9. Alerts (webhooks)
10. CLI and API equivalents

## 1. The Tasks view

"Tasks are the live work history for an agent." Open the agent's Tasks area; filter by status, eval result,
created date, task text, or credits; open a task for its timeline (messages, tool calls, outputs), detail,
evals, the agent version badge, and the **Filesystem** tab. From Tasks you can start new chats, send
follow-ups on open tasks and evaluate performance continuously. "Start with Tasks when you want to
understand what happened in a real run."

## 2. Status semantics

Console statuses: **Running**, **Needs info** (the agent asked a question), **Success**, **Failed**,
**Idle**. API values: `running`, `need_more_info`, `success`, `fail`, `idle`. Needs info also appears when a
Kafka Cloud task pauses for an integration approval (summary **Awaiting integration approval**; answer the
pending request to continue in a new turn, **Stop** cancels it) and, per the CLI docs, when a run hit its
token or turn budget — so `need_more_info` is never a pass. A task "can temporarily remain **Running** after
its agent has finished if the platform could not save the final status"; during recovery a later recorded
result corrects the estimated status without rerunning the instruction.

## 3. Steering a running task

- **Add follow-up:** send another message to a task, including while it is running (changelog 2026-09-22:
  the agent picks it up mid-run; works the same from chat, a workflow connector, the CLI; a follow-up sent
  while the first turn runs on Claude Code now runs instead of being lost, changelog 2026-10-22).
- **Stop:** stops the running agent; the button appears only while there is something to stop. If pressed
  while the agent is starting or finishing, the console briefly retries the same Stop request and never
  switches to stopping a newer run. **Stop requested** on a message records the request, not confirmation;
  if Stop cannot be confirmed the console asks you to try again before sending another message. If the agent
  later reports success for the same turn, a confirmed input shows **Stop requested. The agent later
  reported success.**; the reply stays visible and that input loses Edit, Resend and Dismiss. Undelivered
  messages keep their cancellation and retry controls.
- **Answer:** in Needs info, an **Agent needs more info** banner shows the question; select **Answer** and the
  task resumes.
- Cloudflare agents support follow-ups in the same task after the sandbox sleeps; conversation and
  workspace files remain.
- Follow-ups from the app, API, CLI or MCP to a Linear-created task continue it but do not post to Linear;
  reply in the Linear session to keep it visible there (`brainbase-surfaces`).

## 4. Scheduled continuations (wakeups)

Agents on the current Daytona runtime can schedule a later continuation in the same task. Once registered,
the wakeup survives workspace sleep and runner restarts; a replacement cancels the previous pending one;
Stop cancels pending wakeups; each occurrence is accepted once even if delivery is retried; timers expire
after seven days; started work follows the usual Stop controls.

## 5. Failed task diagnoses and recovery

- Daytona restarts: temporary provider and connection errors are retried before failing, reusing the same
  workspace and its saved files; when the retry budget is exhausted the task records the startup failure.
- A failed task keeps the runner's diagnostic text: the runner-reported error when there is one, otherwise
  the recorded failure reason plus whether the agent or the runtime declared the failure. Failures with no
  explanation state what was observed (declared without a summary, or no terminal event captured) rather
  than staying blank; the diagnosis cannot name a cause the agent did not provide.
- An agent-declared failure is a task outcome, not an incident: recorded on the task, no operational alert.
  Runtime-attributed failures remain alertable. Already-running sandboxes keep the earlier, sparser wording
  for unexplained failures until recycled.
- Service restart: a task can stay Running while Brainbase recovers; accepted messages waiting for setup are
  recovered in batches as capacity allows; new messages start without waiting for the backlog; repeated
  interruptions share a limited retry budget, after which the task shows Failed with an explanation.
- Control-plane restart and the 180-second lease adoption window for follow-ups: see
  `references/universal-harness-api.md` §5.

## 6. Attachments and task files

- Chat attachments on a new chat or follow-up: hosted agents accept up to 1 GiB per file; videos larger
  than 25 MiB are added as workspace files. Upload progress shows per attachment; hosted uploads can be
  cancelled and retried within 24 hours while signed in; after a reload select the originals again (for a
  new chat choose **Resume unfinished upload**); signing out clears recovery data. Downloading a hosted
  attachment from a sent message returns the original upload for as long as the task exists; for the
  agent's edited version use the **Filesystem** tab.
- Task files: the **Filesystem** tab browses the workspace and downloads current contents including edits.
  Outside `Shared/`: uploads and downloads up to 1 GiB per file with upload recovery. Under `Shared/…`:
  uploads up to 25 MiB, downloads up to 50 MiB; shared uploads do not resume after a reload. File-transfer
  and files endpoints: `brainbase-sandboxes`.

## 7. Execution-setting credentials (strict admission)

Strict admission requires both `INTEGRATION_CONTROL_ENABLED=true` and `cutover:strict_admission=true`; off
by default. When on, changing a task's model or replacing its metadata through `PATCH /v2/tasks/{task_id}`
(including `clear_model` and `metadata_patch` entries whose keys start `brainbase_`, `_` or
`orchestration_`, which include evaluation settings and platform state) requires a person's session or
user-wide PAT with manage access; sandbox PATs, other resource-scoped PATs and task keys get `403`
`detail.code: agent_credential_refused` before anything is saved. Task credentials can still rename a task
and edit ordinary labels with `metadata_patch` (`{"metadata_patch":{"set":{"customer":"acme"},"unset":["queue"]}}`);
whole-map `metadata` replacement needs the person credential. Reserved keys stay rejected for everyone. If
the setting cannot be read: `503 origin_unavailable`, `Retry-After: 5`. Do not put a person's credential in
a sandbox; change configuration from the console or a trusted controller. (`brainbase-permissions`)

## 8. Tags

"Tags are labels an agent can apply to threads when it finishes a turn." Console: Agent → Tags → add a
title, slug and description per label → review completed threads to confirm the agent applies them. Uses:
classification (`sales-lead`, `support-issue`, `spam`, `investor-related`), routing, reporting. The slug is
what the agent emits: lowercase with dashes; descriptions say when to apply; keep the set small and
non-overlapping; rename titles freely but treat slugs as stable identifiers. No API or manifest field for
tags is documented.

## 9. Alerts (webhooks)

Signed webhook deliveries scoped to a `team`, `group`, `orchestration`, `agent` or `thread` for an
`event_type` (the docs do not list event types); `POST /v2/alerts` returns the `signing_secret` once;
`GET /v2/alerts/{alert_id}/fires` lists deliveries with `status`, `attempts`, `response_code`,
`response_body`, `error`, `request_body`; `POST …/rotate-secret` invalidates old signatures immediately.
Full fields: `references/universal-harness-api.md` §10. Runtime failures are alertable, agent-declared
failures are not.

## 10. CLI and API equivalents

| Console action | API | CLI |
| --- | --- | --- |
| List / filter tasks | `GET /v2/tasks?agent_id=&metadata=key:value&limit=` | `brainbase task list --agent <id> --metadata k=v` |
| Open a task | `GET /v2/tasks/{task_id}`, `GET …/messages`, `GET …/events` | `brainbase task get`, `brainbase task logs [--follow]` |
| Add follow-up | `POST /v2/tasks/{task_id}/inputs` or `POST …/messages` | `brainbase task send <task-id> "…"` |
| Stop | `POST /v2/tasks/{task_id}/interrupt` (+ `expected_generation`) | `brainbase task stop` |
| Rename / label / change model | `PATCH /v2/tasks/{task_id}` | `brainbase task update [--model|--clear-model]` |
| Delete | `DELETE /v2/tasks/{task_id}` | `brainbase task delete` (asks; `--yes` in scripts) |
| Wait in CI | poll `status` until terminal | `brainbase task create --message … --wait [--timeout]`; exit 0 success, 1 fail/need_more_info/timeout, 130 Ctrl-C |

Flags, JSON shapes and exit codes in full: `brainbase-cli`.
