# Integrations: apps through Pipedream and the `brainbase-apps` MCP server

Source: https://docs.brainbaselabs.com/docs/agent/integrations
Source: https://docs.brainbaselabs.com/cli/commands/integrations
Source: https://docs.brainbaselabs.com/docs/agent/tools (types of tools)
Source: changelog 2026-07-03 "Allow, Ask, or Deny Controls for Connected Integrations"; 2026-10-24 "Developer Updates"; 2026-10-30 "Developer Updates"
Snapshot: 2026-11-03

## Contents

1. Rollout and enabled runtimes
2. Connecting apps (console and CLI)
3. Allow, Ask and Deny
4. The `brainbase-apps` MCP server: ten tools
5. `operation_id` idempotency
6. Result contract, statuses and error codes
7. Unknown outcomes and cancellations
8. Approving an Ask
9. Integrations in the task view; acknowledging an unknown outcome
10. Large results, `result_ref` and `output`
11. The `bb-apps` command and its exit codes
12. `brainbase integrations` CLI reference
13. Troubleshooting

## 1. Rollout and enabled runtimes

Limited rollout. Hosted integrations are limited to explicitly selected internal agents or agents in an explicitly configured organization, on enabled runtimes: Claude Code (`claude_code`), Codex (`codex`), Qwen Code (`qwen`), OpenCode (`opencode`), Pi (`pi`) and Kafka Cloud (`kafka_cloud`). They remain off for other agents. Cursor (`cursor`), Factory (`factory`) and Qoder (`qoder`) are deferred, as are local CLI harness setup and local isolation. The legacy `kafka` runtime is unchanged. Kafka Cloud is enabled only within the canary while its compatibility checks continue; outside the canary its existing AppFactory path continues (see `functions-browser-appfactory.md`).

- You do not add the server to the agent's MCP list. Brainbase adds `brainbase-apps` to each enabled turn.
- Once a runtime is enabled for an agent, new tasks get the tools. A task that started before that point does not; start a new task. A task whose sandbox runs an older Brainbase runner gets them once its sandbox is upgraded (upgrades are currently limited to the Pi canary).
- A selected agent has rule controls on the Tools page for its enabled runtime. Other non-Kafka agents may still see "Integration permission controls are only available for Kafka runtime agents." Seeing controls does not by itself mean the new execution path is enabled.
- Organization-scoped rollout: a selected organization covers its current and newly created agents on enabled runtimes. Moving an agent out of the organization, or withdrawing organization scope, removes org-based eligibility unless the agent is also explicitly selected. Existing AppFactory grandfather connections remain protected; new agents use the built-in MCP server.
- Accounts and rules are stored on the agent, not on its runtime: switching an agent from Kafka to Claude Code keeps connected accounts and rules, but using them still requires the new runtime to be enabled for the agent.

The CLI page (`cli/commands/integrations`) says "Only Kafka agents can use integrations today" and `list --json` carries `permissions_available: false` on other agents; the changelog (2026-10-24) also describes `brainbase integrations` as managing "a Kafka agent's integration apps". The agent docs page describes the wider limited rollout above. Treat the docs as describing a rollout in progress and check the live pages.

## 2. Connecting apps

Connecting accounts is a manager's job: agent managers (the agent's owner and the team's owners and admins) connect, disconnect and add apps. Other members can see the agent's apps and rules but cannot change them. Connect from your own session; Brainbase keeps account credentials on the server. Connections belong to the agent, not to a task: set them up before the agent has ever run, and every task uses the same accounts.

Console: open the agent, go to **Tools**. Under **Integrations** select **Browse integrations**, pick the app and select **Connect** (sign in to the app in the window that opens). For an app that needs no account, such as a public data source, select **Add** instead. Then set a rule for the app, and for any single action that needs a different rule.

CLI (needs a `brainbase login` session; refuses `BRAINBASE_TOKEN`): see section 12.

Multiple accounts: an agent can hold more than one account for the same app. When an action could use several, the agent has to name the account it wants; Brainbase never picks one and never switches accounts silently. With exactly one healthy account, that account is used.

## 3. Allow, Ask and Deny

| Rule | What happens when the agent calls the action |
| --- | --- |
| Allow | The action runs. |
| Ask | The action waits for a person to approve it (section 8). |
| Deny | The action is refused and nothing is sent to the app. The agent is told which rule refused it. |

- A rule can cover a whole app or one action. A rule on a single action takes precedence over the app's rule, and a rule saved on a task takes precedence over the agent's rule for that task.
- An action that uses more than one app needs every one of those apps to allow it. Any Deny refuses it; any Ask makes it wait.
- When a task was started by another task, the rules of the task that started it also apply. Any Deny in the chain refuses; any Ask in the chain waits.
- Looking up options for a form field or refreshing an action's fields checks rules but never uses up an approval. Running an action, sending a proxy request or uploading a file uses it up.
- Brainbase checks rules before app execution, on its side rather than inside the agent. Changing a rule affects later calls, even in a running task; it cannot undo an action already sent.
- Who may change rules: changelog 2026-07-03 says only profile owners and organization admins can change permission rules; the docs page says managers. For the role model, open `brainbase-permissions`.

## 4. The `brainbase-apps` MCP server

The agent sees one MCP server named `brainbase-apps`. The name is reserved: on a task that has integrations, an MCP server of your own with that name is replaced by the built-in one. The tools are the same on every runtime.

| Tool | What it does |
| --- | --- |
| `list_apps` | Lists the agent's apps and connected accounts. Shows connected apps by default; pass `include: "all"` to list every app. |
| `search_actions` | Searches one app's actions, including custom actions you have added. |
| `get_action` | Returns an action's fields and which accounts can run it. |
| `configure_prop` | Looks up the choices for one field, such as a list of channels or spreadsheets. |
| `reload_props` | Refreshes an action's fields after a field that changes the others has been set. |
| `run_action` | Runs an action. Accepts `output` options to return only some fields or matching items. |
| `proxy_request` | Sends a direct API request to an app through the connected account, for anything the ready-made actions do not cover. |
| `upload_preflight` | Checks that an upload is allowed before any file is read. |
| `upload_file` | Uploads a file from the task's workspace or from a public URL. Files up to 25 MiB. |
| `get_operation` | Looks up an earlier call by its `operation_id`, including one that was waiting for approval. |

Input conventions seen in the docs: `search_actions` takes `{"app_slug": "slack", "query": "send message"}`; `run_action` takes `action_key` (for example `rss-merge-rss-feeds`) and `configured_props`; account selection uses `accounts` (actions) or `account_id` (`proxy_request` and uploads); upload sources are `{"kind": "workspace_path", "path": "/workspace/..."}` (hosted tasks only), `{"kind": "public_url", "url": "..."}` or `{"kind": "bytes_base64", ...}`.

## 5. `operation_id` idempotency

`run_action`, `proxy_request` and `upload_file` take an optional `operation_id`. If the agent leaves it out, one is generated and returned. Calling again with the same `operation_id` and the same input never runs the action twice: a call that already succeeded returns `success` with `data.replayed: true` (the original data is not returned again), and one that failed returns an error saying the operation ran and failed. Reusing an `operation_id` with different input is refused with `invalid_input`. Receipts belong to the task's shared context; a new independent task does not share them.

## 6. Result contract, statuses and error codes

Every tool returns the same shape. `status` says what happened; the matching field carries the result, approval, denial or error; an error can also include supporting `data`, and `files` can contain file information.

```json
{
  "contract": "brainbase.integrations/v1",
  "status": "error",
  "operation_id": "6f0c2a4e-2b1d-4c47-9a63-0d1f5c2e8b11",
  "data": null,
  "result_ref": null,
  "files": [],
  "pending": null,
  "denied": null,
  "error": {
    "code": "needs_connection",
    "message": "This agent has no connected gmail account. An agent manager connects one in the agent's Tools page.",
    "retryable": false,
    "dispatched": "no",
    "action_required": { "kind": "connect_account", "app_slug": "gmail" }
  }
}
```

| Status | Meaning |
| --- | --- |
| `success` | The call worked. The result is in `data`, or in a workspace file named by `result_ref` when large. |
| `pending` | The action needs approval. Nothing has been sent. `pending.message` says what is waiting. |
| `denied` | The action was denied. Nothing was sent. `denied` describes the denial and includes the matched rule when available. |
| `error` | The call failed. `error.code` says why, `retryable` whether trying again can help, and `dispatched` whether anything reached the app: `no`, `yes` or `unknown`. |

| Error code | What it means |
| --- | --- |
| `needs_connection` | No connected account, or the account needs reconnecting. An agent manager connects it on the Tools page; the agent cannot, and neither can a non-manager member. |
| `needs_install` | The app needs no account but has not been added to the agent. A manager adds it. |
| `account_selection_required` | More than one account could run the action. Call again naming the account in `accounts` (actions) or `account_id` (`proxy_request`, uploads). |
| `invalid_input` | The input is missing something or has the wrong shape (also: an `operation_id` reused with different input). |
| `invalid_configuration` | A custom action is set up incorrectly (no component or no app account). A manager fixes it on the Tools page. |
| `not_found` | The app, action or operation does not exist for this agent. |
| `upstream_error` | The app answered with an error. For an HTTP error, `upstream_status` carries its status. |
| `outcome_unknown` | The request reached the app but no answer came back. Never retried. See section 7. |
| `busy` | Another action is running in this task, or in a task that started it or that it started. Try again shortly. If the message says an earlier outcome is unknown, retrying will not help: a manager has to acknowledge it. |
| `payload_too_large` | A file is over 25 MiB, or a large result could not be saved to the workspace. |
| `rate_limited` | Too many calls. Wait and try again. |
| `unsupported` | Not available here, for example integrations are not enabled for this run. |
| `cancelled` | This action will never run, and nothing was sent. See section 7. |
| `internal` | Something failed inside Brainbase. Nothing is retried for you. Check `dispatched` before calling again. |

## 7. Unknown outcomes and cancellations

`outcome_unknown` means the request left Brainbase but no answer came back (for example after a timeout). The message may have been sent, the record created, or neither. Brainbase never resends it. Until someone resolves it, other app execution in the same context answers `busy`, including tasks that share a parent context; stopping the task does not clear it. A manager checks the app, then acknowledges in the task view (section 9). Acknowledging only unblocks the task and records what the manager found; it never resends, and the same `operation_id` still returns `outcome_unknown`. If it did not happen, ask the agent to do it again.

`cancelled` always means nothing was sent. It happens when the task was stopped or redirected while the action was waiting, when the approval the action was waiting on was already used by another action, or when a request from your own code expired before anyone answered. The same `operation_id` keeps returning `cancelled`; call again with a new one, which asks for a new approval if needed.

## 8. Approving an Ask

When an action has an Ask rule the call returns `pending` and nothing is sent. Brainbase stops the task's current run and the approval request appears in the task view; the task waits there until someone answers, independent of the agent noticing.

1. The agent calls the action; the call returns `pending`, and the agent is told to stop and wait.
2. Brainbase stops the run. The task view shows a card naming the action, for example `slack.slack-send-message`.
3. Someone with access to the task answers.
4. Brainbase starts a new turn and tells the agent the answer. The agent calls again, and it runs, or it gets `denied`.

On Kafka Cloud a task paused for an integration approval shows **Needs info** with the summary **Awaiting integration approval** (also when the agent called through `bb-apps`). Choosing **Stop** cancels that request.

| Answer | What it does | Who can choose it |
| --- | --- | --- |
| **Allow once** | Lets this one action run. The rule stays Ask. | Managers and members |
| **Allow for this task** | Saves an approval for this action on this task. The next run of the action in this task uses it up. | Managers and members |
| **Always allow** | Saves an Allow rule on the agent for every future task. | Managers |
| **Deny** | Refuses the action. A manager's Deny saves a Deny rule on the agent. A member sees **Deny for this task**. | Managers and members |

- Each request is answered once; a second answer, or one from an old or expired card, is refused.
- If the run cannot be stopped cleanly, the card stays and can still be answered; the task view says the stop is being retried. The action never runs before someone approves.
- If a parent task's rules also ask for this action, the card says so. **Allow once** covers both. **Allow for this task** and **Always allow** save your rule, but the other task's rule still asks, so the task keeps waiting.
- Stopping the task, or sending a redirecting message, cancels the waiting request (`cancelled`).

## 9. Integrations in the task view

| What the task view shows | Meaning |
| --- | --- |
| **Apps are ready for this task.** | The task's sandbox runs a runner with integrations. |
| **This task's sandbox needs an upgrade before it can use apps** | The sandbox runs an older runner. Nothing on the agent needs changing. |
| **Stopping the run that asked for approval** | An action is waiting and Brainbase is stopping the run that asked. The card can be answered meanwhile. |
| **Brainbase couldn't stop the run that asked for approval** | The stop failed and is retried. Your answer still counts. |
| **An app action may or may not have happened** | An outcome is unknown; apps are paused for the task and the tasks it started until a manager acknowledges. |

A task that started before integrations were enabled shows none of these. Connecting accounts, adding apps and setting rules on the Tools page never depend on a task.

Acknowledging an unknown outcome (console): open the task; the card lists actions whose outcome is unknown and when each became unknown or was sent. Check the app. Choose **It happened**, **It did not happen** or **I can't tell**, then select **Acknowledge**. Apps run again in the task. Only managers of the context's agent (owner, or the team's owners and admins; for delegated tasks, possibly the parent agent's manager) can acknowledge, from their own signed-in session: API keys, PATs, task keys and integration grants are refused. Each acknowledgement is recorded with who, when and what they found; acknowledging again changes nothing.

## 10. Large results, `result_ref` and `output`

By default, successful result data over 32 KiB is written as JSON to `/workspace/.brainbase/integration-results/<operation_id>.json` (or a generated name for tools without one) and the call returns `result_ref` instead of `data`:

```json
{
  "status": "success",
  "data": null,
  "result_ref": {
    "path": "/workspace/.brainbase/integration-results/6f0c2a4e-2b1d-4c47-9a63-0d1f5c2e8b11.json",
    "format": "json",
    "bytes": 912340,
    "sha256": "9b1c…",
    "items": 500,
    "item_path": "ret.values",
    "summary": "A JSON object whose largest array, ret.values, has 500 items, each an array.",
    "sample": [["2026-10-01", "Acme", 1200], ["2026-10-01", "Globex", 940], ["2026-10-02", "Initech", 310]]
  }
}
```

The agent reads the file, or processes it with a script, without loading every row into context. To keep results small, pass `output` to `run_action`: within the action's `ret` result, `fields` selects the listed paths and `filter` keeps matching items when `ret` is a list (a filter tests whether the value at a path `equals` or `contains` a value). These do not shrink `exports` or `summary`. `max_inline_bytes` sets the inline limit for one call, up to 256 KiB.

## 11. The `bb-apps` command

Enabled hosted tasks on the current runner have `bb-apps` on their path. It runs one `brainbase-apps` tool and prints the result as JSON, through the same rules, approvals and accounts as the MCP tools, with no other credentials.

```bash
# bb-apps <tool> [--json '<input>' | --input <file> | --input -] [--output <file>] [--wait]
bb-apps list_apps
bb-apps search_actions --json '{"app_slug": "slack", "query": "send message"}'
bb-apps run_action --input message.json

# A loop that stops at the first action that does not succeed,
# and cleanly when one needs approval
while IFS= read -r row || [ -n "$row" ]; do
  bb-apps run_action --json "$row"
  code=$?
  if [ "$code" -eq 10 ]; then
    echo "Waiting for approval; this run is stopping." >&2
    exit 10
  elif [ "$code" -ne 0 ]; then
    exit "$code"
  fi
done < rows.jsonl
```

| Exit code | Meaning |
| --- | --- |
| `0` | Success |
| `10` | Pending: the action needs approval and this run is being stopped. End the script; the task continues in a new turn after someone answers. |
| `11` | Denied by a rule |
| `12` | Error. The `error` field says why. |
| `13` | Integrations are not enabled for this run, or Brainbase refused the run's access |

- `--output <file>` saves a successful result to a new file in the workspace (never overwriting) and prints `result_ref` in place of `data`.
- In a hosted task an approval stops the run, so `bb-apps` exits `10` even with `--wait`. For standalone approval waiting use the SDK or a plain MCP client (`integrations-from-code.md`).
- For loops that write to an app, give each item its own fixed `operation_id` in the input; items that already ran return `success` with `data.replayed: true` after a restart instead of running twice.

## 12. `brainbase integrations` CLI reference

Manages an agent's Pipedream apps, the same list the Integrations section of the Tools page shows. Every subcommand acts on the agent linked in this folder unless `--agent <id>` names another, and takes `--json`. `integration` is an alias. These commands call the web app, which holds the Pipedream credentials, and accept only a `brainbase login` session: with `BRAINBASE_TOKEN` set they refuse and tell you to unset it. `BRAINBASE_WEB_URL` picks the web app.

```bash
brainbase integrations search gmail
brainbase integrations add gmail
brainbase integrations actions gmail
brainbase integrations deny gmail.send_email
brainbase integrations list
```

| Command | What it does | `--json` output |
| --- | --- | --- |
| `list` | Apps on the agent, their accounts and the app-level permission. `!` marks an account needing reconnection; `(default)` marks an app following the agent's default effect. | `{ agent_id, integrations[], default_effect, permissions_available }`; each entry `app`, `name`, `needs_account`, `accounts[]` (`id`, `name`, `healthy`), `effect` (or `null`). |
| `search <query>` | Finds apps in the Pipedream catalog; not per agent, needs no linked folder. | `{ apps[] }` |
| `actions <app>` | An app's actions and the effect each gets, with `(app)` or `(default)` beside it. Use these keys with `allow`/`ask`/`deny`. | `{ app, default_effect, app_effect, actions[] }`; each `key`, `name`, `description`, `effect`, `source` (`action`, `app`, `default`). |
| `add <app>` | Installs an app. An app needing no account is added straight away; one needing an account runs `connect` with the same flags. | `{ app, name, needs_account: false, added: true }` |
| `connect <app>` | Prints a link to Pipedream's Connect page, opens it, waits until a new account appears. Refused for apps needing no account. Flags `--no-open`, `--no-wait`, `--agent <id>`. | `{ app, url, expires_at }` and exit `0` without waiting. |
| `disconnect <app>` | Deletes the app's connected account; everyone using the agent loses it. Asks first; `--yes`/`-y` skips (required with no terminal). `--account <id>` picks one of several (refused otherwise, listing ids). | `{ app, account_id, disconnected }`; requires `--yes`. |
| `remove <app>` | Uninstalls an app that needs no account (use `disconnect` for account apps). | `{ app, removed: true }` |
| `allow\|ask\|deny <app>[.<action>]` | Sets the rule for an app (stored as `<app>.*`) or one action. Names are normalized as the web app does: lowercased, anything other than letters, digits, `-` and `*` turned into `_`. | `{ capability_pattern, effect }` |

Treat the `connect` link as a credential: anyone who opens it can connect an account to this agent until it expires. The wait ends when the account appears (exit `0`), when the link expires (exit `1`), or when Brainbase stops answering for five polls in a row (exit `1`). Ctrl-C exits `130`; the link keeps working.

Exit codes: `0` success, `1` any failure, `130` interrupted `connect`. Under `--json` every outcome is JSON on stdout, failures as `{"error": "…"}`.

## 13. Troubleshooting

| What you see | What to do |
| --- | --- |
| The agent has no `brainbase-apps` tools | Check the rollout: the agent must be explicitly selected or in the configured organization, on an enabled runtime. For an enabled agent, start a new task if this one predates enablement. |
| The task view says the sandbox needs an upgrade | The task's sandbox runs an older runner. Upgrades are currently limited to the Pi canary. Accounts and rules need no change. |
| `unsupported`: Integrations are not enabled for this run | Same as above. A `bb-apps` call exits `13`. |
| `needs_connection` or `needs_install` | A manager connects or adds the app on the Tools page, then the agent tries again. |
| `account_selection_required` | Tell the agent which account, or remove the ones it should not use. |
| `busy` that does not clear | An earlier action has an unknown outcome. A manager checks the app and acknowledges in the task view. Stopping the task does not clear it. |
| An approval card stays after you answered | Another task in the chain still has an Ask rule. Use **Allow once**, or have that agent's manager change its rule. |
