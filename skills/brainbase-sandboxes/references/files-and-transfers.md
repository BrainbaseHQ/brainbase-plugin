# The file system, files API, shared files and file transfers

Source: https://docs.brainbaselabs.com/docs/agent/file-system · https://docs.brainbaselabs.com/docs/monitoring/tasks (Chat attachments, Task files) · https://docs.brainbaselabs.com/api/files/list-files · …/file-tree · …/stat-file · …/download-file · …/upload-file · …/create-folder · …/move-file · …/delete-file · https://docs.brainbaselabs.com/api/shared-files/shared-file-tree · …/read-shared-file · …/upload-shared-file · …/download-shared-file · …/delete-shared-file · …/provision-shared-folder · https://docs.brainbaselabs.com/api/file-transfers/reserve-task-upload · …/authorize-task-upload · …/complete-task-upload · …/get-task-upload-status · …/cancel-task-upload · …/download-task-original · …/reserve-task-current-file-download · …/get-task-download-status · …/cancel-task-download · …/get-file-transfer-capabilities · …/get-task-file-transfer-capabilities · …/get-shared-file-transfer-capabilities · https://docs.brainbaselabs.com/api/agents/create-agent (`shared_folder_enabled`) · https://docs.brainbaselabs.com/docs/agent/secrets (reserved variables) · https://docs.brainbaselabs.com/api/usecases/harness-bakeoff · changelog 2026-06-18, 2026-06-19, 2026-09-16
Snapshot: 2026-11-03

## Contents

1. Two kinds of storage
2. The agent file system (shared folder)
3. Task files and chat attachments (console)
4. Files API: the task workspace
5. Admission responses on the files API
6. Shared files API
7. File-transfer API (up to 1 GiB)
8. Capabilities endpoints
9. Protected hosted tasks (published Shared snapshots)
10. Limits at a glance
11. Changelog history

## 1. Two kinds of storage

| Storage | Scope | Runtime path | API root | Per-file limits |
| --- | --- | --- | --- | --- |
| Task workspace | One task's sandbox; gone when the machine is torn down | `/workspace` | `/v2/tasks/{task_id}/files…` | 1 GiB upload and download for hosted agents (file-transfer API); the plain files API has no documented limit |
| Shared folder (agent **Filesystem**) | One agent, across all its tasks | `/workspace/Shared` (`BRAINBASE_SHARED_DIR`) | `/v2/agents/{agent_id}/shared/files…` | 25 MiB upload, 50 MiB download |

Paths in both APIs are relative to the root (`solution.py`, not `/workspace/solution.py`). Shared files inside a task appear under `Shared/...`.

## 2. The agent file system (shared folder)

Labelled **Filesystem** in the agent sidebar. Upload documents, examples, datasets, scripts, or other durable artifacts the agent needs across tasks.

Console steps:

1. In the agent sidebar, turn on the **Filesystem** switch so the shared folder mounts into the agent's tasks.
2. Open **Filesystem**.
3. Upload files, or drag files into the file browser (multiple at once is fine).
4. Open text files to preview their contents; non-text files download instead.
5. Download files to inspect or reuse an artifact locally. Downloads contain the current contents, including the agent's edits.

Rules:

- The shared folder mounts into a task's sandbox only while the switch is on (`shared_folder_enabled: true` on the agent via `POST /v2/agents` or `PATCH /v2/agents/{agent_id}`: "When true, future cloud-runtime task sandboxes mount this agent's shared folder at /workspace/Shared"). With it off you can still browse and upload, but tasks do not see the files.
- Shared folders are not available on the E2B, Modal, Brainbase Sandbox (`bbsandbox`), or AWS MicroVM providers. `GET /v2/machines/capabilities` reports `supports_shared_folders` per provider.
- Inside a task the folder is `/workspace/Shared`, also in `BRAINBASE_SHARED_DIR`. The file browser shows the same folder.
- The shared-folder toggle is not captured in agent versions.
- Best practices from the docs: descriptive filenames; keep canonical instructions in Instructions or Playbooks and use files for artifacts and examples; remove stale files; store credentials in Secrets, not uploaded files; upload small, focused files.

Unavailable task sandbox: if a task's Daytona sandbox no longer exists, its file listing, tree, metadata, and download endpoints return HTTP `409` with `detail.code: machine_terminal` and `detail.message: task's machine is no longer available`. No `Retry-After`; the sandbox is not recreated and Shared files are not restored. A missing file in an existing sandbox still returns `404`.

## 3. Task files and chat attachments (console)

- **Task files:** the task's **Filesystem** tab browses the workspace and downloads current contents, including the agent's edits. For hosted agents, files outside `Shared/` support uploads and downloads up to 1 GiB per file with upload recovery. Files under `Shared/...` use the shared-folder limits (25 MiB up, 50 MiB down) and shared uploads do not resume after a reload.
- **Chat attachments:** attach files to a new chat or a follow-up message. Hosted agents accept files up to 1 GiB each. Videos larger than 25 MiB are added as workspace files for the agent to work with. Files added to a message are uploaded into the task workspace and referenced with their workspace paths (changelog 2026-06-19); uploads wait through sandbox startup on a brand-new chat.
- **Upload recovery:** progress appears beside each attachment. Hosted uploads can be cancelled and retried within 24 hours while you remain signed in. After a reload, select the original files again; for a new chat, first choose **Resume unfinished upload**. Brainbase checks each entire file before resuming. Signing out clears the recovery information saved in the browser.
- **Originals vs edits:** downloading a hosted attachment from a sent chat message returns the original upload for as long as the task exists. To download a version the agent has edited, use the task's **Filesystem** tab (or the files API).
- Orchestration handoffs to Cloudflare agents can include workspace files (see `preview-and-recovery.md`).

## 4. Files API: the task workspace

All under `/v2/tasks/{task_id}`; paths are relative to the workspace root. Entry objects look like `{"name", "path", "is_dir", "size", "mod_time", "mode", "permissions", "owner", "group"}`.

| Endpoint | Params | Returns |
| --- | --- | --- |
| `GET /v2/tasks/{task_id}/files` | query `path` (optional, relative path within the workspace) | `{"path", "items": [entry…]}` |
| `GET /v2/tasks/{task_id}/files/tree` | query `path` (root, default workspace root), `max_depth`, `max_entries` | `{"name", "path", "is_dir", "size", "children": [...]}` |
| `GET /v2/tasks/{task_id}/files/stat` | query `path` (required) | entry |
| `GET /v2/tasks/{task_id}/files/download` | query `path` (required) | file bytes |
| `POST /v2/tasks/{task_id}/files/upload` | query `path` (required; destination inside the workspace, relative to its root); body is the file | entry |
| `POST /v2/tasks/{task_id}/files/folders` | JSON `{"path": "...", "mode": "755"}` (`mode` optional) | entry |
| `POST /v2/tasks/{task_id}/files/move` | JSON `{"source": "...", "destination": "..."}` | `{...: true}` |
| `DELETE /v2/tasks/{task_id}/files` | query `path` (required), `recursive` (optional) | `{...: true}` |

```bash
curl --request GET \
  --url "https://api.brainbaselabs.com/v2/tasks/$TASK_ID/files/download?path=solution.py" \
  --header "Authorization: Bearer $BRAINBASE_TOKEN" --output solution.py
```

Threads and tasks share ids: the harness-bakeoff use case downloads with `GET /v2/tasks/{thread_id}/files/download`. The API has no endpoint that runs a command in the sandbox; files are the only way in and out besides messages.

## 5. Admission responses on the files API

Every files endpoint answers four ways when the task has no usable machine. The three `409`s are told apart by `detail.code`; a billing refusal by its HTTP status. `Retry-After` is present on the two retryable `409`s and absent on the terminal one, so it is the quick check; `detail.code` is the precise one.

| Response | `detail.code` | `Retry-After` | Action |
| --- | --- | --- | --- |
| `409` | `machine_not_ready` | yes | Provisioning is in progress. Retry. |
| `409` | `task_run_busy` | yes | The task holds an active run lease. Retry. |
| `409` | `task_terminal_no_machine` | no | Nothing will ever provision this task. Do not retry. |
| `402` or `429` | — | — | The payer was refused by the credit gate. Do not retry; surface the billing error. |

On a credit refusal:

- Read-only endpoints (`files`, `tree`, `stat`, `download`) never change the task and return `{"code": "credits_exhausted", "message": ...}` under `detail`, with no billing figures.
- Write endpoints (`upload`, `folders`, `move`, `DELETE`) return the upstream entitlement body under `detail` — its `error` field carries the upstream code, for example `CREDITS_EXHAUSTED` — and the task is marked terminal.

The file-system docs page separately documents `409` `machine_terminal` for a Daytona sandbox that no longer exists (section 2). Handle both codes as "no machine; do not retry".

## 6. Shared files API

All under `/v2/agents/{agent_id}/shared`; paths are relative to the shared folder.

| Endpoint | Params | Returns |
| --- | --- | --- |
| `GET /v2/agents/{agent_id}/shared/files/tree` | query `path` (root inside the shared folder), `max_depth`, `max_entries` | tree node |
| `GET /v2/agents/{agent_id}/shared/files/read` | query `path` (required) | `{"path", "content"}` |
| `GET /v2/agents/{agent_id}/shared/files/download` | query `path` (required) | file bytes (50 MiB limit) |
| `POST /v2/agents/{agent_id}/shared/files/upload` | query `path` (required; destination inside the shared folder); body is the file | entry (25 MiB limit) |
| `DELETE /v2/agents/{agent_id}/shared/files/delete` | query `path` (required) | — |
| `POST /v2/agents/{agent_id}/shared/provision` | — | `{"agent_id", "volume_name", "subpath", "mount_path", "machine_external_id"}` |
| `GET /v2/agents/{resource_id}/shared/files/config` | — | `{"enabled", "max_file_bytes", "download_enabled", "max_download_file_bytes"}` (example values 26214400 / 52428800) |

The docs do not describe what `provision` does beyond its response shape; treat it as "make sure the agent's shared volume exists and report where it mounts".

## 7. File-transfer API (up to 1 GiB)

Hosted uploads and downloads for task files, with resumable uploads and server-side snapshot exports. The resource id in these paths is the task id (`resource_id`). Shared paths are excluded: `Shared/...` paths and shared-folder scopes return `503` with `detail.code=shared_transfer_not_available`; use the standard shared upload (25 MiB) and download (50 MiB) routes instead.

Every transfer call returns the same transfer object:

```json
{
  "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
  "direction": "upload",
  "path": "string",
  "size_bytes": 0,
  "status": "pending_upload",
  "bytes_transferred": 0,
  "stored": false,
  "error_code": "string",
  "error": "string",
  "entry": { "name": "...", "path": "...", "is_dir": true, "size": 0, "mod_time": "...", "mode": "...", "permissions": "...", "owner": "...", "group": "..." },
  "upload": { "bucket": "string", "object_key": "string", "endpoint": "string", "signature": "string", "expires_at": "2019-08-24T14:15:22Z" },
  "download_url": "string"
}
```

The docs show `pending_upload` and speak of a "ready" state; they do not enumerate every `status` or `error_code` value, nor the exact protocol for sending bytes to `upload.endpoint`. Fetch the live pages before implementing a client.

### Uploads

| Step | Endpoint | Body / notes |
| --- | --- | --- |
| Reserve | `POST /v2/tasks/{resource_id}/files/uploads` | JSON `request_id` (uuid, required), `path` (required), `size_bytes` (required), `content_sha256` (required), `content_type` (optional, e.g. `application/octet-stream`). Reserves an idempotent task upload bound to size and SHA-256 digest. |
| Authorize | `POST /v2/tasks/{resource_id}/files/uploads/{transfer_id}/authorize` | Refresh resumable upload access (a new `upload` block). Cancelled partial uploads are retained for 24 hours. |
| Complete | `POST /v2/tasks/{resource_id}/files/uploads/{transfer_id}/complete` | Verify stored size and queue import. Retry retained bytes after cancellation has stopped. |
| Status | `GET /v2/tasks/{resource_id}/files/uploads/{transfer_id}` | Poll until ready before attaching the file to a message or presenting it as imported. |
| Cancel | `DELETE /v2/tasks/{resource_id}/files/uploads/{transfer_id}` | Request cancellation. An import that already committed remains ready; other bytes survive 24 hours. |
| Original | `GET /v2/tasks/{resource_id}/files/uploads/{transfer_id}/download` | Short-lived URL for the preserved original, excluding later workspace edits. Response is a string map. |

### Downloads (current file, including agent edits)

| Step | Endpoint | Body / notes |
| --- | --- | --- |
| Reserve | `POST /v2/tasks/{resource_id}/files/downloads` | JSON `request_id` (uuid, required), `path` (required). Queues a snapshot of the current task file, including agent edits, up to 1 GiB. |
| Status | `GET /v2/tasks/{resource_id}/files/downloads/{transfer_id}` | Poll the snapshot export; a ready response includes a short-lived `download_url`. |
| Cancel | `DELETE /v2/tasks/{resource_id}/files/downloads/{transfer_id}` | Cancel a pending or running current-file export. |

## 8. Capabilities endpoints

| Endpoint | Scope | Example response |
| --- | --- | --- |
| `GET /v2/file-transfers/config` | Deployment: hosted upload/download availability and per-file limits in bytes | `{"enabled": true, "max_file_bytes": 1073741824, "download_enabled": true, "max_download_file_bytes": 1073741824}` |
| `GET /v2/tasks/{resource_id}/files/config` | One task's workspace limits | same shape, 1073741824 |
| `GET /v2/agents/{resource_id}/shared/files/config` | One agent's shared folder | `{"enabled": false, "max_file_bytes": 26214400, "download_enabled": false, "max_download_file_bytes": 52428800}` |

1073741824 bytes = 1 GiB; 26214400 = 25 MiB; 52428800 = 50 MiB. Check these before choosing between the plain files API and the transfer API, and when a deployment (for example the AWS appliance) may have transfers disabled.

## 9. Protected hosted tasks (published Shared snapshots)

Disabled by default. Published Shared snapshots are a separate hosted capability that requires operator verification within the internal canary before use. Ordinary Filesystem behaviour is unchanged for tasks that have not adopted a snapshot.

- An agent manager can publish selected Shared files as an immutable version and explicitly adopt that version into a fresh task. Each adopted task gets its own writable copy at `/workspace/Shared`; its edits persist in that task and do not change the published version, the agent's Filesystem, or another task. Publishing a newer version does not update existing tasks.
- Publication and adoption use the management API from your own signed-in session. Worker credentials cannot publish or adopt.
- A snapshot holds up to 1,000 regular files and 16 MiB of decoded content in total, with relative paths. Hidden directories and links are rejected. Oversized or unsupported input is rejected without changing the source files. Exclude credential stores.
- Flow: for an enrolled hosted agent with snapshots enabled and its Shared folder setting on, create an empty task with `POST /v2/tasks` and body `{"agent_id": "<agent ID>", "auto_run": false}` (its sandbox stays unprovisioned, even when global strict admission is off). From the same authorized management session, `POST /v2/tasks/{task_id}/shared-snapshot` with `{"snapshot_id": "<published snapshot ID>"}`, then send the first message. Creating a task never adopts a snapshot automatically.
- Adoption requires a new task that has never created a sandbox and whose creation the service can verify. Use another new task for a different version. When strict admission is enabled, a task without a verified private Shared copy stays blocked. A lost sandbox is not silently replaced with an older copy of its files.
- The docs do not document the endpoint that publishes a snapshot; fetch the live page.

## 10. Limits at a glance

| Item | Limit |
| --- | --- |
| Chat attachment (hosted agent) | 1 GiB per file; videos over 25 MiB become workspace files |
| Task file upload / download outside `Shared/` | 1 GiB per file (transfer API) |
| Shared folder upload / download | 25 MiB / 50 MiB per file; shared uploads do not resume |
| Upload recovery window | 24 hours, while signed in; signing out clears it |
| Published Shared snapshot | 1,000 regular files, 16 MiB decoded, no hidden dirs or links |
| Interface source editor (for comparison) | UTF-8 text files up to 256 KiB (see `brainbase-interfaces`) |

## 11. Changelog history

| Date | Entry | What it added |
| --- | --- | --- |
| 2026-06-18 | The File System | Per-agent persistent file system across all threads and runs; per-agent toggle on the developer agent overview and enterprise agent detail view; file browsing, uploads and downloads on cloud-runtime agents go through the persistent workspace; toggling is atomic. |
| 2026-06-19 | Richer File Attachment Handoff in Chat | Attachments uploaded into the task workspace and referenced by workspace path; uploads wait through sandbox startup; failed uploads keep text and files for retry. |
| 2026-06-19 | Fixes and Improvements | Filesystem tab in the developer sidebar next to Memory and Browser. |
| 2026-09-16 | Attach and Download Files Up to 1 GB | 1 GB attachments and task files (up from 25 MB); automatic resume after a dropped connection or reload; 24-hour retry window; streamed downloads. Shared folder keeps 25 MB / 50 MB. |
