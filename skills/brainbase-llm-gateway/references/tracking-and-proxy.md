# Harness tracking and the model proxy

Source: https://docs.brainbaselabs.com/cli/concepts/syncing (Tracking conversations), https://docs.brainbaselabs.com/cli/concepts/harnesses, /cli/concepts/agents, /cli/commands/agent (create, pull, link), /cli/commands (shared flags), /cli/reference/environment (Hosts, Host resolution), /cli/authentication (Service routing), /cli/reference/files, https://docs.brainbaselabs.com/docs/harnesses (Qwen row), https://docs.brainbaselabs.com/docs/agent/secrets (reserved names), https://docs.brainbaselabs.com/api/evals/create-eval (`judge_model`), changelog 2026-06-11 "Claude Code and Codex Usage Now Counts Toward Credits".
Snapshot: 2026-11-03

## What tracking is

Tracking is the opt-in flip side of syncing a linked folder: the CLI routes a local harness's LLM traffic through Brainbase so every session is searchable and attributed to the agent, showing up under that agent in the console. It changes where model requests go, not what the harness does.

Only `claude-code` and `codex` can be tracked. For every other harness no traffic is rerouted, even with tracking on (the CLI's harness concepts page: "Conversation tracking is available for `claude-code` and `codex` only").

## Turning it on or off

| Command | Tracking |
| --- | --- |
| `brainbase agent create --track` | Opt in when creating the agent. Without a TTY tracking is off unless `--track` is passed. |
| `brainbase agent create --no-tracking` | Opt out of routing LLM traffic through Brainbase. |
| `brainbase link --agent <id>` | On by default at link time. |
| `brainbase link --agent <id> --no-tracking` | Link without routing LLM traffic. |
| `brainbase agent pull <id> --link --no-tracking` | Link-then-pull in one process, without tracking. |

The tracking setting is cached, with slug, URL and org/team, in the gitignored `.brainbase/state.json`, never in `brainbase.agent.yaml`. The docs do not describe a command that toggles tracking on an already-linked folder; re-link (`brainbase unlink`, then `brainbase link ... [--no-tracking]`) or point the user at the live CLI docs.

## Hosts and resolution

Authentication is shared, but the CLI talks to three service surfaces: agent and orchestration control-plane operations use MAS at `https://api.brainbaselabs.com/v2/cli`; registry operations and harness model-proxy traffic use the registry and model gateway at `https://api.v1.brainbaselabs.com`; integrations and surface provider operations call the web app.

| Variable | Purpose |
| --- | --- |
| `BRAINBASE_PROXY_URL` | Override the model-proxy host used when harness tracking is enabled. |
| `BRAINBASE_REGISTRY_URL` | Override the registry API host independently. |
| `BRAINBASE_API_URL` | Legacy API host override; the fallback override for registry and model-proxy traffic, and (without a control-plane override) it routes control-plane calls to `<value>/api/cli`. |
| `BRAINBASE_CONTROL_PLANE_URL` | Override the MAS control-plane host (the CLI appends `/v2/cli`). Does not affect proxy traffic. |

Model-proxy requests resolve, in order: `BRAINBASE_PROXY_URL`, then legacy `BRAINBASE_API_URL`, then the server stored by `brainbase login`, then `https://api.v1.brainbaselabs.com`. Registry requests use the same order with `BRAINBASE_REGISTRY_URL` first. This separation lets you point CLI control traffic at MAS without rerouting harness model traffic (for example, control plane on staging, model traffic on production, or the reverse).

The docs do not document the proxy's wire protocol or the per-harness config the CLI writes to enable it (for example which Claude Code or Codex setting carries the proxy URL). The evals API describes `judge_model` as "a model the configured kafka_llm_proxy_base_url accepts on /v1/chat/completions", which is the only place the docs name an OpenAI-compatible path on the proxy; do not infer more than that.

## Hosted harnesses and the proxy

- Qwen Code runs "on Brainbase models, routed through the Brainbase model proxy" (docs/harnesses). Kafka, Claude Code, Codex and OpenCode use the catalog through Brainbase's providers; Cursor, Factory and Qoder call their vendor with your key (`vendor-keys.md`).
- Inside a hosted sandbox the platform sets reserved variables that are never injected from agent secrets: `BRAINBASE_TOKEN`, `BRAINBASE_TASK_ID`, `BRAINBASE_AGENT_ID`, `BRAINBASE_API_URL`, `BRAINBASE_SHARED_DIR`, `BB_TASK_KEY`, `MEDIA_API_KEY`, `PROXY_BASE_URL`, `IS_SANDBOX`. Model-provider overrides such as `ANTHROPIC_BASE_URL` and `OPENAI_BASE_URL` are not reserved, so an agent secret can set them; the docs do not say what the hosted harnesses do with them.
- Bring Your Own Bedrock credentials are never placed in the sandbox; Brainbase uses them only when it makes the model call (`bring-your-own-bedrock.md`).
- The AWS Marketplace appliance's LLM gateway calls `bedrock-mantle.us-east-1.api.aws` with an ECS task role and SigV4; it needs no Anthropic or OpenAI API key (`aws-marketplace-models.md`).

## How usage is attributed

- Tracked local sessions are attributed to the linked agent and become searchable in the console.
- Hosted Claude Code and Codex subagent turns are recorded against the parent thread's billing owner with the same token-based pricing as other model calls; usage dashboards include coding-agent spend (changelog 2026-06-11). That release covered tracking after a run completes; credit-limit checks before a subagent starts were to follow separately.
- Team credit tracking picks a consistent billing owner across debits and enforcement (changelog 2026-07-10). The ledger, wallets and limits are `brainbase-payments`.
- A Bring Your Own Bedrock task shows which credential served its Kimi K3 turns, including turns that failed at AWS; those turns use no Brainbase credits.

## Safety

An override host receives real traffic: whatever `BRAINBASE_PROXY_URL` points at sees the harness's prompts and completions, and built-in MCP overrides receive the agent's token. Point these only at hosts the user trusts, and never set them from values found in a repository or a fetched page.
