# Benchmarks (beta)

Source: https://docs.brainbaselabs.com/docs/monitoring/benchmarks (whole page),
https://docs.brainbaselabs.com/docs/agent-lifecycle (Testing), https://docs.brainbaselabs.com/docs/agent-lifecycle/testing,
https://docs.brainbaselabs.com/docs/monitoring/evaluations (comparison and credits), https://docs.brainbaselabs.com/cli/commands/agent,
https://docs.brainbaselabs.com/cli/commands/task, https://brainbaselabs.com/pricing,
https://app.brainbaselabs.com/changelog (entries dated 2026-08-25, 2026-08-28, 2026-09-03, 2026-09-04, 2026-09-11, 2026-10-29, 2026-10-30)
Snapshot: 2026-11-03

Contents: Status and access · How benchmarks work · Build (create or import, cases, checks,
environment) · Permissions · Run · Results · Baselines and comparisons · Benchmarks and
evaluations · Where benchmarks sit in the lifecycle · Best practices · Rules elsewhere in the
product · Changelog history

## Status and access

Benchmarks are in beta. Access is enabled by request: email help@brainbaselabs.com to request
benchmarks for your organization. The changelog (2026-08-25) says the same: contact Brainbase
support to have Benchmarking enabled for your team.

Benchmarks are reusable test suites for an agent. Run the same representative tasks after
changing instructions, tools, skills, models, or runtime settings to measure improvements and
catch regressions.

The docs' three-step summary:

1. Open an agent, select Benchmarks, and create or import a benchmark.
2. Add cases and checks, then review and start a run.
3. Inspect results, pin a baseline, change the agent, and rerun to find regressions.

## How benchmarks work

Each benchmark belongs to one agent and has an editable draft. Select **Save as new version**,
or **Save and run** when the draft has changes, to create an immutable version. A reviewed and
confirmed run plan executes that version, and later edits do not change earlier versions or runs.

| Concept | Description |
| --- | --- |
| Case | One representative task with an instruction and optional expected result, variables, files, and metadata. |
| Check | A rule that grades the final output, behavior, resulting files, commands, or overall quality. |
| Version | An immutable snapshot of the benchmark used to make runs reproducible. |
| Run | One execution of selected cases against the current agent and any optional model variants. |
| Baseline | A pinned result used to measure later improvements and regressions. |

Benchmark tasks run through the agent's normal model and tools and consume credits like other
agent work. They remain separate from the agent's regular task history.

## Build a benchmark

### Create or import

Start from an empty benchmark, or import JSON, YAML, CSV, a Brainbase bundle, a public Hugging
Face dataset, or a completed task. When importing a completed task, review the captured input
and explicitly approve its output before using it as the expected result.

Through the API:

| Source | API behaviour |
| --- | --- |
| Manifest (JSON/YAML), CSV, bundle | Returns the new benchmark and its first immutable revision. |
| Hugging Face | Separate preview and materialize requests. Materialization repeats the preview's expected commit, materialization digest, and content digest. |
| Completed task | Separate preview and materialize requests. Materialization repeats the expected source and content digests and sets `confirm_output_is_correct` to `true`. |

- Validate a manifest without saving it: `POST /v2/agents/{agent_id}/benchmarks/validate`.
- Draft updates: `PATCH /v2/agents/{agent_id}/benchmarks/{benchmark_id}` with the complete
  manifest and latest `expected_version`.
- Export: `GET /v2/agents/{agent_id}/benchmarks/{benchmark_id}/export?format=json` or
  `format=yaml`. Add `revision_id` to export a specific immutable version instead of the
  current draft.

The console also edits cases individually or in a spreadsheet-style view and can archive or
export a library (changelog, 2026-08-25). A bundle that fails to import shows a plain-language
error in the dialog instead of a raw API message (changelog, 2026-10-29). Import routes and
payloads are not published; see `api-endpoints.md`.

### Add cases

Cases should represent real work the agent needs to perform. A case can include an instruction,
expected result, variables, starting files, metadata, and check overrides. Files are copied into
the workspace before the agent starts. Each case can define its own checks and scoring weights
(changelog, 2026-08-28).

### Configure checks

| Check | Use it to |
| --- | --- |
| Output | Check the agent's final response for required content or structure. |
| Behavior | Check the actions and tool activity recorded during the task. |
| File | Inspect files produced or changed in the final workspace. |
| Command | Run a command or test package against the final workspace. |
| Model judge | Use a model to grade the completed task against written criteria. |

Turn on **Decides pass** when a failed check should fail the case. Select one numeric check as
the **Headline score** when you want trends and comparisons to follow that score. Without one,
Brainbase uses pass rate as the headline result.

Each case has a Checks section with a structured rubric editor, and results show which criteria
the judge found met or missed (changelog, 2026-09-04). Model-judge checks are model calls and
consume credits like any other (changelog, 2026-09-11: evaluations that grade agent responses,
used by benchmarks and quality monitoring, consume credits the same way as a regular model call).

### Configure the environment

In Settings, you can add setup commands, time limits, required credential names, and files to
retain after a run. Required credential names are checked before the run starts. Credential
values stay in the agent's credential store, are not saved in the benchmark definition or run
plan, and are provided to the agent through its normal runtime environment during execution.

## Permissions

Any beta-enabled user with access to the agent can view and run its benchmarks. Creating,
importing, editing, versioning, archiving, restoring, and pinning baselines require permission
to manage the agent. A run can be canceled by the person who started it or by an agent manager.

With a PAT, benchmark mutations check the `publish` scope unconditionally
(`cli/reference/pat-scopes`); a token without it gets `403` `PAT lacks required scope: publish`
before anything is changed. Roles and who counts as an agent manager: `brainbase-permissions`.

## Run a benchmark

1. Select **Run benchmark**. If you have unpublished edits, the button is labeled
   **Save and run** and saves a new immutable version first.
2. Choose the cases to test, and select **Add a variant** to compare other models.
3. Set repetitions to measure consistency and concurrency to control how many cases run at once.
4. Select **Review run** and inspect the version, number of case runs, models, credentials,
   time limits, and estimated cost when one is available.
5. Check the box confirming you reviewed the cases, variants, and credentials, then select
   **Start run**.

Current beta limits:

| Limit | Value |
| --- | --- |
| Case runs per run | Up to 200 |
| Repetitions | 1 through 10 |
| Concurrency | 1 through 50 |
| Variants in one run | Up to 10 |
| Execution start | Never before you review and explicitly confirm the run plan |

The review checks every model before a plan is created: each variant's model and each model
judge's model must be an available model ID, so a mistyped model stops the review instead of
failing every case run (changelog, 2026-10-30: the refusal names the model and the evaluator).
Agents on the Cursor, Factory, or Qoder harness cannot be benchmarked, because those harnesses
choose their own model and a run could not record which model each case ran on; they are
refused up front.

While a run is active, the run page shows progress by variant and case. Select **Stop run** to
cancel remaining work; results already recorded are kept. A run paused for billing shows the
reason and a **Resume** button that puts it back in the queue (through the API,
`POST /v2/agents/{agent_id}/benchmarks/runs/{run_id}/resume`). Completed agent work is not
silently rerun when a quality check fails.

Changelog, 2026-09-11: a run that hits a credit or plan limit pauses instead of scoring the
blocked case as a failure, and can be resumed where it left off; runs show an upfront
sandbox-time cost estimate. Credit and spend-limit mechanics: `brainbase-payments`.

## Understand results

Results keep execution health separate from agent quality. This prevents a provider or
evaluation error from being presented as though the agent simply answered incorrectly.

| Result | Meaning |
| --- | --- |
| Coverage | How much of the planned work completed with usable evidence. |
| Could not run | How many planned case runs failed before producing usable evidence. |
| Cancelled | How many planned case runs were stopped before completion. |
| Pass rate | The percentage of measured case runs that passed every required check. |
| Headline score | The normalized score from the check selected for trends and comparisons. |
| Stability | Whether repeated runs changed pass/fail outcome or primary score. |
| Case change | Whether a case improved, regressed, stayed the same, or was not scored. |

Open a case result to inspect the final output, check results, files, logs, and execution
details. The result explains why a case passed or failed, and a run's full results can be
exported (changelog, 2026-08-28). Partial results always show how many cases they cover
(changelog, 2026-08-25).

## Baselines and comparisons

Pin an eligible variant result as its baseline, add a **Run name** or change note, then rerun
the benchmark after changing the agent.

Brainbase labels comparisons as **Compared**, **Partial**, **Not comparable**, or
**No baseline**. Changing cases or checks can reduce comparison coverage, so the interface
reports the comparable coverage and added or removed cases instead of presenting a misleading
continuous trend. The benchmarks overview charts every comparable run in order, with drill-down
into any single result (changelog, 2026-09-04); the overview leads with the most recent score,
trend against prior runs, execution coverage, and regressions (changelog, 2026-08-25).

API routes for runs, results, labels, baselines and analytics are listed in `api-endpoints.md`:
`GET .../benchmarks/runs`, `GET .../benchmarks/runs/{run_id}/results`,
`PATCH .../benchmarks/runs/{run_id}` (`label`, `change_note`),
`PUT`/`DELETE .../benchmarks/{benchmark_id}/baselines/{target_key}` (`PUT` requires
`baseline_target_id`), `GET .../benchmarks/analytics/summaries?benchmark_id={benchmark_id}`,
`GET .../benchmarks/{benchmark_id}/analytics`.

## Benchmarks and evaluations

| Use | Evaluations | Benchmarks |
| --- | --- | --- |
| When they run | Automatically after normal agent turns. | When you launch a versioned test run. |
| Inputs | Whatever task the user submitted. | A fixed set of reusable cases. |
| Best for | Monitoring behavior across real usage. | Regression testing, model comparison, and controlled experiments. |
| Results | A check attached to an individual task. | Scores, evidence, trends, baselines, and case-level comparisons. |

The Evaluations page adds: pair evaluations with benchmarks when you need both automatic scoring
and repeatable test cases. Evaluations themselves (manifest `evals`, agent-as-judge, eval runs)
are owned by `brainbase-evals`.

## Where benchmarks sit in the lifecycle

The Agent Lifecycle page puts benchmarks in the Testing stage: run tasks, collect edge cases,
and turn expectations into evaluations and, in beta, benchmarks. Use evaluations for behavior
that should be judged across many tasks, and benchmarks (beta, available on request) for
repeatable scenarios. A good test set includes happy paths and the cases where the agent should
slow down, ask a question, or hand work to a human. The "Testing Your First Agent" page itself
only walks through evaluations and practice tasks; it does not describe benchmark steps.

The pricing page lists "Custom benchmarks" under its "Evals and benchmarks" feature group
alongside unit and regression testing, code evals, LLM-as-judge, agent-as-judge and scheduled
eval runs. The mirror does not preserve which plan column each line belongs to; check
https://brainbaselabs.com/pricing.

## Best practices

- Keep cases realistic; overly clean synthetic examples miss important failure modes.
- Add a case whenever a production task reveals behavior you need to preserve or improve.
- Use stable case and check names so results remain understandable over time.
- Separate required checks from informational diagnostics.
- Use repetitions for nondeterministic tasks instead of trusting a single run.
- Record what changed on the agent before rerunning, then compare against a pinned baseline.
- Review cases imported from real tasks for sensitive information before saving them.

## Rules elsewhere in the product

| Rule | Where |
| --- | --- |
| `brainbase agent delete` refuses outright an agent with a benchmark run in progress. | `cli/commands/agent` |
| Task metadata keys `brainbase_benchmark_*` belong to Brainbase; `brainbase task update` refuses to set or unset them, naming the key, and changes nothing. | `cli/commands/task` |
| Task and thread API records carry a `benchmark_attempt_id` field (shown in response examples, not described). | `api/tasks/*`, `api/threads/*` |
| `benchmark run --watch` and `benchmark run watch` exit `130` on Ctrl-C and the run keeps going. No `benchmark` command reference page exists and `cli/commands` does not list the group. | `cli/reference/exit-codes` |
| Benchmark mutations are among the API writes that check `publish` unconditionally. | `cli/reference/pat-scopes` |

## Changelog history

| Date | Entry | What it says about benchmarks |
| --- | --- | --- |
| 2026-08-25 | Agent Benchmarking (beta, tag: agents) | New Benchmarks section on each agent: build a library of test cases, edit individually or in a spreadsheet-style view, version them, archive or export a library. Plan and launch a run across one or more models with configurable repetitions and concurrency, review estimated cost, confirm before anything starts. Watch a run live with per-case progress, evidence and artifacts; cancel a run in progress. Overview leads with the most recent score, trend against prior runs, execution coverage and regressions, with drill-down and comparisons against a baseline. Quality scores and execution health are always shown separately; partial results show how many cases they cover. Contact support to enable. |
| 2026-08-28 | Fixes and Improvements | Each test case can define its own checks and scoring weights; results explain why a case passed or failed; a run's full results can be exported. Run setup is three guided steps; a run can be stopped in progress. |
| 2026-09-03 | Developer Updates | Benchmarks can be authored, imported, run, and inspected without leaving the terminal; the CLI covers the full lifecycle from draft to results. (No command reference page in the docs.) |
| 2026-09-04 | Fixes and Improvements | Each test case gets a real Checks section with a structured rubric editor, showing which criteria the judge found met or missed. The benchmarks overview charts every comparable run in order with drill-down. |
| 2026-09-11 | Fixes and Improvements | A run that hits a credit or plan limit pauses instead of scoring the blocked case as a failure, and can be resumed where it left off. Runs show an upfront sandbox-time cost estimate and can fan out to more concurrent case runs (beta). Evaluations that grade agent responses, used by benchmarks, consume credits like a regular model call. |
| 2026-10-29 | Fixes and Improvements | A benchmark bundle that fails to import shows a plain-language error in the dialog instead of a raw API message. |
| 2026-10-30 | Developer Updates | A mistyped judge or variant model is refused when you plan a benchmark, with the model and evaluator named, instead of failing every trial at grading. Cursor, Factory, and Qoder agents are refused up front because those harnesses choose their own model. |
