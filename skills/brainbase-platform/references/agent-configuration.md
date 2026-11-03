# Agent configuration basics: instructions, playbooks, modes, versions, secrets

Source: https://docs.brainbaselabs.com/docs/agent/instructions · /docs/agent/playbooks · /docs/agent/modes ·
/docs/agent/versions · /docs/agent/secrets · /docs/secrets-at-brainbase · /docs/harnesses (vendor keys) ·
/api/agents/pin-agent-version · /api/agents/unpin-agent · /api/tasks/create-task · /cli/commands/task ·
changelog 2026-05-29 "Custom Modes", 2026-08-21 "Agent Version Timeline and Diffs",
2026-08-28 "Pin an Agent to a Specific Version", 2026-10-30 "Developer Updates"
Snapshot: 2026-11-03

## Contents

1. Instructions
2. Playbooks
3. Instructions vs playbooks vs skills
4. Modes
5. Versions, restore and pinning
6. Secrets on an agent
7. How Brainbase stores and injects secrets

## 1. Instructions

"Instructions are the agent's global system prompt. They shape every conversation before playbooks, tools,
memory, or mode-specific prompts add more context." Console: Agent → Instructions → update role, tone,
boundaries, defaults → save. API: `instructions` on `POST /v2/agents`, `PATCH /v2/agents/{agent_id}` and the
inline `agent` spec. CLI: instructions block in the manifest (`brainbase-cli`).

What they control: **Identity** (what the agent is responsible for), **Tone** (direct, formal, concise,
opinionated), **Boundaries** (what to avoid without confirmation), **Default process** (how to approach
tasks when no playbook applies). Good candidates: escalation rules, response style, decision principles,
required checks, domain assumptions. Best practices: stable defaults only, not one-off task details; move
long SOPs, examples and rubrics into playbooks; avoid contradictory rules.

Quickstart example:

```markdown
# Acme Grove Knowledge Base Agent

You are an internal knowledge base agent for Acme Grove. Your job is to answer teammate questions using
company guidance, route unclear ownership to the right team, and avoid guessing about legal, security, or
customer-impacting decisions.
```

## 2. Playbooks

"Playbooks are onboarding documents for your agents. They define explicit SOPs an agent can access anytime."
They are not placed into every prompt; they stay available as reference material the agent pulls in when a
task calls for it.

Console: Agent → Playbooks → **New playbook** → title, description, body. New playbooks start as **Draft**,
which running agents do not receive; select the Draft badge to publish as **Active**.

Playbooks have no public REST endpoint. Manage them in the console, with `playbooks:` in
`brainbase.agent.yaml` plus `brainbase agent push`, or from an MCP client with the Brainbase MCP tools
`playbooks_list`, `playbooks_upsert`, `playbooks_archive`. (The CLI control plane's manifest endpoint
archives playbooks absent from a push only when `reconcile_playbooks` is sent; `brainbase-cli`.)

Typical uses: resume review (criteria, red flags, scoring, summary format); brand guidelines; sales
qualification (ICP signals, discovery questions, disqualifiers, CRM update rules); support triage
(categories, escalation paths, required follow-ups); process guides (lead research, invoice review, partner
onboarding). Best practices: a clear step-by-step SOP; exact code snippets or commands for deterministic
technical steps; short enough for a human to scan; one step, policy or short process per playbook; update
when reviewers correct the agent. Users can @mention a playbook when creating a task or sending a follow-up
(changelog 2026-07-24 fixes).

Quickstart example (abridged): a "# Acme Grove Internal Knowledge" playbook with sections Company context,
Routing rules (product → Product, escalations → Support Leadership, security → Security, legal → Legal,
pricing exceptions → Sales Leadership, renewal risk → CS Leadership), Operating norms, Common policies and
Guardrails (do not copy customer data into personal tools; do not answer legal/compliance/security from memory).

## 3. Instructions vs playbooks vs skills

| Put it in | When |
| --- | --- |
| Instructions | High-level identity and default behaviour: what it is, how it communicates, boundaries, always-on principles. |
| Playbooks | Company-specific SOPs, policies, rubrics, examples and agent-specific processes for recurring situations. |
| Skills | Reusable, company-agnostic capabilities: creating PPTX decks, analysing spreadsheets, a portable technical process (`brainbase-skills`). |
| Memory | Structured data reused across tasks (`brainbase-memory`). |

## 4. Modes

"Modes are custom operating states for an agent. A mode can inject a prompt, enable selected tool groups,
and control which other modes the agent can switch into." Console: Agent → Modes → create with display name,
description, prompt → choose tool groups and transitions. No public API or manifest field is documented.

| Setting | Meaning |
| --- | --- |
| Display name | Human-readable name shown in the interface. |
| Name | Lowercase identifier the agent uses with `change_mode`. |
| Description | When the agent should use the mode. |
| Tool groups | Capabilities available while the mode is active. |
| Inject prompt | Extra system guidance applied only in that mode. |
| Allowed transitions | Which modes the agent can switch into next. |

Examples: Research mode (read and summarize, discourage changes), Build mode (implementation tools), Triage
mode (classification, routing, follow-up questions). Best practices: create a mode only when behaviour
should meaningfully change; keep prompts short; restricted tool groups for review/research/intake; leave
transitions unrestricted unless the workflow needs guardrails; avoid names overlapping built-in modes like
`agent` or `build`. Changelog 2026-05-29: custom mode names and transitions are validated before use; mode
summaries sent to the model are normalized. Modes are not part of the pinned definition (section 5), though
mode prompts appear in version diffs (changelog 2026-08-21).

## 5. Versions, restore and pinning

A version is a snapshot of the agent's definition: instructions, entrypoint, installed skills, tools,
playbooks, harness and default model. Versions are captured automatically a few seconds after an edit
settles, from the console, CLI or API (changelog 2026-08-21: full timeline newest first with who/when;
line-by-line diffs for instructions, entrypoint, playbook bodies, function scripts and mode prompts, plain
before/after for other settings; secret values are never stored, only which secrets exist). Each task
records the version it ran on (badge on the task).

Name and restore: **Name this version** labels the latest; **Rename…** on a row names that version.
**Restore** copies an earlier definition back onto the agent and creates a new version, so nothing is lost.

Pin: by default an agent runs its latest definition. Pinning makes new tasks run the pinned version until
the pin moves or is removed, while edits keep saving as new versions; running tasks keep their version.
Console: Versions page → choose version → **Pin** → confirm; the Version tile reads "Pinned"; **Unpin** to
return to latest. API: `PUT /v2/agents/{agent_id}/pin` `{"version_id", "expected_version_id"?}` (`409
pin_changed`), `DELETE /v2/agents/{agent_id}/pin?expected_version_id=` (`409 pin_changed` / `not_pinned`).
CLI: `brainbase agent versions list|show|diff|label|restore --dry-run|pin|unpin` (changelog 2026-10-30;
from CLI v0.53.0 pin/unpin conflict if someone moved the pin).

| Frozen by the pin | Always current |
| --- | --- |
| Instructions | Secret values |
| Entrypoint | Tool credentials (MCP env and headers, matched by tool name) |
| Installed skills (which ones are installed) | Skill file contents — these follow the current skill version |
| Tools (MCP url, command, arguments, enabled) | Machine kind, size and accelerator |
| Playbooks | Memory, browser and shared-folder toggles |
| Harness | Slack, GitHub and meeting connections |
| Default model | Permission rules, modes, functions, workflows |
| Agent name and tagline | Revision number (the sync marker the CLI compares against) |

Run one task on a specific version, pinned or not: choose it in the new-task composer, pass
`agent_version_id` to `POST /v2/tasks`, or `brainbase task create --message "…" --version v12` (`12`, `v12`
or a version id; an unknown version creates no task; `--json` adds `agent_version_id` and
`version_number`; only your own login or token can choose a version). A per-task model or machine size
still applies.

Limits: a task's version is fixed at creation; skill file contents are not frozen; workflows, functions,
modes and permission rules are not part of the pinned definition yet; pushing configuration from inside a
pinned task with the CLI is refused (edit in the web app or push from outside); any agent can be pinned but
a task only starts when the pinned harness is one the managed runtime can execute — a legacy `kafka`
harness pin refuses every new task with `422 pinned_harness_unavailable` while the tile still says
"Pinned"; unpinning is the only way back to live; if an operator disables pin enforcement service-wide,
pins stay recorded but stop applying while the tile still says "Pinned".

## 6. Secrets on an agent

"Secrets are environment variables and credentials available to an agent at runtime." Console: Agent →
Secrets → **Add secret** → key + value → save. API: `secrets` map on `POST /v2/agents`, `PATCH
/v2/agents/{agent_id}` and the inline spec (note: `GET /v2/agents/{agent_id}` returns the map in plaintext;
the docs page says saved values "are never shown again, in the app or through the API" — treat the agent
object as sensitive either way). CLI: `.brainbase/secrets.env` (gitignored), synced by `agent pull`/`push`;
`PUT /v2/cli/agents/{agent_id}/secrets` is a whole-map replace.

Rules:
- Keys match `^[A-Z][A-Z0-9_]*$`; duplicates cannot be saved; to change a value type a new one over it.
- Reserved, never injected from secrets: `BRAINBASE_TOKEN`, `BRAINBASE_TASK_ID`, `BRAINBASE_AGENT_ID`,
  `BRAINBASE_API_URL`, `BRAINBASE_SHARED_DIR`, `BB_TASK_KEY`, `MEDIA_API_KEY`, `PROXY_BASE_URL`,
  `IS_SANDBOX`. Use your own prefix; avoid `BRAINBASE_`. `ANTHROPIC_BASE_URL` and `OPENAI_BASE_URL` are not
  reserved.
- The agent reads them the normal way, e.g. `process.env.LINEAR_API_KEY`.
- Inheritance: an agent inherits the secrets of the orchestration it belongs to (one orchestration at a
  time); inherited keys show the source orchestration; an agent-level key of the same name overrides.
  Names and conflicts: `GET /v2/agents/{agent_id}/secrets/inherited`. (`brainbase-orchestration`)
- Vendor keys for Cursor/Factory/Qoder (`CURSOR_API_KEY`/`CURSOR_AUTH_TOKEN`, `FACTORY_API_KEY`,
  `QODER_PERSONAL_ACCESS_TOKEN`/`BRAINBASE_QODER_PAT`) are ordinary agent or orchestration secrets.
- Uses: API keys, private configuration (base URLs, tenant ids), entrypoint setup credentials, function
  runtime values. Add a secret when a value is private, environment-specific or likely to rotate.
- Best practices: clear uppercase keys like `LINEAR_API_KEY`, `CRM_BASE_URL`; smallest-scoped credential;
  rotate when people leave or credentials are exposed; never paste values into instructions, playbooks,
  memory, `brainbase.agent.yaml` or example files; remove unused secrets.

## 7. How Brainbase stores and injects secrets (`/docs/secrets-at-brainbase`)

- Storage: encrypted at rest in a managed, access-controlled store; scoped to one agent or one
  orchestration (an orchestration's secrets reach only its member agents); nothing shared implicitly across
  teams or workspaces; only authorized managers can set or read values through the API.
- Runtime injection: delivered only at execution into that run's isolated sandbox as environment variables;
  per-run and ephemeral (each task gets a fresh sandbox); injection uses a narrow agent-scoped credential, so
  a run reaches only the agent's own secrets plus inherited ones.
- Safeguards: a multi-layer redactor masks known credential formats and high-entropy values in logs, events
  and transcripts before persistence; secrets never go to outside services; rotate anytime and the change
  applies on the next run.
- Caution: agents are instructed not to echo secrets, but a user can still prompt one to print environment
  variables or write them to a file; avoid asking secret-bearing agents to expose runtime values.
