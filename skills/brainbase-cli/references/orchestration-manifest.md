Source: https://docs.brainbaselabs.com/cli/reference/orchestration-manifest; https://docs.brainbaselabs.com/cli/concepts/orchestrations
Snapshot: 2026-11-03

# `brainbase-orchestration.yaml` field by field

## Contents

- Folder layout and identity
- Full example
- `orchestration`
- `members`
- `edges`
- `triggers`
- Drift, push and conflict rules

`brainbase-orchestration.yaml` is the committed source of truth for an orchestration's members, handoff edges and schedule triggers. What an orchestration is, app and webhook triggers, shared secrets, MCP servers and memory: `brainbase-orchestration`. Commands: `references/commands-other.md`.

## Folder layout and identity

```text
orchestration/
  brainbase-orchestration.yaml
  .brainbase/                       # orchestration-link.json, orchestration-sync-state.json
  agents/
    janitor/
      brainbase.agent.yaml
      .brainbase/
```

Every `members[].slug` must match a folder under `agents/`, and before `orchestration create` or `push` each member folder must hold a claimed agent with local link state. The orchestration id and revision live under `.brainbase/`, not in the manifest. `brainbase orchestration init` writes a starter (`--full` documents every block); `orchestration create` claims an unlinked manifest; `orchestration pull <id>` creates both the manifest and the link state.

## Full example

```yaml
schema: 1
orchestration:
  name: Daily PR Janitor
  description: Closes stale PRs and reports the results
  credit_limit: 10
members:
  - slug: janitor
    name: PR Janitor
edges: []
triggers:
  - type: schedule
    node_id: 2d92a515-6f69-4e1e-9ba3-193de84151f4
    is_active: true
    config:
      cron_expression: "0 9 * * *"
    to:
      - agent: janitor
        description: Run the daily stale-PR pass
```

## `orchestration`

| Field | Type | Notes |
| --- | --- | --- |
| `schema` | integer, required | Must be `1`. |
| `orchestration.name` | string, required | Display name, non-empty. |
| `orchestration.description` | string, optional | Short description. |
| `orchestration.icon` | string, optional | Icon identifier round-tripped from the cloud. |
| `orchestration.icon_color` | string, optional | Icon color round-tripped from the cloud. |
| `orchestration.credit_limit` | number, optional | Orchestration credit limit. |

## `members`

| Field | Notes |
| --- | --- |
| `members[].slug` | Required. Stable local alias; must match the directory under `agents/`; used by edges and triggers. |
| `members[].name` | Optional display label. The member's own agent manifest remains authoritative. |

`orchestration push` applies the same rules as `agent push` to every member. A member declaring a reserved block (`commands`, `hooks`, `files`) makes the whole run refuse before the first member is pushed; any member push failure stops the graph update, so a successful push means every member made it. An agent can belong to one orchestration at a time (a second add fails with 409).

## `edges`

| Field | Notes |
| --- | --- |
| `edges[].from` | Required member slug. Self-loops are rejected. |
| `edges[].to` | Required member slug. |
| `edges[].description` | Optional handoff description. |
| `edges[].payload_schema` | Optional JSON Schema for the handoff payload; the server validates it. |
| `edges[].settings` | Optional free-form edge behaviour settings (including task-permission options from the app). Preserved by pull and push, e.g. `max_handoffs: 2`. |

Each outgoing edge becomes a `create_task_for_<recipient>` tool on the orchestration MCP server inside the member's sandbox.

## `triggers`

Schedule triggers are writable; app and other non-schedule triggers may appear after a pull as read-only context, and push and status ignore them.

| Field | Notes |
| --- | --- |
| `triggers[].type` | Required. `schedule` for a CLI-managed trigger. |
| `triggers[].node_id` | Required stable trigger-node UUID, unique. |
| `triggers[].is_active` | Optional; defaults to `false` when omitted. |
| `triggers[].config.cron_expression` | Required standard five-field cron expression. |
| `triggers[].config.configured_props` | Optional integration-specific schedule configuration, preserved when present. Author fields only when the trigger provider documents them. |
| `triggers[].to[].agent` | Required member slug started by this trigger. |
| `triggers[].to[].description` | Optional description passed with the trigger edge. |
| `triggers[].to[].payload_schema` | Optional JSON Schema for the trigger payload. |

Schedule config is normalized to `cron_expression` plus non-empty `configured_props`; other runtime-only config keys are not written back. Schedules belong to orchestrations: a scheduled single agent is an orchestration with one member. Schedule-trigger writes need the MAS `/v2/cli` control plane.

## Drift, push and conflict rules

- `orchestration status` compares local and cloud membership; edge description, payload schema and settings; schedule node id, active state, normalized config and target edges; and reports member revision drift, missing local member checkouts, and cloud revision drift even when the modeled graph still matches.
- `orchestration push` refuses and names each conflict when the cloud holds schedule triggers this checkout never pulled or edited since, or when `name`, `description`, `icon`, `icon_color` or `credit_limit` changed on both sides. `orchestration pull` takes the cloud's side; `--force` takes the file's (conflicting cloud schedule triggers deleted, metadata overwritten; a field only the cloud changed is never reverted). `--force` covers the graph only; a member's own conflict is settled with `agent push --force` in that member's folder.
- `--graph-only` pushes membership, edges, edge settings and schedule triggers without member content.
- Over the API, `PUT /orchestrations/{orch_id}` is a partial update except `members` and `edges`, which are whole-replace; `base_revision` gives conflict protection (`references/control-plane-api.md`).
