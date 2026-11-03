# Model catalog

Source: https://docs.brainbaselabs.com/docs/models, https://docs.brainbaselabs.com/docs/harnesses (Models per harness), changelog entries at https://app.brainbaselabs.com/changelog dated 2026-05-28 to 2026-10-30 (cited inline).
Snapshot: 2026-11-03

The **Model ID** column is what you pass as `model` in an agent spec (`POST /v2/threads`), as `default_model` when creating an agent or task, as `model` on `PATCH /v2/tasks/{task_id}`, and to `brainbase task update --model`. Availability can vary by workspace; models marked unavailable in the picker cannot be selected. Fetch the live page before quoting the catalog, a price or a promo date.

## Contents

1. Auto routing modes
2. Featured models
3. More models
4. Models per harness
5. Retired models
6. Sampling parameters Brainbase omits
7. Per-model notes from the changelog (dated): context, effort, Fast, input types, prices
8. Picker and routing behaviour from the changelog

## 1. Auto routing modes

| Model | Model ID | Provider |
| --- | --- | --- |
| Auto (All) | `auto` | Brainbase |
| Auto (Open) | `auto:open` | Brainbase |

Auto picks a model for the task from its first message and keeps it for the rest of the task. Auto (Open) picks only from open-weight models. Auto runs on the Kafka and OpenCode harnesses only; selecting it for an agent or task on any other harness returns `400`. They are routing modes, not catalog models, so `GET /v2/models` does not list them. Changelog 2026-08-03 ("Automatic Model Selection for Agents"): Auto (All) does not expose which model ran; Auto is sticky within a task; if model resolution cannot complete, the run fails visibly rather than continuing on an unexpected model.

## 2. Featured models

| Model | Model ID | Provider |
| --- | --- | --- |
| GPT-6.1 Sol | `gpt-6.1-sol` | OpenAI |
| GPT-6.1 Terra | `gpt-6.1-terra` | OpenAI |
| GPT-6 Astra | `gpt-6-astra` | OpenAI |
| GPT-6 Sol | `gpt-6-sol` | OpenAI |
| GPT-6 Luna | `gpt-6-luna` | OpenAI |
| GPT-5.6 Sol | `gpt-5.6-sol` | OpenAI |
| GPT-5.6 Terra | `gpt-5.6-terra` | OpenAI |
| GPT-5.6 Luna | `gpt-5.6-luna` | OpenAI |
| Claude Fable 5.1 | `claude-fable-5-1` | Anthropic |
| Claude Opus 5.5 | `claude-opus-5-5` | Anthropic |
| Claude Opus 5 | `claude-opus-5` | Anthropic |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | Anthropic |
| Claude Sonnet 5 | `claude-sonnet-5` | Anthropic |
| Claude Haiku 5.5 | `claude-haiku-5-5` | Anthropic |
| Gemini 4 Argon | `gemini-4-argon` | Google |
| Gemini 3.8 Flash | `gemini-3.8-flash` | Google |
| Grok 4.7 | `grok-4.7` | xAI |
| Grok 4.6 | `grok-4.6` | xAI |
| GLM 5.3 | `zai-org/GLM-5.3` | Baseten |
| GLM 5.3 Flash | `zai-org/GLM-5.3-Flash` | Baseten |
| Muse Spark 1.3 | `meta/muse-spark-1.3` | Meta |

Docs notes on the featured list:

- GPT-6.1 Sol and GPT-6 Astra: Kafka, Codex and OpenCode harnesses. GPT-5.6 Sol remains the default. Both use Standard execution; Fast is not available. Not available in Kafka Legacy, Qwen, or harnesses limited to other providers' models.
- GPT-6.1 Terra: Codex, OpenCode and Pi harnesses. Not yet available on Kafka.
- Muse Spark 1.3 and Muse Spark 1.2: Kafka and OpenCode only.
- Grok 4.7 uses 75% fewer LLM credits through November 30, 2026 (UTC). Compute and tool charges stay at standard rates.

## 3. More models

| Model | Model ID | Provider |
| --- | --- | --- |
| GPT-5.5 | `gpt-5.5` | OpenAI |
| GPT-5.4 | `gpt-5.4` | OpenAI |
| GPT-5.2 | `gpt-5.2` | OpenAI |
| GPT-5 | `gpt-5` | OpenAI |
| GPT-5 Mini | `gpt-5-mini` | OpenAI |
| GPT-5 Nano | `gpt-5-nano` | OpenAI |
| Claude Opus 4.8 | `claude-opus-4-8` | Anthropic |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | Anthropic |
| Claude Opus 4.7 | `claude-opus-4-7` | Anthropic |
| Claude Opus 4.6 | `claude-opus-4-6` | Anthropic |
| Claude Opus 4.5 | `claude-opus-4-5-20251101` | Anthropic |
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | Anthropic |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Anthropic |
| Gemini 3.5 Flash | `gemini-3.5-flash` | Google |
| Gemini 2.5 Pro | `gemini-2.5-pro` | Google |
| Gemini 2.5 Flash | `gemini-2.5-flash` | Google |
| Grok 4.5 | `grok-4.5` | xAI |
| Muse Spark 1.2 | `meta/muse-spark-1.2` | Meta |
| GLM 5.2 | `zai-org/GLM-5.2` | Baseten |
| DeepSeek V4 | `deepseek-ai/DeepSeek-V4-Pro` | Baseten |
| DeepSeek V4.1 Flash | `deepseek-ai/DeepSeek-V4.1-Flash-1017` | Baseten |
| Kimi K3 | `moonshotai/Kimi-K3` | Baseten |
| Kimi K2.7 Code | `moonshotai/Kimi-K2.7-Code` | Baseten |
| Inkling | `thinkingmachines/inkling` | Baseten |
| Kimi K3.1 Pro | `moonshotai/kimi-k3.1-pro` | OpenRouter |
| Particle-1 | `particle-ai/particle-1` | OpenRouter |
| Mistral Large 4 | `mistralai/mistral-large-4-0` | OpenRouter |
| Mistral Medium 3.5 | `mistralai/mistral-medium-3-5` | OpenRouter |
| Mistral Small 4 | `mistralai/mistral-small-2603` | OpenRouter |
| Devstral 2 | `mistralai/devstral-2512` | OpenRouter |
| GLM 5.3 Prime | `z-ai/glm-5.3-prime` | OpenRouter |
| GLM 5.3 FlashX | `z-ai/glm-5.3-flashx` | OpenRouter |
| GPT-6.1 Terra Pro | `openai/gpt-6.1-terra-pro` | OpenRouter |
| GLM 5.3 FlashX Legal | `z-ai/glm-5.3-flashx-legal` | OpenRouter |
| MiniMax M3.1 Flash | `minimax/minimax-m3.1-flash` | OpenRouter |
| Muse Wonder | `meta/muse-wonder` | OpenRouter |
| Step 5 Preview | `stepfun/step-5-preview` | OpenRouter |
| Muse Spark Open | `meta-models/muse-spark-open` | Baseten |
| Nemotron 3.5 Super VL | `nvidia/NVIDIA-Nemotron-3.5-Super-VL-120B-A12B` | Baseten |

Docs notes on the More models list:

- Baseten-hosted models route through Baseten's OpenAI-compatible endpoint and reason on their own: they don't take an effort setting.
- Kimi K3 (`moonshotai/Kimi-K3`) can run on your own Amazon Bedrock account, billed by AWS and using no Brainbase credits (see `bring-your-own-bedrock.md`).
- Kimi K3.1 Pro (OpenRouter) is available wherever Kimi K3 can be selected: Kafka, Kafka Legacy, Claude Code, Codex, OpenCode, Pi and Qwen. Accepts image input. Fast is not available.
- Particle-1 (OpenRouter): Kafka, Claude Code, Codex, OpenCode, Pi, Qwen. Image input on Kafka, Claude Code and Codex, and on OpenCode and Pi in Daytona sandboxes; Qwen is text-only. Effort low/medium/high. Context window 1,048,576 tokens. Fast not available.
- Mistral Large 4, Mistral Medium 3.5, Devstral 2, GLM 5.3 Prime, GLM 5.3 FlashX (OpenRouter): Kafka, Claude Code, Codex, OpenCode, Pi, Qwen. Mistral Small 4: Kafka, OpenCode, Pi only. Image input (Mistral Large 4, Mistral Medium 3.5, Mistral Small 4, GLM 5.3 FlashX) on Kafka, Claude Code and Codex, and on OpenCode and Pi in Daytona sandboxes; Qwen text-only. Devstral 2 and GLM 5.3 Prime are text-only. All except Devstral 2 take low/medium/high effort. Context windows: 1,048,576 (Mistral Large 4, GLM 5.3 FlashX), 1,000,000 (GLM 5.3 Prime), 262,144 (the others). Fast not available.
- GPT-6.1 Terra Pro, GLM 5.3 FlashX Legal, MiniMax M3.1 Flash, Muse Wonder, Step 5 Preview are served through OpenRouter; Muse Spark Open and Nemotron 3.5 Super VL through Baseten. GLM 5.3 FlashX Legal, MiniMax M3.1 Flash and Step 5 Preview run on Kafka, Claude Code, Codex, OpenCode, Pi, Qwen. GPT-6.1 Terra Pro runs on Kafka, Codex, OpenCode, Pi; Nemotron 3.5 Super VL on Kafka, OpenCode, Pi. Muse Wonder and Muse Spark Open on Kafka, OpenCode, Pi, Qwen. Image input on Kafka, on Codex where offered, and on OpenCode and Pi in Daytona sandboxes; Claude Code and Qwen are text-only for these. All except Muse Spark Open and Nemotron 3.5 Super VL take low/medium/high effort. Context windows: 1,050,000 (GPT-6.1 Terra Pro), 1,000,000 (MiniMax M3.1 Flash, Step 5 Preview), 1,048,576 (the others). Fast not available.

## 4. Models per harness

From https://docs.brainbaselabs.com/docs/harnesses:

- Kafka and OpenCode can run any model in the catalog.
- Qwen can run any model that isn't limited to specific harnesses.
- Claude Code runs Anthropic models and Codex runs OpenAI models; both can also run the Baseten-hosted open-weight models and these OpenRouter-hosted models: Kimi K3.1 Pro, Particle-1, Mistral Large 4, Mistral Medium 3.5, Devstral 2, GLM 5.3 Prime, GLM 5.3 FlashX, GLM 5.3 FlashX Legal, MiniMax M3.1 Flash, Step 5 Preview. Muse Wonder and Muse Spark Open don't run on Claude Code or Codex.
- Limited to specific harnesses: GPT-6.1 Sol and GPT-6 Astra run on Kafka, Codex and OpenCode; GPT-6.1 Terra Pro on Kafka, Codex, OpenCode and Pi; Muse Spark and Auto on Kafka and OpenCode; Mistral Small 4 and Nemotron 3.5 Super VL on Kafka, OpenCode and Pi.
- Cursor, Factory and Qoder pick their own model.

Explicit restrictions, collected:

| Model | Harnesses the docs name |
| --- | --- |
| `auto`, `auto:open` | Kafka, OpenCode (400 elsewhere) |
| `gpt-6.1-sol`, `gpt-6-astra` | Kafka, Codex, OpenCode (not Kafka Legacy, not Qwen) |
| `gpt-6.1-terra` | Codex, OpenCode, Pi (not yet Kafka) |
| `openai/gpt-6.1-terra-pro` | Kafka, Codex, OpenCode, Pi |
| `meta/muse-spark-1.3`, `meta/muse-spark-1.2` | Kafka, OpenCode |
| `mistralai/mistral-small-2603`, `nvidia/NVIDIA-Nemotron-3.5-Super-VL-120B-A12B` | Kafka, OpenCode, Pi |
| `meta/muse-wonder`, `meta-models/muse-spark-open` | Kafka, OpenCode, Pi, Qwen |
| `moonshotai/kimi-k3.1-pro` | Kafka, Kafka Legacy, Claude Code, Codex, OpenCode, Pi, Qwen |
| `particle-ai/particle-1`, Mistral Large 4 / Medium 3.5, Devstral 2, GLM 5.3 Prime / FlashX / FlashX Legal, MiniMax M3.1 Flash, Step 5 Preview | Kafka, Claude Code, Codex, OpenCode, Pi, Qwen |
| `moonshotai/Kimi-K3` on your Bedrock account | OpenCode, Pi, Kafka, Qwen, Codex (not Claude Code, not Kafka Legacy) |

Where the docs name "Pi": the harness page's table lists eight harnesses without Pi, and the `POST /v2/threads` harness enum is `claude_code | codex | cursor | factory | kafka_cloud | opencode | qoder | qwen`. The integrations page uses `pi` as Pi's runtime value and the CLI manifest accepts `harness: pi`. Confirm with `GET /v2/models` before relying on Pi availability.

Harness name mapping: Kafka `kafka_cloud` (API) / `kafka` (CLI manifest); Claude Code `claude_code` / `claude-code`; Codex `codex` / `codex`; Cursor `cursor`; Factory (Droid) `factory`; OpenCode `opencode`; Qoder `qoder`; Qwen (Qwen Code) `qwen` / `qwen-code`; Pi `pi`; OpenClaw `openclaw` (CLI only). "Kafka Legacy" is the pre-September-2026 platform runtime; it has no documented harness value.

## 5. Retired models

Existing saved selections and API or CLI requests that specify a retired model ID run and are billed as the replacement, which has its own behaviour and pricing. Use the replacement ID when updating a configuration.

| Retired model | Retired ID | Runs as |
| --- | --- | --- |
| GPT-4o | `gpt-4o` | `gpt-5.6-luna` |
| GPT-4o Mini | `gpt-4o-mini` | `gpt-5.6-luna` |
| Claude Sonnet 4 | `claude-sonnet-4-20250514` | `claude-sonnet-4-6` |
| Gemini 3.0 Flash | `gemini-3-flash-preview` | `gemini-3.5-flash` |
| Grok 4 | `grok-4` | `grok-4.6` |
| Grok 4 Fast | `grok-4-fast` | `grok-4.6` |

Changelog 2026-09-11 ("GPT-4o Retired, Existing Selections Move to GPT-5.6 Luna"): GPT-4o and GPT-4o Mini were removed from pickers across agents, workflows and the phone integration; saved agents, workflows and API/CLI requests, including dated snapshots, run as GPT-5.6 Luna; historical usage and billing are unchanged; agent cards now show the replacement model. Changelog 2026-06-12: Gemini 3 Pro Preview, Gemini 3.1 Flash Lite Preview and Gemini 2.0 Flash were removed (discontinued by Google); Gemini 3.5 Flash became the free-tier Google model.

## 6. Sampling parameters Brainbase omits

Some models reject caller-supplied sampling settings. Brainbase omits the listed parameters before the request is sent and the model's own defaults apply:

- `temperature`, `top_p`, `top_k`: Claude Fable 5.1, Claude Opus 5.5, Claude Opus 5, Claude Opus 4.8, Claude Opus 4.7, Claude Sonnet 5.5, Claude Sonnet 5, Claude Haiku 5.5, GPT-6 Sol, GPT-6 Luna, Gemini 4 Argon, Gemini 3.8 Flash.
- `temperature`, `top_p`: GPT-6.1 Sol, GPT-6.1 Terra, GPT-6 Astra, GPT-5.6 Luna, GPT-5, GPT-5 Mini. GPT-6.1 Sol, GPT-6.1 Terra and GPT-6 Astra also drop `logprobs` and `top_logprobs`; GPT-6.1 Sol and GPT-6.1 Terra drop `stop`.
- `stop`, `presence_penalty`, `frequency_penalty`: Grok 4.7, Grok 4.6, Grok 4.5.

Other models, including GPT-5.6 Sol and GPT-5.6 Terra, keep caller sampling values. (Changelog 2026-10-09: the GPT-5.6 Luna / GPT-5 / GPT-5 Mini omission fixed requests that failed when temperature or top-p was set.)

## 7. Per-model notes from the changelog

Prices are USD per million tokens as the changelog stated them on that date; they are not in the docs page. Fetch the live picker (it shows per-model pricing) before quoting. Credits mechanics: `brainbase-payments`.

| Model | Date | Context / output | Effort, Fast, input | Price and notes |
| --- | --- | --- | --- | --- |
| GPT-6.1 Terra | 2026-10-30 | not stated | effort none to max | Codex, OpenCode, Pi. No price stated. |
| Gemini 4 Argon | 2026-10-30 | not stated | effort low/medium/high | "across agents and tasks"; introductory pricing through 2026-11-30 (amount not stated). |
| DeepSeek V4.1 Flash 1017 | 2026-10-30 | 1,048,576 in; 262,144 out | text + image, tool use, reasoning | $0.30 in / $1.20 out / $0.007 cached in. "Under All Models in every harness picker." |
| Particle-1 | 2026-10-30 | 1,048,576 (docs) | low/medium/high (docs); no Fast | $0.27 in / $1.08 out. |
| Kimi K3.1 Pro | 2026-10-23 | 1M | image input; no Fast | $2.16 in / $10.80 out. Offered wherever Kimi K3 is. |
| Claude Haiku 5.5 | 2026-10-07 | 1M; 128K out | adaptive-thinking effort low through max | $0.10 in / $0.50 out for prompts up to 100K tokens. Agents on Claude Haiku 4.5 keep it. |
| GPT-6.1 Sol | 2026-09-29 | 1,050,000; 128,000 out | text + image; effort low/medium/high/xhigh/max; Standard only, no Fast | $2 in / $0.10 cached in / $10 out; above 272K input tokens OpenAI long-context rates. Kafka, Codex, OpenCode; start a new task if the sandbox predates the release. |
| Claude Sonnet 5.5 | 2026-09-28 | 1M; 128K out | adaptive-thinking low through max | $2 in / $10 out. |
| GPT-6 Sol | 2026-09-22 | 1,050,000; 128,000 out | text + image; effort none through max; Fast mode | $2 in / $0.20 cached in / $10 out (half of GPT-5.6 Sol); long-context rates above 272K input; Fast costs twice the applicable rate. |
| GPT-6 Luna | 2026-09-22 | 1,050,000; 128,000 out | same as GPT-6 Sol | $0.10 in / $0.01 cached in / $0.50 out. |
| Claude Opus 5.5 | 2026-09-22 | 1M; 128K out | adaptive-thinking low through max | $4 in / $20 out (lower than Claude Opus 5). |
| Grok 4.7 | 2026-09-21 | 500K | effort low/medium/high/extra-high (high default); text, image, tool calling, structured outputs | $2 in / $6 out; prompts of 200K tokens or more $4 / $12; cached input $0.50 / $1. Docs: 75% fewer LLM credits through 2026-11-30 UTC (changelog 2026-09-25 says "through the end of November"). |
| GPT-6 Astra | 2026-09-04 | API up to 1,050,000; Codex defaults to 272,000, configurable up to 872,000; 128,000 out | text + image; effort low/medium/high/xhigh/max; Standard only | $10 in / $1 cached in / $12.50 cache-write / $50 out; long-context rates above 272K; Batch and Flex 50% of Standard; "Fast costs twice the applicable rate where available" (docs: Fast not available). Codex and OpenCode at launch; Kafka the same day in a separate entry (Kafka Legacy excluded). |
| Claude Fable 5.1 | 2026-09-02 | 1M; 128K out | adaptive-thinking low through max | $10 in / $50 out. |
| Muse Spark 1.3 | 2026-09-02 | 1M | native video input | $1.25 in / $4.25 out. Kafka and OpenCode. |
| Gemini 3.8 Flash | 2026-09-02 | 1M | low/medium/high; tool calling; structured outputs | $0.75 in / $3.75 out through 2026-12-31 (launch price). |
| GLM 5.3 | 2026-08-28 | 1M in; 262k out | text-only; tool calling; structured outputs | $1.40 in / $4.40 out (Baseten list). |
| GLM 5.3 Flash | 2026-08-26 | 1M in; 131k out | text + image; tool calling | $0.15 in / $0.50 out (Baseten list; "roughly a tenth of GLM 5.2's rates"). |
| Muse Spark 1.2 | 2026-08-12 | "large" | vision; first model on Brainbase with native video input | No price stated. |
| Grok 4.6 | 2026-08-12 | 500k | effort low/medium/high; streamed reasoning; tool calling; image; structured outputs | No price stated. Replaced Grok 4.5 as featured xAI model. |
| Kimi K3 | 2026-07-28 | 1M in; 262k out | text + image; tool calling | No price stated. Available across cloud coding runtimes including OpenCode. |
| Claude Opus 5 | 2026-07-24 | 1M; 128k out | effort low through max incl. xhigh | No price stated. Claude Opus 4.8 stays under All Models. |
| Inkling | 2026-07-15 | not stated | text + image | Free at launch; the free period ended (changelog 2026-09-04), now billed at standard per-token rates. |
| Grok 4.5 | 2026-07-13 | 500k | streamed reasoning | Changelog also mentions `grok-4.5-latest` and `grok-build-latest` aliases; neither is in the docs catalog. |
| Claude Sonnet 5 | 2026-07-10 | 1M; 128k out | effort low through max incl. xhigh | No price stated. Claude Sonnet 4.6 stays under All Models. |
| GPT-5.6 Sol / Terra / Luna | 2026-07-09 | not stated | tool-using requests routed with the correct reasoning settings | Sol became the default for new agents and flows. Changelog 2026-08-21: GPT-5.6 Sol discounted 50% through 2026-09-15 (Pacific), now expired. Changelog 2026-09-25: GPT-5.6 agents have a built-in live web-search tool. |
| GLM 5.2, DeepSeek V4 Pro, Kimi K2.7 Code | 2026-07-03 | not stated | GLM 5.2 and DeepSeek V4 Pro reason internally; no effort control | No price stated. |
| Gemini 3.5 Flash | 2026-06-12 | not stated | | "Free-tier Google model". |
| Claude Fable 5 | 2026-06-10 | not stated | effort low/medium/high/max; concise reasoning summaries by default | Announced for Anthropic-model agents; the current catalog lists no `claude-fable-5` ID, only `claude-fable-5-1`. |
| Claude Opus 4.8 | 2026-05-28 | not stated | effort low/medium/high/xhigh/max; Fast mode | Kafka featured model at the time. |

## 8. Picker and routing behaviour from the changelog

- 2026-10-30 (signup credits): free signup credits run on a set of open models in the web app until the first top-up; a model the credits cannot run shows a "Top up" badge; new agents and tasks on such accounts default to a model the credits can run.
- 2026-10-27: pickers list models newest first and hide models released before July 2026; agents and tasks already on a hidden model keep it.
- 2026-08-28: picker redesign with Featured, Newly added, Open-source and per-lab browsing, per-model pricing shown up front; displayed pricing for 22 of the 35 models then matched billing.
- 2026-08-21: pickers surface the most relevant models first; the model for a follow-up message can be changed from the composer.
- 2026-07-18: any member of an agent's team can change its model; GPT-5 and o-series models run correctly on OpenCode and Qwen.
- 2026-07-17: a run or API call with a model not available on Brainbase returns an explicit "model not available" error.
- 2026-07-09: picker options are scoped to the runtime family of the surface, so Codex, Cloud and other runtimes only show compatible models.
- 2026-07-03: a mid-chat model switch is saved on the conversation and applies on the next turn.
- 2026-05-29: the chat picker remembers the model chosen per thread.
- 2026-06-11: Claude Code and Codex subagent turns are recorded against the parent thread's billing owner with the same token-based pricing as other model calls.
- Reliability notes: upstream rate-limit/transient errors are retried with jitter honouring `Retry-After` (2026-07-10); a Claude "model not found" from the primary path retries through a backup path (2026-08-21); provider connections closed without output are retried (2026-08-28); dropped mid-stream responses and malformed tool calls recover automatically (2026-09-18); Gemini tool calls survive to the next turn (2026-09-11).
