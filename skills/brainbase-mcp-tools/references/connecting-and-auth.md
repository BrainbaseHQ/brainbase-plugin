Source: https://docs.brainbaselabs.com/docs/mcp
Source: https://docs.brainbaselabs.com/api/authentication (Brainbase MCP), https://docs.brainbaselabs.com/api/meta/oauth-protected-resource
Source: BrainbaseHQ/brainbase-mcp 0.1.2, skills/brainbase-mcp/SKILL.md (Credential and authorization boundary)
Source: changelog 2026-07-22 "Brainbase MCP: Manage Your Agents from Claude Code and Codex"
Snapshot: 2026-11-10

# Connecting and authorizing the Brainbase MCP

## What it is

A remote Streamable HTTP MCP server at `https://api.brainbaselabs.com/mcp` for any OAuth-capable MCP client. It exposes explicit tools for managed-agent operations, with revision and confirmation safety, instead of turning API routes into tools. Authorization is Brainbase OAuth: no API key is stored in client configuration. The OAuth issuer is `https://app.brainbaselabs.com`; the `/mcp` URL is the resource, not the issuer.

## Connecting

| Client | How |
| --- | --- |
| Codex | `codex mcp add brainbase --url https://api.brainbaselabs.com/mcp`, then complete the OAuth flow Codex opens. `codex mcp login brainbase --scopes mcp:all` only to reauthenticate. |
| Claude Code | `claude mcp add --transport http --scope user brainbase https://api.brainbaselabs.com/mcp`, then finish OAuth through Claude Code's MCP connection flow. |
| Cursor | One-click remote MCP install from the docs page; approve the server, then finish OAuth in Cursor. |
| VS Code and GitHub Copilot | One-click remote HTTP configuration from the docs page; confirm, then authorize in VS Code. |
| ChatGPT | Enable developer mode on ChatGPT web if the plan and workspace allow it, add a custom app with the server URL, complete OAuth. |
| Claude | Create a custom remote MCP connector in Claude settings with the server URL, complete OAuth. |
| Any other compatible client | Create a remote Streamable HTTP MCP named Brainbase and let the client start OAuth. Add no authorization headers or tokens. |

Generic JSON, only for a client that accepts an `mcpServers` object and supports OAuth for remote HTTP servers:

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

## The companion package

Codex and Claude Code can install the official `brainbase-mcp` package, which connects the same server and adds an operating skill named `brainbase-mcp`.

```bash
# Codex: run both, complete OAuth, then start a new Codex session
codex plugin marketplace add BrainbaseHQ/brainbase-mcp --ref main
codex plugin add brainbase-mcp@brainbase

# Claude Code: run both, complete OAuth, then restart Claude Code
claude plugin marketplace add --scope user BrainbaseHQ/brainbase-mcp
claude plugin install --scope user brainbase-mcp@brainbase
```

How the two skills divide the work: the package's `brainbase-mcp` skill is the operating guide for a build session and ships with the connection. This plugin's `brainbase-mcp-tools` is the reference: which tool does what, what the MCP cannot reach, and how each `brainbase-*` skill maps to it. Their write rules are the same. This skill works without the package, which matters in ChatGPT, Claude chat and any client that only has the remote server.

The agent template is something else: choosing Brainbase MCP in the agent-template picker creates a managed agent from `brainbase/brainbase-mcp`. It installs nothing in the client. Authorize that agent's Brainbase MCP from its Tools page if prompted.

## When the server is configured but not authorized

A server that is listed but has no tools usually needs OAuth. The agent cannot start OAuth; the human does it in the client:

| Client | The human's step |
| --- | --- |
| Claude Code | Open the MCP connection flow (`/mcp`) and authorize `brainbase`. |
| Codex | `codex mcp login brainbase --scopes mcp:all`. |
| ChatGPT, Claude, Cursor, VS Code | Reconnect or authorize the Brainbase connector in the client's settings. |

Tools may appear only after a refresh, a new chat or a restart. If the human declines, use the CLI, the API or the console instead. Do not accept a pasted key or token as a shortcut.

A `401` on a call that worked earlier means the grant expired; the same step fixes it.

## Granted access

OAuth grants the `mcp:all` scope. It is user-wide, not limited to one agent, so the consent screen shows no agent or organization picker. It does not bypass authorization: every action stays bounded by the signed-in user's organization, role and resource access. Resource-scoped PATs and `bb_live_…` task keys are not MCP credentials.

The docs differ on publishing: the changelog (2026-07-22) says the sign-in only grants MCP access, with publishing and administrative actions outside its reach, while the orchestration secrets page counts "an OAuth-connected MCP client" among credentials that can publish. Check the live pages before relying on either. Role and scope detail: `brainbase-permissions`.

## Troubleshooting

| Symptom | What to do |
| --- | --- |
| Authorization did not open | Remove the stale Brainbase connection, add `https://api.brainbaselabs.com/mcp` again, complete OAuth in the same client. |
| Expected agents are missing | Confirm the right Brainbase account is signed in and has access to those agents. |
| The optional skill does not appear | Confirm the Codex or Claude Code package is installed, then start a new chat or restart the client. |
| Tools do not appear | Refresh or restart the client after connecting or installing. |
| The client cannot connect | Confirm it supports remote Streamable HTTP MCP and OAuth; otherwise use another client, the CLI or the API. Never substitute pasted tokens. |
