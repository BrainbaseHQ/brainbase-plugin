# Functions, the browser tool, image generation, web search, and AppFactory

Source: https://docs.brainbaselabs.com/docs/agent/tools, https://docs.brainbaselabs.com/docs/agent/secrets, https://docs.brainbaselabs.com/docs/agent/versions
Source: https://docs.brainbaselabs.com/docs/agent/browser, https://docs.brainbaselabs.com/cli/reference/control-plane-api (browser_enabled), https://docs.brainbaselabs.com/cli/reference/agent-manifest (capabilities.browser)
Source: https://docs.brainbaselabs.com/docs/agent/appfactory, https://docs.brainbaselabs.com/docs/agent/integrations
Source: changelog 2026-08-21 "Generate Images in Agent Tasks"; 2026-09-25 "Fixes and Improvements" (live web search); 2026-07-30 "Inline Playback for Browser Agent Sessions"; 2026-06-05, 2026-07-10, 2026-07-18, 2026-07-29, 2026-08-07, 2026-09-04, 2026-05-29, 2026-06-25 "Fixes and Improvements"
Snapshot: 2026-11-03

## Contents

1. Functions
2. Browser
3. Browser session playback and recordings (changelog)
4. Image generation (changelog)
5. Live web search (changelog)
6. AppFactory (legacy) and the Kafka Cloud compatibility layer
7. Synchronous code and workflow app nodes
8. Preparing code for the app tools
9. Notebook restart recovery

## 1. Functions

Functions are custom scripts with a name, description, parameter schema and implementation. Use them when no integration or MCP server exists, or when the agent should call a repeatable set of deterministic steps: normalize CSVs, score leads, create a report, call an internal endpoint, transform a file.

Guidance from the docs:

- Keep functions narrow, typed and deterministic; broad functions are harder to use safely.
- Give every tool a clear name and description so the model knows when to call it.
- Store credentials as agent secrets instead of hard-coding them in function code. Secrets cover the "function runtime": values custom functions need without hard-coding, read through the runtime's normal environment-variable interface (for example `process.env.LINEAR_API_KEY`). Keys match `^[A-Z][A-Z0-9_]*$`.
- Functions are edited in the agent's Tools area (console). Agent versions show function scripts line by line in diffs (changelog 2026-08-21), but functions, workflows, modes and permission rules are not yet part of a pinned version (docs/agent/versions).

The docs give no manifest block, CLI command or public API endpoint for functions: the manifest has `instructions`, `entrypoint`, `playbooks`, `skills`, `mcp`, `evals` and `capabilities` only, and `brainbase agent push` syncs none of a function's definition. Manage functions in the console and fetch the live Tools page for the editor's fields.

## 2. Browser

Browser gives an agent a managed web browsing session for live pages, interactive websites or visual context. It is a built-in MCP server (`capabilities.browser`, default on; `browser_enabled` on the control plane; the headless browser host is `https://brainbase-browser-mcp.onrender.com`, overridable with `BRAINBASE_BROWSER_MCP_URL`, see `builtin-mcps.md`).

- What it is for: research on current pages; web app workflows (forms, dashboards, authenticated sites) when a tool integration is not available; visual verification (page state, screenshots, layouts, browser-only behavior).
- When to use it: when the agent must interact with a real web page or inspect rendered content. Prefer tools or MCP servers when a structured API gives the same data more reliably; prefer API tools for high-volume or repeatable access.
- How to use it: ask the agent to use a browser; it should just work. In the Browser tab, add and enable a proxy only if the agent must browse through a specific server or network.

Proxies are optional. You do not need a proxy for normal browsing. A proxy changes where the session's traffic exits; it does not turn browser access on. Add one only for a specific server, network, region or customer-approved route (changelog 2026-06-05: HTTP and HTTPS proxies, including regional egress, authenticated networks and staging environments). Only one proxy can be active at a time; enabling one disables the others for that agent.

| Field | Required | Description |
| --- | --- | --- |
| Name | Yes | A readable label for the proxy. |
| Server | Yes | The proxy server URL or host your browser traffic should use. |
| Username | No | The proxy username, if the proxy requires authentication. |
| Password | No | The proxy password, if the proxy requires authentication. |

Proxy passwords are encrypted at rest and decrypted only when used to route a request (changelog 2026-09-04). Keep proxy credentials in Secrets or the proxy credential fields, not in instructions.

Best practices: start without a proxy; enable only the proxy the agent should currently use; review browser sessions for agents that touch sensitive customer systems; tell the agent which sites it may access and what actions require confirmation. Changelog 2026-05-29 adds a recovery mode that blocks risky follow-up actions after a tool fails while keeping read-only inspection available; 2026-07-18: the hosted browser tool detects and clears CAPTCHA and anti-bot challenges on its own.

## 3. Browser session playback and recordings (changelog)

- 2026-07-10: the developer Task view has a Browser tab showing the per-task browser session (also available on live threads), view-only by default with an explicit Take control mode.
- 2026-07-29: download a recording of what the browser agent did during a task, even after its sandbox is gone; browser screenshots in task history render as images.
- 2026-07-30 "Inline Playback for Browser Agent Sessions": a video pane sits alongside the event timeline in the task view. Click an event to jump the video to that moment, or scrub the video to highlight the matching event; a coverage strip shows which parts have video. An event outside recorded coverage lands on the nearest frame and shows how far off it is. Full downloads start immediately and stream directly; the previous 6-hour cap per download is removed.
- 2026-08-07: no replay pane or playback error on tasks that never used the browser. 2026-07-18: screenshots and image results render as inline thumbnails that open full-size.

## 4. Image generation (changelog 2026-08-21 "Generate Images in Agent Tasks")

Agents can generate images inside managed tasks using Brainbase-provided models and task-scoped access: choose from the image models Brainbase exposes, pass supported generation options, and create as many variations as the task requires. Generated images are saved as ordinary task files and use the existing attachment flow. Available on newly provisioned managed-agent sandboxes. Brainbase provides short-lived, task-scoped access while keeping provider credentials out of the sandbox; image usage is attributed to the task and billed through Brainbase credits. The docs pages do not name the image models or the tool; check the live changelog and the agent's task view.

## 5. Live web search (changelog 2026-09-25)

Agents running GPT-5.6 models have a live web-search tool built in, instead of falling back to a slower browser-based workaround. The docs pages do not describe it further or list it for other models; for model availability open `brainbase-llm-gateway`.

## 6. AppFactory (legacy)

AppFactory is the Python client Kafka agents use to call connected apps from notebook code, with `from integrations import AppFactory`. During managed turns and synchronous code operations on enabled Kafka Cloud (`kafka_cloud`) canary agents, AppFactory calls the new integration service through a compatibility layer. Other agents keep the existing path.

Kafka Cloud is canary only: the new path is enabled only for selected internal canary agents. The older `kafka` runtime is unchanged; its AppFactory copy in `kafka-lite-vm` and the legacy `/pipedream/*` routes remain available, and both new and existing legacy Kafka agents can still use AppFactory, including for apps connected later.

During enabled managed execution, Brainbase records which agent, app and exact connected account may keep using AppFactory. An existing connection is covered only if it is on that list.

| During enabled managed execution | What to expect |
| --- | --- |
| A recorded app and account | AppFactory can keep using it, subject to its Allow, Ask and Deny rules. |
| The recorded account is disconnected and replaced | The replacement must use the `brainbase-apps` tools; the old connection is retired from AppFactory. |
| An app or account not on the list | Use the `brainbase-apps` tools. Another listed connection does not add this one. |
| A second account connected while the recorded one remains | Only the recorded account is eligible; use the `brainbase-apps` tools for the new one. |
| No recorded connection remains usable | AppFactory compatibility calls are refused; use the `brainbase-apps` tools. |

A refused compatibility call is stopped before reaching the app. Report the refusal when running a saved program unchanged; do not silently rewrite it, reconnect the account or switch tools. Refusal does not disconnect accounts or change rules. Once retired, re-adding the connection to the list does not restore it. `factory.get_auth_link()` keeps returning a connection link when available, or `None`, via the legacy route; connecting an account does not make it eligible for the compatibility layer. A copy of an agent does not inherit recorded AppFactory connections.

Running saved programs: run a supplied AppFactory program through Python in the notebook, keeping its variables, API calls, arguments and result expressions. Native MCP tools with similar names are not substitutes. `app.action(slug)` validates the slug against the app catalogue itself. Statements may be split into cells in order to inspect access and permission results; do not add probes or output wrappers. Stop if inspection requires changing the program, an input or account is missing, approval is pending, or access is denied.

## 7. Synchronous code and workflow app nodes

On enabled Kafka Cloud agents with a compatible runner, synchronous task code and workflow app nodes use the same connection restrictions, permission rules and integration accounting as managed turns. Saved AppFactory imports and configured inputs need not change; missing inputs remain missing. An incompatible runner refuses managed execution rather than sending calls through the legacy path. When the managed path is disabled, workflow app nodes keep their legacy behavior.

When an app action needs approval, Brainbase stops that code operation and shows the approval in the task view. While pending, the task-code response includes `pending` with continuation `"new_code_operation_required"`. Answering does not rerun code: after Allow once, explicitly submit a new code operation with the same action inputs; the approval can be used once. Stop cancels the pending approval. Retrying the same outer code operation ID returns its stored result without executing again. If an action's outcome is unknown, check the app before submitting new work.

## 8. Preparing code for the app tools

Applies to Kafka Cloud agents with the new tools enabled; keep the current path until Brainbase enables them. Accounts remain managed on the Tools page.

| AppFactory | Use instead |
| --- | --- |
| `factory.list_apps()`, `factory.get_connected_accounts()` | `list_apps` |
| `app.list_actions()`, `app.search_actions()` | `search_actions` |
| `print(action)` | `get_action` |
| `action.get_options_for_prop()`, `action.configure()` | `configure_prop`, `reload_props` |
| `app(...).action(...).run()` | `run_action` |
| `factory.proxy_get()` and the other `proxy_*` methods, `factory.custom_request()` | `proxy_request` |
| `factory.proxy_upload_file()` | `upload_file` with `source: {"kind": "workspace_path", "path": "/workspace/..."}` |
| `factory.proxy_upload_from_url()` | `upload_file` with `source: {"kind": "public_url", "url": "..."}` |
| `factory.get_auth_link()` | None. An agent manager connects accounts on the Tools page. |
| A Python loop over app data | The `bb-apps` command, from the shell or from Python |

```bash
# Once the new tools are enabled for this hosted agent:
bb-apps list_apps --json '{"include":"connected"}'
```

## 9. Notebook restart recovery

Kafka Cloud notebooks save Python values between worker restarts. A file handle is a Python file object, not the file; on runtimes with the checkpoint fix, disk handles (and lists, objects or functions capturing one) are omitted from saved state, and the cell reports "checkpoint skipped unsafe or unpicklable names". Keep the file path and the data rather than relying on a handle; reopen outputs in read mode. Do not rerun an app action or recreate an export just to rebuild notebook variables: the original operation may already have completed. The warning "restore skipped unsafe or unsupported names" lists variables omitted on recovery. "prior namespace could not be restored" means recovery failed and the saved state was moved aside intact into a `.corrupt` file: do not load that pickle or rename it back, since restoring it can execute saved Python code or create, reopen or truncate files; recover values from verified output files or operation receipts.
