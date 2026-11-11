# Brainbase concepts: anatomy, lifecycle, harnesses, quickstart

Source: https://docs.brainbaselabs.com/docs/welcome · /docs · /docs/quickstart · /docs/anatomy-of-an-agent ·
/docs/agent-lifecycle (+ /ideating, /building, /testing, /deploying, /improving) · /docs/agent/overview ·
/docs/harnesses · /cli/concepts/harnesses · /api (Any harness) · /docs/mcp · /help · /learn · /tutorials ·
/tutorials/how-to-read-these · changelog 2026-07-01, 2026-07-15, 2026-10-22, 2026-10-27, 2026-10-30
Snapshot: 2026-11-03

## Contents

1. What Brainbase is
2. The anatomy of an agent (the stack)
3. The agent lifecycle
4. Console quickstart (build, test, deploy)
5. Harnesses
6. Tasks, threads and turns
7. Where things live (console, API, CLI, MCP)
8. Docs sections that are stubs

## 1. What Brainbase is

"Brainbase is the agentic operating system for your AI workforce. Use it to onboard models, build agents,
wire them into your tools, and supervise what they do from one control plane." The welcome page lists what
you can do: run agents from phone calls, Zoom meetings, Slack, chat and other daily workflows; schedule
autonomous workflows from a schedule or third-party app event (the docs page still says webhook triggers are
"coming soon"; changelog 2026-10-30 "Webhook Triggers for Orchestrations" says they shipped); connect
3,000+ integrations, MCP servers and custom functions; evaluate at scale with custom evaluations, benchmarks
(beta) and review workflows; set up agent orchestrations; share templates. Deploying in your own AWS account
is covered by Install on AWS (`/docs/aws-marketplace`; see `brainbase-llm-gateway` and `brainbase-payments`).

Agents are "AI employees that own evaluatable work". The Agent Overview groups configuration as:

| Area | Includes | Use it to |
| --- | --- | --- |
| Define its identity | Playbooks, instructions, skills | Set the agent's role, expertise, rules, tone, and operating style. |
| Connect knowledge and systems | Tools, browser, memory, file system, secrets | Give the agent access to integrations, external information, reusable context, shared files, and private credentials. |
| Prepare its sandbox | Entrypoint | Install packages, clone repositories, and run setup commands before the agent starts work. |
| Choose where it runs | Surfaces, orchestrations, triggers | Decide where people and systems can reach the agent, and what starts its work. |
| Improve over time | Tasks, evaluations, benchmarks (beta) | Review real work, test expected behavior, and measure quality as the agent changes. |

Agent sidebar pages: Playbooks, Instructions, Skills, Tools, Surfaces, Memory, Browser, File system,
Secrets, Entrypoint (plus Modes, Versions, Tasks, Tags, Evaluations, Benchmarks documented on their own pages).

## 2. The anatomy of an agent

"An agent is more than a model with a prompt. It is a stack of choices."

| Layer | What it controls | Brainbase concept |
| --- | --- | --- |
| Model | Reasoning, language quality, latency, cost, and modality support. | Models |
| Harness | The runtime, local environment, files, commands, and workflow conventions around the model. | Harnesses |
| Skills, tools, and MCP | The agent's portable expertise, integrations, functions, and external actions. | Skills and Tools |
| Context | The durable instructions, playbooks, memory, and business facts the agent can use. | Instructions, Playbooks, Memory |

- Model: "only one layer. A stronger model can still fail if the harness is wrong, the tools are unclear,
  or the context is stale."
- Harness: "determines how the agent receives work, what files or commands it can use, how it runs code,
  how it stores state locally, and which conventions it follows."
- Capabilities: "Give an agent the capabilities it needs for its job, not every capability available in the
  workspace."
- Context: always-on (instructions), retrieved when needed (playbooks), structured and persistent (memory),
  and whatever the current conversation or request provides.

## 3. The agent lifecycle

| Stage | Question | Brainbase helps you |
| --- | --- | --- |
| Ideation | What work should this agent own? | Define the job, success criteria, inputs, and human handoff points. |
| Building | What does the agent need to do the job? | Configure instructions, playbooks, skills, tools, memory, and surfaces. |
| Testing | Does it behave well on real examples? | Run tasks, collect edge cases, and turn expectations into evaluations and, in beta, benchmarks. |
| Deploying | Where should people or systems reach it? | Launch the agent through chat, Slack, meetings, phone, or orchestrated triggers. |
| Monitoring | What is it doing, and how should it improve? | Review tasks, evaluations, and human feedback to update the agent. |

Guidance from the page: start with a narrow recurring process (triage a queue, prepare an account brief,
review a document, classify inbound work, route a request); "build the smallest version that can complete
the job end to end"; test both happy paths and the cases where the agent should slow down, ask or hand off;
"deploy narrow, review early, and expand once the agent has a track record"; monitoring's goal is to turn
real failures into better instructions, playbooks, tools and evaluations. Benchmarks are beta, available on
request.

## 4. Console quickstart (build, test, deploy)

Building Your First Agent (`/docs/quickstart`):

1. Create a new agent and choose the **Project** it belongs to; name it; choose the model or runtime. Start
   with one job the agent should own.
2. Customize: clear instructions plus one focused playbook (the instructions define the role; the playbook
   holds team rules, brand guidance, process details). Add tools and integrations only when the agent must
   read data, update systems, send messages or call a service. Explore Skills, Memory and Surfaces later.
3. Chat with the agent on a real task; watch whether it follows instructions, uses the playbook and asks
   for missing information instead of guessing.

Testing Your First Agent (`/docs/agent-lifecycle/testing`): set up evaluations, run practice tasks, review
and iterate. Evaluation types:

| Type | Use it for | Example |
| --- | --- | --- |
| Binary | A pass/fail check for a required behavior. | `asks-for-missing-info`: Pass when the agent asks a follow-up question before acting without required details. |
| Classification | Sorting a task into one of several categories. | `request-type`: Classify the task as setup, integration, troubleshooting, or billing. |
| Rating (1-5) | Scoring quality on a scale when the answer is not simply right or wrong. | `answer-quality`: Rate how complete, grounded, and useful the final response is. |

Starter set: `answer-is-helpful`, `no-hallucination`, `asks-for-missing-info`, `uses-playbook-guidance`.
Practice prompts: a happy-path question, a vague question that should trigger a follow-up, a playbook-only
detail, an out-of-scope question that should be redirected. Review the task timeline and eval results; fix
the smallest thing, rerun the same example. Evals in depth: `brainbase-evals`.

Deploying Your First Agent (`/docs/agent-lifecycle/deploying`):

1. Add a surface: Chat, Slack, Phone (approved callers), Meetings. For chat, configure available models,
   template prompts and computer panel tabs. (`brainbase-surfaces`)
2. Add a trigger: third-party app event or schedule (webhook per changelog 2026-10-30). App triggers have
   three modes, **Off**, **Test** (events go to the test webhook) and **Live**; schedule triggers have only
   **Off** and **Live**. Test with a low-risk event, then set Live. (`brainbase-orchestration`)
3. Add the agent to an orchestration: one agent per responsibility, connect outputs to inputs, describe each
   handoff, keep the first orchestration small.

## 5. Harnesses

"Harnesses are the runtimes your agents use to do work. They decide where an agent runs, which tools it
can reach, and what kind of execution loop it follows." Kafka is for production agents needing surfaces,
orchestrations, triggers and shared team workflows; the coding harnesses are for codebase-centred work.
Eight harnesses; the **Harness value** is what you pass as `harness` on the Universal Harness API
(`runtime_kind` on `POST /v2/agents`).

| Harness | Harness value | Best for | Notes |
| --- | --- | --- | --- |
| Kafka | `kafka_cloud` | Production agents, team workflows, surfaces, and orchestrations | Brainbase's flagship runtime, designed for knowledge work. |
| Claude Code | `claude_code` | Codebase work and developer iteration | Repo-focused execution loop. Default when an inline spec omits `harness`. |
| Codex | `codex` | Implementation, review, and local workspace tasks | Inspect, edit, and verify code in a workspace. |
| Cursor | `cursor` | Agentic coding with Cursor's runtime | Runs on your own Cursor account (vendor key). |
| Factory (Droid) | `factory` | Software engineering tasks end to end | Factory's Droid agent as a managed harness (vendor key). |
| OpenCode | `opencode` | Open-source coding agent workflows | Open-source harness with a familiar coding loop. |
| Qoder | `qoder` | Coding tasks in Qoder's agentic runtime | Qoder's agent as a managed harness (vendor key). |
| Qwen (Qwen Code) | `qwen` | Coding workflows in Qwen Code's agent loop | Runs on Brainbase models through the Brainbase model proxy. |

Every harness runs behind the same API: same payload, same response, same thread endpoints; switch by
changing `harness`.

Cursor, Factory and Qoder keys: add the vendor key as an agent secret before starting a task:
`CURSOR_API_KEY` or `CURSOR_AUTH_TOKEN` (Cursor), `FACTORY_API_KEY` (Factory),
`QODER_PERSONAL_ACCESS_TOKEN` or `BRAINBASE_QODER_PAT` (Qoder). A secret on the agent's orchestration also
counts. The vendor bills model usage on that account; the harness picks its own model, so these agents and
tasks take no model. Starting without the key returns `422` with `detail.code: missing_required_secret` and
`detail.missing` listing accepted secret names.

Models per harness (summary only; the catalog and current defaults are `brainbase-llm-gateway`, and
`GET /v2/models` lists the default per harness): Kafka and OpenCode run any catalog model; Qwen runs any
model not limited to specific harnesses; Claude Code runs Anthropic models and Codex runs OpenAI models, plus
the Baseten-hosted open-weight models and a listed set of OpenRouter-hosted models; a few models are
restricted to named harnesses; Auto (`auto`, `auto:open`) runs on Kafka and OpenCode only; Cursor, Factory
and Qoder pick their own model. Default model when none is named: the docs page says Claude Opus 5
(`claude-opus-5`) on Claude Code and GPT-5.6 Sol (`gpt-5.6-sol`) elsewhere; changelog 2026-10-27 says new
agents start on GPT-6 Sol, or Claude Opus 5.5 on Claude Code. Check live.

CLI harness ids are different identifiers: the CLI installs components into `claude-code`, `codex`,
`kafka`, `qwen-code`, `opencode`, `openclaw`, `cursor`, `factory`, `qoder`, `pi` (`--harness <id>`), where
the first three take every component type and the rest take skills, instructions and files only. The legacy
Kafka runtime is the `kafka` harness value in the pin limits (`422 pinned_harness_unavailable`). Changelog
2026-07-15 "Choose Your Coding Agent Runtime": the runtime can be chosen at create and changed later; existing
tasks keep their runtime. Changelog 2026-10-22: new tasks start faster (median first output about 16 s
OpenCode, 19 s Claude Code, 20 s Kafka); sandbox creation overlaps the first-message check.

## 6. Tasks, threads and turns

- **Thread** (API): the conversation `POST /v2/threads` returns a handle to; "a thread is a conversation,
  not a one-shot job"; it keeps its sandbox warm for more turns and stops on its own when idle.
- **Task** (console, CLI, `/v2/tasks`): the same conversation. The API guide says to send follow-ups "using
  its `thread_id` as the `task_id`"; events carry both `task_id` and `thread_id`; `GET /v2/threads/{id}`
  and `GET /v2/tasks/{id}` return the same object (`id`, `agent_id`, `owner_user_id`, `parent_task_id`,
  `title`, `status`, `status_info`, `metadata`, `sandbox_id`, `machine_id`, `machine_size`, `model`,
  `benchmark_attempt_id`, `created_at`). Tasks can be nested (`parent_task_id`), labelled (`metadata`),
  pinned to a version (`agent_version_id`), sized (`machine_size`) and given a model (`default_model`).
- **Turn**: one execution in response to input. A thread "reports `running` while a turn is executing, then
  settles: `success` or `fail` for a finished turn, `need_more_info` when the agent is waiting on your
  answer, or `idle` when the turn ended without reporting an outcome." Events carry `turn_id`; inputs may
  join the current turn (native steering) or wait for the next; the `idle` event closes a turn with
  `data.status` and `data.summary`. The CLI also shows `initializing` immediately after create.
- Console labels: **Running**, **Needs info**, **Success**, **Failed**, **Idle**. Needs info also covers a
  Kafka Cloud task paused for an integration approval (summary "Awaiting integration approval") and, per the
  CLI docs, a run that hit its token or turn budget.
- Migration walkthrough wording: "Users can interact through Tasks or through chat. Tasks support a more
  structured, turn-based workflow for requests, updates, and review."

## 7. Where things live

| Surface | Address | Auth | Notes |
| --- | --- | --- | --- |
| Console | `https://app.brainbaselabs.com` | Login session | Projects, agents, tasks, settings, Members, Usage, Billing (changelog 2026-07-01); legacy UI at `/legacy`. Everything created by API appears here. |
| Universal Harness API | `https://api.brainbaselabs.com/v2/…` | `Authorization: Bearer $BRAINBASE_API_KEY` | Agents, threads, tasks, messages, events, templates, alerts, groups/teams, machines, files, evals, orchestrations, benchmarks. |
| CLI control plane | `https://api.brainbaselabs.com/v2/cli/…` | PAT `bbpat_…` or session | Serves the CLI; not the public API contract. `brainbase-cli`. |
| Brainbase MCP | `https://api.brainbaselabs.com/mcp` (Streamable HTTP) | Brainbase OAuth, scope `mcp:all` | Explicit tools for agents, evals, orchestrations and tasks; Codex: `codex mcp add brainbase --url https://api.brainbaselabs.com/mcp`. `brainbase-mcp-tools`. |
| Changelog | `https://app.brainbaselabs.com/changelog` | public | Cite entries by date and title. |

Onboarding (changelog 2026-10-30): new accounts get $25 free credits after phone and card verification; free
credits run on a set of open models until the first top-up; "the API and CLI unlock after your first top-up".
`brainbase-payments` owns credits.

## 8. Docs sections that are stubs

`/docs/agent-lifecycle/ideating`, `/building` and `/improving` are "Coming soon." `/help` links to FAQ,
Troubleshooting and Contact pages not present in the snapshot. `/learn` is an AI-foundations course for
developers, not product docs. `/tutorials` lists eval-driven receipt extraction, streaming long-running runs,
routing prompts across models, wire your first MCP server, Slack triage agent, GitHub PR reviewer, monitor
with evals, roll out a new model safely; only receipt extraction and wire-first-MCP exist in the snapshot.
Tutorial conventions: replace `YOUR_API_KEY` and `ag_…` ids with your own; code blocks are runnable as-is.
