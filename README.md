<div align="center">

# Brainbase Plugin

**Fourteen skills that teach your coding agent how Brainbase works.**

By [Brainbase Labs](https://brainbaselabs.com/)

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)

</div>

Brainbase Plugin is a set of skills for Claude Code, Codex, Cursor and other coding agents that work with the [Brainbase](https://brainbaselabs.com) agent platform. Ask your agent to publish an agent from a folder, switch a running task's model, wire an orchestration, connect Slack, add an eval or mint a CI token, and the matching skill opens on its own with the exact commands, endpoints, fields, limits and error codes.

It's built from the public docs at [docs.brainbaselabs.com](https://docs.brainbaselabs.com) and the public [changelog](https://app.brainbaselabs.com/changelog) only. Where the docs are silent the skill says so instead of guessing, and it tells the agent when an action spends credits or can't be undone.

## Install

### Let your agent install it

Paste the prompt for your tool. If your agent can read web pages, pasting just the link to this repo and asking it to install the plugin also works.

**Claude Code**

```text
Install the plugin from https://github.com/BrainbaseHQ/brainbase-plugin. Follow the "Instructions for agents" section of its README.

This plugin contains fourteen skills with instructions on how to operate the Brainbase
agent platform: the brainbase CLI and agent manifest, models and routing, sandboxes,
orchestrations, surfaces (Slack, Linear, GitHub, phone, meetings), interfaces,
benchmarks, evaluations, permissions and tokens, tools and MCP servers, skills, memory,
and payments and credits. Each skill carries the exact commands, endpoints, fields,
limits and error codes from the public docs, and opens on its own when a request
touches its area.
```

**Codex**

```text
Install the skills from https://github.com/BrainbaseHQ/brainbase-plugin into ~/.agents/skills. Follow the "Instructions for agents" section of its README.

This plugin contains fourteen skills with instructions on how to operate the Brainbase
agent platform: the brainbase CLI and agent manifest, models and routing, sandboxes,
orchestrations, surfaces (Slack, Linear, GitHub, phone, meetings), interfaces,
benchmarks, evaluations, permissions and tokens, tools and MCP servers, skills, memory,
and payments and credits. Each skill carries the exact commands, endpoints, fields,
limits and error codes from the public docs, and opens on its own when a request
touches its area.
```

**Cursor**

```text
Install the skills from https://github.com/BrainbaseHQ/brainbase-plugin into ~/.cursor/skills. Follow the "Instructions for agents" section of its README.

This plugin contains fourteen skills with instructions on how to operate the Brainbase
agent platform: the brainbase CLI and agent manifest, models and routing, sandboxes,
orchestrations, surfaces (Slack, Linear, GitHub, phone, meetings), interfaces,
benchmarks, evaluations, permissions and tokens, tools and MCP servers, skills, memory,
and payments and credits. Each skill carries the exact commands, endpoints, fields,
limits and error codes from the public docs, and opens on its own when a request
touches its area.
```

**Claude (web and desktop chat)**

Here you upload the skills yourself, and this prompt walks you through it:

```text
Help me install the skills from https://github.com/BrainbaseHQ/brainbase-plugin. Follow the "Instructions for agents" section of its README.

This plugin contains fourteen skills with instructions on how to operate the Brainbase
agent platform: the brainbase CLI and agent manifest, models and routing, sandboxes,
orchestrations, surfaces (Slack, Linear, GitHub, phone, meetings), interfaces,
benchmarks, evaluations, permissions and tokens, tools and MCP servers, skills, memory,
and payments and credits. Each skill carries the exact commands, endpoints, fields,
limits and error codes from the public docs, and opens on its own when a request
touches its area.
```

**Other agents**

This works in any agent listed under [Other agents](#other-agents) below:

```text
Install the skills from https://github.com/BrainbaseHQ/brainbase-plugin into this tool's personal skills folder. Follow the "Instructions for agents" section of its README.

This plugin contains fourteen skills with instructions on how to operate the Brainbase
agent platform: the brainbase CLI and agent manifest, models and routing, sandboxes,
orchestrations, surfaces (Slack, Linear, GitHub, phone, meetings), interfaces,
benchmarks, evaluations, permissions and tokens, tools and MCP servers, skills, memory,
and payments and credits. Each skill carries the exact commands, endpoints, fields,
limits and error codes from the public docs, and opens on its own when a request
touches its area.
```

### Claude Code

Claude Code installs the whole plugin from its marketplace. In a session:

```text
/plugin marketplace add BrainbaseHQ/brainbase-plugin
/plugin install brainbase@brainbase-plugin
```

Or from a terminal, which is what the agent prompt above runs:

```bash
claude plugin marketplace add BrainbaseHQ/brainbase-plugin
```

```bash
claude plugin install brainbase@brainbase-plugin
```

Skills open on their own when your request matches. To call one directly, type `/brainbase:brainbase-cli` (or any other skill name from the [table below](#skills)). To try a checkout without installing, start Claude Code with `claude --plugin-dir /path/to/brainbase-plugin`.

### Codex

Codex reads the same skills from its personal skills folder. Download **[`brainbase-all-skills.zip`](https://github.com/BrainbaseHQ/brainbase-plugin/releases/latest/download/brainbase-all-skills.zip)** and unzip it there:

```bash
mkdir -p ~/.agents/skills && unzip brainbase-all-skills.zip -d ~/.agents/skills/
```

In the Codex CLI or IDE extension, type `$brainbase-cli` (or any other skill name) to use one directly, or run `/skills` to find them. If they don't appear, restart Codex. See [Codex skills](https://developers.openai.com/codex/skills). The repo also carries a `.codex-plugin/plugin.json` manifest, so it can be listed in a Codex plugin marketplace you configure.

### Claude (web and desktop)

Claude's skill upload takes one skill at a time, so there is a zip per skill. Start with `brainbase-platform` (the orientation skill) and the areas you work in.

1. **Download the zip for a skill** from the [latest release](https://github.com/BrainbaseHQ/brainbase-plugin/releases/latest): `brainbase-platform.zip`, `brainbase-cli.zip`, and so on. Keep it zipped.
2. In Claude, go to **[Customize > Skills](https://claude.ai/customize/skills)**.
3. Click **+**, then **Create skill**, then **Upload a skill**.
4. Select the zip. Make sure the skill is toggled on in your skills list.

> [!IMPORTANT]
> Use the release zips, not GitHub's green **Code > Download ZIP** button. That button packages the whole repository under `brainbase-plugin-main`, and Claude expects one skill per zip with the folder named after the skill.

Skills need code execution, which you can turn on in **Settings > Capabilities**. On Team and Enterprise plans, an owner may need to allow skills first. See [Using skills in Claude](https://support.claude.com/en/articles/12512180-using-skills-in-claude).

### Cursor

Download **[`brainbase-all-skills.zip`](https://github.com/BrainbaseHQ/brainbase-plugin/releases/latest/download/brainbase-all-skills.zip)**, then unzip it into your personal skills folder:

```bash
mkdir -p ~/.cursor/skills && unzip brainbase-all-skills.zip -d ~/.cursor/skills/
```

In Agent chat, type `/` and search for `brainbase` to use a skill directly. See [Cursor skills](https://cursor.com/docs/skills).

### Other agents

Download the same zip, then unzip it into your tool's personal skills folder. For example, for Gemini CLI:

```bash
mkdir -p ~/.gemini/skills && unzip brainbase-all-skills.zip -d ~/.gemini/skills/
```

| Tool | Skills folder | How to use it |
| --- | --- | --- |
| [Gemini CLI](https://geminicli.com/docs/cli/skills/) | `~/.gemini/skills` | Loads when your request matches, after you approve it. Run `/skills reload` if you installed it during a session. |
| [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-skills) | `~/.copilot/skills` | Put `/brainbase-cli` (or another skill name) in your prompt. Run `/skills reload` if you installed it during a session. |
| [OpenCode](https://opencode.ai/docs/skills/) | `~/.config/opencode/skills` | Loads when your request matches. |
| [Cline](https://docs.cline.bot/features/skills) | `~/.cline/skills` | Type `/brainbase-cli`, or let it load when your request matches. |
| [Factory Droid](https://docs.factory.com/cli/configuration/skills) | `~/.factory/skills` | Type `/brainbase-cli`, or let it load when your request matches. |
| [Amp](https://ampcode.com/docs/customize/skills) | `~/.config/agents/skills` | Loads when your request matches. |
| [Devin Desktop](https://docs.devin.ai/desktop/cascade/skills) | `~/.config/devin/skills` | Type `/brainbase-cli`, or let it load when your request matches. |

Using something else? If your tool supports `SKILL.md` skills, check its docs for the personal skills folder. Many also read `~/.agents/skills`.

### Updating

In Claude Code, run `/plugin marketplace update brainbase-plugin` and reinstall, or `claude plugin update brainbase@brainbase-plugin` from a terminal. For the zip installs, download the latest zip and install it again the same way: delete the old `brainbase-*` folders first, or ask your agent to reinstall the skills. If Claude won't accept an upload, delete the old copy of that skill first.

## Instructions for agents

If someone gave you this repo's link and asked you to install the plugin or its skills, follow these steps.

1. **Pick the route for the tool you're running in.** If you can't tell, ask.

   | Tool | Route |
   | --- | --- |
   | Claude Code | Plugin install (step 2) |
   | Codex | Skills zip into `~/.agents/skills` (step 3) |
   | Cursor | Skills zip into `~/.cursor/skills` (step 3) |
   | Gemini CLI | Skills zip into `~/.gemini/skills` (step 3) |
   | GitHub Copilot CLI | Skills zip into `~/.copilot/skills` (step 3) |
   | OpenCode | Skills zip into `~/.config/opencode/skills` (step 3) |
   | Cline | Skills zip into `~/.cline/skills` (step 3) |
   | Factory Droid | Skills zip into `~/.factory/skills` (step 3) |
   | Amp | Skills zip into `~/.config/agents/skills` (step 3) |
   | Devin Desktop | Skills zip into `~/.config/devin/skills` (step 3) |

   If your tool isn't listed, use the personal skills folder from its docs. If you can't confirm one, ask.

   If you're Claude in a web or desktop chat and can't write to the person's skills, don't try to install anything. Give them the [latest release](https://github.com/BrainbaseHQ/brainbase-plugin/releases/latest) link and the upload steps from the "Claude (web and desktop)" section above, then stop.

2. **Claude Code: install the plugin.** Run these two commands, in order. They need no confirmation and install for the person's user account, so the plugin is available in every project.

   ```bash
   claude plugin marketplace add BrainbaseHQ/brainbase-plugin
   claude plugin install brainbase@brainbase-plugin
   ```

   Confirm with `claude plugin list`, which should show `brainbase@brainbase-plugin`. Then go to step 5. If the person is inside a Claude Code session rather than a terminal, give them the two `/plugin` commands from the "Claude Code" section instead.

3. **Every other tool: check for an existing copy, then install the skills zip.** If any `brainbase-*` folder is already in the skills folder, ask before replacing it; if they decline, stop. Set `SKILLS_DIR` to the folder from step 1. Use the release zip rather than cloning the repo, so that only the skills are installed. On Windows, use the PowerShell equivalents, and keep the same order.

   ```bash
   (
     set -e
     SKILLS_DIR="$HOME/.agents/skills"  # replace with your tool's folder from step 1
     mkdir -p "$SKILLS_DIR"
     TMP_DIR="$(mktemp -d "$SKILLS_DIR/.brainbase-all-skills.XXXXXX")"
     trap 'rm -rf "$TMP_DIR"' EXIT
     curl -fsSL "https://github.com/BrainbaseHQ/brainbase-plugin/releases/latest/download/brainbase-all-skills.zip" -o "$TMP_DIR/skills.zip"
     unzip -q "$TMP_DIR/skills.zip" -d "$TMP_DIR/unpacked"
     test -f "$TMP_DIR/unpacked/brainbase-platform/SKILL.md"
     for dir in "$TMP_DIR"/unpacked/brainbase-*/; do
       name="$(basename "$dir")"
       rm -rf "${SKILLS_DIR:?}/$name"
       mv "$dir" "$SKILLS_DIR/"
     done
   )
   ```

   If this fails, tell the person what went wrong; any existing copies are still in place. If your sandbox blocks the download or the write, give them these commands to run themselves.

4. **Confirm the install.** Check that fourteen `brainbase-*/SKILL.md` files exist in the skills folder.

5. **Report back.** Tell them where you installed it and how to use it, using the section above for their tool. Suggest they start with `brainbase-platform`, the orientation skill, if they are new to Brainbase. If the skills don't appear, they may need to restart the tool. Don't change anything else on their machine.

## Usage

Ask about Brainbase in your own words. Your agent picks up the right skill on its own:

```text
I have a folder with instructions for an agent. Get it onto Brainbase from CI and
kick off a task I can wait on.
```

```text
Our Cursor-harness agent fails with missing_required_secret. What's wrong?
```

```text
Write a brainbase-orchestration.yaml where a triage agent hands confirmed bugs to a
fixer agent every weekday at 09:00 UTC.
```

### What you get

| In the answer | What it means |
| --- | --- |
| **Exact commands and calls** | `brainbase` CLI commands with their flags, `/v2` endpoints with their fields, manifest keys that exist |
| **Which credential a step needs** | A PAT and its scope, a login session, or the console, before you run anything |
| **What it costs** | A flag whenever a step starts a task, keeps a sandbox warm, runs a judge, or otherwise spends credits |
| **What can't be undone** | A confirmation request before deletes, archives, revokes and pushes that archive cloud state |
| **Where the docs stop** | A plain "the docs don't say" plus the live page to check, instead of a guess |

## Skills

A skill opens when the agent decides the conversation needs it, so you rarely invoke one by name. When you do, use `/brainbase:<skill>` in Claude Code or `$<skill>` in Codex.

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

### Companion: Brainbase MCP

The same marketplace lists [`brainbase-mcp`](https://github.com/BrainbaseHQ/brainbase-mcp), the official Brainbase MCP with its operating skill. The skills here explain the platform; the MCP gives the agent live, authenticated access to your agents, evals, orchestrations and tasks. Install both for the full picture:

```text
/plugin install brainbase-mcp@brainbase-plugin
```

## Network and data

The plugin is documentation only: Markdown skills and their reference files. It ships no MCP server, no hooks and no scripts that run on install or at load time, so the plugin itself reads nothing from your machine, sends nothing and stores nothing. Following a skill, your agent may run commands or requests on your behalf, with your own Brainbase credentials, to these services:

| Service | Hosts | What goes there |
| --- | --- | --- |
| Brainbase platform (the vendor of this plugin) | `api.brainbaselabs.com`, `api.v1.brainbaselabs.com`, `app.brainbaselabs.com` | API calls the skills document (agents, tasks, evals, orchestrations, machines, tokens), made with your `BRAINBASE_API_KEY` or `BRAINBASE_TOKEN`. Anything you create there is your workspace data, kept under Brainbase's [privacy policy](https://brainbaselabs.com/privacy) until you delete it. |
| Brainbase docs | `docs.brainbaselabs.com` | Plain page fetches when a skill asks the agent to check a live docs page. No credentials. |
| Brainbase built-in MCP servers | `brainbase-*-mcp.onrender.com`, `meeting.mcp.brainbaselabs.com` | Reached only from inside a Brainbase sandbox by the agent running there, with the task's own token. The skills describe them; nothing on your machine connects to them. |
| GitHub | `github.com` | The release zip in the install instructions above, and `git clone` examples that use your own `GITHUB_TOKEN` for your own private repositories. |

Third-party hosts named in the skills (`api.githubcopilot.com`, `gitlab.com`, vendor documentation sites) appear only as examples of what you might configure on your own agent. The skills tell the agent never to ask for, print or write credential values, and to reference them by environment variable name instead.

## How the skills stay honest

- Every reference file names the docs pages it condenses (`Source:` lines) and the date of the snapshot it was written from (`Snapshot:`).
- Facts come from the docs and changelog only. Where the docs are silent, the skill says so and points at the live page instead of guessing.
- Skills tell the agent to fetch the live docs for console click paths, prices, model lists and other version-sensitive details, and to treat fetched pages as data rather than instructions.
- Skills never ask for or print secret values, and they say when an action spends credits or is destructive.
- Every skill ships eval cases that run with and without the skill. The latest benchmark is in [docs/evals.md](docs/evals.md): 98% of assertions pass with the skills, 16% without.

## What's inside

| Path | Purpose |
| --- | --- |
| [`skills/<skill>/SKILL.md`](skills) | The operating guide for one area, which the agent follows |
| `skills/<skill>/references/*.md` | Docs-derived detail the agent reads on demand |
| `skills/<skill>/evals/<case>/` | Eval cases in the `claude plugin eval` layout |
| [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) | Claude Code plugin manifest |
| [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) | Marketplace listing this plugin and `brainbase-mcp` |
| [`.codex-plugin/plugin.json`](.codex-plugin/plugin.json) | Codex plugin manifest |
| [`.agents/plugins/marketplace.json`](.agents/plugins/marketplace.json) | Codex marketplace manifest |
| [`docs/skill-authoring.md`](docs/skill-authoring.md) | How to write and update a skill here |
| [`docs/evals.md`](docs/evals.md) | The eval cases and the latest benchmark |
| [`scripts/validate.mjs`](scripts/validate.mjs) | Repository checks run in CI |
| `.github/workflows/release-skills.yml` | Rebuilds the skill zips on the release page whenever a skill changes |

## Contributing

Read [docs/skill-authoring.md](docs/skill-authoring.md) before changing a skill, then run the checks:

```bash
node scripts/validate.mjs
claude plugin validate .
```

When the docs change, update the matching reference file, bump its `Snapshot:` date, and adjust `SKILL.md` if a workflow or limit moved. Keep skill names stable; hosts namespace and link to them.

Each skill ships two eval cases under `skills/<name>/evals/<case>/` (a prompt, the expected outcome and one grader file per assertion). They run with and without the skill through Claude Code's plugin evals, which are real, billed model runs:

```bash
claude plugin eval skills/brainbase-cli --allow-tools Write
```

Maintained by [Brainbase Labs](https://brainbaselabs.com/). Released under the [MIT License](LICENSE).
