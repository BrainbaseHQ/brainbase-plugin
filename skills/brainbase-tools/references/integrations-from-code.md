# Integrations from your own code (standalone contexts)

Source: https://docs.brainbaselabs.com/docs/agent/integrations-from-code
Source: https://docs.brainbaselabs.com/docs/agent/tools (Standalone SDK connection errors)
Snapshot: 2026-11-03

## Contents

1. Status and how it works
2. Create a context (`brainbase integrations context create`, `POST /v2/integration-contexts`)
3. Python SDK (`kafka_sdk.standalone_integrations`)
4. Get and renew access (`POST /v2/integration-grants/renew`)
5. Call the MCP server with any client
6. Approving an Ask from code
7. Unknown outcomes
8. End a context
9. HTTP errors and SDK connection errors

## 1. Status and how it works

Canary only. Standalone integrations are enabled only for selected internal canary agents. CLI 0.54.0 includes the context commands; the Python SDK is available by Git commit. Installing either does not enable integrations for your agent.

Code you run yourself (a Kafka SDK program or any plain MCP client) uses an agent's connected apps through the same `brainbase-apps` MCP server hosted tasks use, with the same accounts and the same Allow, Ask and Deny rules. Connect apps and set rules on the agent's Tools page first (`integrations.md`).

1. A person with management rights on the agent creates a **context**: one program's access to that agent's apps, for at most 30 days. Creating it returns a **renewal handle** (`bbir_…`).
2. Your code trades the renewal handle for a short-lived **access grant** (`bbig_…`), valid about 15 minutes. Each trade returns a new renewal handle that replaces the old one.
3. Your code calls the MCP server with the access grant as bearer token.
4. When an action needs approval, the call returns an approval link; a person approves in the browser and your code checks back with `get_operation`.

Both tokens let your code run the agent's app actions. Store them like any other secret; never put them in a prompt, a log or source control.

## 2. Create a context

CLI 0.54.0 or later, signed in as yourself with `brainbase login` and management rights on an enabled agent. Prints the renewal handle once; put it in your program's secret store.

```bash
brainbase integrations context create --agent "$AGENT_ID" --application nightly-report
# --max-lifetime 30d   how long the context may live: 60s to 30d (default 7d)
# --json               print {context_id, renewal_handle, renewal_expires_at, max_expires_at}
```

- `--agent` defaults to the agent the current folder is linked to.
- `--application` names your program: up to 120 characters of `a-z`, `0-9`, `.`, `_`, `:`, `/` and `-`, starting with a letter or digit.
- The CLI requires your own signed-in session. It refuses `BRAINBASE_TOKEN` and does not use a stored PAT. Task keys and integration grants cannot create contexts.

API (enabled canary): accepts a signed-in person's session token with management rights. `max_lifetime_s` is required, 60 to 2592000 seconds.

```bash
curl --request POST \
  --url "https://api.brainbaselabs.com/v2/integration-contexts" \
  --header "Authorization: Bearer $BRAINBASE_SESSION_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"agent_id": "'"$AGENT_ID"'", "application": "nightly-report", "max_lifetime_s": 2592000}'
```

Response: `{ context_id, renewal_handle: "bbir_…", renewal_expires_at, max_expires_at }`.

Refusals: a recognised credential that is not a person's session gets `403 human_credential_required` ("Sign in with your Brainbase session to manage integration contexts"); missing or invalid credentials `401`; `404` can mean the feature is off, the agent is outside the canary, or you cannot manage that agent.

## 3. Python SDK

Install the reviewed commit from GitHub with an identity that can access the repository. The SDK is distributed by Git commit; the package version alone does not identify its contents.

```bash
python -m pip install 'kafka-sdk @ git+https://github.com/BrainbaseHQ/kafka-sdk.git@61e786f833b8be9f887c4c3bb9c86022b711c63b'
```

`kafka_sdk.standalone_integrations.StandaloneIntegrations` renews access, retries lost responses and waits for approval. Give it a renewal handle and a function that saves each replacement before the new grant is used. Create the handle file with mode `0600` first.

```python
import asyncio
from pathlib import Path
from kafka_sdk.standalone_integrations import StandaloneIntegrations

HANDLE = Path("~/.config/brainbase/renewal-handle").expanduser()  # mode 0600, outside source control

async def main():
    async with StandaloneIntegrations(
        HANDLE.read_text().strip(),
        on_renewal_handle=lambda handle: HANDLE.write_text(handle + "\n"),
    ) as apps:
        result = await apps.run(
            "run_action",
            {"action_key": "rss-merge-rss-feeds",
             "configured_props": {"urls": ["https://example.com/feed.xml"]}},
            timeout_s=600,
        )
        print(result["status"], result.get("data") or result.get("error"))

asyncio.run(main())
```

- `run(tool, arguments)` adds an `operation_id` for `run_action`, `proxy_request` and `upload_file` if you leave it out and reuses it when retrying a lost response. Save and pass your own id to resume after restarting your program.
- On approval, `run` prints the approval link (or calls your `on_pending`), checks `get_operation` every 5 seconds or more, and runs the action once approved. It returns the `pending` result if nobody answers before the request expires or `timeout_s` passes.
- `call(tool, arguments)` returns the envelope without waiting for approval; it can renew and retry after a `401`. Both `call` and `run` renew the grant when two minutes or less remain.
- Tool outcomes (`denied`, `error`, `outcome_unknown`) are returned as envelopes. Connection and access failures raise `StandaloneNotEnabled`, `RenewalInvalid`, `ServiceRefused` (with `status`, `error` and `reason`) or `ServiceUnavailable`; other renewal failures raise `IntegrationsError`.

## 4. Get and renew access

Without the SDK, send the renewal handle, and nothing else, to the renew endpoint. Save the new handle before you use the grant: the old one stops working.

```bash
curl --request POST \
  --url "https://api.brainbaselabs.com/v2/integration-grants/renew" \
  --header "Authorization: Bearer $BRAINBASE_RENEWAL_HANDLE" \
  --header "Content-Type: application/json" \
  --data '{}'
```

Response: `{ grant: "bbig_…", grant_expires_at, renewal_handle: "bbir_…", renewal_expires_at }`.

- Renew a minute or two before `grant_expires_at`. A grant lasts about 15 minutes and never past the context's end. An expired grant is refused before anything runs.
- If a renew response is lost, retry with the same handle within 60 seconds; the server can return the same replacement pair while that replacement is current. After that window the old handle returns `401 renewal_invalid`.
- The renewal handle never outlives the context. Renewing never changes the agent, extends the context, or clears a Deny or a waiting approval.
- `401 renewal_invalid`: the handle is unknown, expired, replaced, or its context ended. Use the newest saved handle; if lost or ended, a person creates a new context. `503 renewal_unavailable`: try again with the same handle.

## 5. Call the MCP server with any client

Stateless Streamable HTTP at `https://brainbase-pipedream-mcp.onrender.com/mcp`. Send the current access grant as bearer token on every request. The agent comes from the grant, so no tool takes an agent id. Tools, inputs and result shape are those in `integrations.md`.

```python
import asyncio, os, uuid
import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

URL = "https://brainbase-pipedream-mcp.onrender.com/mcp"

async def call(tool: str, arguments: dict) -> dict:
    grant = os.environ["BRAINBASE_ACCESS_GRANT"]
    http = httpx.AsyncClient(headers={"Authorization": f"Bearer {grant}"}, timeout=300)
    async with http, streamable_http_client(URL, http_client=http) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            await session.list_tools()
            result = await session.call_tool(tool, arguments)
            return result.structuredContent

async def main():
    op = str(uuid.uuid4())  # keep it: retries and status checks reuse it
    envelope = await call("run_action", {
        "action_key": "rss-merge-rss-feeds",
        "configured_props": {"urls": ["https://example.com/feed.xml"]},
        "operation_id": op,
    })
    print(envelope["status"], envelope.get("data") or envelope.get("error"))

asyncio.run(main())
```

- The example opens a new MCP session per call; the server uses stateless HTTP.
- Keep the same `operation_id` and input when retrying `run_action`, `proxy_request` or `upload_file`. A completed operation returns its stored receipt (`data.replayed: true` and a summary). An operation still running can return `busy`; do not replace its id to force another execution.
- Uploads take `source: {kind: "bytes_base64", …}` or `{kind: "public_url", url}`, up to 25 MiB. Workspace paths are only for hosted tasks.
- The standalone path does not write large results to workspace files or set `result_ref`. Use `output.fields` or `output.filter` on `run_action`; `max_inline_bytes` does not create a file here.
- Discovery without a grant: `list_apps`, `search_actions` and `get_action` work without an access grant; discovery clients can also use `/p/{agent_id}/mcp` or `/t/{task_id}/mcp` with a credential that can access that agent or task. Execution always needs a grant.

## 6. Approving an Ask from code

An Ask rule returns `status: "pending"`; the action has not run. Your grant cannot approve it; a person answers in the browser. New execution operations in the same context wait behind the request; discovery and `get_operation` remain available.

```json
{
  "status": "pending",
  "operation_id": "a479040e-55c5-4c86-ad3b-dc6aa04592b1",
  "pending": {
    "event_id": "fca861a6-ce5b-4f30-b37b-ef67c2a51c58",
    "capability": "rss.rss-merge-rss-feeds",
    "state_generation": 3,
    "mode": "standalone",
    "message": "rss.rss-merge-rss-feeds needs a person's approval. Open https://app.brainbaselabs.com/integrations/approvals/fca861a6-ce5b-4f30-b37b-ef67c2a51c58 to approve it, then call get_operation with this operation_id (no more often than every 5 s) and repeat the call once it is approved.",
    "approval_url": "https://app.brainbaselabs.com/integrations/approvals/fca861a6-ce5b-4f30-b37b-ef67c2a51c58",
    "poll_after_s": 5,
    "expires_at": "2026-10-27T10:10:00Z"
  }
}
```

1. Show `pending.approval_url` to the person who should approve.
2. They open it, sign in, and see the agent, your program's name, the action and the expiry. They choose **Allow once** or **Deny**. Only people with access to the agent can see or answer it; a non-manager cannot allow what the agent's rules deny.
3. Call `get_operation` with the same `operation_id`, no more often than every `poll_after_s` seconds (at least 5). It returns `pending` until answered, `denied` after a Deny, and after **Allow once** `success` with `data.phase: "approved"` (approved, not run).
4. Repeat the original call with the same `operation_id` and input within 10 minutes of the approval and before the context expires. The agent's rule stays Ask.

- A request expires 10 minutes after it is made. `get_operation` can keep returning `pending` after `expires_at`, so stop waiting at the first response's `expires_at`. A new `operation_id` asks again; the old one returns `cancelled`.
- **Allow once** covers only that `operation_id` and input. Different input needs a new `operation_id`; reusing the old one with different input returns `invalid_input`.
- **Deny** in the browser blocks that action for the whole context, every later `operation_id` and across renewals, until an agent manager selects **Clear this Deny** on the same page or the context ends. It does not change the agent's rules; lasting rules are set on the Tools page.

## 7. Unknown outcomes

`outcome_unknown` means an action may have reached the app but Brainbase cannot confirm the result. New execution operations in the context return `busy`; the SDK does not retry an `outcome_unknown` envelope. Ask an agent manager to check the app before continuing. Do not use a new operation id or context to repeat the uncertain action.

On the standalone approval page, an agent manager reviews the stored unknown outcome from their own signed-in session, chooses **It happened**, **It did not happen** or **I can't tell**, then **Acknowledge**. This records the finding and releases the context; it never resends the action or changes its receipt (polling still returns `outcome_unknown`). Ending or recreating a context does not establish whether it happened.

## 8. End a context

Ending revokes the renewal handle and grants; it cannot undo an action already dispatched.

```bash
brainbase integrations context end "$CONTEXT_ID" --reason "job retired"
```

```bash
curl --request POST \
  --url "https://api.brainbaselabs.com/v2/integration-contexts/$CONTEXT_ID/end" \
  --header "Authorization: Bearer $BRAINBASE_SESSION_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"reason": "job retired"}'
```

`reason` is 1 to 200 characters.

## 9. Errors

Authentication refusals (`401`, `403`) happen before dispatch. Tool outcomes, including a Deny or an upstream failure, use the envelope's `status`. A lost response, timeout or generic server error does not prove nothing ran: keep the operation id and check `get_operation` before deciding what to do.

| Response | Meaning |
| --- | --- |
| `401 unauthorized` | No credential, or one the server does not recognise. |
| `401 grant_invalid` | The grant expired, was revoked, or its context ended. Check the body's `reason`: renew an expired grant; an ended context needs a new context. |
| `403 grant_required` | Only `list_apps`, `search_actions` and `get_action` work without a grant. |
| `403 flag_off` | Integrations are off for this kind of access. |
| `404 agent_required` | The credential is not tied to an agent. Discovery clients can use `/p/{agent_id}/mcp` or `/t/{task_id}/mcp`; execution still requires a grant. |
| `404` | The agent or task is not one your credential can reach. |
| `405` | A GET request. The server takes POST only. |
| `413` | The encoded request exceeds the server body limit. Files have a separate 25 MiB limit. |
| `503 unavailable` | An authentication or access check was unavailable. Preserve the operation id when retrying. |
| `401 renewal_invalid` (renew endpoint) | The renewal handle is unknown, expired or replaced, or its context ended. |

Standalone SDK connection errors (from docs/agent/tools): pass the renewal handle as `bbir_` followed by 64 hex characters, no whitespace; the SDK rejects malformed handles with `ValueError` before sending. Strip the trailing newline when reading a handle file, as `examples/standalone_integrations.py` does. `ServiceUnavailable` reports the failing step and a transport reason class such as `ConnectError`, `LocalProtocolError` or `ReadTimeout`; transport error text and chained tracebacks are omitted because they can contain credentials. For `ConnectError` check the configured API and service addresses and network access; for `LocalProtocolError` check any custom HTTP client's header handling. A lost tool response can mean the action already ran: retry with the same `operation_id` (`run()` preserves it).
