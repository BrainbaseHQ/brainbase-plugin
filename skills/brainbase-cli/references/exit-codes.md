Source: https://docs.brainbaselabs.com/cli/reference/exit-codes; https://docs.brainbaselabs.com/cli/commands/task (wait and follow codes); https://docs.brainbaselabs.com/cli/commands/mcp; https://docs.brainbaselabs.com/cli/commands/integrations
Snapshot: 2026-11-03

# Exit codes

## Contents

- The general table
- `brainbase run` passes its command's code through
- Interrupting a wait exits 130
- "Nothing to do" still exits 0
- Preconditions the command cannot meet
- Partial outcomes
- With `--json`
- Per-command code tables

Test zero against non-zero rather than for `1` specifically: `1` is the failure code for almost everything, but not all of it.

## The general table

| Code | Meaning |
| --- | --- |
| `0` | The command did what you asked, or there was nothing to do. |
| `1` | The command did not do what you asked. The reason is printed. |
| `2`, `127`, or your command's own code | Only from `brainbase run`, which reports your command's outcome. |
| `130` | Interrupted with Ctrl-C while waiting (128 + SIGINT). |
| `143` | `task logs --follow` stopped by SIGTERM (128 + SIGTERM). |

```bash
brainbase agent push --yes || exit 1

if ! brainbase skill publish --name acme/thing --skill-version 1.2.0 --yes; then
  echo "publish failed" >&2
  exit 1
fi
```

## `brainbase run` passes its command's code through

`brainbase run <command>` runs your command with `.brainbase/secrets.env` loaded and returns the command's code, re-raising signals.

| Code | Meaning |
| --- | --- |
| `2` | No command was given (usage error, on stderr). |
| `127` | The command was not found on `PATH`. |
| `1` | The command could not be started for another reason. |
| anything else | Whatever your command exited with. |

## Interrupting a wait exits 130

Stopping the wait never cancels the work.

| Command | What keeps going |
| --- | --- |
| `login` | Nothing; no session is saved. |
| `task create --wait` | The task. Stop it with `task stop`. |
| `task logs --follow` | The task. SIGTERM exits `143` instead. |
| `agent versions list --wait` | Saving the version. |
| `interface build`, `rebuild`, `publish`, `preview` | The build, publish or preview on the server. |
| `mcp connect` | The link, until it expires. |
| `integrations connect` | The link, until it expires. |
| `agent connect github` / `linear`, `agent surface github` / `linear connect`, `reconnect`, `wait` | The setup in the browser; the resume command is printed. |
| `benchmark run --watch`, `benchmark run watch` | The benchmark run (see `brainbase-benchmarks`; the command reference does not document this group). |

## "Nothing to do" still exits 0

`agent push` with no local changes prints `Nothing to push — local is in sync with the cloud.` and exits 0; `sync` with nothing new does the same. Declining an interactive confirmation exits 0. `template remove` and `skill remove` on something not installed print that they found no installation and exit 0. Exception: `skill update <slug>` on a missing skill prints the same sentence, `No skill named <slug> found.`, but exits 1 (updating an absent skill leaves it missing). Branch on the exit code, not the text.

## Preconditions the command cannot meet

"This folder is not linked to any agent", "no `brainbase.agent.yaml` here" and similar print as warnings but exit 1; scripts should treat them as failures. The remove verbs are the exception above.

| Command | Precondition |
| --- | --- |
| `agent push`, `agent unpack` | A `brainbase.agent.yaml` that exists and carries an `id`. |
| `agent status`, `sync` | The folder is linked to an agent. |
| `agent create` | The folder does not already belong to an agent. |
| `orchestration push`, `orchestration status`, `orchestration add-agent` | The folder is linked to an orchestration. |
| `orchestration pull` | A link, or an orchestration id as an argument. |
| `orchestration create` | A `brainbase-orchestration.yaml`, and no existing link. |
| `skill update` | A skill installed under that name. |

## Partial outcomes

A partial result exits 1, but the output names what landed and the command to run next; the work that succeeded is kept.

| Command | Partial outcome | What you see |
| --- | --- | --- |
| `template publish` | The template publishes but a skill inside it stays inline. | The inline skills are named; the run closes on `PUBLISHED (PARTIAL)`. |
| `orchestration pull` | Some members materialise and others do not. | How many of how many landed, the missing members, and a note that `orchestration push` will refuse until they are pulled. |
| `agent create` | The agent is created and linked but local content does not upload. | `CREATED (NO CONTENT)`, with the retry command, which is `brainbase agent push`. |

`team list` reports a partial read at exit 0: organizations it could not read carry an `error` field in `--json` with the reason on stderr; check that field, not the exit code.

## With `--json`

`--json` changes the shape of output, not the outcome. stdout is valid JSON or empty on failure; `--json` never turns a failure into a success. `agent status` exits 1 when it cannot reach the control plane, so an unreachable control plane never reads as "in sync". Where the reason lands varies: a plain stderr message with empty stdout; a normal payload with a field carrying the answer (`agent status --json` on an unlinked folder, `whoami --json` with no credential); or `{"error": "…"}`. Read the exit code first, the payload second.

```bash
if ! out=$(brainbase agent list --json); then
  echo "agent list failed" >&2
  exit 1
fi
echo "$out" | jq 'length'     # agent list --json is a bare array
```

`brainbase mcp check` reports unreachable servers in its payload and still exits 0; read `check_status` and the per-server entries. In CI set `BRAINBASE_NON_INTERACTIVE=1` so prompts resolve instead of waiting.

## Per-command code tables

| Command | `0` | `1` | `130` | `143` |
| --- | --- | --- | --- | --- |
| `task create --wait` | Task finished `success`. | `fail`, `need_more_info`, or `--timeout` elapsed. | Ctrl-C; task keeps running. | — |
| `task logs --follow` | Terminal state reached with no follow-up pending (even if the task failed). | Stream refused (expired login, unknown id) or unreachable for 60 s. | Ctrl-C. | SIGTERM. |
| `task send` | Queued, dispatched, submitted or completed. | Unconfirmed, cancelled, failed, or request error. | — | — |
| `task stop` | Stop confirmed. | Refused, failed or unconfirmed (retry command on stderr). | — | — |
| `task update` | Updated. | Usage error, refusal or request error. | — | — |
| `mcp connect` | Authorized, or link printed with `--json` / `--no-wait`. | Failed, declined, superseded, expired, refused, or Brainbase stopped answering. | Ctrl-C; link stays valid. | — |
| `mcp check` | The probe ran, whatever it found. | The check could not run. | — | — |
| `integrations *` | Success. | Any failure. | Interrupted `connect`. | — |
| `integrations connect` wait | Account appeared. | Link expired, or five unanswered polls. | Ctrl-C. | — |
| `agent surface github/linear connect|wait` | Installation live. | Timed out, revoked, disconnected or failed (resume command printed). | Ctrl-C (resume command printed). | — |
| `agent versions list --wait` | Version saved. | Still saving after `--timeout` (default 120). | Ctrl-C. | — |
| `agent versions pin/unpin` | Changed (or already unpinned, `changed: false`). | Someone moved the pin meanwhile; missing `--yes`. | — | — |
| `agent versions restore` | Applied. | Stopped partway (rerun finishes) or refused. | — | — |
| `interface *` | Done. | Refused or failed. | Interrupted; server keeps working. | — |
| `agent delete`, `task delete`, `orchestration delete`, `token revoke` without a terminal and without `--yes` | — | Refused, naming `--yes`. | — | — |
