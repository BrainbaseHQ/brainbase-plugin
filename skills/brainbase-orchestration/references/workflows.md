# Workflows (Kafka) and how they differ from orchestrations

Source: https://docs.brainbaselabs.com/docs/agent/workflows, /docs/orchestrations/building-an-orchestration, /docs/harnesses; changelog 2026-05-28 "Slack Workflow Commands", 2026-05-29, 2026-06-05, 2026-06-12, 2026-07-10, 2026-07-18, 2026-07-29, 2026-09-04, 2026-09-11
Snapshot: 2026-11-03

## What workflows are

Workflows are visual automation graphs for an agent. A workflow starts with a trigger, runs through connected nodes, and records each execution as a run. Triggers decide when the workflow starts; nodes decide what happens after it starts; edges connect those pieces in the order they should run. They are a Kafka (`kafka_cloud`) feature: the harnesses page describes Kafka as built for "surfaces, orchestrations, triggers, and shared team workflows".

The docs say: prefer orchestrations. "We recommend orchestrations for new multi-step automation work." Reach for a workflow only when the user already has one or explicitly wants the Kafka canvas (for example a Slack slash command with modal inputs).

- Use workflows for repeatable processes with a clear start and a known sequence of steps.
- Use triggers to start the workflow from a schedule, request, app event, or macro.
- Use nodes to ask Kafka to reason, run code, or take an app action.
- Review runs after publishing to confirm each step completed as expected.

Publish when done: saving the canvas is not the same as publishing. Click **Publish** when the workflow is ready. If a published workflow shows saved changes that are not live yet, publish the changes before expecting triggers to use the updated graph.

## Trigger types

| Trigger | What it does | Use it when |
| --- | --- | --- |
| Schedule | Starts the workflow on a UTC schedule. | The workflow should run on a cadence, such as every morning or every hour. |
| Webhook | Starts the workflow when an HTTP request hits the generated endpoint. | Another system should start the workflow by sending data to Brainbase. |
| App Trigger | Starts the workflow when a connected app emits an event. | A change in an app should kick off the workflow. |
| Macro | Starts the workflow from a Slack slash command, with optional inputs. | A person should launch the workflow from Slack and provide fields like a name, city, or ticket id. |

## Node types

| Node | What it does | Use it when |
| --- | --- | --- |
| Kafka | Asks the agent to reason, classify, extract, write, or decide. | The workflow needs model judgment, generated text, structured output, or instructions with context. |
| App Action | Takes an action in a connected app during the workflow run. | The workflow should send a message, create a record, update a row, or perform another app action. |
| Code | Runs Python for deterministic logic. | The workflow needs calculations, formatting, filtering, data lookup, or a repeatable transformation. |

## Slack workflow commands (macros)

Changelog 2026-05-28 "Slack Workflow Commands": workflow trigger nodes accept a Slack Command, the slash command users type in Slack to start the workflow; Kafka-managed Slack apps include the interactivity needed for macro input buttons and modals; macro deliveries use durable delivery so each run replies exactly once; modals work for legacy Slack installs without reinstalling the app.

Later changelog refinements: Slack workflow commands can collect inputs directly in the thread with a Run button alongside the modal flow, and the confirmation message includes the submitted inputs (2026-06-05); macros can be invoked with a slash command from v2 Chat and the developer Task view, and Slack macro results post back to the originating thread (2026-07-10); a macro on a workflow that also has webhook or schedule triggers starts from the macro trigger you chose and fails closed if none is configured (2026-07-18); Slack macro runs map to a single task with a completion link to it (2026-07-18); macro deliveries are not retired by brief network blips (2026-09-04). Slack setup itself is in `brainbase-surfaces`.

## Run behaviour from the changelog

- Clicking a run of a managed workflow opens it in the agent's task chat surface, where every node's messages, files and follow-ups live in one thread; older runs open in their original view (2026-07-10).
- Pressing Stop in a workflow-driven thread cancels the workflow itself, so the run cannot resume later (2026-06-12). Follow-ups and stop requests work the same whether a task started from chat, a workflow connector, or the CLI (2026-09-22).
- Steps that pause for approval or additional input stay paused across automatic retries (2026-07-29) and resume after a reviewer approves (2026-05-29); Kafka workflows wait for missing input instead of failing (2026-05-29).
- Starting the same workflow again from Slack or the dashboard creates a fresh run even with matching inputs; Gmail, Linear and other app triggers collapse duplicate deliveries into one run; polling app triggers check about every 15 seconds (2026-06-05).
- Version history shows who made each edit, and past Kafka workflow versions can be previewed on the canvas and restored (2026-05-29). Workflows can be renamed from the editor breadcrumb (2026-07-10).
- GPT-4o and GPT-4o Mini were retired; saved workflows that referenced them run on GPT-5.6 Luna automatically (2026-09-11). Model choice is in `brainbase-llm-gateway`.
- The Usage dashboard breaks out daily Chat, Sandbox and Workflow spend (2026-07-18); see `brainbase-payments`.

## Workflows versus orchestrations

| | Workflow | Orchestration |
| --- | --- | --- |
| Unit | One agent's automation graph: a trigger, then Kafka / App Action / Code nodes | A graph of several agents; each node is a whole agent with its own harness, tools and secrets |
| Harness | Kafka only | Any harness per member (Kafka, Claude Code, Codex, and the rest) |
| Starts from | Schedule, Webhook, App Trigger, Macro (Slack slash command) | Schedule, third-party app event, webhook; or any member calling `create_task_for_<recipient>` |
| Handoff model | Edges run nodes in order inside one run | Edges are described handoffs that start a task on the recipient agent |
| Determinism | Code nodes run Python for deterministic steps | Each step is an agent task; use edge descriptions, `payload_schema` and small payloads to constrain it |
| Shared state | Within the run | Orchestration secrets, orchestration MCP servers, shared memory |
| Source of truth | Canvas; Publish makes changes live | Canvas, `brainbase-orchestration.yaml` (CLI), `/v2/orchestrations` (API); templates |
| Docs stance | Legacy-leaning; "prefer orchestrations" | Recommended for new multi-step automation |

The docs give no CLI or public API for workflows; the only documented surfaces are the workflow editor, Slack macros and the run views. If a user asks to script a workflow, say so and offer an orchestration instead.
