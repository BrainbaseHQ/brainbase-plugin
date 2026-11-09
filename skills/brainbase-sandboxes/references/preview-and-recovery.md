# Preview URLs, sleep and resume, recovery, and AWS MicroVM capacity

Source: https://docs.brainbaselabs.com/api/usecases/live-preview · https://docs.brainbaselabs.com/api/machines/machine-preview · https://docs.brainbaselabs.com/api/machines/machine-preview-probe · https://docs.brainbaselabs.com/docs/monitoring/tasks · https://docs.brainbaselabs.com/docs/agent/entrypoint · https://docs.brainbaselabs.com/docs/orchestrations/building-an-orchestration · https://docs.brainbaselabs.com/docs/interfaces · https://docs.brainbaselabs.com/cli/commands/interface · https://docs.brainbaselabs.com/docs/aws-marketplace/quotas · https://docs.brainbaselabs.com/docs/aws-marketplace/operations · https://docs.brainbaselabs.com/docs/aws-marketplace · https://docs.brainbaselabs.com/api/messages/submit-task-input · changelog 2026-09-18, 2026-09-28, 2026-10-22
Snapshot: 2026-11-03

## Contents

1. Preview URLs: the live-preview recipe
2. Preview rules and errors
3. Interface previews (port 8000)
4. Sleep and resume
5. Cloudflare: follow-ups after sleep and file handoffs
6. Daytona: restarts, retries and scheduled continuations
7. Recovering after a restart; failed task diagnoses
8. AWS MicroVM capacity quotas

## 1. Preview URLs: the live-preview recipe

A preview maps a port inside the sandbox to a URL you can open. There is no deploy step and no hosting to set up. The use case (Python, `pip install requests`, `BRAINBASE_API_KEY` exported) does this:

1. **Build and serve.** `POST /v2/threads` with an inline agent (`harness: claude_code`, a model, instructions "You build tiny web apps and keep their dev server running.") and an `input` that asks for a self-contained `index.html`, then serves it bound to `0.0.0.0` in the background so the port stays open after the turn ends:
   `nohup python3 -m http.server 8080 --bind 0.0.0.0 >/tmp/srv.log 2>&1 &`, then `curl -s localhost:8080 | head`, and "Leave the server running."
2. **Wait for the turn.** Poll `GET /v2/threads/{thread_id}` until `status` is one of `success`, `fail`, `need_more_info`, `idle`, or stream `GET /v2/threads/{thread_id}/events/stream` until the `idle` event.
3. **Get the machine.** `machine_id = thread["machine_id"]` (keep it for teardown; it is not `sandbox_id`).
4. **Mint the link.** `GET /v2/machines/{machine_id}/preview?port=8080` → `{"url", "port", "token", "token_header", "expires_at"}`.
5. **Wait for the app.** Poll `GET /v2/machines/{machine_id}/preview/probe?port=8080` until `serving` is true (wakes the machine if asleep; a listener slower than five seconds also counts as serving).
6. **Open it.** If `token` and `token_header` are non-null, send `{token_header: token}` as a request header; otherwise the URL is public.
7. **Edit on a second turn.** `POST /v2/threads/{thread_id}/messages` with `{"messages":[{"role":"user","content":"…Keep the same server running on the same port."}], "run": true}`. The POST can briefly return `409` while the previous turn settles (retry it), and the thread can still report the previous turn's terminal status for a moment, so wait until the transcript grows and the status is terminal. The same URL then serves the updated page.
8. **Clean up.** The sandbox stops on its own when idle; to free it immediately, `DELETE /v2/machines/{machine_id}`.

Token-gated vs public: on `api.brainbaselabs.com` a branded `*.brainbaselabs.space` URL comes back that anyone can open, with `token` and `token_header` null. On a deployment without a branded domain the URL is token-gated; a browser request without the header redirects to auth.

## 2. Preview rules and errors

- Default port is 8000 unless the provider uses another; set `port` for anything else.
- Minting a branded link does not wake the machine; on other deployments it resumes a sleeping machine first (a few seconds on a cold sandbox). The probe always resumes the machine. Opening the link resumes it.
- A link is minted whether or not anything listens; use the probe before opening.
- `422` `interface_preview_only` (preview): port 8000 serves an interface's unpublished dashboard; open `detail.preview_url` instead.
- `422` string (preview and probe): Modal has no public preview port; an AWS MicroVM port other than the proxy default is refused.
- `422` array (preview): validation errors.
- `409` (probe): `"machine has been torn down (dead); cannot open a preview"`.
- `502` (probe): `"failed to reach the machine's preview"`.
- Probe semantics: `502`/`503`/`504` or connection failure → `serving: false`; any other status (redirects, app error pages) → true; no answer within 5 seconds → true.

Full endpoint detail is in `machines-api.md`.

## 3. Interface previews (port 8000)

Interfaces (agent-built dashboards, see `brainbase-interfaces`) are served from the build conversation's sandbox on port **8000** and opened at the interface's preview address `https://<address>-preview.<domain>`, behind sign-in, for people who can edit the agent. The **Preview** tab "is not available on every machine type". `brainbase interface preview` wakes a sleeping sandbox first; if the working copy is no longer in the sandbox it shows the last saved version and says so; Modal sandboxes cannot show previews. Its `--json` output is `{ task_id, preview_url, serving, source, restored, ... }`.

## 4. Sleep and resume

- Billing stops while a sandbox is stopped or asleep; only active time is metered (`providers-and-pricing.md`).
- Cloudflare sleeps when idle and resumes with its workspace intact. Daytona workspaces also sleep (`brainbase machine ls` shows `sleeping`), and scheduled continuations survive workspace sleep.
- What wakes a machine: a new message or follow-up on its task, a file sent to it (Cloudflare), the preview probe, opening a preview link, a non-branded preview mint, `brainbase interface preview`.
- Task start order: when a sandbox was paused, Brainbase wakes it before the entrypoint runs (sandbox access, then setup, then the runtime). Temporary sandbox transitions are retried during wake-up, so a short delay is normal. If the sandbox cannot be started, the task fails during startup. Changelog 2026-09-18: runs are less likely to fail right at start while waking a paused sandbox.
- Modal does not resume: sandboxes live 24 hours at most and a task does not resume afterwards.

## 5. Cloudflare: follow-ups after sleep and file handoffs

- **Follow-ups after sandbox sleep:** Cloudflare agents support follow-ups in the same task, including after the sandbox sleeps. The conversation and saved workspace files remain available when the task resumes.
- **File handoffs in orchestrations:** handoffs to Cloudflare agents can include workspace files. Brainbase prepares the recipient's sandbox, copies the attachments, and then starts the recipient's task; no separate message is needed to start its sandbox first.
- Changelog 2026-09-28: sending a file to a task whose Cloudflare sandbox has gone idle reliably wakes it and delivers the attachment instead of the handoff timing out.

## 6. Daytona: restarts, retries and scheduled continuations

- When an existing Daytona workspace needs to restart, Brainbase retries temporary provider and connection errors before failing the task; the retries reuse the same workspace and preserve its saved files. If the retry budget is exhausted, the task records the startup failure.
- Agents on the current Daytona runtime can schedule a later continuation in the same task. Once registered, the wakeup survives workspace sleep and runner restarts; a replacement wakeup cancels the previous pending one; Stop cancels pending wakeups; each occurrence is accepted once even when delivery is retried; timers expire after seven days. Scheduling itself belongs to `brainbase-orchestration`.
- If a task's Daytona sandbox no longer exists, file endpoints answer `409` `machine_terminal` (`files-and-transfers.md`).

## 7. Recovering after a restart; failed task diagnoses

- A task can stay **Running** while Brainbase recovers from a service restart. Accepted messages waiting for setup are recovered automatically in batches, with setup waiting for available capacity; new messages can start without waiting for the backlog. Repeated interruptions during setup share a limited retry budget; if it is exhausted the task shows **Failed** with an explanation.
- A task can also remain Running after its agent finished if the final status could not be saved; a later recorded result corrects the estimate without rerunning the instruction.
- After a control-plane restart, an expired run lease can still represent a turn waiting to be adopted: for 180 seconds `POST /v2/tasks/{task_id}/inputs` (and the threads messages endpoint) return `409` `task is busy (active run lease); wait for it to finish` with no `Retry-After`. Retry the same `input_id` after the earlier turn is adopted or settles.
- Failed task detail keeps the runner-reported error or the recorded failure reason plus whether the agent or the runtime declared it. Agent-declared failures are task outcomes, not incidents. The sparser wording for failures with no explanation ships with the sandbox image, so already-running sandboxes keep it until recycled.
- Provider refusals on `POST /v2/tasks/{task_id}/inputs`: `503` with a provider `detail.code` such as `aws_microvm_unavailable` when fresh sandbox provisioning is disabled or provider access cannot be verified. No input was admitted; read `detail.message` and retry the same `input_id` and payload after availability is restored. No `Retry-After`.
- Changelog 2026-10-22: the sandbox is now created and the agent warmed up while the first message is still being checked.

## 8. AWS MicroVM capacity quotas

For the AWS Marketplace appliance (release `2026-09-16.1`, `us-east-1`). Model access and Bedrock throughput belong to `brainbase-llm-gateway`; this section is the sandbox capacity part.

- The shipped sandbox image reserves **8192 MiB (8 GiB) per VM**. In Service Quotas select AWS Lambda and locate **Max allocated MicroVM memory**, quota code `L-CD1C0CC4` (use the code if the display name differs). It is separate from Lambda function concurrency or per-function memory.
- Count both **RUNNING and SUSPENDED** VMs, including other workloads in the account and region. Suspension reduces compute charges but does not release this capacity.

| Example capacity plan | Baseline memory needed |
| --- | --- |
| One retained Brainbase VM, no spare capacity | 8 GiB |
| One retained VM plus capacity for one new VM | 16 GiB |
| Two retained VMs plus capacity for one new VM | 24 GiB |
| Ten retained VMs plus capacity for two new VMs | 96 GiB |

These are sizing examples, not AWS defaults or promised approvals. New accounts can have capacity for only one Brainbase VM. Check the applied account quota, request the needed value, and wait for the applied value to change before increasing usage. If AWS rejects an increase by comparing with a higher advertised default, contact AWS Support with the quota code, region, applied value, requested value and exact error; do not inflate the request. Do not terminate a VM to free capacity without its owner's approval and an export of needed VM-local data.

Read-only checks (AWS CLI v2, in the deployment account; confirm the account id first; they create nothing and request nothing):

```bash
aws sts get-caller-identity --region us-east-1

aws service-quotas get-service-quota \
  --service-code lambda --quota-code L-CD1C0CC4 \
  --region us-east-1 \
  --query 'Quota.{Name:QuotaName,Applied:Value,Unit:Unit,Adjustable:Adjustable}'

aws lambda-microvms list-microvms --region us-east-1 \
  --query 'items[].{Id:microvmId,State:state,Image:imageArn,Version:imageVersion}'
```

If the CLI does not recognise `lambda-microvms`, update AWS CLI v2 or use the Lambda console; an unavailable command is not evidence the account lacks MicroVM access.

Troubleshooting rows from the operations page:

| Symptom | Check |
| --- | --- |
| MicroVM allocation fails / `ServiceQuotaExceededException` | Applied Lambda MicroVM memory, including suspended VMs. Reserve 8 GiB per Brainbase VM plus headroom. Request capacity or perform owner-approved cleanup through Brainbase. |
| VM exists but shell or tools fail | Task events, runtime readiness, MicroVM logs. A RUNNING provider state is not an application-readiness check. Record task/machine IDs and release for support. |

Retire individual sandboxes with the owner's approval, after exporting needed local files, through Brainbase's machine-management path (`machines-api.md`) so records stay consistent. The smoke test on the install page asks the agent to create and read back a file and verifies a machine assignment plus actual shell/file tool calls; a machine ID alone does not prove sandbox execution. Database backups do not cover unsaved MicroVM-local data.
