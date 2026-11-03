# Manifest `evals` block and the `brainbase agent eval` commands

Source: https://docs.brainbaselabs.com/cli/reference/agent-manifest (evals section, full example, creating the file)
Source: https://docs.brainbaselabs.com/cli/commands/agent (pull, push, status, eval)
Source: https://docs.brainbaselabs.com/cli/commands (global flags: --json, --limit)
Source: https://docs.brainbaselabs.com/cli/commands/task (task get)
Source: https://docs.brainbaselabs.com/cli/reference/control-plane-api (Evals, Manifest and revision)
Snapshot: 2026-11-03

Contents

1. Where the block lives
2. `evals[]` fields
3. Example block
4. Rules that surprise people
5. `brainbase agent pull`, `push` and `status` as they affect evals
6. `brainbase agent eval list` and `runs`
7. Reading `--json` verdicts
8. Verdicts on `brainbase task get`
9. Credentials the CLI uses
10. CI patterns

## 1. Where the block lives

`brainbase.agent.yaml` is the committed, declarative source of truth for an agent; edit it by hand, then run `brainbase agent push`. Cached cloud metadata lives in a gitignored `.brainbase/state.json`, never in the manifest. The older filename `brainbase.yaml` is still read, but writes go to `brainbase.agent.yaml`. Only `schema: 1` and `agent.name` are required; `evals` is optional and defaults to an empty list.

Three commands produce a manifest: `brainbase agent init` (offline starter; `--full` writes a commented template covering every block), `brainbase agent create` (file plus cloud agent in one step), `brainbase agent pull <id>` (manifest for an existing cloud agent into an empty folder).

The manifest reference's full example ends with:

```yaml
evals:
  - slug: cites-the-diff
    criteria: Pass when the review quotes the lines it is commenting on.
```

Evals are the agent's test suite: keeping them in the manifest puts a behaviour change and the check that guards it in the same commit and the same review. Definitions are declarative; verdicts are results, never config. Verdicts are read with `brainbase agent eval runs` and never written to this file.

## 2. `evals[]` fields

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `slug` | string | yes | Identity within the agent. Kebab-case (`a-z`, `0-9`, hyphens), unique across the agent's evals. Renaming a slug on an entry that carries an `id` renames that cloud eval; renaming one without an `id` creates a new eval and archives the old one. |
| `id` | string | no | Cloud eval id. Round-tripped: written by `pull`, and by `push` for evals it creates, then sent back on later pushes so an existing eval is updated rather than recreated. Do not write it by hand. |
| `criteria` | string | yes | What the judge scores against, in plain language. 1–4000 characters. Inline only; there is no `file` form. |
| `icon` | string | no | Lucide icon name shown beside the eval in the web app, e.g. `CircleCheck`. Max 64 characters. |
| `enabled` | boolean | no | Whether the judge scores turns against this eval. Defaults to `true`. `false` keeps the definition and its past verdicts while stopping new ones. |
| `judge_model` | string | no | Model that renders the verdict. Defaults to `claude-sonnet-4-6`. Ignored when `judge_type` is `agent`. |
| `judge_type` | `"model"` or `"agent"` | no | Who judges: a model directly, or another agent. Defaults to `model`. |
| `judge_agent` | string | no | The judging agent, as an agent id or a name that slugifies to one. Required when `judge_type` is `agent`, rejected otherwise. Must be an agent you can access that shares a project with this one (or, for personal agents, one you own), and cannot be the agent being judged. A name is resolved on push and rewritten in place as the resolved id. |
| `output_shape` | `"binary"`, `"rating"` or `"classification"` | no | Pass/fail, a 1–5 rating, or one of a fixed set of categories. Defaults to `binary`. |
| `classification_values` | array of string | no | The allowed categories. Required, non-empty and free of duplicates when `output_shape` is `classification`; rejected for any other shape. |

The API's equivalent of `judge_agent` is `judge_agent_id`, a uuid only; the name form exists in the manifest alone.

## 3. Example block

```yaml
evals:
  - slug: asks-for-missing-info
    criteria: >-
      Pass when the agent asks for a required field it was not given,
      instead of guessing a value.
    icon: CircleCheck

  - slug: answer-quality
    criteria: Rate how completely the answer addressed the question.
    output_shape: rating

  - slug: refusal-reason
    criteria: When the agent declined, which reason applied?
    output_shape: classification
    classification_values: [policy, missing-data, out-of-scope]

  - slug: follows-escalation-policy
    criteria: Pass when the agent escalated according to the policy playbook.
    judge_type: agent
    judge_agent: policy-reviewer
```

## 4. Rules that surprise people

A judge named by name is rewritten as an id. `judge_agent: policy-reviewer` is resolved on push and written back into the manifest as that agent's id, because agent names are not stable identity. The rewrite happens once, on the first push; until then `agent status` reports the eval as locally modified, which is expected. Commit the rewritten file.

The evals list is authoritative, and omissions archive. `agent push` sends the whole list, so an eval you delete from the file is archived in the cloud: it stops scoring turns and disappears from the web app. Archived is not deleted: past verdicts are kept, and re-adding the same slug restores the same eval with its history. `agent push` names every eval it is about to archive and, when run interactively, asks first; `agent status` shows the same list before you push. The same rule applies to `playbooks`.

Push refuses rather than archive an eval you have never pulled. A deletion and a folder that has never seen the cloud's evals both look like an empty list, so push distinguishes them using the last-synced state in `.brainbase/`. If the cloud holds an eval your checkout has not pulled (one a teammate created in the web app, say), push stops with a non-zero exit and tells you to `agent pull` first. The same applies to an eval edited in the cloud since your last pull. `agent push --force` overrides both and makes your local list authoritative.

A manifest that declares no evals makes no claim. A manifest with no `evals`, whether the block is absent or written as `evals: []` (indistinguishable once parsed), asserts nothing: cloud evals are left untouched and the rest of the push proceeds. That holds under `--force` too, which means "my edits beat the cloud's edits" and never "this agent has no evals". Deleting your last eval still works, because that is a change against your last-synced state.

Server side, these rules are the `reconcile_evals` flag and the `base_revision` requirement on `PUT /v2/cli/agents/{agent_id}/manifest`; see `api.md` section 13.

## 5. `brainbase agent pull`, `push` and `status` as they affect evals

```bash
brainbase agent pull                      # bring cloud changes (including evals and their ids) into this folder
brainbase agent pull <agent-id> --force   # overwrite local changes with the cloud version
brainbase agent status                    # preview: evals a push would archive, and whether push is blocked
brainbase agent status --json             # evals.archive and evals.pushBlocked for pipelines
brainbase agent push                      # send the whole evals list; names archives, asks when interactive
brainbase agent push --force              # local list wins, archives never-pulled cloud evals
```

| Command | Flag | Effect on evals |
| --- | --- | --- |
| `agent pull` | `--force` | Overwrite local changes with the cloud version. |
| `agent push` | `--force` | Overwrite cloud-side content and `default_model` conflicts with local values, and archive cloud evals missing from the manifest even when they have not been pulled; never overrides `machine_kind` immutability. |
| `agent push` | `--yes`, `-y` | Skip confirmation prompts, including the archive confirmation. |
| `agent status` | `--json` | Machine-readable report. `evals.archive` lists what a push would archive and `evals.pushBlocked` is true when a push would be refused, so a pipeline can gate on either. |

`agent push` sends instructions, entrypoint, playbooks, skills, MCP servers, evals, and `default_model`. A pinned agent keeps running its pinned version after a push; move the pin with `agent versions pin <version>` or remove it with `agent versions unpin`. Changelog, 2026-09-03: Developer Updates: manifest evals "now actually sync — push, pull, and status all understand the evals block instead of silently ignoring it"; a CLI older than that drops the block.

## 6. `brainbase agent eval list` and `runs`

Read the agent's evals and the judge's verdicts. `list` shows the eval definitions the cloud currently holds; `runs` shows verdicts newest first, with the judge's reasoning, any quotes it cited, and the task each verdict came from. Both subcommands are read-only. There is no run command: the platform scores each turn as it finishes.

```bash
brainbase agent eval list
brainbase agent eval list --archived
brainbase agent eval runs --limit 20
brainbase agent eval runs --task-id 6f1d9c2a-... --json
```

| Flag | Description |
| --- | --- |
| `--archived` | `list` only. Also show evals a push has archived; they are marked `(archived)` and carry a `status` of `archived` in `--json`. |
| `--task-id <id>` | `runs` only. Narrow to one task. |
| `--limit <n>` | `runs` only. How many verdicts to fetch (1–200, default 50). |
| `--json` | Machine-readable output, and nothing else on stdout. Never prompts. |

Under the hood: `GET /v2/cli/agents/{agent_id}/evals` (query `include_archived`, default `false`) and `GET /v2/cli/agents/{agent_id}/eval-runs` (query `task_id`, `limit` default `50` max `200`). Neither requires a PAT scope.

## 7. Reading `--json` verdicts

A verdict's status is not its outcome. In `--json`, `status` reports whether the judge ran, not what it decided:

- A binary eval the agent failed comes back as `status: "passed"` with `passed: false`.
- When the judge itself failed, the verdict fields are empty and `error` says why. The CLI page writes this as `status: "errored"`; the control-plane page writes `status: "failed"`. Treat either as "no verdict" and read `error`.

Verdict fields (same object as the public `eval-runs` endpoint): `id`, `eval_id`, `task_id`, `turn_id`, `status`, `passed`, `rating`, `category`, `reasoning`, `cites`, `judge_model`, `error`, `triggered_by`, `judge_task_id`, `created_at`, `completed_at`.

## 8. Verdicts on `brainbase task get`

`brainbase task get <task-id>` prints one task: status, agent, model, the machine it ran on, caller metadata, and the eval verdicts recorded against it. With `--json`, the task record is nested under `task`, next to `eval_runs`.

```text
success         nightly smoke suite

  task     09d61d87-311a-414e-b6e2-76376b5eaf21
  agent    Support Bot (2ff01836-b183-478b-89d5-cd2f77118c25)
  model    agent default
  created  2026-08-31T21:39:53.205552
  machine  143975a9-9677-4562-9d55-b37e365510c6 (size s)
  sandbox  3d86f338-305c-432c-94b6-12fc6c91d446

  EVAL VERDICTS
  pass  answers-the-question
```

When Brainbase stops a task because there are no credits left or a billing limit was reached, `failure` says so with the service's detail; add credits or raise the limit, then run the task again.

## 9. Credentials the CLI uses

Control-plane commands, including `agent eval` and the eval verdicts on `task get`, use `BRAINBASE_TOKEN` first, then a valid or renewable login session, then the PAT saved by `brainbase token create` when its account id matches the session. Set `BRAINBASE_TOKEN` in CI to select a PAT explicitly. Eval reads need no scope; `agent push` (which writes `PUT .../manifest`) needs a PAT with `publish`, and an agent task key (`bb_live_…`) is refused on every `/v2/cli` write with `CLI task keys cannot manage cloud configuration`. Scope semantics in depth belong to the `brainbase-permissions` skill.

## 10. CI patterns

```bash
# Refuse to deploy when a push would archive evals or is blocked on an unpulled cloud eval
brainbase agent status --json | jq -e '.evals.pushBlocked == false and (.evals.archive | length) == 0'

# Push non-interactively (no archive prompt), then dump the latest verdicts
brainbase agent push --yes
brainbase agent eval runs --limit 200 --json

# Count judge failures (no verdict) separately from failing verdicts
brainbase agent eval runs --limit 200 --json | jq '[.[] | select(.error != null)] | length'
```

The docs do not print the exact top-level shape of `agent eval runs --json` (whether it is a bare array or wrapped); inspect one real response before writing a parser.
