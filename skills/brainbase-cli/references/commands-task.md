Source: https://docs.brainbaselabs.com/cli/commands/task; https://docs.brainbaselabs.com/docs/models (task update --model); changelog 2026-10-30 Developer Updates, 2026-09-22 Steer Running Agent Tasks, 2026-08-14 Fixes and Improvements
Snapshot: 2026-11-03

# `brainbase task`

## Contents

- Overview and credentials
- `task create`
- `task list`
- `task send`
- `task stop`
- `task get`
- `task update`
- `task delete`
- `task logs` (and `--follow`)
- Dispatch and assert in CI
- JSON errors

## Overview and credentials

`create` starts a task and its first run; `list`, `get` and `logs` are read-only. Every subcommand takes `--json` and works without a TTY. A task spends credits (the run, its sandbox, and any eval judges); what a task is and how it is monitored is in `brainbase-platform`.

Task commands, including eval verdicts on `task get`, use the saved PAT when the login session cannot be used. In CI set `BRAINBASE_TOKEN` to select a PAT ahead of either saved credential; a PAT stored by `token create` is not enough on its own there. Updating a task needs edit access to its agent (with a PAT, the `publish` scope).

## `task create`

Create a task on an agent and start its first run. Without `--agent`, the agent claimed in `brainbase.agent.yaml` is used.

```bash
brainbase task create --message "triage the open PRs"
brainbase task create --agent <agent-id> --message "triage the open PRs"
brainbase task create --message "run the smoke suite" --wait
brainbase task create --message "replay yesterday's ticket" --version v11
brainbase task create --message "run the smoke suite" --metadata env=staging --metadata owner=ci
brainbase task create --message "run the smoke suite" --wait --timeout 900 --json
```

```text
Task ID: 09d61d87-311a-414e-b6e2-76376b5eaf21
Agent ID: 2ff01836-b183-478b-89d5-cd2f77118c25
Status: initializing
First run accepted.
```

| Flag | Description |
| --- | --- |
| `--message <text>` | Required. The first user message. |
| `--agent <id>` | Override the agent claimed in `brainbase.agent.yaml`. |
| `--title <text>` | Optional task title. |
| `--model <id>` | Model override for this task only. |
| `--version <version>` | Run a saved agent version: `12`, `v12` or a version id. Overrides a pin for this task. `--json` adds `agent_version_id` and `version_number`. |
| `--interface <id>` | Open the task as a build conversation for this interface. Without `--agent`, the interface's agent is used. |
| `--metadata key=value` | Label the task. Repeatable; splits on the first `=`; each key once. |
| `--wait` | Block until the task reaches a terminal status, then exit accordingly. |
| `--timeout <secs>` | Give up waiting after `<secs>` and exit 1. Requires `--wait`. |
| `--json` | Emit one JSON object and nothing else. |

Without `--wait` the command prints the task id and exits; the run continues on the platform. With `--wait` it polls, printing each status change, and the exit code reports the outcome. `--version` looks the version up before creating anything (an unknown version creates no task) and freezes the version's instructions, entrypoint, installed skills, tools, playbooks, harness and default model, while secrets, credentials, machine settings, permission rules, connections and skill contents stay current. Only your own login or token can choose a version.

Exit codes with `--wait`:

| Code | Meaning |
| --- | --- |
| `0` | The task finished as `success`. |
| `1` | The task finished as `fail` or `need_more_info`, or `--timeout` elapsed. |
| `130` | Ctrl-C. The task keeps running. |

`need_more_info` is not a pass: the agent stopped mid-work and needs something from you, including a run that hit its token or turn budget. Giving up on `--timeout` is not observing a pass either.

Under `--json --wait` exactly one line prints after the task settles:

```json
{
  "task_id": "09d61d87-311a-414e-b6e2-76376b5eaf21",
  "agent_id": "2ff01836-b183-478b-89d5-cd2f77118c25",
  "status": "success",
  "outcome": "terminal",
  "exit_code": 0
}
```

`outcome` is `terminal` (settled), `timeout` (`--timeout` elapsed) or `interrupted` (Ctrl-C).

## `task list`

Recent tasks you can reach, newest first; metadata only (`task ls` is an alias).

```bash
brainbase task list
brainbase task list --agent <agent-id> --limit 20
brainbase task list --json
brainbase task ls --interface <interface-id>
brainbase task list --metadata env=staging --metadata owner=ci
```

Each entry prints status and title, the task id, then `agent <id> · created <timestamp>`.

| Flag | Description |
| --- | --- |
| `--agent <id>` | Only this agent's tasks. Omitted, every task you can reach. |
| `--interface <id>` | Only this interface's build conversations (a plain list hides them). |
| `--metadata key=value` | Only tasks carrying this label. Repeatable; a task must carry every label given. A key containing `:` cannot be filtered on. |
| `--limit <n>` | 1–200; server default 50. |
| `--json` | Emit the task array and nothing else. |

## `task send`

Send a follow-up message, including while the agent is still running. This is how you answer an agent that stopped to ask a question (for example a build conversation started by `brainbase interface build`).

```bash
brainbase task send <task-id> "Use the ticket owner's display name"
```

| Flag | Description |
| --- | --- |
| `--input-id <uuid>` | Recover a send whose answer was lost, using its original id and the identical message. |
| `--generation <n>` | When retrying, pass the generation the first attempt printed. Omitted, a fresh one is read. |
| `--json` | Emit the receipt, including `expected_generation`. |

Exits 0 when the message was queued, dispatched, submitted or completed; 1 when unconfirmed, cancelled, failed, or the request errored.

## `task stop`

Stop a task's running execution and cancel any follow-ups still waiting. A cancelled follow-up keeps its text but a later message does not replay it. Before stopping, the command prints the task's generation and the exact retry command on stderr. A stop covers the task as it stood at that generation, so a follow-up sent after it is not cancelled. If a stop is interrupted or unconfirmed, run the printed command with the same `--generation` rather than a fresh stop that could cancel newer work. A turn still starting or finalizing cannot be stopped yet: wait a second and retry.

```bash
brainbase task stop <task-id>
brainbase task stop <task-id> --generation 3
```

```text
Task ID: 4aac86b3-7c1e-4f5a-9d2b-3e8f6a1c0b57
Status: success
Stop generation: 3
Cancelled follow-ups: 0
```

| Flag | Description |
| --- | --- |
| `--generation <n>` | The generation to stop at. |
| `--json` | Emit the stopped task record with `expected_generation` and `cancelled_inputs`. |

Exits 0 when confirmed; 1 when refused, failed or unconfirmed (reason and retry command on stderr). Ctrl-C on `task create --wait` or `task logs --follow` only detaches; `task stop` is how you cancel remote work. Stop from the CLI shipped in v0.35.0 (changelog, 2026-09-22).

## `task get`

One task: status, agent, model (`agent default` when it follows its agent), creation time, machine and sandbox, caller metadata, and the eval verdicts recorded against it. `--json` nests the task under `task` next to `eval_runs`. A failed task prints the reason under `failure`; if Brainbase stopped the task because credits ran out or a billing limit was reached, `failure` says so with the service's detail (add credits or raise the limit, then run again).

```bash
brainbase task get <task-id>
brainbase task get <task-id> --json
```

## `task update`

Rename a task, change its labels, switch its model, or return it to the agent's default. Works on a running task; never prompts; at least one change flag required. Without `--json` prints a summary; with it, the full task record `task get --json` returns under `task`.

```bash
brainbase task update <task-id> --title "Nightly smoke run" --metadata env=staging
brainbase task update <task-id> --model claude-sonnet-5-5
brainbase task update <task-id> --clear-model
```

| Flag | Description |
| --- | --- |
| `--title <text>` | New title, trimmed; blank refused; at most 200 characters. |
| `--clear-title` | Remove the title (automatic titling may name it again later). |
| `--metadata key=value` | Set one label, keep the others. Repeatable. |
| `--unset-metadata <key>` | Remove one label. Repeatable; a missing label is ignored. |
| `--clear-metadata` | Remove every label. With `--metadata`, the labels become exactly the ones given. |
| `--model <id>` | Model for the next turn (a running turn keeps its model). Blank or malformed ids are refused before any request. |
| `--clear-model` | Return to the agent's default from the next turn. Not with `--model`. |
| `--json` | Print the updated task record only. |

`--metadata` and `--unset-metadata` send only the labels you name and the server merges them, so concurrent writers keep each other's labels (against an older control plane the whole map is sent and writers can overwrite each other). Reserved keys are refused by name: `_parent_link_verified`, the `brainbase_benchmark_*` keys, `brainbase_interface_id`, `brainbase_interface_viewer`. The server decides whether a model fits: an unknown id, `auto` on a harness other than Kafka or OpenCode, or any model on a Cursor, Factory or Qoder task is refused with the server's reason. Exits 0 on update, 1 on any usage error, refusal or request error. The API equivalent is `PATCH /v2/tasks/{task_id}` with `model`, `clear_model`, `metadata_patch` (changelog, 2026-10-30).

## `task delete`

Permanently delete a task and tear down its sandbox; cannot be undone. A running task is not deleted: stop it first. The task is read before the prompt, so a running task is reported first.

```bash
brainbase task delete <task-id>
brainbase task delete <task-id> --yes --json
```

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Skip the prompt. Required without a terminal. |
| `--json` | Emit `{ id, kind, name, deleted }`. Never prompts, so it needs `--yes`. |

## `task logs`

The transcript, one line per event: messages, reasoning, every tool call and result, and the closing verdict. Each event is collapsed onto one line, so it stays greppable (`grep tool_call.end`).

```bash
brainbase task logs <task-id>
brainbase task logs <task-id> --limit 50
brainbase task logs <task-id> --json | jq '.items[] | select(.type == "tool_call.end")'
brainbase task logs <task-id> --follow
brainbase task logs <task-id> --follow --json | jq -r 'select(.type == "idle")'
```

```text
2026-08-31T21:40:15.460110Z  user.message  run the smoke suite
2026-08-31T21:40:31.126370Z  assistant.thinking  Running the suite, then reporting the result.
2026-08-31T21:40:31.126407Z  tool_call.start  run_tests
2026-08-31T21:40:31.126407Z  tool_call.end  run_tests → success
2026-08-31T21:40:37.037864Z  idle  success — all 128 tests passed
2026-08-31T21:40:37.037864Z  assistant.message  All 128 tests passed.
```

| Flag | Description |
| --- | --- |
| `--limit <n>` | Stop after `<n>` events. With `--follow`, the size of the first page before tailing (not a cap on history). |
| `--follow`, `-f` | Stay attached until the task finishes, including follow-ups sent with `task send`, or Ctrl-C. |
| `--json` | `{ "items": [...] }` with every raw event. With `--follow`, one raw event per line. |

The human view drops `assistant.message.chunk` deltas where the same turn and subagent already carries the finalized `assistant.message`; where no finalized row exists (mid-turn, after an interrupt, or when `--limit` cuts short) the chunks print. `--json` returns every row.

Following: the server sends a page of recent history then keeps the connection open. A dropped connection reconnects and resumes from the last event (needs a control plane that stamps frames with a cursor; older ones re-send the opening page). Reconnection notices go to stderr. The follow gives up only after the stream has been continuously unreachable for 60 seconds; any reconnect resets the clock, and a task that settled during an outage still exits 0 once the closing event lands. While following, chunk deltas print as they arrive, `--json` is one record per line, and rows arrive in landing order rather than sorted by timestamp. When `task send` queues a message on a finished task, `--follow` stays attached until that follow-up has run.

Exit codes with `--follow`:

| Code | Meaning |
| --- | --- |
| `0` | The task reached a terminal state with no follow-up pending. This means the follow finished, not that the task passed: a failed task still exits 0 here. |
| `130` | Ctrl-C. The task keeps running. |
| `143` | SIGTERM (a CI step's timeout, a container shutting down). |
| `1` | The server refused the stream (expired login, unknown task id) or it stayed unreachable for 60 seconds. |

Use `task create --wait` when the job must go red on a failed task.

## Dispatch and assert in CI

```bash
#!/usr/bin/env bash
set -euo pipefail

# A user-scoped PAT must be exported, not just stored by `token create`.
export BRAINBASE_TOKEN="$BRAINBASE_PAT"

status=0
result=$(brainbase task create \
  --agent "$AGENT_ID" \
  --message "run the release checklist for $GIT_SHA" \
  --wait --timeout 1800 --json) || status=$?

[ "$status" -eq 0 ] && exit 0

# `create` can fail before a task exists (expired PAT, unreachable control
# plane), so there may be no id to read. Print whatever came back instead of
# running `logs` on an empty id, and keep the exit code that says what went wrong.
task_id=$(jq -r '.task_id // empty' <<<"$result" 2>/dev/null || true)

if [ -n "$task_id" ]; then
  echo "Task $task_id did not pass:"
  brainbase task logs "$task_id" || true
else
  echo "Could not start the task: $result"
fi

exit "$status"
```

## JSON errors

Task commands with `--json` report failures as `{"error": {"code": "...", "reason": "...", "message": "...", "details": {}}}` and exit non-zero. A missing confirmation is `code: invalid_input`, `reason: confirmation_required`; a running task on delete is `code: conflict`, `reason: task_running`.
