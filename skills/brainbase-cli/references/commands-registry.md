Source: https://docs.brainbaselabs.com/cli/commands/template; https://docs.brainbaselabs.com/cli/concepts/templates; https://docs.brainbaselabs.com/cli/commands/skill; https://docs.brainbaselabs.com/cli/concepts/skills; https://docs.brainbaselabs.com/cli/reference/files (.brainbase.json); https://docs.brainbaselabs.com/cli/reference/exit-codes (remove/update semantics)
Snapshot: 2026-11-03

# Registry commands: `brainbase template` and `brainbase skill`

## Contents

- Templates: concept and components
- `template pack|publish|search|info|onboard|list|remove`
- Skills: sources and the registry
- `skill add|list|update|remove|search|info|publish`
- Provenance: `.brainbase.json`
- Exit-code quirks

Registry operations use the registry host (`https://api.v1.brainbaselabs.com`, override `BRAINBASE_REGISTRY_URL`), not the `/v2/cli` control plane. `template` and `skill` are auth-gated. What a skill is on Brainbase, and the manifest `skills:` list, is covered in depth by `brainbase-skills`.

## Templates: concept and components

A template is a versioned, installable bundle of agent components. `template pack` captures a working agent; `template onboard` installs it elsewhere. Components land where the harness already reads them (see `references/harnesses-and-sync.md`); templates target any supported harness, including `kafka`.

| Component | What it is |
| --- | --- |
| Skill | A SKILL.md folder the harness loads on demand. |
| MCP server | A Model Context Protocol server config (URL or stdio command). |
| Command | A slash command / prompt the harness exposes. |
| Sub-agent | A scoped agent definition (Claude Code / Kafka). |
| Playbook | A markdown playbook plus an auto-managed table in the instructions file. |
| Instruction | A block injected into CLAUDE.md / AGENTS.md / KAFKA.md between markers. |
| File | An arbitrary file or directory copied to a target path. |

Templates are addressed as `creator/slug` and resolve to the latest published version unless pinned. Installs are tracked per machine in `~/.brainbase/installed.json`; packed templates live in `~/.brainbase/registry/<creator>/<slug>/<version>/`. Use the agent manifest to manage one live agent; use templates to package a reusable starting point.

## `template` commands

```bash
brainbase template pack                          # bundle the current agent into the local registry
brainbase template publish --visibility unlisted # upload a packed template
brainbase template search "code review"
brainbase template search --category devtools --target claude-code
brainbase template search --page 2
brainbase template info acme/reviewer
brainbase template onboard acme/reviewer
brainbase template onboard acme/reviewer --harness codex --scope project --yes
brainbase template list
brainbase template list --all
brainbase template remove acme/reviewer
```

| Command | Flags |
| --- | --- |
| `pack` | none documented. |
| `publish` | `--visibility <v>` (`public`, `unlisted`, `private`); `--yes`, `-y` skip confirmation. Uses `GET /orgs` on the control plane to pick an org. |
| `search [query]` | `--category <c>`; `--target <harness>`; `--page <n>` (1-based). |
| `info <creator/slug>` | none. |
| `onboard <creator/slug>` | Install or refresh into the current folder. `--harness <id>` (e.g. `claude-code`, `codex`, `kafka`); `--scope <s>` (`global` or `project`); `--yes`, `-y` auto-overwrite. |
| `list` | `--all` includes installs from other folders on this machine. |
| `remove <creator/slug>` | Uninstall, removing the files and settings entries it added. Destructive: needs `--yes` without a terminal. |

`template publish` can partly succeed: the template publishes but a skill inside it does not reach the registry and stays inline. The skills that shipped inline are named and the run closes on `PUBLISHED (PARTIAL)` with exit 1.

## Skills: sources and the registry

A skill is a `SKILL.md` folder the harness loads on demand. `skill add` records where each came from so `skill list` and `skill update` know its origin.

| Source form | Fetched from |
| --- | --- |
| `owner/repo` | GitHub short-form (not the registry). |
| `owner/repo@ref` | GitHub at a branch or tag. |
| `github:owner/repo/sub/path[@ref]` | GitHub with a subpath. |
| `https://github.com/owner/repo/tree/REF/sub` | GitHub tree URL. |
| `https://gitlab.com/...`, `git@host:...`, `git+<url>` | Generic git (there is no `git:` scheme). |
| `brainbase://creator/slug@version` | Brainbase skill registry. |

A bare `creator/slug` is GitHub, never the registry: use `brainbase://creator/slug@version` to install from the registry. Pin a version inside the source string, not with a flag. `search`, `info` and `publish` address registry skills as `creator/slug`.

Inside an agent manifest, `skills:` uses a different grammar (`registry:creator/slug@1.4.0`, `registry:slug`, `./path`) resolved at `agent pull` time, separately from these commands; version ranges such as `@^2.0` are rejected by every command that reads the manifest. See `references/agent-manifest.md`.

## `skill` commands

```bash
brainbase skill add owner/repo
brainbase skill add github:owner/repo/path/to/skill@v1.2.0
brainbase skill add brainbase://acme/pdf-extract@1.2.0 --as my-skill
brainbase skill list                      # installed skills and their sources
brainbase skill update pdf-extract        # re-fetch from the recorded source
brainbase skill remove pdf-extract
brainbase skill search "pdf"
brainbase skill search --category devtools --agent claude-code
brainbase skill search --page 2
brainbase skill info acme/pdf-extract
brainbase skill publish
brainbase skill publish ./my-skill --name acme/pdf-extract --skill-version 1.2.0 --visibility public
```

| Command | Flags |
| --- | --- |
| `add <source>` | `--as <slug>` install under a different slug; `--scope <s>` (`global` or `project`); `--harness <id>`. Overwriting an existing skill is destructive: needs `--yes` without a terminal. |
| `list` | none. |
| `update <slug>` | none. |
| `remove <slug>` | Destructive: needs `--yes` without a terminal. |
| `search [query]` | `--category <c>`; `--agent <harness>`; `--page <n>` (1-based). |
| `info <creator/slug>` | none. |
| `publish [dir]` | Defaults to the current directory. `--name <creator/slug>`; `--skill-version <MAJOR.MINOR.PATCH>`; `--visibility <v>` (`public`, `unlisted`, `private`); `--harness <id>`; `--yes`, `-y`. `--name` and `--skill-version` are required when `--yes` is passed. Uses `GET /orgs` to pick an org. |

Skills you publish can be attached to agents and appear in the UI (changelog, 2026-06-04: Developer Updates). Registry skills install correctly into sandboxes and under the name declared in their own instructions (changelog, 2026-08-06: Developer Updates).

## Provenance: `.brainbase.json`

`skill add`, `skill update` and template installs stamp a `.brainbase.json` beside `SKILL.md` recording the source (GitHub, git, registry or local path). `skill update` uses it to fetch again, `skill list` to show the source, and `template pack` to decide whether to reference the skill or inline it. A skill folder without one is treated as not installed by the CLI, so a template install never displaces it.

## Exit-code quirks

- `template remove` and `skill remove` on something not installed print that they found no installation and exit `0` (removing an absent thing is the state you asked for), so teardown scripts can remove unconditionally.
- `skill update <slug>` on a skill that is not installed prints the same sentence, `No skill named <slug> found.`, but exits `1`. Branch on the exit code, not the text.
- `skill publish --name acme/thing --skill-version 1.2.0 --yes` exits non-zero on failure; test `if ! brainbase skill publish …; then …; fi`.
