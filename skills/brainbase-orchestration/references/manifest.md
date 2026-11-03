# Orchestration manifest (`brainbase-orchestration.yaml`)

Source: https://docs.brainbaselabs.com/cli/reference/orchestration-manifest, /cli/concepts/orchestrations, /cli/reference/files, /cli/reference/agent-manifest (schedules note), /cli/quickstart, /docs/orchestrations/building-an-orchestration
Snapshot: 2026-11-03

`brainbase-orchestration.yaml` is the committed source of truth for an orchestration's members, handoff edges, and schedule triggers. Member agents live under `./agents/<slug>/` and keep their own `brainbase.agent.yaml` files. The orchestration id and revision are stored under `.brainbase/`, not in this manifest.

Three ways the file comes to exist:

- `brainbase orchestration init` writes a starter manifest (`--full` for one documenting every block). It has no members because `create` requires a local checkout for every member.
- `brainbase orchestration create` claims an unlinked manifest and creates the orchestration in the cloud.
- `brainbase orchestration pull <id>` on an existing orchestration creates both the manifest and its local link state.

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

A two-member graph with an edge setting and a schedule, from the CLI concepts page:

```yaml
edges:
  - from: planner
    to: worker
    settings:
      max_handoffs: 2

triggers:
  - type: schedule
    node_id: 11111111-1111-4111-8111-111111111111
    is_active: true
    config:
      cron_expression: "0 9 * * *"
    to:
      - agent: planner
```

## Folder layout

```text
orchestration/
  brainbase-orchestration.yaml
  .brainbase/
  agents/
    janitor/
      brainbase.agent.yaml
      .brainbase/
```

Every `members[].slug` must match a folder under `agents/`. Before `orchestration create` or `push`, each member folder must contain a claimed agent with local link state. Members and edges reference agents by slug, not ID; the CLI resolves each slug to the agent linked in its `agents/<slug>/` folder. The file does not substitute `${VAR}` placeholders.

## `schema` and `orchestration`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schema` | integer | yes | Manifest schema version. Must be `1`. |
| `orchestration.name` | string | yes | Display name. Must be non-empty. |
| `orchestration.description` | string | no | Short description of the workflow. |
| `orchestration.icon` | string | no | Icon identifier round-tripped from the cloud. |
| `orchestration.icon_color` | string | no | Icon color round-tripped from the cloud. |
| `orchestration.credit_limit` | number | no | Optional orchestration credit limit. |

`name`, `description`, `icon`, `icon_color` and `credit_limit` are the metadata fields `orchestration push` checks for two-sided conflicts. The API's `metadata` labels have no manifest field.

## `members`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `members[].slug` | string | yes | Stable local alias. Must match the directory name under `agents/`; used by edges and triggers. |
| `members[].name` | string | no | Optional display label. The member agent manifest remains authoritative. |

Member manifests are checked before anything is pushed: `orchestration push` applies the same rules as `agent push` to every member. If any member declares a block the CLI cannot sync (the agent manifest's reserved fields), the whole run is refused before the first member is pushed and the graph is left unchanged. A member whose push fails for any other reason also stops the graph update, so a successful `orchestration push` means every member made it.

## `edges`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `edges[].from` | member slug | yes | Source member. Self-loops are rejected. |
| `edges[].to` | member slug | yes | Destination member. |
| `edges[].description` | string | no | Human-readable handoff description. The source agent sees it on its `create_task_for_<recipient>` tool; write what context the recipient needs. |
| `edges[].payload_schema` | object | no | JSON Schema for the handoff payload. The server validates it. |
| `edges[].settings` | object | no | Edge behavior settings, including task-permission options configured in the app. Free-form; pull and push preserve this object and status reports drift in it. |

The docs show `max_handoffs: 2` as an example setting but do not enumerate the keys; read existing values from a pull or the canvas rather than inventing them.

## `triggers`

Schedule triggers are writable. App and other non-schedule triggers may appear after a pull as read-only context; `orchestration push` ignores those entries and reconciles only schedule triggers.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `triggers[].type` | string | yes | Use `schedule` for a writable CLI-managed trigger. |
| `triggers[].node_id` | UUID | yes | Stable trigger-node id. Schedule trigger ids must be unique UUIDs. |
| `triggers[].is_active` | boolean | no | Whether the trigger fires. Defaults to `false` when omitted. |
| `triggers[].config.cron_expression` | string | yes | Standard five-field cron expression, evaluated in UTC. |
| `triggers[].config.configured_props` | object | no | Integration-specific schedule configuration preserved when present. Author fields only when the trigger provider documents them. |
| `triggers[].to[].agent` | member slug | yes | Member agent started by this trigger. Every entry must name a member. |
| `triggers[].to[].description` | string | no | Description passed with the trigger edge; becomes part of the first user message. |
| `triggers[].to[].payload_schema` | object | no | Optional JSON Schema for the trigger payload. |

Normalization: schedule config is normalized to `cron_expression` plus non-empty `configured_props`; other runtime-only config keys are not written back. Pull writes schedule triggers in this writable normalized form.

Schedules belong to orchestrations. Agent manifests (`brainbase.agent.yaml`) do not accept schedule triggers, and `agent push` treats schedules as orchestration-level configuration. A scheduled single-agent workflow is an orchestration with one member and a schedule trigger pointing to that member.

## Local state under `.brainbase/`

| File | Meaning |
| --- | --- |
| `orchestration-link.json` | Present when the folder is linked to an orchestration: the orchestration id, its team and organization, and when it was linked. Delete it after `orchestration delete` to recreate the orchestration with `orchestration create`. |
| `orchestration-sync-state.json` | The orchestration's state at the last pull or push: member revisions, edges, schedule triggers and metadata. `orchestration status` and `orchestration push` compare against it to tell a local edit from a cloud one. |

Both are gitignored. `orchestration init --force` still refuses a folder that is linked: edit its manifest and run `orchestration push` instead.

## What status compares

`orchestration status` compares local and cloud membership; edge description, payload schema, and settings; and schedule node ID, active state, normalized config, and target edges. It also reports member revision drift, missing local member checkouts, and orchestration cloud revision drift even when the modeled graph still matches. Non-schedule triggers are not diffed.
