Source: BrainbaseHQ/brainbase-mcp 0.1.2, skills/brainbase-mcp/reference.md and skills/brainbase-mcp/SKILL.md
Source: https://docs.brainbaselabs.com/docs/mcp
Snapshot: 2026-11-10

# What the Brainbase MCP reaches, skill by skill

Each `brainbase-*` skill states its own coverage in one line. This file is the full matrix behind those lines. Tool names are defined in `tool-inventory.md`; the connected tool list wins over both files.

## The states

| State | Meaning | What the agent does |
| --- | --- | --- |
| Tools | The MCP has tools for the skill's main operations. | Use them, following `safety-contract.md`. Named gaps fall back as below. |
| Fields only | The MCP has no tool for the area, but an agent field or a discovery tool touches it. | Set the field or read the list; everything else falls back. |
| None | No Brainbase MCP tool exists for the area. | Fall back. Do not look for or invent a tool. |
| Mapping | Used for `brainbase-cli` only. The CLI is the other way to operate Brainbase, not an area of it, so its commands are mapped to tools instead of given a state. | Read `cli-to-mcp-map.md`. |

## The fallback

Pick by what the session has:

1. A shell with the `brainbase` CLI signed in, or an API key already in the environment: use the CLI or API path the skill gives.
2. A shell without credentials: the CLI needs `brainbase login` or a PAT, which only the human can supply. Ask them to sign in; never ask for the token value.
3. No shell (ChatGPT, Claude chat, a locked-down client): give the human the console steps from the skill, with the docs link. Do the part the MCP can do first.

## Matrix

| Skill | State | MCP tools | Not reachable through the MCP |
| --- | --- | --- | --- |
| `brainbase-platform` | Tools | `agents_*`, `instructions_update`, `tasks_*`, `orgs_list`, `teams_list`, `templates_search`, `templates_get`, `playbooks_*`; version tools when connected | Threads and inline agent specs (`POST /v2/threads`), task update, delete and model switch, modes, secrets |
| `brainbase-orchestration` | Tools | `orchestrations_*`, `orchestration_members_*`, `orchestration_edges_*`, `schedules_*` | App-event and webhook triggers, orchestration secrets, orchestration MCP servers, shared memory, workflows |
| `brainbase-evals` | Tools | `evals_list`, `evals_get`, `evals_create`, `evals_update`, `evals_delete`, `evals_run`, `evals_results` | Benchmarks; eval runs across many tasks are read per agent or task |
| `brainbase-skills` | Tools | `skills_search`, `skills_get`, `skills_attach`, `skills_detach` | Publishing, local skill upload, installing into a local harness |
| `brainbase-tools` | Tools | `mcp_servers_list`, `mcp_servers_upsert`, `mcp_servers_remove` | Integrations and their Allow/Ask/Deny rules, authorizing a server's OAuth, credential headers and env values, functions, browser proxies |
| `brainbase-permissions` | Fields only | `orgs_list`, `teams_list` | Members, roles, tokens, secrets, spend limits, integration rules, team rename and delete |
| `brainbase-llm-gateway` | Fields only | `default_model` on `agents_create` and `agents_update` | Listing models, switching a running task's model, Bring Your Own Bedrock, vendor keys |
| `brainbase-sandboxes` | Fields only | `machine_kind` on `agents_create`; `entrypoint` and `shared_folder_enabled` on `agents_update` | Listing or removing machines, machine size, file transfer, shared files, preview URLs |
| `brainbase-surfaces` | None | | Connecting or configuring Slack, Linear, GitHub, phone, meetings |
| `brainbase-interfaces` | None | | Creating, building, previewing, publishing, audiences, rollback |
| `brainbase-benchmarks` | None | | Suites, runs, baselines, imports and exports |
| `brainbase-memory` | None | | Memory tables and rows; `playbooks_*` covers the neighbouring playbook layer only |
| `brainbase-payments` | None | | Wallet, credits, top-ups, spend limits, purchase requests. The orchestration credit limit is a scalar on `orchestrations_update`. |
| `brainbase-cli` | Mapping | See `cli-to-mcp-map.md` | Login, tokens, manifests, link and sync, template packing and publishing, machines, interfaces, members |

## Credits

MCP calls that start work spend credits the same way the CLI and API do: `tasks_create` with `auto_run`, `tasks_followup` with `run`, `evals_run` and `schedules_test`. Say so and get the user's go-ahead first. Credit mechanics are in `brainbase-payments`.
