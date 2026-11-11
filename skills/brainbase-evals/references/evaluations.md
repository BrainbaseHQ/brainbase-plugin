# Evaluations: what they are, what they cost, how they relate to benchmarks

Source: https://docs.brainbaselabs.com/docs/monitoring/evaluations
Source: https://docs.brainbaselabs.com/docs/agent-lifecycle (Testing and Monitoring stages)
Source: https://docs.brainbaselabs.com/docs/agent-lifecycle/testing
Source: https://docs.brainbaselabs.com/docs/agent-lifecycle/improving
Source: https://docs.brainbaselabs.com/docs/monitoring/benchmarks (Benchmarks and evaluations table)
Source: https://docs.brainbaselabs.com/docs/monitoring/tasks (Evals in the Tasks view)
Source: https://app.brainbaselabs.com/changelog (entries dated 2026-06-18 through 2026-10-30 that mention evals or judges)
Source: https://brainbaselabs.com/pricing (Evals and benchmarks block)
Snapshot: 2026-11-03

Contents

1. Definition and where evals live
2. What evaluations are for, with example slugs
3. Output shapes
4. Model evaluations consume credits
5. Who can see evals
6. Agent as a judge (changelog)
7. Evaluations versus benchmarks
8. Evals in the agent lifecycle
9. Best practices
10. Changelog timeline
11. Pricing page mentions the docs do not explain

## 1. Definition and where evals live

Evaluations are automatic checks that run when an agent finishes a turn. Use them to grade qualities that should be true across many tasks, such as helpfulness, policy compliance, or whether the agent asked for missing information.

Three places hold the same definitions:

| Place | What you do there |
| --- | --- |
| Console, the agent's Evaluations area | 1. Open the agent's Evaluations area. 2. Add the behavior you want to check and the scoring criteria. 3. Enable the evaluation and review results on completed tasks. |
| `brainbase.agent.yaml`, the `evals` list | Edit the block and run `brainbase agent push`. The list is authoritative: push sends the whole list, and removing an eval from the file archives it in the cloud. Push names what it will archive and refuses if the cloud holds an eval you have not pulled. Read verdicts with `brainbase agent eval runs`. See `manifest-and-cli.md`. |
| REST API, `/v2/agents/{agent_id}/evals` and `/v2/agents/{agent_id}/eval-runs` | Create, read, update, delete definitions and list verdicts. See `api.md`. |

Verdicts appear on completed tasks. The Tasks view can filter by eval result, and a task's detail shows "Evals: Performance and classification of a task against set criteria". The transcript's turn detail view has an evals panel (changelog, 2026-07-24: Fixes and Improvements, a scrolling fix). `brainbase task get <task-id>` prints an `EVAL VERDICTS` block.

## 2. What evaluations are for, with example slugs

| Purpose | What it checks |
| --- | --- |
| Quality gates | Whether the answer is complete, grounded, or useful. |
| Policy checks | Missing disclaimers, unsafe actions, or skipped approvals. |
| Workflow checks | Whether the agent followed required steps before finishing. |

Examples from the evaluations page:

| Slug | Criteria |
| --- | --- |
| `answer-is-helpful` | The reply directly addresses the user's question. |
| `asks-for-missing-info` | The agent asks a follow-up question when required inputs are absent. |
| `uses-approved-tone` | The response follows the team's tone and formatting rules. |

Starter set from the testing page:

| Evaluation | Slug | Criteria |
| --- | --- | --- |
| Helpful answer | `answer-is-helpful` | The agent directly addresses the user's question and gives a useful next step. |
| No hallucination | `no-hallucination` | The agent does not invent product details, policies, URLs, or capabilities. |
| Asks when missing context | `asks-for-missing-info` | The agent asks a follow-up question when it lacks required information. |
| Uses the playbook | `uses-playbook-guidance` | The agent follows the rules, tone, and process details from the relevant playbook. |

## 3. Output shapes

The manifest and API call this `output_shape`; the testing page describes the three shapes:

| Type | `output_shape` | Use it for | Example |
| --- | --- | --- | --- |
| Binary | `binary` (default) | A pass/fail check for a required behavior. | `asks-for-missing-info`: Pass when the agent asks a follow-up question before acting without required details. |
| Classification | `classification` | Sorting a task into one of several categories. | `request-type`: Classify the task as setup, integration, troubleshooting, or billing. |
| Rating (1-5) | `rating` | Scoring quality on a scale when the answer is not simply right or wrong. | `answer-quality`: Rate how complete, grounded, and useful the final response is. |

A classification eval needs `classification_values`, a non-empty list without duplicates; any other shape rejects that field. A verdict carries `passed` (binary), `rating` (rating) or `category` (classification), plus `reasoning` and `cites`.

## 4. Model evaluations consume credits

From the evaluations page:

- Each enabled model-based evaluation runs a judge after the agent finishes a turn and uses Brainbase credits like another model call.
- The judge request and result are not added as chat messages, but their usage is recorded in the credit ledger.
- Additional enabled evaluations and occasional transcript summarization can add more calls.
- This does not delay the agent's primary response.
- With no credits left or a spending limit reached, the judge call is rejected and the evaluation is recorded as errored with no verdict.
- If a model provider omits token usage, Brainbase records a conservative estimate instead of leaving the evaluation unmetered.

Changelog, 2026-09-11: Fixes and Improvements: "Evaluations that grade agent responses (used by benchmarks and quality monitoring) now consume credits the same way as a regular model call, instead of running for free."

An agent judge runs as its own task (see section 6), so expect it to spend credits like any task; the docs do not give a separate price for agent judges. Credit mechanics, top-ups and spend limits belong to the `brainbase-payments` skill.

## 5. Who can see evals

Changelog, 2026-07-18: Fixes and Improvements: teammates and members of groups an agent is shared with can view that agent's evaluations and results, instead of seeing an empty evals view.

Writing evals (create, change, delete) requires permission to manage the agent; a caller without access receives `404`. See `api.md` for the full credential rules, and `brainbase-permissions` for roles and PAT scopes.

## 6. Agent as a judge (changelog)

Changelog, 2026-06-18: Agent as a Judge. Evals can be judged by a full agent run instead of a single-shot model; the judge can open files, browse artifacts, and reason the same way the agent under test does.

- Every eval row in the developer app has a Model / Agent toggle and an agent picker, so each eval can choose between a quick single-shot model judge and a full agent judge per rubric.
- Agent judges run as their own task, which means they can open files in the workspace, inspect artifacts, and follow multi-step reasoning.
- Verdict cards in the turn view and the eval detail modal show which agent rendered the verdict, with a "View judge run" link that opens a read-only transcript of the judge's reasoning. "Open full view" expands the transcript inline into the read-only task detail.
- Judge runs are filtered out of the regular task list so evaluation traffic does not pollute conversation history.

Later changelog entries:

- 2026-09-04: Fixes and Improvements: agent-judge evals previously produced no verdicts for Claude Code, Codex, and OpenCode agents; they now run and report results as they already did for Kafka agents.
- 2026-10-30: Developer Updates: agent-judged evals on very long conversations now return pass or fail instead of a context-length error.

In the manifest this is `judge_type: agent` plus `judge_agent`; in the API it is `judge_type: "agent"` plus `judge_agent_id`. The judging agent must be one you can access that shares a project with the judged agent (or, for personal agents, one you own) and cannot be the agent being judged. `judge_model` is ignored for agent judges. A verdict from an agent judge carries `judge_task_id`, the id of the judge's own task.

## 7. Evaluations versus benchmarks

From the benchmarks page (benchmarks are in beta, enabled by request through help@brainbaselabs.com):

| Use | Evaluations | Benchmarks |
| --- | --- | --- |
| When they run | Automatically after normal agent turns. | When you launch a versioned test run. |
| Inputs | Whatever task the user submitted. | A fixed set of reusable cases. |
| Best for | Monitoring behavior across real usage. | Regression testing, model comparison, and controlled experiments. |
| Results | A check attached to an individual task. | Scores, evidence, trends, baselines, and case-level comparisons. |

Benchmarks have their own "Model judge" check type that grades a completed case against written criteria; that is a benchmark check, not an agent eval, and is covered by `brainbase-benchmarks`. The evaluations page's last best practice: pair evaluations with benchmarks when you need both automatic scoring and repeatable test cases.

## 8. Evals in the agent lifecycle

The lifecycle page's loop:

| Stage | Question | Brainbase helps you |
| --- | --- | --- |
| Ideation | What work should this agent own? | Define the job, success criteria, inputs, and human handoff points. |
| Building | What does the agent need to do the job? | Configure instructions, playbooks, skills, tools, memory, and surfaces. |
| Testing | Does it behave well on real examples? | Run tasks, collect edge cases, and turn expectations into evaluations and, in beta, benchmarks. |
| Deploying | Where should people or systems reach it? | Launch the agent through chat, Slack, meetings, phone, or orchestrated triggers. |
| Monitoring | What is it doing, and how should it improve? | Review tasks, evaluations, and human feedback to update the agent. |

Testing: use evaluations for behavior that should be judged across many tasks, and benchmarks (beta) for repeatable scenarios. A good test set includes happy paths and the cases where the agent should slow down, ask a question, or hand work to a human. Deploying: before deploying, make sure the agent has been tested against the examples and evaluations that matter most. Monitoring: tasks show what happened, evaluations show whether quality is holding, human review shows what the agent still needs to learn; turn real failures into better instructions, sharper playbooks, safer tools, and stronger evaluations.

The "Testing Your First Agent" page's three steps:

1. Set up evaluations for the behaviors you want to measure. Each evaluation should check one thing, use a readable slug, and describe the standard clearly enough that a teammate would agree with the result. One or two behaviors are enough for a first pass.
2. Chat with the agent and create practice tasks from realistic examples: a common happy-path question; a vague question where the agent should request more context; a policy or product detail that only exists in the playbook; a question outside the agent's scope to check whether it redirects or escalates.
3. Review completed tasks, compare evaluation results, and iterate. Repeated failures usually mean the instructions are unclear, the playbook is missing an example, or the agent needs a tool to verify the answer. Update the smallest thing that could fix it, then rerun the same example before moving on.

The "Improving" lifecycle page is "Coming soon" as of the snapshot. The migration pages add that evals are first-class on the new platform ("Define criteria, review results, and use evals to guide iteration before and after deployment") and suggest defining evals for the behaviors that matter before or shortly after migration.

## 9. Best practices

From the evaluations page:

- Write criteria as observable outcomes, not vague preferences.
- Keep each evaluation focused on one behavior.
- Use stable slugs so results are easy to compare over time.
- Pair evaluations with benchmarks when you need both automatic scoring and repeatable test cases.

From the manifest reference: evals are the agent's test suite, so keeping them in `brainbase.agent.yaml` puts a behaviour change and the check that guards it in the same commit and the same review.

## 10. Changelog timeline

| Date | Entry | What changed for evals |
| --- | --- | --- |
| 2026-06-18 | Agent as a Judge | Model / Agent toggle per eval; agent judges run as their own task; "View judge run" transcript; judge runs hidden from the task list. |
| 2026-07-03 | New Models Available: GLM 5.2, DeepSeek V4 Pro, and Kimi K2.7 Code | These models appear in eval detail views (among other pickers). |
| 2026-07-18 | Fixes and Improvements | Teammates and shared-group members can view an agent's evaluations and results. |
| 2026-07-22 | Brainbase MCP: Manage Your Agents from Claude Code and Codex | The Brainbase MCP's tool set covers evals ("run evaluations"). The docs MCP page lists no eval tool by name; the official `brainbase-mcp` package (0.1.2) names `evals_list`, `evals_get`, `evals_create`, `evals_update`, `evals_delete`, `evals_run` and `evals_results`. See `brainbase-mcp-tools`. |
| 2026-07-24 | Fixes and Improvements | The evals panel in a transcript's turn detail view scrolls instead of clipping. |
| 2026-09-03 | Developer Updates | Manifest `evals` now sync: `push`, `pull` and `status` understand the block. |
| 2026-09-04 | Fixes and Improvements | Agent-judge evals run on Claude Code, Codex and OpenCode, not only Kafka. |
| 2026-09-11 | Fixes and Improvements | Model evaluations consume credits like a regular model call. |
| 2026-10-30 | Developer Updates | Agent-judged evals on very long conversations return a verdict instead of a context-length error. |

## 11. Pricing page mentions the docs do not explain

The pricing page's "Evals and benchmarks" block lists "Code evals" (deterministic code assertions and custom scorers), "LLM-as-judge", "Agent-as-judge", "Custom benchmarks" and "Scheduled eval runs", and the Teams plan's highlights read "Orchestration, evals & priority support". The docs mirror describes only model and agent judges on finished turns; it does not document code evals or scheduled eval runs, and the mirror cannot show which plan each row applies to. Fetch https://brainbaselabs.com/pricing for current plan details.
