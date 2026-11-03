# Skills in the agent manifest, the sync commands and the API

Source: https://docs.brainbaselabs.com/cli/reference/agent-manifest, https://docs.brainbaselabs.com/cli/commands/agent, https://docs.brainbaselabs.com/cli/concepts/syncing, https://docs.brainbaselabs.com/cli/reference/control-plane-api, https://docs.brainbaselabs.com/cli/quickstart, https://docs.brainbaselabs.com/api, https://docs.brainbaselabs.com/api/agents/create-agent, https://docs.brainbaselabs.com/api/agents/update-agent, https://docs.brainbaselabs.com/api/agents/get-agent, https://docs.brainbaselabs.com/api/threads/create-thread, https://docs.brainbaselabs.com/api/templates/create-template, https://docs.brainbaselabs.com/docs/agent/versions, https://docs.brainbaselabs.com/cli/commands/task, https://docs.brainbaselabs.com/cli/concepts/templates, https://docs.brainbaselabs.com/cli/commands/template, https://app.brainbaselabs.com/changelog
Snapshot: 2026-11-03

Contents: the manifest `skills` list · where it sits in the manifest · how `pull`, `push`, `create`, `unpack` and `sync` treat skills · the control-plane manifest and revision · the `skills` field on the agents API · threads and templates APIs · versions, pins and `task create --version` · templates as the related packaging unit.

## The manifest `skills` list

`brainbase.agent.yaml` is the committed, declarative source of truth for an agent; edit it and run `brainbase agent push`. The `skills` block:

> A list of skill sources, resolved at `agent pull` time. Defaults to an empty list. Each entry is `{ source: <string> }`.

| Field | Type | Meaning |
| --- | --- | --- |
| `skills` | list, optional | Skill sources. Defaults to `[]`. |
| `skills[].source` | string, required per entry | One of the four forms below. The only key the docs define on an entry. |

| `source` form | Meaning |
| --- | --- |
| `registry:creator/slug` | Latest version from the registry. |
| `registry:creator/slug@1.4.0` | A pinned version (exact `MAJOR.MINOR.PATCH`). |
| `registry:slug` | Legacy / unscoped (no creator namespace). |
| `./relative/path` | A local skill directory (relative to the manifest). |

Version ranges are not supported. `@^2.0` resolves to nothing; validation happens when the manifest is read, so every command that reads it (`agent push`, `agent pull`, `agent create`, `agent unpack`, `sync`) rejects the range with an error telling you to pin an exact version, and exits non-zero. Omit the version to track the latest.

Unlike `playbooks[]` and `evals[]`, skill entries carry no cloud `id` and no `title`; identity is the source string. The manifest page gives skills no archive-on-omission callout of their own (it states that rule for evals and "the same rule applies to `playbooks`"); the behaviour for skills follows from the control-plane manifest endpoint described below.

### Where it sits

```yaml
schema: 1
id: 5ad59580-8028-4c52-9a31-574607a2aacb  # present once claimed
harness: claude-code
machine_kind: daytona
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

Only `schema` and `agent.name` are required. `brainbase agent init --full` writes a commented template covering every block. The CLI quickstart uses `registry:brainbase/changelog@1.0.0` as its example skill. Keep secrets out of the manifest; a skill folder you commit beside it should contain none either.

Reserved blocks `commands`, `hooks` and `files` parse but are not synced; a non-empty one makes `agent push` and `agent create` refuse and exit non-zero. Files a skill needs belong inside the skill folder.

## How the sync commands treat skills

| Command | Skills behaviour |
| --- | --- |
| `brainbase agent init` | Writes a starter manifest (no `skills` block) offline; `--full` includes a commented one. |
| `brainbase agent create` | Scaffolds a manifest if none, then claims it in the cloud; reads the manifest, so a version range is rejected before any cloud write. Partial outcome `CREATED (NO CONTENT)` means the agent exists but local content did not upload; the retry is `agent push`. |
| `brainbase agent pull [<id>]` | Resolves the `skills` list and lays each skill into the harness path for the cloud agent's harness (`--harness` is ignored on pull) at `--scope global|project`. Refuses to overwrite locally edited runtime config unless `--force`. `--link` links first; `--run-entrypoint` runs the entrypoint afterwards. Inside a sandbox this is the step that installs the agent's declared skills before the entrypoint and the in-VM runner start. |
| `brainbase agent push` | Sends instructions, entrypoint, playbooks, **skills**, MCP servers, evals and `default_model` via `PUT /v2/cli/agents/{agent_id}/manifest` (scope `publish`). An unpinned registry skill resolves to the latest published version on each push (changelog, 2026-06-12). `--force` keeps the local side of content conflicts. Refused from inside a pinned task. |
| `brainbase agent unpack` | Installs the claimed agent into a harness layout (`--harness`, `--scope`) offline inside a sandbox; reads the manifest, so it validates skill versions too. |
| `brainbase sync` | Reconciles the folder with the cloud using per-component hashes in `.brainbase/sync-state.json`: pulls down skills and instructions a teammate updated while preserving local edits. `--harness` and `--scope` force a target. Exits `0` with nothing to do. |
| `brainbase agent status` | Shows local-versus-cloud drift per component, including skill entries, before you push. `--json` available; exits `1` if the control plane is unreachable. |
| `brainbase agent versions diff <v> [<v>]` | Lists skills entry by entry alongside playbooks and MCP servers. |

`agent versions restore` rolls the cloud back and leaves the folder alone; run `agent pull` before editing or pushing again.

## The control-plane manifest and revision

`GET /v2/cli/agents/{agent_id}/manifest` returns the agent's whole content as a list of components (instructions, skills, MCP servers, playbooks, evals), each with its files and a content hash, plus the current `revision`; it may also return `warnings` for content the server could not represent.

`PUT /v2/cli/agents/{agent_id}/manifest` is a **whole-manifest replacement**, reconciled per component type: components present are created or updated, and components absent are unlinked or archived. Pass `base_revision` so the server refuses with a conflict when the cloud has moved. Archive-on-absence is opt-in per request only for playbooks (`reconcile_playbooks`) and evals (`reconcile_evals`); the docs name no such flag for skills, so read a skill entry's absence as unlinking it. Requires `publish`.

`GET /v2/cli/agents/{agent_id}/revision` returns `{"revision": <n>}`, a hash over instructions, skills, MCP servers, active playbooks, active evals and secret key names. Adding or removing a skill moves it. It does not cover integrations.

## The `skills` field on the agents API

Base URL `https://api.brainbaselabs.com`, `Authorization: Bearer <API key>`.

| Endpoint | `skills` |
| --- | --- |
| `POST /v2/agents` | `skills` array<object>, optional. "Skill declarations. Omit or null for none." Each `{ "source": "string" }`. `template_slug` (`creator/slug`) instantiates from an agent template, which supplies instructions, runtime, model, `mcp_servers` and `skills`; fields set explicitly on the body override the template. |
| `PATCH /v2/agents/{agent_id}` | `skills` array<object>, optional. Fields you omit are left unchanged. `expected_revision` (from `GET /v2/cli/agents/{agent_id}/revision`) makes the update conditional: `409` with `detail.code=revision_conflict` and `detail.expected` / `detail.current` when the agent moved. A `409` with a string detail means `mcp_servers` omitted a server with a connected OAuth session. |
| `GET /v2/agents/{agent_id}`, `GET /v2/agents` | Response carries `skills: [{ "source": "string" }]`. The 2026-08-06 changelog fixed both failing when a skill came from a GitHub source. |

The API overview's inline-agent example and field description:

```json
"agent": {
  "harness": "claude_code",
  "instructions": "You are a research assistant.",
  "model": "claude-opus-4-8",
  "mcp_servers": [{ "name": "search", "url": "https://mcp.example.com/sse" }],
  "skills": [{ "source": "registry:brainbase/deep-research" }],
  "secrets": { "TAVILY_API_KEY": "tvly-..." },
  "entrypoint": "pip install -r requirements.txt"
}
```

> `skills` array, optional. Skill declarations from the Brainbase registry, as `registry:creator/slug` with an optional `@version` pin.

Create example:

```bash
curl --request POST --url https://api.brainbaselabs.com/v2/agents \
  --header "Authorization: Bearer $BRAINBASE_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "title": "Research assistant",
    "runtime_kind": "claude_code",
    "skills": [{ "source": "registry:brainbase/deep-research@1.0.0" }]
  }'
```

Harness ids on the API are `runtime_kind` values (`claude_code`, `codex`, `cursor`, `factory`, `kafka_cloud`, `opencode`, `qoder`, `qwen`), underscored, unlike the CLI's hyphenated `claude-code`. The response also carries `template_warnings` (strings) when a template could not be applied fully; the docs do not say whether skill problems surface there.

Whether the API accepts GitHub or local sources is undocumented; see `references/registry-and-sources.md`.

### Threads and templates

- `POST /v2/threads` accepts an inline `agent` object with `agent.skills` array<object> (same `{ source }` shape) for a thread that runs without a saved agent.
- `POST /v2/agents/templates` (`team_id`, `creator`, `slug`, `name` required) and `PATCH` on a template take `skills` array<object> with `{ "source": "string" }`, plus `mcp_servers` and `secrets` (placeholders only). An agent created with `template_slug` inherits the template's skills.

## Versions, pins and `task create --version`

A version is a snapshot of the agent's definition: instructions, entrypoint, installed skills, tools, playbooks, harness and default model, captured automatically a few seconds after an edit settles. Pinning (Versions page, or `brainbase agent versions pin <version>`) makes new tasks run that version until unpinned.

| Frozen by the pin | Always current |
| --- | --- |
| Installed skills (which ones are installed) | Skill file contents, which follow the current skill version |

Limits the docs state: a task's version is fixed when it is created; skill file contents are not frozen, so a pinned task installs the skills the version lists at their current contents; pushing configuration from inside a pinned task with the CLI is refused. `brainbase task create --version <v>` (and `agent_version_id` on `POST /v2/tasks`) freezes the same set for one task, with the same carve-out for skill contents. `agent versions pin` and `unpin` ask first and need `--yes` with no terminal or `--json`.

To freeze a skill's contents as well, pin its registry version in the source string (`registry:creator/slug@1.4.0`) and push; the pinned agent version then lists that exact skill version.

## Templates: the related packaging unit

A template is a versioned, installable bundle of agent components (skills, MCP servers, commands, sub-agents, playbooks, instructions, arbitrary files) addressed `creator/slug`. `brainbase template pack` captures the current agent; `template publish --visibility <public|unlisted|private>` uploads it; `template onboard creator/slug [--harness <id>] [--scope <s>] [--yes]` installs or refreshes it elsewhere; `template list [--all]` and `template remove` track installs through `~/.brainbase/installed.json`. Use the manifest to manage one live agent in sync with the cloud, and templates to package a reusable starting point others install into their own folders. Two skill-specific points: `template pack` reads each skill's `.brainbase.json` to decide whether to reference the skill or inline it, and `template publish` exits `1` with `PUBLISHED (PARTIAL)` when a bundled skill does not reach the registry and stays inline. Everything else about templates is in `brainbase-cli`.
