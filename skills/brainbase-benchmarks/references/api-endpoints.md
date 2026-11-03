# Benchmark API endpoints

Source: https://docs.brainbaselabs.com/docs/monitoring/benchmarks (every benchmark route the docs give),
https://docs.brainbaselabs.com/api/authentication, https://docs.brainbaselabs.com/cli/reference/pat-scopes,
https://docs.brainbaselabs.com/api/tasks/get-task, https://docs.brainbaselabs.com/cli/commands/task,
https://docs.brainbaselabs.com/cli/commands/agent, https://docs.brainbaselabs.com/cli/reference/exit-codes
Snapshot: 2026-11-03

The Benchmarks page names these routes in prose; there is no generated API reference section for
benchmarks in the docs, so request and response bodies, pagination and benchmark-specific error
codes are not published. Everything below is what the docs state. Where a route or field is not
given, this file says so rather than guessing.

## Base URL and authentication

```
https://api.brainbaselabs.com
Authorization: Bearer $BRAINBASE_API_KEY
```

Create the key at app.brainbaselabs.com. A personal access token (`bbpat_…`) also works on these
routes; see the credential rules at the end of this file.

## Documented routes

| Method | Path | Purpose | Parameters and notes |
| --- | --- | --- | --- |
| `POST` | `/v2/agents/{agent_id}/benchmarks/validate` | Validate a benchmark manifest without saving it. | Body: the manifest. The manifest schema is not published; export an existing benchmark to see the shape. |
| `PATCH` | `/v2/agents/{agent_id}/benchmarks/{benchmark_id}` | Update the editable draft. | Send the complete manifest and the latest `expected_version`. The draft is replaced, not merged. |
| `GET` | `/v2/agents/{agent_id}/benchmarks/{benchmark_id}/export` | Export the benchmark. | `format=json` or `format=yaml` (query). Add `revision_id` to export a specific immutable version instead of the current draft. |
| `GET` | `/v2/agents/{agent_id}/benchmarks/runs` | List run history for the agent. | No documented filters. |
| `GET` | `/v2/agents/{agent_id}/benchmarks/runs/{run_id}/results` | A run's aggregate and case-level results. | |
| `PATCH` | `/v2/agents/{agent_id}/benchmarks/runs/{run_id}` | Update a run's name and change note. | Body fields: `label`, `change_note`. |
| `POST` | `/v2/agents/{agent_id}/benchmarks/runs/{run_id}/resume` | Put a run paused for billing back in the queue. | Console equivalent: the **Resume** button on the run page. |
| `PUT` | `/v2/agents/{agent_id}/benchmarks/{benchmark_id}/baselines/{target_key}` | Pin a variant baseline. | Body requires `baseline_target_id`. |
| `DELETE` | `/v2/agents/{agent_id}/benchmarks/{benchmark_id}/baselines/{target_key}` | Clear a variant baseline. | |
| `GET` | `/v2/agents/{agent_id}/benchmarks/analytics/summaries?benchmark_id={benchmark_id}` | Library summaries. | `benchmark_id` as a query parameter. |
| `GET` | `/v2/agents/{agent_id}/benchmarks/{benchmark_id}/analytics` | One benchmark's trends. | |

## Import behaviour (paths not published)

The docs describe how imports behave through the API but do not give the routes or payloads:

| Source | Behaviour |
| --- | --- |
| Manifest (JSON or YAML), CSV, Brainbase bundle | One request returns the new benchmark and its first immutable revision. |
| Public Hugging Face dataset | Two requests: preview, then materialize. The materialize request repeats the preview's expected commit, materialization digest and content digest. |
| Completed task | Two requests: preview, then materialize. The materialize request repeats the expected source and content digests and sets `confirm_output_is_correct` to `true`. Review the captured input and explicitly approve its output before using it as the expected result. |

Also undocumented as routes: creating an empty benchmark, saving a version, planning and
starting a run, cancelling a run, archiving and restoring a benchmark. The console does all of
these; the changelog says the CLI covers the full lifecycle too. Read the live API reference or
run `brainbase benchmark --help` before scripting them, and do not invent paths.

## Example calls

```bash
# Export the current draft as YAML
curl "https://api.brainbaselabs.com/v2/agents/$AGENT_ID/benchmarks/$BENCHMARK_ID/export?format=yaml" \
  -H "Authorization: Bearer $BRAINBASE_API_KEY"

# Export one immutable version
curl "https://api.brainbaselabs.com/v2/agents/$AGENT_ID/benchmarks/$BENCHMARK_ID/export?format=json&revision_id=$REVISION_ID" \
  -H "Authorization: Bearer $BRAINBASE_API_KEY"

# Validate a manifest without saving it
curl -X POST "https://api.brainbaselabs.com/v2/agents/$AGENT_ID/benchmarks/validate" \
  -H "Authorization: Bearer $BRAINBASE_API_KEY" -H "Content-Type: application/json" \
  --data @benchmark.json

# Label a run and record what changed on the agent
curl -X PATCH "https://api.brainbaselabs.com/v2/agents/$AGENT_ID/benchmarks/runs/$RUN_ID" \
  -H "Authorization: Bearer $BRAINBASE_API_KEY" -H "Content-Type: application/json" \
  -d '{"label": "after tool rewrite", "change_note": "Replaced the search tool with the new MCP server"}'

# Resume a run paused for billing
curl -X POST "https://api.brainbaselabs.com/v2/agents/$AGENT_ID/benchmarks/runs/$RUN_ID/resume" \
  -H "Authorization: Bearer $BRAINBASE_API_KEY"

# Pin a baseline
curl -X PUT "https://api.brainbaselabs.com/v2/agents/$AGENT_ID/benchmarks/$BENCHMARK_ID/baselines/$TARGET_KEY" \
  -H "Authorization: Bearer $BRAINBASE_API_KEY" -H "Content-Type: application/json" \
  -d '{"baseline_target_id": "'"$BASELINE_TARGET_ID"'"}'
```

The draft `PATCH` body is the complete manifest plus `expected_version`; the docs do not show an
example. Export first, edit the exported document, add the latest `expected_version`, and send it.
How `target_key` and `baseline_target_id` are obtained is not documented; read them from the run
results payload rather than constructing them.

## Credentials and permissions

| Rule | Source |
| --- | --- |
| Any beta-enabled user with access to the agent can view and run its benchmarks. | Benchmarks page, Permissions |
| Creating, importing, editing, versioning, archiving, restoring and pinning baselines require permission to manage the agent. | Benchmarks page, Permissions |
| A run can be canceled by the person who started it or by an agent manager. | Benchmarks page, Permissions |
| With a PAT, the benchmark mutations check the `publish` scope unconditionally (they are in the group that enforces today, alongside agent secrets, file uploads, thread creation and orchestration writes). | PAT scopes, "What is actually enforced" |
| A browser login session carries no scope list and is never scope-checked; it can do whatever the user's role allows. | PAT scopes |

A PAT without `publish` is refused before the handler runs, so nothing is created or modified:

```json
{
  "detail": "PAT lacks required scope: publish"
}
```

Nearby failures that are not scope failures: `401 missing bearer token` (no `Authorization`
header), `401 invalid or expired PAT`, `403 credential_scope_denied` (a resource-bound token
Brainbase minted for a sandbox, not one you created), `403 CLI task keys cannot manage cloud
configuration` (a `bb_live_…` agent task key on a write). `brainbase token create` mints
`read,publish` by default; the raw mint endpoint defaults to `read` alone.

## Benchmark traces on other objects

| Where | What the docs say |
| --- | --- |
| Task and thread records (`GET /v2/tasks/{task_id}`, `GET /v2/threads/{thread_id}`, list/create/update/interrupt responses) | Carry a `benchmark_attempt_id` (uuid) field. The docs show the field in response examples and do not describe it further. Benchmark tasks stay separate from the agent's regular task history. |
| Task metadata | Keys matching `brainbase_benchmark_*` belong to Brainbase. `brainbase task update --metadata` / `--unset-metadata` refuse them with the key named and change nothing. Under strict admission the API also reserves keys starting `brainbase_`, `_` or `orchestration_` for person credentials, and reserved keys stay rejected for everyone. |
| `brainbase agent delete` | An agent with a benchmark run in progress is refused outright. Stop the run first. |
| CLI exit codes | `benchmark run --watch` and `benchmark run watch` exit `130` on Ctrl-C; the benchmark run keeps going on the server. No `benchmark` command reference page exists and the command index does not list the group. |
