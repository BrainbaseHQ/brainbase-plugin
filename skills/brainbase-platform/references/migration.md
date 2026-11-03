# Migrating from Kafka Legacy to the new Brainbase platform

Source: https://docs.brainbaselabs.com/docs/migrating-to-new-platform · /docs/migration-walkthroughs ·
/docs/agent/versions (pin limits) · /cli/reference/control-plane-api (legacy control plane) ·
changelog 2026-07-01 "The New Brainbase Experience Is Live"
Snapshot: 2026-11-03

## Timeline (as the docs state it)

| When | What |
| --- | --- |
| Before September 8, 2026 | Review Kafka Legacy agents and migrate the ones you want to validate early. |
| September 8, 2026 at midnight UTC | Brainbase automatically migrates all remaining agents to the new platform. |
| After September 8, 2026 | The old platform is deprecated. Agents run on Kafka unless your Brainbase team helps with a specific support path. |

The snapshot postdates the deadline but the page still reads as pre-migration; fetch the live page before
telling a user what will happen to a remaining legacy agent. "Each agent can run on only one platform at a
time." Migrating "changes the agent's runtime. It does not create a second copy of the agent." A Brainbase
account manager can help review critical agents, validate behaviour and plan the order across a team.

## What is changing

- **Projects:** agents are grouped in projects (the API calls them groups; the default is the Projects group
  created at account bootstrap, changelog 2026-07-01).
- **Dedicated task view:** status, timelines, messages, tool calls, outputs and follow-ups in one place.
- **Evaluations:** first-class; define criteria, review results, iterate before and after deployment.
- **Runtime configuration:** change the runtime or harness alongside the model.
- **Agent orchestrations:** connect agents, define handoffs, attach triggers (events, schedules, other
  systems).

## What stays the same

Core workflows (create agents, give instructions and context, connect tools, run tasks, review outputs,
improve). Existing agents, tasks, threads, groups, playbooks, workflows, integrations, MCP servers, secrets,
billing, usage and members still exist; the platform "mostly changes where these concepts live and how they
are organized." Chat and task review remain central. Team and organization concepts, members, billing,
usage, API keys and settings remain, surfaced through the new shell. "Existing data should carry forward."

## Old vs. new mapping

| Previously | Now | What you need to do differently |
| --- | --- | --- |
| Thread runs were viewed from the sidebar, with limited metadata and a cramped review experience. | Runs live in the dedicated Tasks view, with metadata, timelines, messages, tool calls, outputs, and follow-up context. | Review task history from Tasks instead of scanning sidebar threads. |
| Users interacted with agents primarily through thread chat. | Users can interact through Tasks or through chat. Tasks support a more structured, turn-based workflow for requests, updates, and review. | Use Tasks for operational work you want to track and review. Use chat for exploratory or conversational interactions. |
| Agent settings were edited from the settings button at the bottom of the old UI. | Agent features now live in the agent sidebar. Connectors are now called Surfaces. | Open the agent and use the sidebar pages for instructions, playbooks, skills, tools, surfaces, memory, browser, and secrets. |
| Build mode updated playbooks, workflows, global instructions, integrations, and related configuration from inside a thread. | Build capabilities now live in Copilot, alongside dedicated agent configuration pages. | Use Copilot or the dedicated configuration pages instead of treating a long-running thread as the build workspace. |
| Evals were not available. | Evals are first-class and can monitor performance against criteria your team defines. | Define evals for the behaviors that matter before or shortly after migration. |
| Agents were connected together through webhooks. | Agents are connected through orchestrations. | Rebuild multi-agent flows as orchestrations with clear agent roles, handoffs, and triggers. |

The walkthrough page's visual sections (Reviewing runs, Interacting with agents, Configuring agents, Building
agents, Connecting agents) carry screenshot placeholders only.

## Gotchas

- Do not run one agent on both platforms.
- Cold starts: an agent sandbox can take around 10–15 seconds to start on the new infrastructure.
- Expect some behaviour changes from runtime, model, tool and orchestration settings.
- Validate important agents early on representative tasks; tune instructions, playbooks, tools or evals.
- Check orchestrations and triggers for agents that were part of a legacy workflow.
- Pins: pinning a version whose harness is the legacy `kafka` harness refuses every new task with
  `422 pinned_harness_unavailable` until the agent is unpinned or pinned to a supported version.
- CLI: `BRAINBASE_API_URL` means "this is the legacy KLS control plane"; on that path the CLI refuses
  declarative `machine_kind`/`default_model` writes, orchestration creation and schedule-trigger writes
  (`brainbase-cli`).
- Models: several newer models are "not available in Kafka Legacy" (`/docs/models`; `brainbase-llm-gateway`).

## The new experience (changelog, 2026-07-01)

Dedicated Settings, Members, Usage and Billing pages with stable URLs; unified group and agent navigation
for deep links; Meetings connector settings reorganized with pre- and post-meeting guidance pointing at the
agent's Instructions; account bootstrap guarantees a default Projects group. The previous interface stays
at `/legacy` during the transition.

## Help

Contact your Brainbase account manager or email help@brainbaselabs.com.
