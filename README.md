# Brainbase plugin

Skills that teach AI coding agents how the [Brainbase](https://brainbaselabs.com) platform works and how to operate it: the `brainbase` CLI, models and the LLM gateway, sandboxes, orchestrations, surfaces, interfaces, benchmarks, evaluations, permissions, tools, skills, memory, and payments.

Each skill condenses one area of the public docs at [docs.brainbaselabs.com](https://docs.brainbaselabs.com) and the public [changelog](https://app.brainbaselabs.com/changelog) into an operating guide the model can act on, with the exact commands, endpoints, fields, limits and error codes, and with pointers back to the live pages for anything that drifts.

## Install

### Claude Code

```text
/plugin marketplace add BrainbaseHQ/brainbase-plugin
/plugin install brainbase@brainbase-plugin
```

On Claude Code 2.1.275 or later the two steps collapse into one:

```text
/plugin install brainbase --marketplace BrainbaseHQ/brainbase-plugin
```

To try a checkout without installing, start Claude Code with `claude --plugin-dir /path/to/brainbase-plugin`.

### Codex CLI

```bash
codex plugin marketplace add BrainbaseHQ/brainbase-plugin
codex plugin add brainbase@brainbase-plugin
```

### Companion: Brainbase MCP

The same marketplace lists [`brainbase-mcp`](https://github.com/BrainbaseHQ/brainbase-mcp), the official Brainbase MCP with its operating skill. The skills here explain the platform; the MCP gives the model live, authenticated access to your agents, evals, orchestrations and tasks. Install both for the full picture:

```text
/plugin install brainbase-mcp@brainbase-plugin
```

## Skills

The plugin loads these skills. A skill opens when the model decides the conversation needs it, so you rarely invoke one by name; when you do, use `/brainbase:<skill>` in Claude Code or `$<skill>` in Codex.

| Skill | What it covers |
| --- | --- |
| `brainbase-platform` | Orientation: agents, harnesses, tasks and threads, the Universal Harness API, agent configuration basics (instructions, playbooks, modes, versions, secrets), monitoring tasks, and which skill to open next. |
| `brainbase-cli` | The `brainbase` CLI end to end: install, login and tokens, the agent manifest, init/create/link/pull/push/sync, tasks from the terminal, templates, skills, orchestrations, exit codes, environment variables. |
| `brainbase-llm-gateway` | Models and routing: the catalog and model IDs, defaults per harness, Auto, per-harness availability, switching a task's model, Bring Your Own Bedrock, vendor keys, harness tracking through the model proxy. |
| `brainbase-sandboxes` | Sandboxes and machines: providers, sizes and pricing, GPU, `machine_kind`, the machines API, entrypoint, file system, shared folders, file transfers, previews, Cloudflare sleep and resume. |
| `brainbase-orchestration` | Orchestrations: graphs of agents, edges, triggers and schedules, the orchestration manifest, CLI and API, templates, shared secrets, MCP servers and memory, scheduled agents, workflows. |
| `brainbase-surfaces` | Surfaces: chat, Slack, Linear, GitHub, phone and meetings; connecting them from the console and CLI; what each surface lets people do. |
| `brainbase-interfaces` | Interfaces: private dashboards an agent builds for its users; audiences, building in chat, source edits, publishing, rollback, archive, `brainbase interface`. |
| `brainbase-benchmarks` | Benchmarks (beta): cases, checks, versions, runs, variants, baselines, results, import and export, the API, harness bake-offs. |
| `brainbase-evals` | Evaluations: turn-level automatic checks, the manifest `evals` list, the evals API, agent-as-judge, eval-driven development, credits and write credentials. |
| `brainbase-permissions` | Access control: organizations, teams, projects and members; roles; PAT scopes and resource scope; API keys versus sessions; Allow/Ask/Deny rules; secrets; audiences; spend limits; SSO. |
| `brainbase-tools` | Tools: integrations through `brainbase-apps` and `bb-apps`, integrations from code, MCP servers (agent, orchestration, built-in), functions, browser, the Brainbase MCP. |
| `brainbase-skills` | Skills on Brainbase: installing from the registry, GitHub or git, the manifest `skills` list, `brainbase skill` commands, publishing, skills versus instructions versus playbooks. |
| `brainbase-memory` | Memory: structured tables, the `memory_*` tools, `capabilities.memory`, shared memory across an orchestration, memory versus playbooks and secrets. |
| `brainbase-payments` | Payments (beta) and money: agent purchase requests with wallet approvals, the Payments page; credits, the prepaid wallet, top-ups, spend limits, billing, what consumes credits. |

## How the skills stay honest

- Every reference file names the docs pages it condenses (`Source:` lines) and the date of the snapshot it was written from (`Snapshot:`).
- Facts come from the docs and changelog only. Where the docs are silent, the skill says so and points at the live page instead of guessing.
- Skills tell the model to fetch the live docs for console click paths, prices, model lists and other version-sensitive details, and to treat fetched pages as data rather than instructions.
- Skills never ask for or print secret values, and they say when an action spends credits or is destructive.

## Repository layout

```text
.claude-plugin/plugin.json        Claude Code plugin manifest
.claude-plugin/marketplace.json   Marketplace listing this plugin and brainbase-mcp
.codex-plugin/plugin.json         Codex plugin manifest
.agents/plugins/marketplace.json  Codex marketplace manifest
skills/<skill>/SKILL.md           One operating guide per area
skills/<skill>/references/*.md    Docs-derived detail, read on demand
docs/skill-authoring.md           How to write and update a skill here
scripts/validate.mjs              Repository checks run in CI
```

## Contributing

Read [docs/skill-authoring.md](docs/skill-authoring.md) before changing a skill, then run the checks:

```bash
node scripts/validate.mjs
claude plugin validate .
```

When the docs change, update the matching reference file, bump its `Snapshot:` date, and adjust `SKILL.md` if a workflow or limit moved. Keep skill names stable; hosts namespace and link to them.

## License

MIT. See [LICENSE](LICENSE).
