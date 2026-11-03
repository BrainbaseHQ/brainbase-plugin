# Sandbox providers, sizes, GPUs and pricing

Source: https://docs.brainbaselabs.com/docs/agent/sandboxes · https://docs.brainbaselabs.com/api#sandboxes · https://docs.brainbaselabs.com/api/agents/create-agent · https://docs.brainbaselabs.com/api/agents/update-agent · https://docs.brainbaselabs.com/api/tasks/create-task · https://docs.brainbaselabs.com/api/threads/create-thread · https://docs.brainbaselabs.com/cli/reference/agent-manifest · https://docs.brainbaselabs.com/cli/concepts/agents · https://docs.brainbaselabs.com/cli/commands/agent · https://docs.brainbaselabs.com/cli/reference/control-plane-api · https://docs.brainbaselabs.com/cli/reference/environment · https://docs.brainbaselabs.com/docs/agent/versions · https://docs.brainbaselabs.com/docs/agent/file-system · https://docs.brainbaselabs.com/docs/models · changelog 2026-07-14, 2026-07-15, 2026-08-04, 2026-09-28, 2026-10-22, 2026-10-29
Snapshot: 2026-11-03

## Contents

1. Providers
2. Which runtimes each provider runs
3. Sizes and resources
4. Pricing (CPU sandboxes)
5. GPU sandboxes
6. How billing works
7. Sandbox runtime credit tracking (changelog)
8. Choosing the provider: `machine_kind`
9. Choosing the size: `machine_size`
10. Provider-specific behaviour
11. Changelog history

## 1. Providers

Every agent runs in its own isolated sandbox. Provider and size are chosen when the agent is created, under **Sandbox Provider** and **Sandbox Size** in the console, or with `machine_kind` / `machine_size` in the API. The provider is fixed once the agent exists. Which providers appear in the console picker depends on your workspace; the API accepts all six below.

| `machine_kind` | Console name | Sizes | Runtimes | Shared folders | Notes |
| --- | --- | --- | --- | --- | --- |
| `daytona` | Daytona | S, M, L | All | Yes | The default. Offers GPU sandboxes. |
| `e2b` | E2B | L | All | No | |
| `cloudflare` | Cloudflare | S, M, L | Coding agents only | Yes | Sleeps when idle and resumes with its workspace intact. |
| `modal` | Modal | L | Coding agents only | No | Experimental. Sandboxes live 24 hours at most, and a task does not resume afterwards. No public preview port. |
| `bbsandbox` | — | L | Coding agents only | No | Self-hosted. Not in the docs' console table. |
| `aws_microvm` | — | L | Coding agents only | No | AWS Marketplace appliance (Lambda MicroVM). Not in the docs' console table. |

## 2. Which runtimes each provider runs

"Coding agents only" means `claude_code`, `codex`, `qwen`, `opencode`, `cursor`, `factory` and `qoder`. The four coding-only providers (`cloudflare`, `modal`, `bbsandbox`, `aws_microvm`) refuse every other `runtime_kind`, including the Kafka harness (`kafka_cloud`). The refusal happens at agent create: pairing one of them with `kafka_cloud` fails rather than falling back.

`GET /v2/machines/capabilities` does not report supported runtimes, so the table above is the only source. A picker that offers a runtime a provider cannot run will have it refused.

Model modality can also depend on the provider: the models page notes that several OpenRouter-served models accept image input on OpenCode and Pi only "in Daytona sandboxes" (see `brainbase-llm-gateway`).

## 3. Sizes and resources

| Size | vCPU | Memory | Disk |
| --- | --- | --- | --- |
| S | 1 | 2 GiB | 10 GiB |
| M | 2 | 4 GiB | 10 GiB |
| L | 4 | 8 GiB | 10 GiB |

The API field `machine_size` accepts `xs | s | m | l | xl`. All five labels are part of the public contract so tiers can be added without renaming, but only the sizes present in `SIZE_RESOURCES` are provisionable today. `XS` and `XL` are reserved: XL is blocked on the Daytona per-sandbox resource caps (4 vCPU / 8 GiB), XS on demand. `GET /v2/machines/capabilities` returns each provider's `supported_machine_sizes` and `machine_size_resources` (`cpu`, `memory_gib`, `disk_gib` per size).

Cloudflare bills the Cloudflare instance that hosts the size, which rounds memory and disk up: S runs on 1 vCPU / 6 GiB / 12 GB, M on 2 vCPU / 8 GiB / 16 GB, and L on 4 vCPU / 12 GiB / 20 GB.

AWS MicroVM: the shipped sandbox image reserves 8192 MiB (8 GiB) per VM (see `preview-and-recovery.md`, AWS MicroVM capacity).

## 4. Pricing (CPU sandboxes)

Sandbox time is paid from Brainbase credits, the same balance that pays for model usage. One credit is $0.01. Prices are per hour of active sandbox time. The docs say these prices are estimates and may change; fetch the live page before quoting them.

| Provider | S | M | L |
| --- | --- | --- | --- |
| Daytona | $0.084 / hr | $0.167 / hr | $0.332 / hr |
| Cloudflare | $0.129 / hr | $0.220 / hr | $0.401 / hr |
| E2B | — | — | $0.60 / hr |
| Modal | — | — | $0.60 / hr |

- **Daytona** is billed per second for the CPU, memory, and disk the sandbox is given.
- **Cloudflare** is billed per second for the Cloudflare instance that hosts the size (rounded up as above).
- **E2B and Modal** are a flat 1 credit ($0.01) per active minute.
- `bbsandbox` and `aws_microvm` have no price on the docs page. On the AWS appliance, AWS bills sandbox compute/storage separately from Brainbase platform charges (see https://docs.brainbaselabs.com/docs/aws-marketplace/operations).

## 5. GPU sandboxes

GPU sandboxes run on Daytona at size L with one GPU. You cannot choose the GPU type. The GPU is billed per second, on top of the sandbox's CPU, memory, and disk, at the rate for the type the sandbox gets.

| GPU type | Price per GPU |
| --- | --- |
| NVIDIA H100 | $3.95 / hr |
| NVIDIA H200 | $4.54 / hr |
| NVIDIA RTX PRO 6000 | $3.03 / hr |
| NVIDIA RTX 5090 | $1.29 / hr |
| NVIDIA RTX 4090 | $0.99 / hr |

API surface: the agent object returned by `POST/GET/PATCH /v2/agents` carries a read-only `accelerator` block (`{"kind": "gpu", "count": 1, "models": ["..."]}`). `GET /v2/machines/capabilities` reports `accelerator_requests_enabled` (scoped to the caller) and each provider's `accelerators` and `resource_classes` (for example `["cpu"]`). The docs do not document a request field for asking for a GPU on create or update; use the console, and fetch the live create-agent page to check whether one has been added. Machine kind, size and accelerator are not captured in agent versions.

## 6. How billing works

- **Active time only.** The meter runs while the sandbox is active. A sandbox that is stopped or asleep is not charged for that time.
- **Separate from model usage.** Sandbox time is charged in addition to the model calls the agent makes. With Bring Your Own Bedrock, model calls go to your AWS account but sandbox time still uses credits.
- **Out of credits.** A team with no credits left cannot run tasks until credits are added. The files API answers `402` or `429` from the credit gate (see `files-and-transfers.md`), and `brainbase task get` prints the billing detail under `failure`.
- **Machines bill while they exist.** `brainbase machine` docs: a sandbox left behind by a task that ended badly keeps costing until someone tears it down.

## 7. Sandbox runtime credit tracking (changelog 2026-07-14: Sandbox Runtime Credit Tracking)

- Managed sandbox tasks consume credits based on active runtime. Only confirmed running time counts; sleeping, starting, archived, and terminal states are free.
- Partial minutes stay uncharged while the task can still resume.
- Only sandboxes created after the feature was turned on for the workspace are tracked; existing sandboxes were not back-billed.
- Team credit attribution is preserved from the run that used the sandbox.
- The Usage dashboard breaks out sandbox spend as its own total, with daily Chat, Sandbox, and Workflow breakdowns and a per-task view.

Changelog 2026-09-11 (Fixes and Improvements): benchmark runs show an upfront sandbox-time cost estimate. Wallets, top-ups and spend limits belong to `brainbase-payments`.

## 8. Choosing the provider: `machine_kind`

| Where | How | Notes |
| --- | --- | --- |
| Console | **Sandbox Provider** on the new-agent page | The picker spells out trade-offs inline (for example shared-folder support) and links to the pricing page. Cloudflare shows by default for every account since 2026-09-28. |
| Agent spec (`POST /v2/threads`, `agent.machine_kind`) | `"machine_kind": "daytona"` | Omit to use the deployment default. Changing it changes the spec hash, so you get a new `agent_id`. |
| `POST /v2/agents` | `machine_kind: daytona \| e2b \| modal \| bbsandbox \| aws_microvm \| cloudflare` | Fixed at creation; `PATCH /v2/agents/{agent_id}` has no `machine_kind` field. |
| Manifest `brainbase.agent.yaml` | top-level `machine_kind: daytona` | Applied by `brainbase agent create`; must be a non-empty string. Omit to leave selection to the platform. |

```yaml
schema: 1
harness: claude-code
machine_kind: daytona       # selected when the agent is created
default_model: gpt-5.6-terra
agent:
  name: Repo Assistant
```

Immutability rules from the CLI docs:

- A local `machine_kind` change on a claimed manifest blocks `agent push`; `--force` never makes it writable. `agent pull` refuses to discard that edit unless `--force` is used; a cloud-side provider change is reported as pull drift and must be accepted with pull. `agent status` distinguishes a blocked `machine_kind` mismatch from cloud provider drift.
- `agent create` verifies the control plane honoured `machine_kind` and `default_model`; on mismatch it still writes the new `id` (so a retry cannot create a duplicate) and exits non-zero.
- Control-plane API: `PUT /agents/{agent_id}` accepts `machine_kind` only as the value the agent already has; any other value is `409 machine_kind is immutable after agent creation`, naming current and requested values.
- Declarative `machine_kind` / `default_model` writes need the MAS `/v2/cli` control plane (`BRAINBASE_CONTROL_PLANE_URL`); the legacy `BRAINBASE_API_URL` (`/api/cli`) surface refuses them.
- `brainbase agent list` prints each agent's harness, sandbox provider and `default_model`.

Availability is decided at create: a provider in capabilities can still answer `503` (switched off by a kill switch) or `403` (account outside the rollout). See `machines-api.md`.

## 9. Choosing the size: `machine_size`

| Where | How |
| --- | --- |
| Console | **Sandbox Size** when creating the agent; the agent overview and task views show the active size with a quick way to change it after creation (changelog 2026-08-04). |
| `POST /v2/agents`, `PATCH /v2/agents/{agent_id}` | `machine_size` (`xs \| s \| m \| l \| xl`); updatable, unlike `machine_kind`. |
| `POST /v2/tasks` | `machine_size` overrides the agent's size for that task only. The task/thread record returns `machine_size`, `machine_id` and `sandbox_id`. |
| CLI | No manifest field and no `brainbase task create` flag for size in the docs. `brainbase task get` prints `machine <id> (size s)`. |

Machine settings (kind, size, accelerator) always stay current: they are not frozen by a version pin or `brainbase task create --version`.

## 10. Provider-specific behaviour

**Daytona (default).** Only provider with GPUs. Agents on the current Daytona runtime can schedule a later continuation in the same task; the wakeup survives workspace sleep and runner restarts, a replacement cancels the previous pending one, Stop cancels pending wakeups, and timers expire after seven days. When an existing Daytona workspace needs to restart, Brainbase retries temporary provider and connection errors before failing the task, reusing the same workspace and its saved files. If a task's Daytona sandbox no longer exists, file endpoints answer `409` `machine_terminal`.

**Cloudflare.** Coding agents only. Sleeps when idle and resumes with its workspace intact; follow-ups in the same task work after sleep, with the conversation and saved workspace files available. Orchestration handoffs to Cloudflare agents can include workspace files: Brainbase prepares the recipient's sandbox, copies the attachments, then starts the task. Sending a file to an idle Cloudflare sandbox wakes it (changelog 2026-09-28). Payments results and approvals reach agents on Cloudflare and E2B sandboxes (changelog 2026-10-02).

**E2B.** Size L only, no shared folders, all runtimes. Available across all coding runtimes since changelog 2026-07-15.

**Modal.** Experimental, L only, coding agents only, no shared folders. Sandboxes live 24 hours at most and a task does not resume afterwards. Modal machines have no public preview port: `GET /v2/machines/{id}/preview` and `/preview/probe` answer `422`, and `brainbase interface preview` says Modal sandboxes cannot show previews.

**bbsandbox.** Self-hosted, L only, coding agents only, no shared folders. Nothing else is documented.

**aws_microvm.** L only, coding agents only, no shared folders. Each VM reserves 8 GiB of Lambda MicroVM memory against quota `L-CD1C0CC4`. A preview can open only the proxy's default port; other ports are refused with `422`. `POST /v2/tasks/{task_id}/inputs` can answer `503` with a provider `detail.code` such as `aws_microvm_unavailable` when fresh provisioning is disabled or provider access cannot be verified (no `Retry-After`; retry the same `input_id` after access is restored).

Shared folders (the agent **Filesystem**) are not available on E2B, Modal, Brainbase Sandbox, or AWS MicroVM.

Sandbox images are per release: several model announcements say "start a new task to use <model> if your current sandbox predates this release". Existing threads pick changes up when their sandbox restarts.

## 11. Changelog history

| Date | Entry | What it added |
| --- | --- | --- |
| 2026-06-19 | Fixes and Improvements | Entrypoint tab and Filesystem tab in the developer sidebar; thinking indicator during sandbox spin-up. |
| 2026-07-14 | Sandbox Runtime Credit Tracking | Active-minute billing and the Usage breakdown (section 7). |
| 2026-07-15 | Choose Where Your Cloud Agents Run | Provider picker for every cloud agent; E2B on all coding runtimes; the default is used when nothing is picked. The entry says the provider can be changed later; the current docs say it is fixed at creation. Follow the docs. |
| 2026-08-04 | Configurable Sandbox Sizing for Agents and Tasks | S/M/L per agent, per-task override, size shown on agent overview and task views. |
| 2026-09-28 | Cloudflare Sandboxes Now Available to Every Account | Cloudflare in the picker by default; file delivery to an idle Cloudflare sandbox wakes it. |
| 2026-10-22 | New Tasks Start Faster | The sandbox is created and the agent warmed up while the first message is still being checked; median first-output times 19s→16s (OpenCode), 24s→19s (Claude Code), 25s→20s (Kafka). |
| 2026-10-29 | Fixes and Improvements | Sandbox prices published on the Sandboxes docs page; the provider picker links to it; out-of-credit refusals offer a dialog to add credits. |
