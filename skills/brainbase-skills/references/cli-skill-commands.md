# `brainbase skill` commands, exit codes and install paths

Source: https://docs.brainbaselabs.com/cli/commands/skill, https://docs.brainbaselabs.com/cli/commands, https://docs.brainbaselabs.com/cli/reference/exit-codes, https://docs.brainbaselabs.com/cli/reference/environment, https://docs.brainbaselabs.com/cli/reference/files, https://docs.brainbaselabs.com/cli/concepts/harnesses, https://docs.brainbaselabs.com/cli/authentication
Snapshot: 2026-11-03

Contents: command summary · `skill add` · `skill list` · `skill update` · `skill remove` · `skill search` · `skill info` · `skill publish` · exit codes · prompts and non-interactive runs · `.brainbase.json` · where skills land per harness · environment variables.

## Command summary

| Command | Does |
| --- | --- |
| `brainbase skill add <source>` | Install a skill from GitHub, a generic git URL, the Brainbase registry or a local path. |
| `brainbase skill list` | Show locally installed skills and the source each was fetched from. |
| `brainbase skill update <slug>` | Re-fetch a skill from its recorded source. |
| `brainbase skill remove <slug>` | Uninstall a skill. |
| `brainbase skill search [query]` | Search the Brainbase skill registry. |
| `brainbase skill info <creator/slug>` | Show registry details for a skill. |
| `brainbase skill publish [dir]` | Publish a `SKILL.md` folder to the registry. |

All `skill` commands are auth-gated: they need `BRAINBASE_TOKEN`, a login session in `~/.brainbase/auth.json`, or a saved PAT in `~/.brainbase/token.json`. `brainbase help` prints the same summary.

## brainbase skill add <source>

Install a skill. The source string decides where it is fetched from; a bare `owner/repo` is GitHub short-form (not the registry), and `brainbase://` pulls from the registry. Pin a version inside the source string rather than with a flag. Rename on install with `--as`.

| Source form | Fetched from |
| --- | --- |
| `owner/repo` | GitHub short-form. |
| `owner/repo@ref` | GitHub at a branch or tag. |
| `github:owner/repo/sub/path[@ref]` | GitHub with a subpath. |
| `https://github.com/owner/repo/tree/REF/sub` | GitHub tree URL. |
| `https://gitlab.com/...`, `git@host:...`, `git+<url>` | Generic git (there is no `git:` scheme). |
| `brainbase://creator/slug@version` | Brainbase skill registry. |

```bash
brainbase skill add owner/repo
brainbase skill add github:owner/repo/path/to/skill@v1.2.0
brainbase skill add brainbase://acme/pdf-extract@1.2.0 --as my-skill
```

| Flag | Description |
| --- | --- |
| `--as <slug>` | Install under a different slug. |
| `--scope <s>` | `global` or `project`. |
| `--harness <id>` | Target harness. |

`--yes` / `-y` (a global flag on most commands) matters here when the install would overwrite a skill that already exists: that case is listed among the destructive commands, so it prompts in a terminal and refuses without `--yes` when there is no terminal. The harness is auto-detected from the current folder when `--harness` is omitted.

## brainbase skill list

```bash
brainbase skill list
```

Shows locally installed skills and the source each was fetched from, read from each skill's `.brainbase.json`. The docs show no flags and do not describe a `--json` shape for this command.

## brainbase skill update <slug>

```bash
brainbase skill update pdf-extract
```

Re-fetches the skill from the source recorded in its `.brainbase.json`. Precondition: a skill installed under that name. When there is none it prints `No skill named <slug> found.` and exits `1`; the wording matches `skill remove`, but the exit code differs because the skill is still missing afterwards. Branch on the exit code, not the text. The docs show no flags.

## brainbase skill remove <slug>

```bash
brainbase skill remove pdf-extract
```

Uninstalls the skill. Removing a skill that is not installed counts as nothing to do: the command prints that it found no installation and exits `0`, so a teardown script can remove unconditionally (the docs compare this to `apt`, `npm` and `kubectl`). It is a destructive command: it prompts in a terminal, and with no terminal it needs an explicit `--yes` or exits non-zero naming the flag.

## brainbase skill search [query]

```bash
brainbase skill search "pdf"
brainbase skill search --category devtools --agent claude-code
brainbase skill search --page 2
```

| Flag | Description |
| --- | --- |
| `--category <c>` | Filter by registry category. |
| `--agent <harness>` | Filter by agent harness. |
| `--page <n>` | Results page (1-based). |

The docs list no category values; use `brainbase skill search` output or the live page. (The template equivalent filters by `--target <harness>` instead of `--agent`.)

## brainbase skill info <creator/slug>

```bash
brainbase skill info acme/pdf-extract
```

Shows registry details for a skill. Takes the registry name, not a `brainbase://` source.

## brainbase skill publish [dir]

Publish a `SKILL.md` folder to the registry. `dir` defaults to the current directory.

```bash
brainbase skill publish
brainbase skill publish ./my-skill --name acme/pdf-extract --skill-version 1.2.0 --visibility public
```

| Flag | Description |
| --- | --- |
| `--name <creator/slug>` | Published name in the registry. |
| `--skill-version <MAJOR.MINOR.PATCH>` | Version to publish. |
| `--visibility <v>` | `public`, `unlisted`, or `private`. |
| `--harness <id>` | Target harness. |
| `--yes`, `-y` | Skip confirmation. |

`--name` and `--skill-version` are required when `--yes` is passed (non-interactive publishes). `--category` is accepted by `search` but ignored by `publish`. The commands index notes `--name` is shared with `agent init / create`, `orchestration init` and `token create / rename` (where `-n` is an alias; the alias is not documented for `skill publish`).

On the control plane, `skill publish` calls `GET /orgs` (no scope required) before talking to the registry; the registry request itself is not listed in the control-plane reference. The exit-codes page uses it as its scripting example:

```bash
if ! brainbase skill publish --name acme/thing --skill-version 1.2.0 --yes; then
  echo "publish failed" >&2
  exit 1
fi
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | The command did what you asked, or there was nothing to do. |
| `1` | The command did not do what you asked. The reason is printed on the terminal. |
| `130` | Interrupted with Ctrl-C while waiting (128 + SIGINT). No `skill` command is listed among the waiting commands. |

Skill-specific cases the exit-codes page spells out:

| Command and situation | Exit |
| --- | --- |
| `skill remove <slug>` when nothing is installed under that name | `0` (nothing to do) |
| `skill update <slug>` when nothing is installed under that name | `1`, with `No skill named <slug> found.` |
| `skill update` precondition in the table: "A skill installed under that name." | `1` when unmet; `skill remove` and `template remove` exit `0` here instead |
| `skill publish` with `--yes` but no `--name` / `--skill-version` | Both flags are "required for non-interactive publishes"; the docs show no message, so expect the usual `1` |
| A destructive `skill` verb with no terminal and no `--yes` | Non-zero, naming the flag |
| `template publish` where a skill inside does not reach the registry | `1`; the skill stays inline, the skills that shipped inline are named, the run closes on `PUBLISHED (PARTIAL)`; work that succeeded is kept |

Test zero against non-zero rather than for `1` specifically. `--json` changes the shape of output, never the outcome: stdout is valid JSON or empty on failure, and `--json` never turns a failure into a success. Which `skill` commands support `--json`, and their payload shapes, are not documented on the command page.

## Prompts and non-interactive runs

- `--yes`, `-y` applies to "most commands": skip confirmations / auto-overwrite.
- Destructive commands need `--yes` when there is no terminal (a pipe, a CI job, an agent-driven shell). The list includes `skill remove`, and `skill add` when it would overwrite a skill that already exists. In a real terminal you still get the prompt.
- `BRAINBASE_NON_INTERACTIVE=1` (or any non-empty `CI`) forces non-interactive mode even inside a terminal: ordinary prompts auto-resolve to their defaults; destructive commands refuse and name `--yes`.
- Declining an interactive confirmation exits `0`: nothing happened because you said so.

## Per-skill `.brainbase.json`

`skill add`, `skill update` and template installs stamp a `.brainbase.json` inside each skill folder they write, beside `SKILL.md`. It records the origin (GitHub, git, the registry or a local path) so `skill update` can fetch it again, `skill list` can show its source, and a later `template pack` can tell whether to reference the skill or inline it. A skill folder without one is treated as one the CLI did not install, so a template install never displaces it. The schema is not documented.

Nothing skill-specific lives under the per-folder `.brainbase/` directory (that holds `state.json`, `sync-state.json`, `secrets.env`, `instructions.md`, `playbooks/`, the entrypoint files, MCP resolution files and orchestration link state). Skills land in the harness's own paths below. Under `~/.brainbase/`, `installed.json` and `registry/` index templates, not standalone skills.

## Where installed skills land, per harness

The CLI auto-detects the harness in the current folder; override with `--harness <id>`. Ten harnesses are supported. The first three take every component type; the other seven take skills, instructions and files only, so a component of another type is skipped when installed into one of them.

| Harness | Component types |
| --- | --- |
| `claude-code` (Claude Code) | skills, mcps, agents, commands, playbooks, instructions, files |
| `codex` (Codex) | skills, mcps, commands, playbooks, instructions, files |
| `kafka` (Kafka) | skills, mcps, agents, commands, playbooks, instructions, files |
| `qwen-code` (Qwen Code) | skills, instructions, files |
| `opencode` (OpenCode) | skills, instructions, files |
| `openclaw` (OpenClaw) | skills, instructions, files |
| `cursor` (Cursor) | skills, instructions, files |
| `factory` (Factory Droid) | skills (inlined into `AGENTS.md`), instructions, files |
| `qoder` (Qoder) | skills, instructions, files |
| `pi` (Pi) | skills, instructions, files |

Skill path on the three full harnesses:

| Component | Claude Code | Codex | Kafka |
| --- | --- | --- | --- |
| Skill | `.claude/skills/<slug>/` | `~/.codex/skills/<slug>/` or `.agents/skills/<slug>/` | `.kafka/skills/<slug>/` |

The newer harnesses, project scope first and global scope second; each global root can be moved with the environment variable in the last column.

| Harness | Skill | Instructions | Global root |
| --- | --- | --- | --- |
| `qwen-code` | `.qwen/skills/<slug>/` · `~/.qwen/skills/<slug>/` | Block in `QWEN.md` · `~/.qwen/QWEN.md` | `QWEN_HOME` |
| `opencode` | `.opencode/skills/<slug>/` · `~/.opencode/skills/<slug>/` | Block in `AGENTS.md` · `~/.opencode/AGENTS.md` | `OPENCODE_HOME` |
| `openclaw` | `skills/<slug>/` at the folder root · `~/.openclaw/skills/<slug>/` | Block in `AGENTS.md` · `~/.openclaw/AGENTS.md` | `OPENCLAW_HOME` |
| `cursor` | `.cursor/rules/<slug>.mdc` · `~/.cursor/rules/<slug>.mdc` | Block in `AGENTS.md` · `~/.cursor/AGENTS.md` | `CURSOR_HOME` |
| `factory` | Inlined as a block in the instructions file | Block in `AGENTS.md` · `~/.factory/AGENTS.md` | `FACTORY_HOME` |
| `qoder` | `.qoder/skills/<slug>/` · `~/.qoder/skills/<slug>/` | Block in `AGENTS.md` · `~/.qoder/AGENTS.md` | `QODER_HOME` |
| `pi` | `.pi/skills/<slug>/` · `~/.pi/agent/skills/<slug>/` | Block in `AGENTS.md` · `~/.pi/agent/AGENTS.md` | `PI_CODING_AGENT_DIR` |

Codex's global root is `CODEX_HOME` (default `~/.codex`). The docs give no global-scope skill path for `claude-code` or `kafka`. `--scope <global|project>` applies to `onboard`, `sync`, `skill`, `agent pull` and `agent unpack`.

The manifest's `harness` field takes the same ids (`claude-code`, `codex`, `kafka`, `qwen-code`, `opencode`, `openclaw`, `cursor`, `factory`, `qoder`, `pi`); `agent pull` rewrites it to match the cloud agent, and ignores `--harness`.

## Environment variables that matter here

| Variable | Purpose |
| --- | --- |
| `BRAINBASE_TOKEN` | A long-lived PAT (`bbpat_…`); overrides the saved session and token file. |
| `BRAINBASE_REGISTRY_URL` | Override the registry API host independently (default resolution ends at `https://api.v1.brainbaselabs.com`). |
| `BRAINBASE_API_URL` | Legacy host; fallback override for registry and model-proxy traffic. |
| `BRAINBASE_NON_INTERACTIVE` / `CI` | Force non-interactive mode; destructive commands then refuse without `--yes`. |
| `BRAINBASE_HOME` | Relocate `~/.brainbase` (auth, token, template index). |
| `CODEX_HOME`, `QWEN_HOME`, `OPENCODE_HOME`, `OPENCLAW_HOME`, `CURSOR_HOME`, `FACTORY_HOME`, `QODER_HOME`, `PI_CODING_AGENT_DIR` | Move a harness's global root, and with it the global-scope skill path. |
| `BRAINBASE_DEBUG` | Print full stack traces on error. |
