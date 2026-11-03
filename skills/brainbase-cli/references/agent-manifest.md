Source: https://docs.brainbaselabs.com/cli/reference/agent-manifest; https://docs.brainbaselabs.com/cli/quickstart; https://docs.brainbaselabs.com/docs/agent/memory (capabilities.memory); https://docs.brainbaselabs.com/docs/agent/surfaces (surfaces are not in the manifest)
Snapshot: 2026-11-03

# `brainbase.agent.yaml` field by field

## Contents

- Creating the file
- Full example
- Top-level fields
- `instructions`
- `entrypoint`
- `playbooks`
- `skills`
- `mcp`
- `evals`
- `capabilities`
- Reserved fields (`commands`, `hooks`, `files`)
- What is not in the manifest

`brainbase.agent.yaml` is the committed, declarative source of truth for an agent: edit by hand, then `brainbase agent push`. Cached cloud metadata (slug, URL, org/team, tracking) lives in gitignored `.brainbase/state.json`, never here. The legacy filename `brainbase.yaml` is still read, but writes always go to `brainbase.agent.yaml`. Never put API keys, tokens or other secret values in it, including under MCP `env` or `headers`: secrets belong in gitignored `.brainbase/secrets.env` (written by `agent pull`, synced by `agent push`), and MCP config may reference them with placeholders such as `${GITHUB_TOKEN}`.

## Creating the file

| Command | Use it when |
| --- | --- |
| `agent init` | Starting a new agent. Writes an unclaimed manifest and stops: no login, no network. `--full` writes a commented template covering every block. |
| `agent create` | You want the file and the cloud agent in one step. Scaffolds a manifest if the folder has none, then claims it. |
| `agent pull <id>` | The agent already exists in the cloud. Writes a manifest for it into an empty folder. |

Only `schema` and `agent.name` are required; every other field is optional. The starter file:

```yaml
schema: 1
harness: claude-code
agent:
  name: hello-world
  tagline: A starter agent.
instructions:
  text: You are a helpful Claude Code agent.
```

## Full example

```yaml
schema: 1
id: 5ad59580-8028-4c52-9a31-574607a2aacb  # present once claimed
harness: claude-code
machine_kind: daytona       # selected when the agent is created
default_model: gpt-5.6-terra
agent:
  name: Repo Assistant
  tagline: Reviews PRs and keeps the changelog tidy
instructions:
  file: ./.brainbase/instructions.md
entrypoint:
  commands:
    - npm install
    - npm run build
playbooks:
  - title: Release checklist
    description: Steps to cut a release
    content:
      file: ./playbooks/release.md
capabilities:
  memory: true
  browser: true
  slack: false
  meeting: false
skills:
  - source: registry:brainbase/changelog@1.0.0
  - source: ./skills/local-linter
mcp:
  - name: github
    url: https://api.githubcopilot.com/mcp/
    is_enabled: true
evals:
  - slug: cites-the-diff
    criteria: Pass when the review quotes the lines it is commenting on.
```

## Top-level fields

| Field | Type | Notes |
| --- | --- | --- |
| `schema` | integer, required | Must be `1`. |
| `id` | UUID, optional | Cloud agent id. Absent on an unclaimed manifest; `agent create` writes it. Its presence is what makes the manifest claimed. |
| `harness` | string, optional | `claude-code`, `codex`, `kafka`, `qwen-code`, `opencode`, `openclaw`, `cursor`, `factory`, `qoder`, `pi`. `agent pull` rewrites it to match the cloud. |
| `machine_kind` | string, optional | Sandbox provider selected when `agent create` claims the manifest; omit to let the platform choose. Immutable afterwards: a change is reported as drift and rejected before cloud writes. Create a new agent to use another provider. Providers: `brainbase-sandboxes`. |
| `default_model` | string or null, optional | Agent-level model override managed by the manifest. Omit to leave the cloud value unmanaged; set an id to update; `null` to clear. An agent created without it starts on the platform default for its harness; Cursor, Factory and Qoder agents start with none. Ids: letters, digits, `.`, `_`, `-`, `:`, `/`, up to 128 characters. Model ids: `brainbase-llm-gateway`. |
| `agent` | object, required | Metadata. |
| `agent.name` | string, required | Display name, non-empty. |
| `agent.tagline` | string, optional | One-line description. |

## `instructions`

Standing instructions. Set exactly one of `file` (path relative to the manifest, markdown) or `text` (inline); push rejects both or neither.

## `entrypoint`

Bash that runs inside the sandbox after secrets are loaded and `agent pull` completes, before the in-VM runner launches. Exactly one of:

| Field | Behaviour |
| --- | --- |
| `entrypoint.file` | Path to a local script, used verbatim. |
| `entrypoint.commands` | List of shell commands, joined with newlines and prefixed with `set -euo pipefail`, so a failing command fails the boot. |
| `entrypoint.text` | Inline script body, used as-is (no fail-fast preamble). |

## `playbooks`

A list; defaults to empty. Each ships as one markdown file with `title` / `description` assembled into YAML frontmatter at push time. The list is authoritative: a playbook removed from the manifest is archived in the cloud on push.

| Field | Notes |
| --- | --- |
| `playbooks[].id` | Cloud id, optional. Round-tripped by pull/push so an existing playbook is updated, not recreated. |
| `playbooks[].title` | Required, non-empty. |
| `playbooks[].description` | Optional; included in the playbook table. |
| `playbooks[].icon` | Optional cloud icon, round-tripped. |
| `playbooks[].content` | Required; exactly one of `file` or `text`. |

## `skills`

A list of `{ source: <string> }` resolved at `agent pull` time; defaults to empty.

| Form | Meaning |
| --- | --- |
| `registry:creator/slug` | Latest version from the registry (re-resolved on each push). |
| `registry:creator/slug@1.4.0` | A pinned exact `MAJOR.MINOR.PATCH`. |
| `registry:slug` | Legacy / unscoped. |
| `./relative/path` | A local skill directory. |

Version ranges (`@^2.0`) are not supported: every command that reads the manifest (`agent push`, `agent pull`, `agent create`, `agent unpack`, `sync`) rejects them and exits non-zero. Omit the version to track latest. The standalone `brainbase skill add` grammar is different (`references/commands-registry.md`).

## `mcp`

A list; defaults to empty. Either `url` (remote) or `command` (stdio) must be set; push validates.

| Field | Notes |
| --- | --- |
| `mcp[].name` | Required, non-empty. |
| `mcp[].url` | Remote endpoint URL. |
| `mcp[].command` | Command to launch a stdio server. |
| `mcp[].args` | Arguments for `command`. |
| `mcp[].env` | String map for a stdio server. No secret values; use `${NAME}` placeholders. |
| `mcp[].headers` | String map for a remote server. Same rule. |
| `mcp[].is_enabled` | Whether the server is active. |
| `mcp[].runtime_meta` | Do not edit. State the control plane records (today: a server it switched off for the length of a native Linear task). Pull writes it, push sends it back unchanged. Removing it makes a pushed `is_enabled` apply as written; adding it to an untouched server stops `is_enabled` being taken from the manifest. |

Servers inherited from an orchestration are delivered only to sandboxes and never appear here; push leaves them unchanged. Declaring an OAuth-backed server configures it but does not authorize it: use `brainbase mcp connect`.

## `evals`

A list of natural-language criteria a judge scores each finished turn against; defaults to empty. Declarative: edit and push. Verdicts are read with `brainbase agent eval runs`, never written here. Model-judged evals spend credits (`brainbase-evals`).

| Field | Notes |
| --- | --- |
| `evals[].slug` | Required. Kebab-case (`a-z`, `0-9`, hyphens), unique in the agent. Renaming a slug on an entry with an `id` renames that cloud eval; without an `id` it creates a new one and archives the old. |
| `evals[].id` | Cloud id, round-tripped. Do not write by hand. |
| `evals[].criteria` | Required, 1–4000 characters, inline only. |
| `evals[].icon` | Lucide icon name, e.g. `CircleCheck`, max 64 characters. |
| `evals[].enabled` | Default `true`. `false` keeps the definition and past verdicts, stops new ones. |
| `evals[].judge_model` | Default `claude-sonnet-4-6`. Ignored when `judge_type` is `agent`. |
| `evals[].judge_type` | `model` (default) or `agent`. |
| `evals[].judge_agent` | Agent id, or a name that slugifies to one. Required when `judge_type: agent`, rejected otherwise. Must share a project with this agent (or, for personal agents, be one you own) and cannot be the agent being judged. A name is resolved on the first push and rewritten in place as the id; commit the rewritten file. |
| `evals[].output_shape` | `binary` (default), `rating` (1–5), or `classification`. |
| `evals[].classification_values` | Required, non-empty, no duplicates when `output_shape: classification`; rejected otherwise. |

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

Rules: the list is authoritative and omissions archive (archived is not deleted; re-adding the same slug restores history). Push names what it will archive and asks when interactive. Push refuses to archive an eval this checkout never pulled, or one edited in the cloud since the last pull, unless `agent push --force`. A manifest with no `evals` block, or `evals: []`, asserts nothing and leaves cloud evals untouched, even under `--force`; deleting your last eval still works because it is a change against the last-synced state.

## `capabilities`

Which built-in MCP servers `unpack` lays into the harness. Omit to accept defaults. Only `memory` and `browser` are settable; the four connection flags report state and are changed with `agent connect` / `disconnect`.

| Field | Kind | Default | Changed by |
| --- | --- | --- | --- |
| `capabilities.memory` | Setting, writable | on (only explicit `false` turns it off) | Edit here, then `agent push`. `false` removes the memory tools (`brainbase-memory`). |
| `capabilities.browser` | Setting, writable | on | Edit here, then `agent push`. |
| `capabilities.slack` | Reported, read-only | off | `brainbase agent connect slack`. |
| `capabilities.meeting` | Reported, read-only | off | `brainbase agent connect meeting`. |
| `capabilities.github` | Reported, read-only | off | `brainbase agent connect github`. |
| `capabilities.linear` | Reported, read-only | off | `brainbase agent connect linear`. While on, `unpack` installs the built-in Linear MCP server. |

`agent pull` refreshes the reported flags; `agent push` refuses if what is on disk disagrees with the live connection (pull first). They stay in the file because `unpack` runs offline in a sandbox.

## Reserved fields (`commands`, `hooks`, `files`)

These parse but are not synced: nothing in the CLI transmits them and no harness installs them. A non-empty block makes `agent push` and `agent create` refuse, name the block, and exit non-zero without contacting the control plane; an empty block (`hooks: []`) is a no-op. `agent status` reports declared blocks as `ignored` (human report, and the `ignored` key in `--json`). Older CLI builds dropped these blocks silently while exiting 0; if yours does, upgrade and run `agent status`. Whether they become features is open; treat them as unsupported.

## What is not in the manifest

- Schedules: agent manifests do not accept schedule triggers. A scheduled single agent is an orchestration with one member and a schedule trigger (`references/orchestration-manifest.md`).
- Surface settings: configure in the console or with `brainbase agent surface`; not read from the manifest.
- Memory tables: created in the Memory editor or by the agent's `memory_*` tools, not declared here.
- Secret values, cloud metadata (slug, URL, org/team, tracking), orchestration-inherited secrets and MCP servers.
