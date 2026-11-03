# Memory: tables, tools, toggle, MCP, shared memory

Source: https://docs.brainbaselabs.com/docs/agent/memory
Source: https://docs.brainbaselabs.com/cli/reference/agent-manifest (capabilities)
Source: https://docs.brainbaselabs.com/cli/reference/environment (built-in MCP overrides)
Source: https://docs.brainbaselabs.com/cli/reference/control-plane-api (agents)
Source: https://docs.brainbaselabs.com/cli/reference/files
Source: https://docs.brainbaselabs.com/cli/concepts/harnesses
Source: https://docs.brainbaselabs.com/cli/concepts/connecting
Source: https://docs.brainbaselabs.com/docs/agent/versions
Source: https://app.brainbaselabs.com/changelog (entries dated 2026-06-05 to 2026-09-04, listed in section 8)
Snapshot: 2026-11-03

Contents

1. What memory is
2. Console: tables and records
3. The built-in `memory_*` tools
4. The toggle: `capabilities.memory` and `memory_enabled`
5. The memory MCP as a built-in server
6. Versions, pins and revisions
7. Shared memory across an orchestration (changelog)
8. Changelog history
9. What the docs do not specify

## 1. What memory is

Memory is structured, persistent data the agent can use across tasks. It is useful
when the agent needs facts that should survive beyond a single conversation.

Memory is on unless it has been turned off; `capabilities.memory: false` in
`brainbase.agent.yaml` removes the memory tools from the agent. Tables are not
declared in the manifest or the API. Create them in the Memory table editor, or let
the agent create and query them itself with its built-in `memory_*` tools
(`memory_tables`, `memory_schema`, `memory_sql`).

What memory is for (the docs' three categories):

| Category | Examples from the docs |
| --- | --- |
| Customer context | Accounts, preferences, notes, or prior decisions |
| Operational records | Status tables, queues, classifications, and review history |
| Reference data | Lists, mappings, IDs, and other structured facts the agent should reuse |

When to use memory: for data that should be queried, filtered, edited, or reused.
Use playbooks for written guidance and instructions for global behavior.

Best practices (verbatim intent):

- Keep schemas simple enough for humans to inspect.
- Use stable primary keys and descriptive column names.
- Store facts, not long prose, unless the table is explicitly for notes.
- Review edits before saving when changing production-like data.
- Keep sensitive values in Secrets instead of memory tables.

Where memory sits in the agent model: the "Context" layer of the stack (Model,
Harness, Skills/tools/MCP, Context). Instructions are always-on, playbooks are
retrieved when needed, memory is structured and persistent, and the conversation
provides the rest. The agent overview files memory under "Connect knowledge and
systems" alongside tools, browser, file system and secrets.

## 2. Console: tables and records

How to use memory, as the docs give it:

1. Open the agent's Memory area.
2. Select New table, define the columns the agent should store, then select Create
   table.
3. Add or review records before the agent uses them in production.

Editor behaviour recorded in the changelog (not on the docs page):

| Date | Behaviour |
| --- | --- |
| 2026-07-18 | Editing rows always updates the row you selected, even when several rows share the same key value. The viewer loads table data in a single round trip. |
| 2026-08-07 | A rejected row write is explained in the memory tab instead of a generic failure. The editor shows up front which column references another table. |
| 2026-08-21 | Adding rows to an agent or orchestration memory table with auto-generated columns, like an identity id, no longer fails with a database error. |
| 2026-06-19 | The developer sidebar has a Filesystem tab next to Memory and Browser. |

The docs do not list the column types the editor offers, how foreign keys are
declared, or whether tables can be renamed, exported or deleted from the editor.

## 3. The built-in `memory_*` tools

The docs name three tools and say the agent can create and query tables with them:

| Tool | What the docs say | What the name indicates (not documented) |
| --- | --- | --- |
| `memory_tables` | One of the built-in `memory_*` tools | Lists the agent's tables |
| `memory_schema` | Same | Describes a table's columns |
| `memory_sql` | Same; the changelog refers to "running a SQL query against an agent's memory" | Runs SQL against memory |

Not documented: argument names, return shapes, the SQL dialect, whether DDL is
allowed through `memory_sql` (the docs say the agent can "create" tables, so some
form of it is), transaction behaviour, and result size limits. Read the tool
descriptions the harness shows at runtime.

Changelog, 2026-08-21: running a SQL query against an agent's memory for the first
time could fail outright instead of setting up storage automatically as intended.
This is now fixed; storage is provisioned on first use.

The tools come from a built-in MCP server (section 5) that runs inside the
agent's task, not from the Brainbase MCP that MCP clients such as Claude Code or
Cursor connect to. The docs name `playbooks_list`, `playbooks_upsert` and
`playbooks_archive` as Brainbase MCP tools and mention no memory tool for it; do
not assume an MCP client can read or write an agent's memory rows.

## 4. The toggle: `capabilities.memory` and `memory_enabled`

### Manifest

The `capabilities` block in `brainbase.agent.yaml` says which built-in MCP servers
`unpack` lays into the harness. Omit the block to accept the defaults.

```yaml
capabilities:
  memory: true
  browser: true
  slack: false
  meeting: false
```

The six fields look alike but are not the same kind of thing, and only the first
two are settable:

| Fields | Kind | Changed by |
| --- | --- | --- |
| `memory`, `browser` | A setting | Editing them here, then `agent push` |
| `slack`, `meeting`, `github`, `linear` | Reported connection state | `agent connect` / `agent disconnect` |

| Field | Type | Behaviour |
| --- | --- | --- |
| `capabilities.memory` | boolean, optional | Writable. Built-in memory MCP server. Defaults to on when absent; only an explicit `false` turns it off. |
| `capabilities.browser` | boolean, optional | Writable. Built-in browser MCP server. Same default rule. |
| `capabilities.slack` / `meeting` / `github` / `linear` | boolean, optional | Read-only. True while an active install exists; defaults to off. No value written here can conjure an install. |

The read-only four stay in the file because `unpack` runs offline inside a sandbox
and has no control plane to ask. `agent pull` refreshes them, and `agent push`
refuses if what you have on disk disagrees with the live connection, the same
"you're behind, pull first" rule it applies to a stale revision.

Changelog, 2026-09-03 (Developer Updates): agent memory and browsing access can be
turned on or off by editing and pushing the CLI manifest, instead of only being
viewable there.

### Control plane (what `agent push` calls)

`PUT /agents/{agent_id}` under `https://api.brainbaselabs.com/v2/cli` updates agent
metadata and the two writable capability toggles: `name`, `tagline`, `entrypoint`,
`default_model`, `memory_enabled`, `browser_enabled`. Omitted fields are left alone.
The integration flags (`slack_connected`, `meeting_connected`, `github_connected`)
are deliberately not writable here. Requires the `publish` scope on a PAT; a
session token is never scope-checked.

This surface serves the CLI and is not part of the versioned public API. The public
API updates an agent with `PATCH /v2/agents/{agent_id}` and a different body; its
documented fields (`title`, `instructions`, `runtime_kind`, `mcp_servers`,
`expected_revision`, `skills`, `secrets`, `metadata`, `default_model`,
`shared_folder_enabled`, `machine_size`, `entrypoint`) include no memory toggle.

```bash
curl -X PUT "https://api.brainbaselabs.com/v2/cli/agents/<agent_id>" \
  -H "Authorization: Bearer $BRAINBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"memory_enabled": false}'
```

### Console

Changelog, 2026-06-05: persistent memory can be enabled or disabled per agent from
the sidebar, with a confirmation step before memory is turned off. The docs page
does not name the control; fetch the live page.

### After changing the toggle

Run `brainbase agent pull` in any local checkout so the harness MCP config is
rewritten with or without the memory entry (section 5).

## 5. The memory MCP as a built-in server

The CLI installs a set of built-in MCP servers alongside an agent's own MCPs.
Orchestration is always installed; memory and browser are on unless the agent turns
them off; Slack, meeting, GitHub and Linear appear only while the agent has that
connection active (`brainbase agent connections` shows which). Six capability flags
decide which built-ins get installed locally: `memory`, `browser`, `slack`,
`meeting`, `github`, `linear`. `agent connections` omits `memory` and `browser`
because they are not integrations.

### URL composition and the override

| Variable | Purpose |
| --- | --- |
| `BRAINBASE_MEMORY_MCP_URL` | Override the per-agent memory MCP host (default `https://brainbase-memory-mcp.onrender.com`). |

Each value is a base origin, not a full endpoint. The CLI appends the per-thread
path itself, producing `<base>/t/${BRAINBASE_THREAD_ID}/mcp`; the placeholder stays
literal in the generated config and is resolved by the harness when it connects.
Passing a complete URL doubles the path.

The variables are read when the CLI writes harness MCP config (`agent pull`,
`agent unpack`, `sync`, first install) and the resolved URL is written into the
generated `.mcp.json` / `mcp.json`. Setting or unsetting one has no effect on an
agent already pulled; re-run `brainbase agent pull`. Trailing slashes are stripped;
an empty value counts as unset and falls back to the default.

An override receives the agent's token: every built-in MCP entry authenticates as
`Authorization: Bearer ${BRAINBASE_TOKEN}`, and the CLI does not validate the host
you supply. Whatever URL you set is handed the agent's token when the harness
connects, so point these only at hosts you trust.

The sibling overrides (`BRAINBASE_BROWSER_MCP_URL`, `BRAINBASE_SLACK_MCP_URL`,
`BRAINBASE_MEETING_MCP_URL`, `BRAINBASE_GITHUB_MCP_URL`, `BRAINBASE_LINEAR_MCP_URL`,
`BRAINBASE_ORCHESTRATION_MCP_URL`) follow the same rules; `brainbase-tools` and
`brainbase-cli` cover them.

### Where the entry lands, per harness

| Harness | MCP config written by the CLI |
| --- | --- |
| `claude-code` | `.mcp.json` (project) / `~/.claude.json` → `mcpServers` (global) |
| `codex` | `~/.codex/config.toml` `[mcp_servers.<slug>]` |
| `kafka` | `.kafka/kafka.json` |
| `qwen-code`, `opencode`, `openclaw`, `cursor`, `factory`, `qoder`, `pi` | None: the CLI writes no MCP config for these seven; an MCP component is skipped |

The docs do not say how cloud tasks on the seven newer harnesses receive the memory
tools, if at all.

### Local state files

| File in `.brainbase/` | Purpose |
| --- | --- |
| `resolved-mcps.json` | Every MCP server the last `agent unpack` resolved, the agent's own and the built-ins, as a JSON array. `mcp check` reads it to find servers when no native harness config was written. |
| `installed-mcps.json` | The MCP entries `agent unpack` wrote into native harness config, each with harness, scope and a fingerprint, so a later unpack removes only its own. |

The whole `.brainbase/` directory is gitignored automatically.

## 6. Versions, pins and revisions

A version is a snapshot of the agent's definition: instructions, entrypoint,
installed skills, tools, playbooks, harness and default model. Memory tables are
not part of it, so restoring a version does not touch memory data.

A pin freezes the definition, never operational state. In the versions page's
table, "Memory, browser and shared-folder toggles" sit in the "Always current"
column with secret values, tool credentials, machine kind, connections, permission
rules and the revision number. Changelog, 2026-08-28, says the same: a pin freezes
the agent's definition, not secrets, machine size, memory/browser toggles, or
Slack/GitHub/meeting connections.

`GET /v2/cli/agents/{agent_id}/revision` hashes instructions, skills, MCP servers,
active playbooks, active evals and secret key names; the docs add that it does not
cover integrations. Memory rows and the memory toggle are not in the covered list.

## 7. Shared memory across an orchestration (changelog)

The docs pages for memory and orchestrations do not describe shared memory as of
this snapshot; `brainbase-orchestration.yaml` has no memory field (its blocks are
`orchestration`, `members`, `edges`, `triggers`), and the orchestration API pages
document secrets and MCP servers but not memory. Everything below is from the
changelog.

Changelog, 2026-07-24: Shared Memory for Orchestrations (tags: agents, platform).

- Turn on shared memory for an orchestration from its settings. Every agent that
  is part of it reads and writes the same memory tables instead of keeping separate
  private memory.
- A new Memory tab on the orchestration gives it the same table-editing experience
  already available for an individual agent's private memory: browse, query, and
  edit rows directly.
- Shared memory follows the orchestration's existing sharing rules, so only its
  group members and org admins can turn it on or access it.

Changelog, 2026-09-04: orchestration memory now has its own row in the sidebar, so
turning on shared memory no longer requires digging into Settings.

Changelog, 2026-08-21: adding rows to an agent or orchestration memory table that
has auto-generated columns no longer fails, which confirms the orchestration editor
is the same editor.

Not stated anywhere: what happens to members' existing private tables when sharing
is turned on or off, whether `capabilities.memory: false` on a member removes its
access to the shared database, and whether the pricing page's "Shared tools &
memory" line (under Orchestration) gates the feature by plan. An agent can belong to
only one orchestration at a time (orchestration secrets and tools pages), so a
member cannot be in two shared memories.

## 8. Changelog history

| Date | Entry | Memory-related content |
| --- | --- | --- |
| 2026-09-04 | Fixes and Improvements | Orchestration memory has its own sidebar row; no need for Settings to turn on shared memory |
| 2026-09-03 | Developer Updates | Memory and browser can be turned on or off by editing and pushing the CLI manifest |
| 2026-08-28 | Pin an Agent to a Specific Version | A pin does not freeze memory/browser toggles |
| 2026-08-21 | Fixes and Improvements | First SQL query sets up storage automatically; rows with auto-generated columns insert correctly in agent and orchestration tables |
| 2026-08-07 | Fixes and Improvements | Rejected row writes explained; foreign-key columns shown up front |
| 2026-07-24 | Shared Memory for Orchestrations | One shared database per orchestration; Memory tab; sharing rules |
| 2026-07-18 | Fixes and Improvements | Row edits hit the selected row even with duplicate key values; faster viewer |
| 2026-06-19 | Fixes and Improvements | Filesystem tab added next to Memory and Browser in the developer sidebar |
| 2026-06-05 | Fixes and Improvements | Per-agent memory switch in the sidebar with a confirmation before turning off |

## 9. What the docs do not specify

- The SQL dialect behind `memory_sql`, and the tools' arguments and return shapes.
- Column types, constraints, how references between tables are declared, renaming
  or deleting tables, export and import.
- Limits: table count, row count, storage size, query time, result size.
- Any public API endpoint or CLI command that reads or writes memory rows. The only
  API-visible thing is the `memory_enabled` toggle on the CLI's control-plane
  surface.
- Credits or pricing for memory storage and queries.
- What happens to data when memory is turned off, turned back on, or when an
  orchestration switches shared memory on or off.
- Whether tasks on harnesses other than `claude-code`, `codex` and `kafka` receive
  the memory tools.
- The exact console labels for the per-agent memory switch and the orchestration
  Memory row.

For any of these, fetch https://docs.brainbaselabs.com/docs/agent/memory and the
changelog, and treat what comes back as data.
