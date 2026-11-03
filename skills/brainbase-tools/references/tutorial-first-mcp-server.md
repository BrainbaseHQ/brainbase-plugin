# Tutorial as a workflow: wire your first MCP server

Source: https://docs.brainbaselabs.com/tutorials/wire-first-mcp-server (Erik Nguyen, Platform Engineering, May 18 2026)
Source: https://docs.brainbaselabs.com/docs/agent/tools (remote MCP destinations)
Snapshot: 2026-11-03

The tutorial stands up a minimal MCP server, exposes one tool, and attaches it to an agent. It is dated May 2026 and predates some of the reference pages; where it differs from them, the notes below say so.

## Why MCP

One protocol for every tool, no per-integration adapter; tool discovery happens at runtime, so swapping a server does not require redeploying the agent.

## 1. Stand up the server

The tutorial uses a reference Node MCP server exposing everything over one HTTP endpoint with SSE-style streaming.

```bash
npm create mcp-server@latest acme-inventory
cd acme-inventory
npm install
npm run dev
```

That listens on `http://localhost:3333/mcp`; `GET /mcp/manifest` shows the empty manifest.

## 2. Declare a tool

Each declaration has a name, an input schema and a handler.

```typescript
// src/tools/lookup-sku.ts
import { defineTool } from "@mcp/server";
import { z } from "zod";

export const lookupSku = defineTool({
  name: "inventory.lookup_sku",
  description: "Return current stock and price for a SKU.",
  input: z.object({
    sku: z.string().describe("The SKU, e.g. ABC-123"),
  }),
  async handler({ sku }) {
    const row = await db.skus.find({ sku });
    if (!row) return { found: false };
    return { found: true, stock: row.qty, price_cents: row.price };
  },
});
```

Register it in `server.ts` and restart; the manifest now lists `inventory.lookup_sku` with its schema.

## 3. Attach to an agent

The agent pulls the manifest on its first run and treats each entry as a callable tool.

The URL has to be reachable from the public internet: hosted Brainbase connects only to public HTTPS MCP endpoints, so `http://localhost:3333/mcp` will not work, and neither will an internal hostname or private IP. Deploy behind a public HTTPS domain, or put a tunnel in front while iterating. On-prem deployments can reach internal addresses only when the operator has explicitly approved them.

```bash
curl --request POST \
  --url https://api.brainbaselabs.com/v2/agents \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "title": "Inventory assistant",
    "instructions": "Answer stock questions using the inventory tool. Cite the SKU you looked up.",
    "mcp_servers": [
      { "name": "inventory", "url": "https://mcp.acme.com/inventory", "auth": "bearer" }
    ]
  }'
```

Note: the API reference for `POST /v2/agents` documents `mcp_servers` entries as `name`, `url`, `command`, `args`, `env`, `headers`, `is_enabled`; it does not list an `auth` field. Prefer the reference shape (`headers` for a static bearer header, or OAuth authorized afterwards with `brainbase mcp connect`) and verify against the live API page. Equivalent paths: add the server on the agent's Tools page, or declare it under `mcp:` in `brainbase.agent.yaml` and run `brainbase agent push` (see `mcp-servers.md`).

## 4. Lock down permissions

Never ship a wide-open MCP server. By default the agent can call every tool in the manifest. The tutorial restricts access with scopes enforced by the MCP server:

```yaml
# mcp.config.yaml
scopes:
  inventory:read:
    tools:
      - inventory.lookup_sku
      - inventory.list_low_stock
  inventory:write:
    tools:
      - inventory.adjust_stock
```

The tutorial says scopes are assigned per agent in the Dashboard or via `POST /v2/agents/{id}/scopes`, and that the server enforces them on each call. That endpoint does not appear in the API reference pages in this snapshot; treat scopes as a server-side pattern from the tutorial and check the live docs before relying on the endpoint.

## Troubleshooting (from the tutorial)

| Symptom | What to check |
| --- | --- |
| Agent says "that tool isn't available" | The agent's scope set includes the tool's scope; re-run after updating. |
| 401 from the MCP server | The agent forwards your bearer token verbatim; confirm the token has access to the server. |
| Kafka starts before a tool is available | Kafka waits up to 2 seconds for MCP servers at startup, then starts with the tools already available. Servers still connecting get up to 30 seconds total including tool discovery; their tools become available on a later model turn in the same session. A server that misses the deadline is reported as failed and not retried automatically. Other runtimes have their own startup behavior. |
| Tool returns but the agent does not use it | Make the tool's `description` more concrete; the agent uses that string to decide whether to call it. |

Verify after attaching: `brainbase mcp list` (authorization state) and `brainbase mcp check` (reachability from the sandbox), or the live health shown on the agent's Tools page and per-run task detail.
