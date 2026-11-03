# Triggers and schedules

Source: https://docs.brainbaselabs.com/docs/orchestrations/external-triggers, /docs/agent/scheduled-agents, /docs/agent-lifecycle/deploying, /docs/orchestrations/building-an-orchestration, /cli/concepts/orchestrations, /cli/reference/orchestration-manifest, /cli/reference/pat-scopes, /api/events/list-events, /api/alerts/create-alert; changelog 2026-10-30 "Webhook Triggers for Orchestrations", 2026-10-29, 2026-09-04, 2026-08-21, 2026-08-28, 2026-07-18, 2026-07-10, 2026-06-05, 2026-06-04, 2026-05-29
Snapshot: 2026-11-03

Contents: What triggers are · Trigger types and modes · Schedules · Scheduled agents end to end · App triggers · Webhook triggers · What a fired trigger produces · Best practices · Changelog behaviour

## What triggers are

External triggers start an orchestration from something outside the agent chat. Use them when work should begin automatically: a new lead, ticket, meeting, form submission, or scheduled check can fire the orchestration and send work to one or more agents. Console steps from the docs: open the orchestration canvas, add a schedule or connected-app trigger, connect the trigger to the first agent that should receive the work (fetch the live page for the current UI).

## Trigger types and modes

| Type | Fires from | Where it is managed |
| --- | --- | --- |
| Schedule | A cron schedule (the console also accepts a natural-language schedule); evaluated in UTC | Canvas, manifest `triggers[]`, API `triggers[]` |
| Third-party app | An app event through a connected account (for example Linear issue updates, GitHub) | Canvas only; the CLI shows them read-only after a pull |
| Webhook | An HTTP POST of JSON to the trigger's unique URL | Canvas only (changelog, 2026-10-30) |

Modes (deploying page): each app trigger has three modes, **Off** (no events fire), **Test** (events go to the test webhook), and **Live**. Schedule triggers have only **Off** and **Live**. Test an app trigger with a low-risk event first; once the run looks clean, set it to **Live**. The 2026-10-29 changelog also mentions "a schedule in Test mode" no longer running on its schedule, so the live canvas may expose a Test state for schedules too; verify there.

The external-triggers and deploying pages still describe webhooks as "once available" / "coming soon"; the changelog entry of 2026-10-30 says they shipped.

## Schedules

A schedule is a trigger node on an orchestration. When it fires, Brainbase creates a task for each trigger edge and sends the edge description plus the trigger payload as the initial user message. The agent owns the durable instructions and credentials; the schedule owns timing and per-run configuration.

| Field | Rule |
| --- | --- |
| `cron_expression` | Standard five-field cron, evaluated in UTC. Convert local business time to UTC before writing it. |
| `node_id` | Unique UUID for the trigger node (manifest requires it; API lists it). |
| `is_active` | Defaults to `false` when omitted. Keep new schedules inactive until a manual dry run has been reviewed. |
| `configured_props` | Opaque per-schedule configuration delivered in the payload. Integration-specific; author fields only when the trigger provider documents them. |
| `edges[]` / `to[]` | Each entry names a member agent to start plus a `description` (what to do when it fires) and optional `payload_schema`. |

Where it is declared:

- Manifest: `triggers[]` with `type: schedule`, `node_id`, `is_active`, `config.cron_expression`, `config.configured_props`, `to[].agent`. Push and status reconcile schedule triggers only; pull writes them in normalized form (`cron_expression` plus non-empty `configured_props`).
- API: `triggers[]` with `trigger_type: "schedule"`, `node_id`, `cron_expression`, `is_active`, `configured_props`, `edges[].to_agent_id`. The response adds `state` (for example `"live"`), `last_run_at`, `trigger_count`.
- Never in `brainbase.agent.yaml`: agent manifests do not accept schedule triggers. A scheduled single agent is an orchestration with one member and a schedule trigger pointing at it.
- Schedule-trigger writes require the MAS `/v2/cli` control plane; the legacy `BRAINBASE_API_URL` path refuses them.

## Scheduled agents end to end

1. Create the agent with the runtime, tools and instructions it should use for every scheduled task; pass `group_id` if the orchestration will live inside a group. The docs' example:

```bash
curl --request POST --url "$BRAINBASE_MAS_URL/v2/agents" \
  --header "Authorization: Bearer $BRAINBASE_TOKEN" --header "Content-Type: application/json" \
  --data '{"title": "Daily repository digest", "group_id": "<group-uuid>",
           "runtime_kind": "codex_cloud", "machine_kind": "daytona",
           "instructions": "Review the configured repositories, summarize meaningful changes, and take only the actions allowed by the trigger payload."}'
```

2. Store credentials as agent secrets, planted into every task sandbox as environment variables. Do not put token values in instructions, trigger descriptions, or `configured_props`. Agent secrets use whole-replace semantics on `PATCH /v2/agents/{agent_id}`: send the full desired `secrets` object; omitted keys are removed. (A credential several members need belongs on the orchestration instead; see `references/shared-resources.md`.)

3. Create the orchestration with the agent as a member and a schedule trigger with an edge to it, `is_active: false`:

```bash
curl --request POST --url "$BRAINBASE_MAS_URL/v2/orchestrations" \
  --header "Authorization: Bearer $BRAINBASE_TOKEN" --header "Content-Type: application/json" \
  --data '{"group_id": "<group-uuid>", "name": "Daily repository digest",
           "description": "Scheduled repo review and digest generation.",
           "members": ["<agent-uuid>"],
           "triggers": [{"trigger_type": "schedule", "cron_expression": "30 1 * * 2-6",
                         "is_active": false,
                         "configured_props": {"watched_repos": ["acme/web", "acme/api"],
                                              "scan_overlap_hours": 2,
                                              "target": {"repo": "acme/web", "path": "content/changelog.ts"}},
                         "edges": [{"to_agent_id": "<agent-uuid>",
                                    "description": "Run the scheduled repository digest using the trigger payload."}]}]}'
```

The CLI equivalent is the manifest in `references/manifest.md` plus `orchestration create` or `push --graph-only`.

4. Dry run: create a manual task against the same agent with a representative trigger payload and confirm the output, side effects, and credential access. On each scheduled run the agent receives:

```json
{
  "_source": "schedule",
  "schedule": {
    "trigger_id": "trigger-id", "node_id": "node-id", "orchestration_id": "orchestration-id",
    "cron_expression": "30 1 * * 2-6",
    "fired_at": "2026-05-28T01:30:00+00:00",
    "window_start": "2026-05-27T01:30:00+00:00",
    "window_end": "2026-05-28T01:30:00+00:00"
  },
  "configured_props": {"watched_repos": ["acme/web", "acme/api"], "scan_overlap_hours": 2}
}
```

5. Activate: patch the orchestration with the same trigger and `is_active: true` (or flip `is_active` in the manifest and push). Each firing spends credits as a task; a recurring schedule that cannot afford its next run pauses itself and says why (changelog, 2026-09-04).

## App triggers

- Fire from an app event through a connected account; the connection itself is set up on the agent or workspace (see `brainbase-surfaces` and `brainbase-tools`). The CLI can display them, including Linear issue updates (changelog, 2026-06-04), but push and status never diff or write them.
- The connected account behind an orchestration trigger can be disconnected and reconnected without losing the trigger setup, and failed trigger deployments show a clear reason (changelog, 2026-08-21).
- Editing and testing app triggers: toggle saves no longer wait on slow provider option refreshes, and the **Test trigger** button gives durable feedback (changelog, 2026-07-18). Trigger configuration dropdowns such as the GitHub Repository selector populate correctly (changelog, 2026-07-10). Slow trigger tests keep checking and show how many agents have a task so far (changelog, 2026-10-29).
- Right-click delete on an agent or trigger in the workspace scene asks for confirmation first (changelog, 2026-08-28).
- The orchestration templates API shows the app-trigger shape: `trigger_type: "app"`, `app_slug`, `app_name`, `app_icon`, `trigger_key`, `trigger_name`, `trigger_version`, `configured_props`. The orchestration API pages themselves only document the schedule shape.
- GitHub-surface triggers (auto-review, @mentions, re-review) are agent-level and start normal agent runs; they are not orchestration triggers. See `brainbase-surfaces`.

## Webhook triggers

Changelog, 2026-10-30 "Webhook Triggers for Orchestrations":

- Adding a Webhook trigger to an orchestration gives it a unique URL; posting JSON to that URL starts a run, with no third-party app connection required.
- Send an `Idempotency-Key` header on your request to avoid starting a duplicate run if you need to retry a call.
- A webhook trigger can be turned on or off from the orchestration canvas, the same as app and schedule triggers.

Changelog, 2026-10-29: a webhook trigger that is switched off no longer starts agents, and the same webhook payload sent again after 24 hours starts a new run (so repeats inside 24 hours are deduplicated).

The docs do not give the URL format, the payload shape delivered to the agent, authentication on the URL, or an API to create webhook triggers. Read the URL from the canvas and treat it as a secret-bearing value: do not paste it into files or chat.

## What a fired trigger produces

- One task per trigger edge, on the target member, with the edge description plus the JSON payload as the first user message.
- A Brainbase-minted agent-bound credential for that run, reaching that agent plus the orchestration peers it has an edge to (how `create_task_for_<recipient>` is authorized).
- Events and alert fires carry `orchestration_id` alongside `agent_id`, `task_id`, `thread_id`, `group_id` (`GET /v2/events`, `GET /v2/alerts/.../fires`), and alerts can be created with `scope_level: orchestration`. Task metadata keys starting with `orchestration_` are platform-owned; under strict admission only a person's credential can set or remove them.
- Starting many tasks at once from an orchestration no longer fails some of them with a billing-unavailable error (changelog, 2026-10-29).

## Best practices

- Wire each trigger to the agent that should handle the first step.
- Keep trigger payloads small and include only what downstream agents need.
- Remember that schedule triggers run in UTC.
- Test with a low-risk event before activating a production path; test one handoff at a time before adding external triggers.
- Put standing behavior in `instructions`, credentials in `secrets`, per-schedule configuration in `configured_props`.

## Changelog behaviour worth knowing

| Date | Entry | Detail |
| --- | --- | --- |
| 2026-10-30 | Webhook Triggers for Orchestrations | Unique URL, `Idempotency-Key`, on/off from canvas. |
| 2026-10-29 | Fixes and Improvements | Off webhook triggers do not start agents; schedule in Test mode does not run; 24-hour webhook dedupe; bulk task starts fixed. |
| 2026-09-04 | Fixes and Improvements | A recurring schedule that cannot afford its next run pauses itself and explains why. |
| 2026-08-21 | Fixes and Improvements | Reconnect a trigger's account without losing setup; clear reasons for failed trigger deployments. |
| 2026-07-18 | Fixes and Improvements | Recurring schedules set from inside a Claude Code agent fire reliably in cloud sandboxes; Test trigger button feedback. |
| 2026-07-10 | Fixes and Improvements | Trigger configuration dropdowns populate correctly. |
| 2026-06-05 | Fixes and Improvements | (Under Workflows) app triggers that poll check about every 15 seconds; duplicate deliveries collapse into one run. |
| 2026-06-04 | Developer Updates | CLI shows orchestration triggers, including app triggers. |
| 2026-05-29 | Fixes and Improvements | Kafka recovers from desynced external trigger deployments. |
