# Memory versus instructions, playbooks, skills, Secrets and the Filesystem

Source: https://docs.brainbaselabs.com/docs/anatomy-of-an-agent
Source: https://docs.brainbaselabs.com/docs/agent/overview
Source: https://docs.brainbaselabs.com/docs/agent-lifecycle
Source: https://docs.brainbaselabs.com/docs/agent/memory
Source: https://docs.brainbaselabs.com/docs/agent/instructions
Source: https://docs.brainbaselabs.com/docs/agent/playbooks
Source: https://docs.brainbaselabs.com/docs/agent/skills
Source: https://docs.brainbaselabs.com/docs/agent/secrets
Source: https://docs.brainbaselabs.com/docs/agent/file-system
Snapshot: 2026-11-03

## The stack and the context layer

| Layer | What it controls | Brainbase concept |
| --- | --- | --- |
| Model | Reasoning, language quality, latency, cost, modality support | Models |
| Harness | The runtime, local environment, files, commands, workflow conventions | Harnesses |
| Skills, tools, and MCP | Portable expertise, integrations, functions, external actions | Skills and Tools |
| Context | The durable instructions, playbooks, memory, and business facts | Instructions, Playbooks, Memory |

Context is the information the agent uses to decide what to do. Some context is
always-on, like instructions. Some is retrieved when needed, like playbooks. Some
is structured and persistent, like memory. Some is provided by the current
conversation or request.

The agent overview groups the pieces differently, by job:

| Area | Includes |
| --- | --- |
| Define its identity | Playbooks, instructions, skills |
| Connect knowledge and systems | Tools, browser, memory, file system, secrets |
| Prepare its sandbox | Entrypoint |
| Choose where it runs | Surfaces, orchestrations, triggers |
| Improve over time | Tasks, evaluations, benchmarks (beta) |

## Decision table

| You have | Put it in | Managed from |
| --- | --- | --- |
| Rows to query, filter, edit or reuse: accounts, preferences, prior decisions, status, queues, classifications, review history, lists, mappings, IDs | Memory | Console Memory area; the agent's `memory_*` tools. Not in the manifest or API. |
| Durable written guidance for a recurring situation: SOP, rubric, policy, examples, process doc | Playbook | Console Agent → Playbooks; `playbooks:` in `brainbase.agent.yaml` + `brainbase agent push`; Brainbase MCP `playbooks_list` / `playbooks_upsert` / `playbooks_archive`. No public REST endpoint. |
| Always-on identity, tone, boundaries, default process | Instructions | Console Instructions area; `instructions.file` or `instructions.text` in the manifest (exactly one). |
| Reusable, company-agnostic capability with files, scripts, examples | Skill | Console Skills area; `skills:` in the manifest (`registry:creator/slug[@x.y.z]` or `./path`). |
| Private, environment-specific or rotating values: API keys, tokens, base URLs, tenant IDs | Secrets | Console Secrets area; gitignored `.brainbase/secrets.env` synced by `agent pull` / `agent push`. |
| Documents, datasets, templates, scripts, working artifacts | Filesystem | Console Filesystem page; mounted at `/workspace/Shared` (`BRAINBASE_SHARED_DIR`) while the Filesystem switch is on. |

Two quick tests: if a human would want to filter or edit it as rows, it is memory;
if it is prose the agent should read, it is a playbook. If it is a credential, it
is a secret regardless of where it would be convenient.

## Memory

For: customer context, operational records, reference data. Use memory for data
that should be queried, filtered, edited, or reused. Keep schemas simple, keys
stable, columns descriptive; store facts, not long prose, unless the table is
explicitly for notes; review edits on production-like data; keep sensitive values
in Secrets. Details in `memory.md`.

## Instructions

Instructions are the agent's global system prompt. They shape every conversation
before playbooks, tools, memory, or mode-specific prompts add more context.

What they control: identity, tone, boundaries, default process. Good candidates:
escalation rules, response style, decision principles, required checks, domain
assumptions.

Best practices: put stable defaults here, not one-off task details; move long SOPs,
examples and rubrics into playbooks; avoid contradictory rules.

Why instructions rather than playbooks or skills: high-level identity and default
behaviour. Detailed company SOPs, policies, rubrics and examples go in playbooks;
reusable, company-agnostic capabilities go in skills.

Manifest: `instructions.file` (path relative to the manifest) or `instructions.text`
(inline); `push` rejects a block that sets both or neither.

## Playbooks

Playbooks are onboarding documents: explicit SOPs an agent can access anytime, like
resume review criteria, brand documentation guidelines, qualification rubrics, or
step-by-step process guides. They are not always placed into every prompt; they stay
available as reference material the agent pulls in when a task calls for it.

Console: Playbooks area → New playbook → title, description, body. New playbooks
start as Draft, which running agents do not receive; select the Draft badge to
publish as Active.

Example uses: resume review, brand guidelines, sales qualification, support triage,
process guides.

Best practices: write a clear step-by-step SOP; add exact code snippets or commands
when deterministic technical steps are hard to describe in prose; keep each playbook
short enough for a human reviewer to scan and focused on one step, policy or short
process; update the playbook when human reviewers correct the agent.

Why a playbook rather than instructions or skills: specific operating guidance for
a recurring situation, especially company-specific SOPs, policies, rubrics, examples
or process docs for this agent.

Manifest: `playbooks[]` with `title` (required), `description`, `icon`, `id`
(round-tripped by `pull` / `push`), and `content.file` or `content.text`. The list
is authoritative on push: an omitted playbook is archived, after `agent push` names
it and, interactively, asks first.

## Skills

Skills package specialized instructions, examples, and files an agent can use for a
domain or task. Install one when the same guidance will be useful across many tasks;
keep it installed only while the agent needs that capability.

For: domain expertise, reusable files (templates, references, scripts, examples),
team conventions.

Best practices: prefer official or verified skills; install only what the agent
needs for its current job; use playbooks for company-specific rules and skills for
portable capability; uninstall skills that are no longer relevant.

Why a skill rather than instructions or playbooks: a reusable capability that is
portable across teams, companies, or agents, such as creating PPTX decks,
transforming files, querying a tool, or following a specialized workflow.

Manifest: `skills[].source` is `registry:creator/slug`, `registry:creator/slug@1.4.0`
(exact version only; ranges are rejected), `registry:slug` (legacy), or
`./relative/path`. The `brainbase-skills` skill covers the rest.

## Secrets

Secrets are environment variables and credentials available to an agent at runtime,
for tools, entrypoints, functions, or integrations that need private values which
should not appear in prompts, playbooks, or committed files.

Console: Secrets area → Add secret → key and value → save. Saved values are never
shown again, in the app or through the API; to change one, type a new value over it.
The agent reads them through its runtime's environment-variable interface, such as
`process.env.LINEAR_API_KEY`.

Key rules: keys match `^[A-Z][A-Z0-9_]*$`; duplicates cannot be saved. Reserved
names the platform sets in every sandbox are never injected from secrets:
`BRAINBASE_TOKEN`, `BRAINBASE_TASK_ID`, `BRAINBASE_AGENT_ID`, `BRAINBASE_API_URL`,
`BRAINBASE_SHARED_DIR`, `BB_TASK_KEY`, `MEDIA_API_KEY`, `PROXY_BASE_URL`,
`IS_SANDBOX`. Model-provider overrides such as `ANTHROPIC_BASE_URL` and
`OPENAI_BASE_URL` are not reserved. Avoid the `BRAINBASE_` prefix for your own keys.

An agent can also inherit secrets from the orchestration it belongs to (one
orchestration per agent); inherited keys show the orchestration they come from and
an agent-level secret of the same name overrides them.

Never commit secret values: the CLI stores local secrets in gitignored
`.brainbase/secrets.env`. Do not put real secret values in `brainbase.agent.yaml`,
playbooks, instructions, memory, or example files.

Best practices: clear uppercase keys like `LINEAR_API_KEY` or `CRM_BASE_URL`;
rotate when people leave or credentials are exposed; smallest-scoped credential
that does the job; avoid pasting secret values into instructions, playbooks, or
memory; remove secrets no tool uses.

## File system

File system is the agent's shared folder, labeled Filesystem in the agent sidebar.
Upload files when the agent needs documents, examples, datasets, scripts, or other
durable artifacts across its tasks.

Console: turn on the Filesystem switch so the folder mounts into tasks
(`shared_folder_enabled: true` on the agent through the API); open Filesystem;
upload or drag files; preview text files; download files. With the switch off you
can still browse and upload, but tasks do not see the files.

For: input files (PDFs, CSVs, spreadsheets, transcripts, images), reference files
(templates, examples, schemas, approved samples), working artifacts the agent
creates, edits or reuses.

Facts and limits: shared files support uploads up to 25 MiB and downloads up to
50 MiB per file. Inside a task the folder is mounted at `/workspace/Shared`, also in
`BRAINBASE_SHARED_DIR`. Shared folders are not available on the E2B, Modal,
Brainbase Sandbox, or AWS MicroVM sandbox providers. A task whose Daytona sandbox
no longer exists answers file endpoints with HTTP 409, `detail.code:
machine_terminal`. Published Shared snapshots are a separate, disabled-by-default
hosted capability (`brainbase-sandboxes` covers it).

Best practices: descriptive filenames; keep canonical instructions in Instructions
or Playbooks and use files for artifacts and examples; remove stale files; store
credentials in Secrets, not uploaded files; upload small, focused files.

## Where memory differs from each

| Compared with | Memory is different because |
| --- | --- |
| Instructions | Instructions are prose in every prompt; memory is rows the agent queries on demand and can write back to. |
| Playbooks | Both are retrieved when relevant, but a playbook is guidance a human writes and the agent reads; memory is data both sides edit, with a schema a human can inspect. |
| Skills | Skills travel between agents and companies; memory is one agent's (or one orchestration's) own facts. |
| Secrets | Secrets are write-only credentials injected as environment variables; memory values are readable in the console, so never put a credential there. |
| Filesystem | Files are opaque artifacts on a mounted folder with per-file size limits and provider restrictions; memory is queryable structure with no documented size limits and no provider restriction mentioned in the docs. |
