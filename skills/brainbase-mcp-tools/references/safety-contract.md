Source: BrainbaseHQ/brainbase-mcp 0.1.2, skills/brainbase-mcp/SKILL.md (Operating contract) and skills/brainbase-mcp/reference.md (Revisions and idempotency; Conflict and error handling)
Source: https://docs.brainbaselabs.com/docs/mcp
Snapshot: 2026-11-10

# Writing safely through the Brainbase MCP

The MCP makes targeted writes guarded by revisions. These rules match the official package's operating contract, so an agent that has both skills loaded gets one set of rules.

## The write loop

1. Resolve exact IDs with discovery and list tools. Never guess an organization, team, agent, eval, orchestration, schedule, playbook or task.
2. Read the resource immediately before changing it.
3. Pass the `revision` from that read as `expected_revision`. Revisions are opaque: do not derive, increment or reuse one.
4. Send only the fields the user asked to change. Use the targeted upsert and remove tools; never rebuild a whole collection to change one item.
5. Read back and check the requested state.
6. Leave adjacent cleanup, migration and deletion alone unless the user asked.

## Revisions

Every editable resource returns a `revision`: the agent (also covering its skills, MCP servers and playbooks), each eval, each orchestration. A successful write changes it.

Two ways an agent conflicts with itself:

- Two writes to the same resource issued in parallel. Send them one after another.
- A second write that reuses the revision from the first read. Re-read between writes; `agents_get_revision` is the cheap way for an agent.

## Idempotency keys

These tools require `idempotency_key`: `agents_create`, `playbooks_upsert`, `evals_create`, `evals_run`, `orchestrations_create`, `tasks_create`.

Generate a unique key of 8 to 200 characters for each new intent. Reuse a key only to retry the identical request, so a retry after a timeout cannot create a second agent or start a second run.

## Dry runs

Member and edge changes on an orchestration accept `dry_run: true`. Run the dry run, show the user any removals or validation errors it reports, re-read the orchestration, then send the same change with `dry_run: false` and the latest revision. A version restore also takes `dry_run` where the version tools are connected.

## Confirmations

| Action | What to send | Confirm with the user |
| --- | --- | --- |
| `agents_delete` | `confirm_name` = the agent's exact name | Yes. Deleting an agent is permanent. |
| `orchestrations_delete` | The orchestration's exact name | Yes. |
| `evals_delete` | `confirm_name` = the eval's exact slug | Yes. |
| `playbooks_archive` | `confirm_name` = the playbook's exact title | Yes. |
| `agent_versions_restore`, `_pin`, `_unpin` | `confirm_version_number` = the target version's number | Yes. Restore and pin change what everyone's new tasks run. |

Read the resource first and show the user the name you will send.

## Billable calls

| Call | When it spends credits |
| --- | --- |
| `tasks_create` | `auto_run: true`, which is the default for MCP-created tasks |
| `tasks_followup` | `run: true` |
| `evals_run` | Always; it starts a task and a judge |
| `schedules_test` | Always; it fires the schedule's handoffs |

Before any of these, tell the user which agent will run, with what prompt, and that it spends credits. Start only after they agree. Create schedules with `is_active: false` unless the user asked for activation.

## Credentials

- The MCP uses OAuth with the `mcp:all` scope, bounded by the user's own Brainbase access. Never put an API key, PAT or session token in an MCP client's configuration, and never ask the user to paste one.
- Responses never contain credential values, headers or env values. `has_headers` and `has_env` only say that hidden configuration exists.
- Do not send credential headers or env values through `mcp_servers_upsert`. Have the user enter them in the console; ask only for the credential's name and purpose.

## Errors

| Status | Meaning | Do |
| --- | --- | --- |
| `400`, `422` | The request does not match the live schema: IDs, cron, graph membership, eval shape or a missing confirmation field. | Check the connected tool's schema and the IDs, then resend. |
| `401` | OAuth is missing or expired. | Have the user complete or refresh OAuth in their client. |
| `403` | The user lacks access, or the credential is not a user-scoped `mcp:all` grant. | Check the user's role and team access. |
| `404` | The resource does not exist or is not visible. | Re-discover it with the list tools. |
| `409` | The revision is stale. | Re-read, rebuild only the requested change on the fresh state, retry once when the merge is unambiguous. Otherwise stop and show the conflict. |

Never resolve a conflict by dropping `expected_revision`, by replacing unrelated state, or by switching to a whole-manifest `brainbase agent push`.
