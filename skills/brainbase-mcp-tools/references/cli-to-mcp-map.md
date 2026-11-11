Source: BrainbaseHQ/brainbase-mcp 0.1.2, skills/brainbase-mcp/reference.md and skills/brainbase-mcp/SKILL.md
Source: https://docs.brainbaselabs.com/cli/commands; https://docs.brainbaselabs.com/cli/commands/agent; https://docs.brainbaselabs.com/docs/mcp
Snapshot: 2026-11-10

# CLI commands and their Brainbase MCP tools

## Contents

- Choosing between the CLI and the MCP
- Command map
- Commands with no MCP tool

## Choosing between the CLI and the MCP

The two write differently. The CLI works from a folder: `brainbase agent push` sends the manifest, and its playbooks and evals lists are authoritative, so an entry missing from the manifest is archived in the cloud. The MCP makes one targeted change at a time, guarded by a revision, and never replaces a whole manifest.

When a session has both:

- Use the path that is already authenticated and that the user is working in. A linked folder with a manifest means the CLI; a chat with no checkout means the MCP.
- Do not mix paths on one resource in one piece of work.
- CI and other unattended runs use the CLI with a PAT. The MCP's OAuth needs a person.
- After MCP writes to an agent that also has a linked folder, run `brainbase agent pull` in that folder before the next push. A push from a stale folder gets a `409` base-revision conflict, and where it does go through, playbooks or evals the folder never pulled can be archived or the push refused. Do not use `--force` to get past it.

## Command map

| CLI | MCP tools | Difference to know |
| --- | --- | --- |
| `team list` | `orgs_list`, `teams_list` | |
| `agent list` | `agents_list` | |
| `agent create` | `agents_create` | The MCP needs `group_id` and an idempotency key, takes instructions inline, and defaults to `kafka_cloud`. No manifest is written. |
| `agent pull`, `agent status` | `agents_get`, `agents_get_revision` | The MCP reads; it writes no local files. |
| `agent push` | `agents_update`, `instructions_update`, `playbooks_upsert`, `playbooks_archive`, `skills_attach`, `skills_detach`, `mcp_servers_upsert`, `mcp_servers_remove`, `evals_create`, `evals_update` | One targeted call per change instead of one push. Secrets do not travel through the MCP. |
| `agent delete` | `agents_delete` | Needs the exact name in `confirm_name`. |
| `agent versions list`, `show`, `label`, `restore`, `pin`, `unpin` | `agent_versions_*` | Docs-only tools; use them when connected. No tool for `diff`. |
| `agent eval list` | `evals_list`, `evals_get` | |
| `agent eval runs` | `evals_results` | |
| (none) | `evals_run` | Running one eval on demand is MCP only. The CLI gets verdicts from ordinary tasks. |
| `skill search`, `skill info` | `skills_search`, `skills_get` | Registry only. |
| `skill add` with a registry ref, `skill remove` | `skills_attach`, `skills_detach` | The MCP attaches to the cloud agent; it does not install into a local harness. |
| `template search`, `template info` | `templates_search`, `templates_get` | |
| `template onboard` | `agents_create` with `registry_template_ref` | Creates a cloud agent; installs nothing locally. |
| `mcp list` | `mcp_servers_list` | The MCP lists the agent's own servers. |
| manifest `mcp` block plus `agent push` | `mcp_servers_upsert`, `mcp_servers_remove` | No credential headers or env values through the MCP. |
| `orchestration list`, `status`, `pull` | `orchestrations_list`, `orchestrations_get` | |
| `orchestration create` | `orchestrations_create` | |
| `orchestration push` | `orchestrations_update`, `orchestration_members_*`, `orchestration_edges_*`, `schedules_upsert`, `schedules_remove` | Targeted graph changes with dry runs. |
| `orchestration add-agent` | `orchestration_members_add`, `orchestration_edges_upsert` | |
| `orchestration delete` | `orchestrations_delete` | |
| (none) | `schedules_test` | Firing a schedule on demand is MCP only. |
| `task create` | `tasks_create` | No `--wait`; poll `tasks_get`. No `--model`, `--version` or `--interface` equivalent is named in the sources. |
| `task list`, `task get` | `tasks_list`, `tasks_get` | |
| `task logs` | `tasks_events` | Normalized events, read on request rather than followed. |
| `task send` | `tasks_followup` | |
| `task stop` | `tasks_interrupt` | |

## Commands with no MCP tool

`login`, `logout`, `whoami`, `token …`, `member …`, `link`, `unlink`, `sync`, `agent init`, `agent unpack`, `agent env`, `run`, `agent connections`, `agent connect`, `agent disconnect`, `agent surface …`, `mcp connect`, `mcp check`, `integrations …`, `template pack`, `template publish`, `skill publish`, `skill update`, `interface …`, `machine ls`, `machine rm`, `task update`, `task delete`, `orchestration init`.

For these, use the CLI when the session has a shell, or give the human the console steps. The primitive skill for each area has both.
