# What consumes credits

Source: https://docs.brainbaselabs.com/docs/agent/sandboxes (sandbox and GPU prices, how billing works), https://docs.brainbaselabs.com/docs/monitoring/evaluations (judge credits), https://docs.brainbaselabs.com/docs/monitoring/benchmarks (run credits, billing pause), https://docs.brainbaselabs.com/docs/models (promos, retired models), https://docs.brainbaselabs.com/docs/bring-your-own-bedrock (what still uses credits), https://docs.brainbaselabs.com/api/usecases/harness-bakeoff (idle sandboxes)
Source: https://app.brainbaselabs.com/changelog entries 2026-06-11, 2026-07-03, 2026-07-07, 2026-07-10, 2026-07-14, 2026-07-15, 2026-08-21 (two), 2026-08-28, 2026-09-04, 2026-09-11, 2026-09-25
Snapshot: 2026-11-03

One credit is $0.01. The docs say sandbox prices "are estimates and may change"; fetch the live sandboxes page before quoting them as current.

## Every metered thing

| What | Price or rule | Source |
|---|---|---|
| Model usage in tasks and threads | Billed per token from credits; rates per model are in `brainbase-llm-gateway`. Separate from and in addition to sandbox time | docs, sandboxes |
| Sandbox time, Daytona | S $0.084/hr, M $0.167/hr, L $0.332/hr; billed per second for the CPU, memory and disk the sandbox is given | docs, sandboxes |
| Sandbox time, Cloudflare | S $0.129/hr, M $0.220/hr, L $0.401/hr; billed per second for the Cloudflare instance that hosts the size, which rounds up: S on 1 vCPU / 6 GiB / 12 GB, M on 2 vCPU / 8 GiB / 16 GB, L on 4 vCPU / 12 GiB / 20 GB | docs, sandboxes |
| Sandbox time, E2B | L only, $0.60/hr; a flat 1 credit ($0.01) per active minute | docs, sandboxes |
| Sandbox time, Modal | L only, $0.60/hr; a flat 1 credit ($0.01) per active minute | docs, sandboxes |
| Sandbox sizes | S = 1 vCPU, 2 GiB; M = 2 vCPU, 4 GiB; L = 4 vCPU, 8 GiB; each 10 GiB disk | docs, sandboxes |
| Sandbox active time | Only active time is metered; a stopped or asleep sandbox is not charged. Sleeping, starting, archived and terminal states are free; partial minutes stay uncharged while the task can still resume; only sandboxes created after tracking was enabled for the workspace are tracked (no back-billing) | docs, sandboxes; changelog 2026-07-14 |
| Idle sandboxes | Idle machines left running keep costing credits; the harness bake-off guide deletes every machine in a teardown pass so they stop | docs, harness-bakeoff |
| GPU time | Daytona size L with one GPU, type not selectable; billed per second on top of CPU, memory and disk at the rate for the type assigned: NVIDIA H100 $3.95/hr, H200 $4.54/hr, RTX PRO 6000 $3.03/hr, RTX 5090 $1.29/hr, RTX 4090 $0.99/hr per GPU | docs, sandboxes |
| Model-based evaluations (judges) | Each enabled model-based evaluation runs a judge after the agent finishes a turn and uses credits like another model call; recorded in the credit ledger, not as chat messages. More enabled evaluations and occasional transcript summarization add calls. If the provider omits token usage, Brainbase records a conservative estimate. Evaluations used to be free; billed as a regular model call since 2026-09-11 | docs, evaluations; changelog 2026-09-11 |
| Benchmark runs | Benchmark tasks run through the agent's normal model and tools and consume credits like other agent work; the review step shows an estimated cost when available, including an upfront sandbox-time estimate; up to 200 case runs per run | docs, benchmarks; changelog 2026-09-11 |
| Meeting Assistant calls | 1 credit per started minute of attended meeting time, after the free period through 2026-08-15. Measured from the recorded meeting session, not calendar invites; repeated or delayed usage reports settle once. The 2026-07-07 entry announced 10 credits per minute; the 2026-07-10 entry revised it to 1 | changelog 2026-07-07, 2026-07-10 |
| Claude Code and Codex subagent turns | Recorded against the parent thread's billing owner with the same token-based pricing as other model calls; Codex Cloud and Claude Code Cloud activity captured at the same fidelity as Brainbase cloud agents; sub-thread LLM consumption rolls up into the parent thread | changelog 2026-06-11, 2026-07-03 |
| Image generation in tasks | Brainbase-provided image models, task-scoped access; usage is attributed to the task and billed through credits; the models and per-image prices are not listed | changelog 2026-08-21 |
| Workflows and playbooks | Have their own limit dialogs alongside credits (so they draw on the same balance); no separate price is given | changelog 2026-07-10 |
| Orchestrations | Billed per underlying agent run; optional `credit_limit` on the orchestration | pricing page FAQ; docs, orchestration manifest |
| Title generation and context compaction | Run on Brainbase's hosted Claude and use credits, even under Bring Your Own Bedrock | docs, bring-your-own-bedrock |
| Kimi K3 under Bring Your Own Bedrock | AWS bills the model calls; they use no Brainbase credits. Sandbox time still uses credits; a team with no credits is still blocked. Test connection makes one minimal call on the user's AWS account that costs a fraction of a cent | docs, bring-your-own-bedrock, models |
| Retired models | Requests naming a retired ID run and are billed as the replacement, which has its own pricing: `gpt-4o` and `gpt-4o-mini` as `gpt-5.6-luna`, `claude-sonnet-4-20250514` as `claude-sonnet-4-6`, `gemini-3-flash-preview` as `gemini-3.5-flash`, `grok-4` and `grok-4-fast` as `grok-4.6`. Historical records are unchanged | docs, models; changelog 2026-09-11 |

## Promotions and discounts on credits

| Model | Rule | Status on 2026-11-03 | Source |
|---|---|---|---|
| Grok 4.7 | 75% fewer LLM credits through 2026-11-30 (UTC); compute and tool charges at standard rates | Active | docs, models; changelog 2026-09-25 |
| GPT-5.6 Sol | 50% discount through 2026-09-15 (Pacific), shown in model pickers | Expired | changelog 2026-08-21 |
| Inkling | Free during early access (zero credits per turn); ended, now billed at standard per-token rates | Expired | changelog 2026-07-15, 2026-09-04 |
| Meeting Assistant | Free through 2026-08-15 | Expired | changelog 2026-07-10 |
| Free signup credits | Run only on a set of open models in the web app until the first top-up | Active | changelog 2026-10-30 |

Per-token rates, including the discounted ones, belong to `brainbase-llm-gateway`.

## Where usage appears

- Usage page: sandbox spend as its own total; daily Chat, Sandbox and Workflow breakdowns; per-task view of sandbox time (changelog, 2026-07-14); credits spent in the window versus cumulative plan total (2026-07-24); filter to the billing period (2026-08-14).
- Billing page: recent credit activity, including meeting minutes (changelog, 2026-07-07) and eval judge usage in the credit ledger (docs, evaluations).
- Agent Tasks page: filter by credits (docs, monitoring/tasks).
- Benchmarks: run review shows the estimated cost; a run paused for billing shows the reason and **Resume** (docs, benchmarks).

## Not stated in the sources

- Per-image prices for image generation and which image models are offered.
- Whether browser sessions, memory tables, interfaces or MCP tool calls carry a charge beyond the model tokens they generate.
- The credit cost of a Meeting Assistant call's model usage, separate from the per-minute meter.
- Any API endpoint or CLI command that returns a balance, ledger or price list. The sources give none; the Billing and Usage pages are the only readout.
