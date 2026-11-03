# The Brainbase MCP: manage Brainbase from Claude Code, Codex, ChatGPT and other MCP clients

Source: https://docs.brainbaselabs.com/docs/mcp
Source: https://docs.brainbaselabs.com/api/authentication (Brainbase MCP), https://docs.brainbaselabs.com/api/meta/oauth-protected-resource, https://docs.brainbaselabs.com/docs/agent/playbooks, https://docs.brainbaselabs.com/docs/orchestrations/secrets, https://docs.brainbaselabs.com/docs/monitoring/evaluations
Source: changelog 2026-07-22 "Brainbase MCP: Manage Your Agents from Claude Code and Codex"; 2026-08-06 and 2026-10-30 "Developer Updates"
Snapshot: 2026-11-03

## What it is

A universal remote Streamable HTTP MCP server at `https://api.brainbaselabs.com/mcp` for any compatible OAuth-capable MCP client. It exposes 52 explicit tools for managed-agent operations with revision and confirmation safety, rather than turning API routes into tools automatically. Authorization is Brainbase OAuth: no API key is stored in client configuration. The protected resource is `https://api.brainbaselabs.com`; authorization is issued by `https://app.brainbaselabs.com`. `GET /.well-known/oauth-protected-resource` (RFC 9728) names the OAuth server; clients fetch it via the `resource_metadata` pointer in the 401 challenge. Changelog 2026-10-30: the OAuth server advertises issuer identification (RFC 9207) and returns `iss` on every authorize redirect, so connector clients like ChatGPT and Codex can use their stable callback URL.

Never paste tokens: do not put API keys, bearer tokens or session tokens into an MCP client, command, chat or support message. Authenticate only through the OAuth flow the destination client starts.

## Connecting

| Client | How |
| --- | --- |
| Codex | `codex mcp add brainbase --url https://api.brainbaselabs.com/mcp`, then complete the OAuth flow Codex opens. `codex mcp login brainbase --scopes mcp:all` only to reauthenticate. |
| Claude Code | `claude mcp add --transport http --scope user brainbase https://api.brainbaselabs.com/mcp`, then use Claude Code's MCP connection flow to finish OAuth. |
| Cursor | One-click remote MCP install from the docs page; approve the server, then finish OAuth in Cursor. |
| VS Code (and GitHub Copilot) | One-click remote HTTP configuration from the docs page; confirm, then authorize in VS Code. |
| ChatGPT | Enable developer mode on ChatGPT web if your plan and workspace allow it, add a custom app with the server URL, complete OAuth. |
| Claude | Create a custom remote MCP connector in Claude settings with the server URL, complete OAuth. |
| Any other compatible client | Create a remote Streamable HTTP MCP named Brainbase and let the client start OAuth. Do not add authorization headers or tokens. |

Generic JSON shape, only for a client that accepts an `mcpServers` object and supports OAuth for remote HTTP servers:

```json
{
  "mcpServers": {
    "brainbase": {
      "type": "http",
      "url": "https://api.brainbaselabs.com/mcp"
    }
  }
}
```

## Optional companion packages (`brainbase-mcp`)

Codex and Claude Code can install an enhanced package from the public `BrainbaseHQ/brainbase-mcp` marketplace. Each package connects the same MCP and adds the Brainbase operating skill, which guides the client through the safe-build workflow: inspect-before-edit, targeted writes, revisions, eval and trigger testing, credential boundaries, and confirmed deletion. The package also carries a thin client manifest and reference material without credentials.

```bash
# Codex: run both, complete OAuth, then start a new Codex session
codex plugin marketplace add BrainbaseHQ/brainbase-mcp --ref main
codex plugin add brainbase-mcp@brainbase

# Claude Code: run both, complete OAuth, then restart Claude Code
claude plugin marketplace add --scope user BrainbaseHQ/brainbase-mcp
claude plugin install --scope user brainbase-mcp@brainbase
```

Invoke the Brainbase skill explicitly when you want the client to follow the complete workflow. The agent template is different: selecting Brainbase MCP in the agent-template picker creates a managed agent from `brainbase/brainbase-mcp`; it does not install a client package. Authorize that agent's Brainbase MCP from its Tools page if prompted.

## What it can do

The launch contract covers organizations and teams, agents, agent versions, templates, registry skills, MCP servers, playbooks, evals, orchestrations, schedules, tasks, and normalized task events. Workflows are excluded.

| Area | Behavior |
| --- | --- |
| Organizations and teams | `orgs_list` and `teams_list` find where to work before you select or create a resource. |
| Agents | List, inspect, create, update, delete. MCP-created agents default to `kafka_cloud` unless a runtime or template supplies another value. |
| Agent versions | `agent_versions_list`, `agent_versions_get`, `agent_versions_label` read and name versions. `agent_versions_restore`, `agent_versions_pin`, `agent_versions_unpin` require `confirm_version_number` equal to the target version's number; run a restore with `dry_run` first. |
| Components | Update instructions and playbooks (`playbooks_list`, `playbooks_upsert`, `playbooks_archive`), search and attach skills, manage MCP servers without returning credential values. |
| Evals and schedules | Create, update, run or test, inspect results, delete. Enabled evals are required before a run. |
| Orchestrations | Manage orchestrations, members, edges and schedule triggers. |
| Tasks | Create runs, send follow-ups, inspect or interrupt tasks, read normalized events. Tasks created through MCP run automatically by default (changelog 2026-08-06). |
| Registry templates | Search and inspect packages, then create a new agent from supported runtime, model, instruction, skill and MCP components. |

Safety contract:

- Re-read before changing. Editable resources carry an opaque revision; updates and lifecycle deletes require `expected_revision`, and a stale value returns a conflict. Re-read, preserve unrelated state, reapply the change.
- Creates require idempotency keys; top-level deletes require exact-name confirmation.
- Some operations start billable work: starting a task, running an eval, testing a schedule, or sending a follow-up with execution enabled can consume credits. Review the target agent, prompt and expected work before confirming.

## Granted access

OAuth grants the `mcp:all` scope. It is user-wide, not limited to one agent, so the consent screen shows no agent or organization picker. It does not bypass authorization: every action remains bounded by the signed-in user's organization, role and resource ACLs. The changelog (2026-07-22) describes the sign-in as consent-based authorization that only grants MCP access, with publishing and administrative actions outside its reach; the orchestration secrets page counts "an OAuth-connected MCP client" among credentials that can publish, and the evaluations page says MCP OAuth JWTs keep their existing access checks for eval writes. Where these differ, check the live pages. The docs do not publish the full list of 52 tool names.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| Authorization did not open | Remove the stale Brainbase connection, add `https://api.brainbaselabs.com/mcp` again, complete OAuth in the same client. |
| Expected agents are missing | Confirm the right Brainbase account, and that it has access to those agents. |
| The optional skill does not appear | Confirm the Codex or Claude Code package is installed, then start a new chat or restart the client. |
| Tools do not appear | Refresh or restart the client after connecting or installing. |
| The client cannot connect | Confirm it supports remote Streamable HTTP MCP and OAuth; otherwise use another client, the CLI or the API. Never substitute pasted tokens. |
