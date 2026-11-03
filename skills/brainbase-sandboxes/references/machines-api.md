# Machines API and `brainbase machine`

Source: https://docs.brainbaselabs.com/api/machines/machine-capabilities · https://docs.brainbaselabs.com/api/machines/create-machine · https://docs.brainbaselabs.com/api/machines/get-machine · https://docs.brainbaselabs.com/api/machines/list-machines · https://docs.brainbaselabs.com/api/machines/machine-status · https://docs.brainbaselabs.com/api/machines/delete-machine · https://docs.brainbaselabs.com/api/machines/machine-preview · https://docs.brainbaselabs.com/api/machines/machine-preview-probe · https://docs.brainbaselabs.com/cli/commands/machine · https://docs.brainbaselabs.com/api#sandboxes · https://docs.brainbaselabs.com/api/usecases/live-preview · https://docs.brainbaselabs.com/api/usecases/fix-failing-tests · https://docs.brainbaselabs.com/cli/commands/task
Snapshot: 2026-11-03

A machine is the sandbox a task runs in. It bills while it exists. Every call below authenticates with `Authorization: Bearer $BRAINBASE_TOKEN` against `https://api.brainbaselabs.com`.

## The machine object

Returned by create, get, list and delete:

```json
{
  "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
  "kind": "string",
  "external_id": "string",
  "status": "starting",
  "region": "string",
  "owner_user_id": "65139110-7c3c-4777-b692-80c218be3b9d",
  "agent_id": "2b1e3b65-2c04-4fa2-a2d7-467901e98978",
  "snapshot": "string",
  "metadata": { "property1": "string" },
  "created_at": "2019-08-24T14:15:22Z",
  "last_seen_at": "2019-08-24T14:15:22Z",
  "destroyed_at": "2019-08-24T14:15:22Z"
}
```

`id` is the Brainbase `machine_id`; `external_id` is the provider's identifier. The docs show `starting` in examples and `sleeping` in `machine ls` output, and call a torn-down machine `DEAD` / `dead`; they do not enumerate every status value.

`machine_id` vs `sandbox_id`: a task or thread record (`GET /v2/threads/{thread_id}`, `GET /v2/tasks/{task_id}`) carries both `machine_id` (Brainbase) and `sandbox_id` (provider-side), plus `machine_size`. The two can look identical (both are often UUIDs), so tell them apart by field name. Previews and `DELETE /v2/machines/{id}` take `machine_id`. A thread whose provisioning never reached a sandbox has no `machine_id`.

## `GET /v2/machines/capabilities`

Describes every registered provider and the caller's accelerator access.

```json
{
  "accelerator_requests_enabled": true,
  "providers": [
    {
      "machine_kind": "string",
      "resource_classes": ["cpu"],
      "accelerators": [],
      "supports_shared_folders": true,
      "supported_machine_sizes": ["l"],
      "machine_size_resources": {
        "s": { "cpu": 0, "memory_gib": 0, "disk_gib": 0 }
      }
    }
  ]
}
```

- The provider list is the build's registry, not the deployment's configuration: it names every provider the service knows how to drive, including ones a kill switch has disabled and ones the caller's account is outside the rollout for. Only `accelerator_requests_enabled` is scoped to the caller.
- It answers "what shape is this provider" (sizes, shared folders, accelerators), never "may I use it". Agent create is the only authority on that: `503` for a disabled provider, `403` for one the caller cannot reach. A client that treats presence here as availability builds a picker whose options are then refused.
- Supported runtimes are not in the response; carry the "coding agents only" column from `providers-and-pricing.md` in the client.

## `POST /v2/machines` (Create Machine)

| Body field | Type | Meaning |
| --- | --- | --- |
| `kind` | string | Machine implementation to use. Must be a registered kind. |
| `agent_id` | uuid | Optional agent to associate this machine with (for cost / ownership rollups). The machine is NOT tied to any task. |
| `snapshot` | string | Optional per-provider image/snapshot override. |
| `metadata` | object | Freeform string→string labels stored on the machine. |

```bash
curl --request POST --url https://api.brainbaselabs.com/v2/machines \
  --header "Authorization: Bearer $BRAINBASE_TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{"kind": "daytona", "agent_id": "<agent-id>", "metadata": {"purpose": "scratch"}}'
```

Tasks and threads provision their own machines; this endpoint creates a standalone one. It bills from creation until deleted.

## `GET /v2/machines` (List Machines)

| Query | Meaning |
| --- | --- |
| `kind` | Filter by provider. |
| `include_dead` | Include terminally torn-down machines. |
| `limit` | Page size. |

Response: `{"items": [ <machine>, ... ]}`.

## `GET /v2/machines/{machine_id}` (Get Machine)

Query `refresh=true` re-observes status from the provider before returning.

## `GET /v2/machines/{machine_id}/status` (Machine Status)

```json
{ "id": "…", "status": "starting", "external_id": "string", "detail": "string" }
```

## `DELETE /v2/machines/{machine_id}` (Delete Machine)

Terminal teardown: destroys the provider sandbox and marks the row DEAD. The row is not removed; machines are kept for audit/cost history. Calling it on an already-dead machine is a no-op that returns the dead row. Teardown is gated more strictly than reads: a read/use-only member of the machine's agent can inspect it, but only the machine owner or an agent manager (owner / team owner-admin) may destroy it. If the task is still running, tearing down its machine ends it.

```bash
curl --request DELETE --url "https://api.brainbaselabs.com/v2/machines/$MACHINE_ID" \
  --header "Authorization: Bearer $BRAINBASE_TOKEN"
```

Alternatives: `DELETE /v2/tasks/{task_id}` and `brainbase task delete <task-id>` permanently delete a task and tear down its sandbox (a running task must be stopped first with `brainbase task stop <task-id>`). A sandbox also stops on its own when idle; delete the machine only to free it immediately.

## `GET /v2/machines/{machine_id}/preview` (Machine Preview)

Query `port` (integer, optional): port on the machine to expose; omit for the provider default (8000 unless the provider uses another).

```json
{ "url": "string", "port": 0, "token": "string", "token_header": "string", "expires_at": "2019-08-24T14:15:22Z" }
```

- On a deployment with a branded preview domain the link is minted without waking the machine; `expires_at` is when the branded link expires. On `api.brainbaselabs.com` a `*.brainbaselabs.space` URL comes back that anyone can open, with `token` and `token_header` null.
- Otherwise a sleeping machine is resumed first (the request can take a few seconds on a cold sandbox), `expires_at` is null, and the URL is token-gated: send the `token_header` header with the `token` value, or a browser request without it redirects to auth.
- A link is minted whether or not anything listens on the port.

| Status | `detail` | Meaning |
| --- | --- | --- |
| `422` | `detail.code = interface_preview_only` | Port 8000 on this machine serves an interface's unpublished dashboard, which opens only at the interface's preview address behind sign-in. `detail.message` names that address; `detail.preview_url` carries it (null when the interface is archived or the deployment has no interfaces domain). Other ports, and every port on other machines, are unaffected. |
| `422` | string | The machine cannot expose the port as a preview: Modal machines have no public preview port; an AWS MicroVM port other than its proxy's default is refused because the returned link carries a single token header and would open a different port. |
| `422` | array | Request validation errors. |

## `GET /v2/machines/{machine_id}/preview/probe` (Machine Preview Probe)

Query `port` (optional; default is the machine's default preview port, 8000 unless its provider uses another).

```json
{ "port": 0, "serving": true }
```

- Sends one GET to the root of the port through the same provider URL the preview link opens. `502`, `503`, `504` or a connection failure means `serving: false`. Any other status means `serving: true`, including a redirect or an error page from the app. If no status arrives within 5 seconds, `serving` is true (a dev server is usually compiling its first page).
- Side effect: a sleeping machine is transparently resumed first. Minting a link with `GET …/preview` does not resume it; opening the link does.

| Status | Meaning |
| --- | --- |
| `409` `"machine has been torn down (dead); cannot open a preview"` | The machine no longer exists. |
| `422` | Modal machines do not support previews, or the port cannot be opened through a preview link (an AWS microVM port that needs extra routing headers); `detail` names which. |
| `502` `"failed to reach the machine's preview"` | The provider could not be asked. |

## `brainbase machine ls`

List the sandboxes you can reach, newest first. `brainbase machine list` is an alias.

```bash
brainbase machine ls
brainbase machine ls --all
brainbase machine ls --json
```

```text
ID                                    KIND     STATUS    SIZE  AGENT        AGE
143975a9-9677-4562-9d55-b37e365510c6  daytona  sleeping  s     Support Bot  2h
6fb8da29-61a8-4875-88f8-0756ee192512  daytona  sleeping  s     -            2d
```

Columns: `ID`, `KIND`, `STATUS`, `SIZE`, `AGENT`, `AGE`. `AGENT` is the name when known, the id otherwise, or `-` when unassigned. Age is the number to scan: a sandbox around for days with no task attached is the one costing money.

| Flag | Description |
| --- | --- |
| `--all` | Include machines that have already been torn down. |
| `--limit <n>` | How many to fetch (1–200, default 50). |
| `--json` | Emit the raw machine objects. |

Torn-down machines are hidden by default because dead rows accumulate and quickly outnumber live ones.

## `brainbase machine rm`

Tear a sandbox down. Terminal: the environment is destroyed and anything not copied out is gone. The record is kept and marked dead, so it still appears under `machine ls --all`.

```bash
brainbase machine rm <machine-id>
brainbase machine rm <machine-id> --yes
```

```text
✓ daytona sandbox 3f9a1b2c-0000-0000-0000-00000000aaaa is torn down.
  destroyed_at 2026-08-31T23:59:00Z
```

| Flag | Description |
| --- | --- |
| `--yes`, `-y` | Skip the confirmation prompt. |
| `--json` | Emit the resulting machine object. |

The command confirms before destroying unless `--yes` is passed or it runs without a terminal (`BRAINBASE_NON_INTERACTIVE=1` or `CI` set makes it refuse and name `--yes`). Tearing down an already-dead machine reports the existing teardown rather than failing. There is no way to restore a torn-down sandbox; if the task is still running, tearing down its machine ends it. Check `brainbase task logs <task-id>` first if unsure the sandbox is idle.

## Reading a machine from a task

`brainbase task get <task-id>` prints the machine and provider sandbox:

```text
  machine  143975a9-9677-4562-9d55-b37e365510c6 (size s)
  sandbox  3d86f338-305c-432c-94b6-12fc6c91d446
```

With `--json` the task record (including `machine_id`, `sandbox_id`, `machine_size`) is nested under `task`.
