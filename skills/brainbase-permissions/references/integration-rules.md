# Allow, Ask and Deny rules for connected integrations

Source: docs.brainbaselabs.com/docs/agent/integrations (Connect apps, Allow/Ask/Deny, Results and errors, Approving an Ask, Integrations in the task view, Scripting with bb-apps, Troubleshooting), /cli/commands/integrations, /docs/agent/integrations-from-code (Approving an Ask, When the outcome is unknown), /docs/agent/appfactory (Synchronous code); changelog 2026-07-03, 2026-09-28, 2026-10-29.
Snapshot: 2026-11-03

## Contents

1. Rollout and where rules live
2. Who may connect apps and change rules
3. The three rules and precedence
4. Setting rules from the CLI
5. Approving an Ask on a task
6. Acknowledging an unknown outcome
7. Rules as seen by the agent: result statuses and codes
8. Standalone (integration grant) approvals
9. Synchronous code and workflow nodes
10. Slack approval step

## 1. Rollout and where rules live

Hosted integrations are a **limited rollout**: explicitly selected internal agents, or agents in an explicitly configured organization, on enabled runtimes (Claude Code `claude_code`, Codex `codex`, Qwen Code `qwen`, OpenCode `opencode`, Pi `pi`, Kafka Cloud `kafka_cloud`; Cursor, Factory and Qoder deferred). Integrations reach apps through Pipedream. Accounts and rules are stored on the agent, not on a task or a runtime: they survive a runtime switch, work for an agent with no tasks, and "one old or blocked task never stops them". Brainbase enforces rules on its side, not inside the agent, before app execution; a rule change affects later calls even in a running task but cannot undo an action already sent.

The CLI page adds: "Only Kafka agents can use integrations today. On any other agent, `list` says so above its results, and `--json` carries `permissions_available: false`." A selected non-Kafka agent may still see "Integration permission controls are only available for Kafka runtime agents."

## 2. Who may connect apps and change rules

- "Connecting accounts is a manager's job. Agent managers (the agent's owner and the team's owners and admins) connect, disconnect and add apps. Other members can see the agent's apps and rules but cannot change them. Connect accounts from your own session. Brainbase keeps account credentials on the server."
- Changelog 2026-10-29: "Connecting or disconnecting an app account on an agent now requires the agent's owner or a team admin. Other members see why connecting isn't available."
- Changelog 2026-07-03 (launch): "Only profile owners and organization admins can change permission rules, so day-to-day teammates can review what's set without accidentally changing it."
- `brainbase integrations …` calls the web app and accepts only a `brainbase login` session; with `BRAINBASE_TOKEN` set it refuses and tells you to unset it.
- Multiple accounts per app are allowed; the agent must name the account (`accounts` for actions, `account_id` for `proxy_request` and uploads) or gets `account_selection_required`. Brainbase never picks or switches accounts silently; with exactly one healthy account it is used.
- `brainbase integrations disconnect <app>` deletes the account for everyone using the agent; it prompts, needs `--yes` without a terminal, and `--account <id>` when the app has several accounts.
- The `connect` link is a credential: "Anyone who opens it can connect an account to this agent until it expires, so do not paste it anywhere public."

## 3. The three rules and precedence

| Rule | What happens when the agent calls the action |
|---|---|
| Allow | The action runs. |
| Ask | The action waits for a person to approve it. |
| Deny | The action is refused and nothing is sent to the app. The agent is told which rule refused it. |

Precedence and composition:

1. A rule can cover a whole app (stored as `<app>.*`) or one action (`<app>.<action>`). An action rule beats the app rule; a rule saved on a task beats the agent's rule for that task.
2. An action that uses more than one app needs every app to allow it: any Deny refuses, any Ask waits.
3. When a task was started by another task, the starting task's rules also apply; any Deny in the chain refuses, any Ask in the chain waits.
4. Looking up options for a field (`configure_prop`) or refreshing fields (`reload_props`) checks rules but never uses up an approval. Running an action, sending a proxy request or uploading a file uses it up.
5. An app with no rule follows the agent's default effect (`default_effect` in CLI JSON; shown as `(default)`).
6. Rules are checked "before app execution"; changing one "cannot undo an action already sent to the app".

## 4. Setting rules from the CLI

```bash
brainbase integrations list [--agent <id>] [--json]   # apps, accounts, app-level effect
brainbase integrations actions <app> [--json]          # each action's effect and its source
brainbase integrations ask gmail                       # whole app -> gmail.*
brainbase integrations allow gmail.list_messages
brainbase integrations deny gmail.send_email
```

| Command | Output / behaviour |
|---|---|
| `list` | Apps with accounts (`!` marks an account needing reconnection) and app-level permission; `(default)` when the app follows the agent default. `--json`: `{ agent_id, integrations[], default_effect, permissions_available }`, each entry `app`, `name`, `needs_account`, `accounts[]` (`id`, `name`, `healthy`), `effect` (`null` when following the default). |
| `actions <app>` | Each action's `key`, `name`, `description`, `effect`, `source` (`action`, `app`, `default`); `--json`: `{ app, default_effect, app_effect, actions[] }`. Use the keys here with `allow|ask|deny`. |
| `allow\|ask\|deny <app>[.<action>]` | Bare app name sets the rule for every action without its own rule. Names are normalized as the web app does: lowercased, anything other than letters, digits, `-` and `*` becomes `_`. `--json`: `{ capability_pattern, effect }`. |
| `search <query>` | Pipedream catalog, no linked folder needed; `--json` `{ apps[] }`. |
| `add <app>` | Installs an app; one that needs an account runs `connect` instead. `--json` `{ app, name, needs_account: false, added: true }`. |
| `connect <app>` | Prints a Pipedream Connect link, opens it, waits for the account. `--no-open`, `--no-wait`, `--json` (`{ app, url, expires_at }`), `--agent <id>`. Exit `0` when the account appears, `1` on expiry or five failed polls, `130` on Ctrl-C (the link keeps working). |
| `disconnect <app>` | `--account <id>`, `--yes`/`-y` (required without a terminal and with `--json`), `--json` `{ app, account_id, disconnected }`. |
| `remove <app>` | Uninstalls a no-account app; `--json` `{ app, removed: true }`. |

Exit codes: `0` success, `1` any failure, `130` interrupted `connect`. Under `--json` failures print `{"error": "…"}` on stdout. `integration` is an alias for `integrations`.

## 5. Approving an Ask on a task

When an Ask action is called, the call returns `pending`, nothing is sent, Brainbase stops the task's current run, and a card appears in the task view naming the action (for example `slack.slack-send-message`). On Kafka Cloud the task shows **Needs info** with **Awaiting integration approval**, also for `bb-apps` calls. Someone with access to the task answers; Brainbase starts a new turn and tells the agent the answer.

| Answer | What it does | Who can choose it |
|---|---|---|
| **Allow once** | Lets this one action run; the rule stays Ask. | Managers and members |
| **Allow for this task** | Saves an approval for this action on this task; the next run of the action uses it up. | Managers and members |
| **Always allow** | Saves an Allow rule on the agent for every future task. | Managers |
| **Deny** | Refuses the action. A manager's Deny saves a Deny rule on the agent; a member sees **Deny for this task**. | Managers and members |

- Each request is answered once; a second answer or an answer from an old or expired card is refused.
- If the run cannot be stopped cleanly the card stays answerable, the view says the stop is retried, and the action never runs before approval.
- In a task chain, **Allow once** covers both tasks' rules; **Allow for this task** and **Always allow** save your rule but the other task's Ask still waits ("An approval card stays after you answered": use Allow once, or have that agent's manager change its rule).
- Stopping the task or redirecting it with a new message cancels the request; the action returns `cancelled`.
- Changelog 2026-07-03: the most recent request stays visible in chat even after the agent moves on; 2026-06-19: permission-only pauses show the approval card without a free-text step.

## 6. Acknowledging an unknown outcome

`outcome_unknown` means the request left Brainbase but no answer came back; it is never retried automatically. Until resolved, other app execution in the same context (including tasks sharing a parent context) answers `busy`; stopping the task does not clear it.

Steps (console): open the task; the card lists actions with unknown outcomes and when each became unknown or was sent; check the app; choose **It happened**, **It did not happen** or **I can't tell**; select **Acknowledge**. Apps run again in the task. Acknowledging only unblocks and records the finding; it never resends, and the same `operation_id` keeps returning `outcome_unknown`.

"Only managers of the context's agent (its owner or the team's owners and admins) can acknowledge, from their own signed-in session. For delegated tasks, this can be the parent agent's manager. API keys, personal access tokens, task keys and integration grants are refused. Other members see the card without the choices." Each acknowledgement records who, when and what they found; repeating it changes nothing.

## 7. Rules as seen by the agent: result statuses and codes

Every `brainbase-apps` tool returns `{ contract: "brainbase.integrations/v1", status, operation_id, data, result_ref, files, pending, denied, error }`.

| `status` | Meaning |
|---|---|
| `success` | Ran; result in `data` or a workspace file via `result_ref` |
| `pending` | Needs approval; nothing sent; `pending.message` says what is waiting |
| `denied` | Denied by a rule; nothing sent; `denied` includes the matched rule when available |
| `error` | `error.code`, `retryable`, `dispatched` (`no`, `yes`, `unknown`) |

Permission-related error codes: `needs_connection` (no connected account; a manager connects it; `action_required: { kind: "connect_account", app_slug }`), `needs_install` (no-account app not added), `account_selection_required`, `invalid_configuration` (a manager fixes a custom action), `busy` (another action running in the chain, or an unknown outcome awaiting acknowledgement), `unsupported` (integrations not enabled for this run), `cancelled` (never ran; new `operation_id` to ask again), `outcome_unknown`.

`bb-apps` exit codes mirror the rules: `0` success, `10` pending (run stops; continues in a new turn after an answer), `11` denied by a rule, `12` error, `13` integrations not enabled or access refused. The rest of `bb-apps` belongs to `brainbase-tools`.

Task view readiness text: **Apps are ready for this task**; **This task's sandbox needs an upgrade before it can use apps**; **Stopping the run that asked for approval**; **Brainbase couldn't stop the run that asked for approval**; **An app action may or may not have happened**.

## 8. Standalone (integration grant) approvals

Code using an access grant sees the same accounts and rules. On an Ask the call returns `status: "pending"` with `pending.approval_url` (`https://app.brainbaselabs.com/integrations/approvals/<event_id>`), `poll_after_s` (at least 5), `expires_at` (10 minutes after the request), `mode: "standalone"`, `capability`, `event_id`, `state_generation`. "Your integration grant cannot approve it; a person answers in the browser."

- Only people with access to the agent can see or answer the page; "someone who is not an agent manager cannot allow what the agent's rules deny". Choices are **Allow once** or **Deny**.
- `get_operation` returns `pending`, then `denied`, or `success` with `data.phase: "approved"` (approved, not run). Repeat the original call with the same `operation_id` and input within 10 minutes of approval and before the context expires. The rule stays Ask.
- **Allow once** covers only that `operation_id` and input; reuse with different input is `invalid_input`.
- **Deny** on the page blocks that action "for the whole context, for every later `operation_id` and across renewals, until an agent manager selects **Clear this Deny** on the same page or the context ends". It does not change the agent's rules; a lasting rule is a separate step on the Tools page.
- Unknown outcomes are acknowledged on the same approval page by an agent manager from their own session; ending or recreating a context does not establish whether the action happened.

## 9. Synchronous code and workflow nodes

On enabled Kafka Cloud agents with a compatible runner, synchronous task code and workflow app nodes use the same connection restrictions, permission rules and accounting as managed turns. When an action needs approval the code operation stops and the approval shows in the task view; the task-code response includes `pending` with continuation `"new_code_operation_required"`. After **Allow once**, submit a new code operation with the same inputs; the approval can be used only once; **Stop** cancels it. Retrying the same outer code operation id returns the stored result without re-executing. `factory.get_auth_link()` has no replacement: "An agent manager connects accounts on the agent's Tools page."

## 10. Slack approval step

Changelog 2026-09-28 (beta): workspaces can turn on an approval step that pauses a sensitive tool action in Slack until someone approves it; off by default. The docs mirror has no page describing who may approve from Slack; see `brainbase-surfaces` and fetch the live changelog entry.
