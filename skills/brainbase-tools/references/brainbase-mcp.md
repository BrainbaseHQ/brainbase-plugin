Source: https://docs.brainbaselabs.com/docs/mcp
Source: changelog 2026-07-22 "Brainbase MCP: Manage Your Agents from Claude Code and Codex"
Snapshot: 2026-11-10

# The Brainbase MCP

The Brainbase MCP is a remote Streamable HTTP MCP server at `https://api.brainbaselabs.com/mcp`. It lets an MCP client (Claude Code, Codex, ChatGPT, Claude, Cursor, VS Code) manage the signed-in user's Brainbase agents, evals, orchestrations and tasks. Authorization is Brainbase OAuth with the `mcp:all` scope; no API key goes into client configuration.

It is not one of the tools an agent uses. An MCP server you attach to an agent is covered in `mcp-servers.md`; the servers the platform installs are in `builtin-mcps.md`.

## Connect

| Client | Command |
| --- | --- |
| Claude Code | `claude mcp add --transport http --scope user brainbase https://api.brainbaselabs.com/mcp` |
| Codex | `codex mcp add brainbase --url https://api.brainbaselabs.com/mcp` |
| Others | Add a remote Streamable HTTP server with that URL and let the client start OAuth. No headers or tokens. |

## Everything else

Open the `brainbase-mcp-tools` skill. It holds the per-client steps and troubleshooting, the companion `brainbase-mcp` package, every tool by area, the revision, idempotency and confirmation rules, the calls that spend credits, the CLI-to-MCP command map, and which Brainbase areas the MCP does not reach.

For this skill's own area, the MCP reaches an agent's MCP servers only: `mcp_servers_list`, `mcp_servers_upsert` and `mcp_servers_remove`. Integrations, functions, browser proxies and authorizing a server's OAuth have no Brainbase MCP tool.
