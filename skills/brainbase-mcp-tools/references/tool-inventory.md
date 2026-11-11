Source: BrainbaseHQ/brainbase-mcp 0.1.2, skills/brainbase-mcp/reference.md and skills/brainbase-mcp/SKILL.md
Source: https://docs.brainbaselabs.com/docs/mcp
Source: changelog 2026-07-22 "Brainbase MCP: Manage Your Agents from Claude Code and Codex"; 2026-08-06 "Developer Updates"
Snapshot: 2026-11-10

# Brainbase MCP tool inventory

## Contents

- How to read this file
- Where the sources disagree
- Discovery
- Agents and settings
- Agent versions
- Registry packages and components
- Evals
- Orchestrations and schedules
- Tasks
- What has no tool

## How to read this file

Tool names below come from the official package's stable tool inventory unless a row says otherwise. The tool list your client has connected is the authority: if a name here is missing there, do not call it, and if a tool exists there that is not here, read its schema and use it. MCP clients often prefix names (`mcp__brainbase__agents_list`); match on the final segment.

Three markers describe what a tool needs:

- **rev**: pass `expected_revision` from a read made immediately before the call.
- **key**: pass a caller-generated `idempotency_key` of 8 to 200 characters.
- **confirm**: needs the user's explicit confirmation and an exact-name field. **bill** means the call can start work that spends credits.

## Where the sources disagree

| Topic | Docs | Package 0.1.2 | What to do |
| --- | --- | --- | --- |
| Tool count | The MCP page gives a count that is higher than the package's list. | Lists the tools in this file, minus the agent-version family. | Do not quote a count. Use the connected tool list. |
| Agent versions | Names `agent_versions_list`, `agent_versions_get`, `agent_versions_label`, `agent_versions_restore`, `agent_versions_pin`, `agent_versions_unpin`. | Does not list them, and tells the client to use only its listed families. | Call a version tool only when it is in the connected tool list. Otherwise use `brainbase agent versions …` or the console. |
| Publish reach | The changelog says MCP sign-in keeps publishing and administrative actions out of reach; the orchestration secrets page counts an OAuth-connected MCP client among credentials that can publish. | Silent. | Check the live pages before promising either. |

The live server's tool list was not read when this file was written.

## Discovery

| Tool | Does | Needs |
| --- | --- | --- |
| `orgs_list` | Lists the organizations the signed-in user can see. | |
| `teams_list` | Lists teams (groups) in an organization. Gives the `group_id` that creates need. | |

## Agents and settings

| Tool | Does | Needs |
| --- | --- | --- |
| `agents_list` | Lists agents in a team. | |
| `agents_get` | Reads one agent with its components and `revision`. | |
| `agents_get_revision` | Returns only the current `revision`; a cheap re-read before a write. | |
| `agents_create` | Creates an agent from `title`, `group_id` and `instructions`, or from `registry_template_ref`. Optional `runtime_kind`, `machine_kind`, `default_model`. | key |
| `agents_update` | Changes supplied fields only: title, instructions, `runtime_kind`, `default_model`, `shared_folder_enabled`, `entrypoint`. | rev |
| `instructions_update` | Changes instructions only. | rev |
| `agents_delete` | Deletes the agent. Send `confirm_name` equal to the agent's exact name. | rev, confirm |

When `runtime_kind` is omitted the server applies `kafka_cloud`, unless a template supplies another value. A runtime change applies to future tasks; existing tasks keep the runtime they were created with.

## Agent versions

Docs only; see "Where the sources disagree".

| Tool | Does | Needs |
| --- | --- | --- |
| `agent_versions_list`, `agent_versions_get` | Read versions. | |
| `agent_versions_label` | Names a version. | |
| `agent_versions_restore` | Restores a version. Run with `dry_run` first. Send `confirm_version_number` equal to the target version's number. | confirm |
| `agent_versions_pin`, `agent_versions_unpin` | Freeze or release the version new tasks run. Send `confirm_version_number`. | confirm |

## Registry packages and components

| Tool | Does | Needs |
| --- | --- | --- |
| `templates_search`, `templates_get` | Find and inspect a registry template before `agents_create` with `registry_template_ref`. Report any `template_warnings` returned. | |
| `skills_search`, `skills_get` | Find and inspect a registry skill by `creator` and `slug`. | |
| `skills_attach` | Attaches that exact package to an agent; `version` is optional. | rev |
| `skills_detach` | Detaches the exact attached package. | rev |
| `mcp_servers_list` | Lists an agent's own MCP servers. Returns safe fields plus `has_headers` and `has_env`; never credential values. | |
| `mcp_servers_upsert` | Adds or changes one server by `name` (`url`, `is_enabled`). Hidden stored credentials are preserved. Do not send headers, env values or tokens. | rev |
| `mcp_servers_remove` | Removes one server by `name`. | rev |
| `playbooks_list` | Returns the agent's active playbooks and `revision`. | |
| `playbooks_upsert` | Creates a playbook (`title`, `description`, `body`) or updates one when `playbook_id` is sent. | rev, key |
| `playbooks_archive` | Archives one playbook. Send `confirm_name` equal to its exact title. | rev, confirm |

## Evals

| Tool | Does | Needs |
| --- | --- | --- |
| `evals_list`, `evals_get` | Read an agent's evals. Use `evals_get` immediately before an update or delete. | |
| `evals_create` | Creates one eval (`slug`, `criteria`, `judge_type`, `output_shape`, `enabled`). | key |
| `evals_update` | Changes supplied fields only. | rev |
| `evals_delete` | Deletes one eval. Send `confirm_name` equal to its exact slug. | rev, confirm |
| `evals_run` | Runs one eval against a `prompt`. The eval must have `enabled: true`. Returns a task. | key, bill |
| `evals_results` | Reads verdicts for an agent, optionally filtered by `task_id`. | |

## Orchestrations and schedules

| Tool | Does | Needs |
| --- | --- | --- |
| `orchestrations_list`, `orchestrations_get` | Read orchestrations; `orchestrations_get` returns members, edges, schedules and `revision`. | |
| `orchestrations_create` | Creates one in a team (`group_id`, `name`, `description`, `members`). | key |
| `orchestrations_update` | Changes scalar fields: name, description, icon, credit limit, metadata. | rev |
| `orchestrations_delete` | Deletes the orchestration. Send the exact name. | rev, confirm |
| `orchestration_members_add`, `orchestration_members_remove` | Add or remove one member agent. Run with `dry_run: true` first. | rev |
| `orchestration_edges_upsert`, `orchestration_edges_remove` | Add, change or remove one handoff edge (`from_agent_id`, `to_agent_id`, `description`, `payload_schema`, `settings`). Run with `dry_run: true` first. | rev |
| `schedules_upsert` | Adds or changes one schedule trigger by `node_id` (`cron_expression`, `is_active`, `configured_props`, `edges`). | rev |
| `schedules_remove` | Removes one schedule by `node_id`. | rev |
| `schedules_test` | Fires one schedule now. `trigger_id` is the schedule's persisted `id` read back from `orchestrations_get`, not its `node_id`. | rev, bill |

Only schedule triggers have tools. App-event and webhook triggers are set up in the console.

## Tasks

| Tool | Does | Needs |
| --- | --- | --- |
| `tasks_create` | Creates a task on an agent from `initial_messages`. `auto_run: true` starts the run; tasks created through the MCP run automatically by default. | key, bill |
| `tasks_list`, `tasks_get` | Read tasks and status. | |
| `tasks_followup` | Sends the next user turn. `run: true` starts another turn. | bill |
| `tasks_interrupt` | Stops an active task. | |
| `tasks_events` | Reads normalized task events. | |

## What has no tool

The package states these boundaries. Do not invent a tool for any of them.

| Boundary | Covers | Route |
| --- | --- | --- |
| Guided | Secrets and OAuth credential entry, third-party integration consent, browser proxy credentials, memory data administration, Slack, meeting, phone and app-trigger setup | The Brainbase console, with the matching docs page |
| Deferred | Modes, functions, arbitrary file reads and writes, team rename and delete | Console, CLI or API |
| Excluded | Brainbase workflows | Not available through the MCP |
| CLI or registry only | Publishing a skill, uploading a local skill | `brainbase skill publish` |

Nothing in either source names a tool for interfaces, benchmarks, machines, payments or credits, model listing, threads, members, roles or tokens. `coverage-by-primitive.md` maps each skill to what the MCP reaches.
