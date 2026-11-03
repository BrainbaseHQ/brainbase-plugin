# The skill registry and skill sources

Source: https://docs.brainbaselabs.com/cli/concepts/skills, https://docs.brainbaselabs.com/cli/commands/skill, https://docs.brainbaselabs.com/cli/reference/agent-manifest#skills, https://docs.brainbaselabs.com/api, https://docs.brainbaselabs.com/cli/authentication, https://docs.brainbaselabs.com/cli/reference/environment, https://docs.brainbaselabs.com/cli/reference/pat-scopes, https://docs.brainbaselabs.com/cli/reference/files, https://docs.brainbaselabs.com/docs/agent/skills, https://app.brainbaselabs.com/changelog
Snapshot: 2026-11-03

## What a skill is

A skill is a `SKILL.md` folder a harness loads on demand. On the platform side, skills "package specialized instructions, examples, and files that an agent can use for a domain or task"; install one when the same guidance will be useful across many tasks. The docs list three uses: domain expertise (a repeatable way to handle a specialized task), reusable files (templates, references, scripts, examples the agent can inspect) and team conventions (standardising how agents write docs, review code, research accounts, prepare reports).

Best practices stated on the Skills page:

- Prefer official or verified skills when they exist.
- Install only the skills the agent needs for its current job.
- Use playbooks for company-specific rules and skills for portable capability.
- Uninstall skills that are no longer relevant to the agent's job.

## The registry

Skills can be published to and discovered through the Brainbase registry. Registry skills are addressed as `creator/slug`; each published version is an exact `MAJOR.MINOR.PATCH`. The `search`, `info` and `publish` commands take `creator/slug`. Installing one with `skill add` uses the `brainbase://creator/slug@version` form; declaring one in a manifest or API body uses `registry:creator/slug[@version]`.

Visibility on publish is one of `public`, `unlisted` or `private` (`--visibility <v>`). The docs do not describe what each level hides or from whom, nor how to delist a version; check the live command page.

The registry also holds templates (`creator/slug`, same visibility values) and, locally, `~/.brainbase/registry/<creator>/<slug>/<version>/` is where packed templates sit before install. The docs do not describe a local cache layout for skills.

### Routing and credentials

The CLI talks to three service surfaces. Agent and orchestration control-plane calls go to `https://api.brainbaselabs.com/v2/cli`; **registry operations and harness model-proxy traffic go to the registry and model gateway at `https://api.v1.brainbaselabs.com`**; integrations and surface provider operations call the web app.

Registry requests resolve their host in this order:

1. `BRAINBASE_REGISTRY_URL`
2. legacy `BRAINBASE_API_URL`
3. the server stored by `brainbase login`
4. `https://api.v1.brainbaselabs.com`

Control-plane, runtime and registry commands share one credential order: `BRAINBASE_TOKEN` (a `bbpat_…` PAT), then `~/.brainbase/auth.json` (login session, renewable), then `~/.brainbase/token.json` (PAT saved by `token create`). The `skill` command group is auth-gated, alongside `template`, `link`, `unlink`, `sync`, `status` and `token`.

PAT permission scopes are `read`, `publish` and `admin` (CLI default `read,publish`). On `/v2/cli` every write requires `publish`. The registry is outside `/v2/cli`, and the PAT scopes page does not list the registry's publish endpoint among the writes it enumerates; it says only that outside `/v2/cli` "the rule is patchier". The 2026-08-21 changelog entry (Developer Updates) notes `token create --scope publish` now mints exactly that scope. Use the default `read,publish` for a CI token that publishes skills. The 2026-07-22 Brainbase MCP entry says the MCP's OAuth grant keeps "publishing and administrative actions" outside its reach, so publishing is a CLI (or console) action.

## Source forms accepted by `brainbase skill add`

| Source form | Fetched from |
| --- | --- |
| `owner/repo` | GitHub short-form. |
| `owner/repo@ref` | GitHub at a branch or tag. |
| `github:owner/repo/sub/path[@ref]` | GitHub with a subpath. |
| `https://github.com/owner/repo/tree/REF/sub` | GitHub tree URL. |
| `https://gitlab.com/...`, `git@host:...`, `git+<url>` | Generic git (there is no `git:` scheme). |
| `brainbase://creator/slug@version` | Brainbase skill registry. |

The command page's intro also says `skill add` installs "from GitHub, a generic git URL, the Brainbase registry, or a local path", and the files reference says `.brainbase.json` records a local-path origin, but neither page shows the local-path syntax for `skill add`. (The manifest's `./relative/path` form is documented; see below.)

Two rules the docs call out:

- **A bare `creator/slug` is GitHub, not the registry.** `skill add owner/repo` is parsed as GitHub short-form. To install from the registry, use the explicit `brainbase://creator/slug@version` form.
- **Pin a version inside the source string**, not with a flag. `owner/repo@ref` pins a branch or tag; `brainbase://creator/slug@1.2.0` pins a registry version.

```bash
brainbase skill add owner/repo
brainbase skill add github:owner/repo/path/to/skill@v1.2.0
brainbase skill add brainbase://acme/pdf-extract@1.2.0 --as my-skill
```

## Source forms accepted by the manifest and the API

The manifest `skills:` list and the API `skills` array both hold entries of `{ source: <string> }`. Manifest forms:

| Form | Meaning |
| --- | --- |
| `registry:creator/slug` | Latest version from the registry. |
| `registry:creator/slug@1.4.0` | A pinned version (exact `MAJOR.MINOR.PATCH`). |
| `registry:slug` | Legacy / unscoped (no creator namespace). |
| `./relative/path` | A local skill directory. |

The API overview describes the `skills` field as "Skill declarations from the Brainbase registry, as `registry:creator/slug` with an optional `@version` pin" and gives `{ "source": "registry:brainbase/deep-research" }` as the example. The create-agent page says only "Skill declarations. Omit or null for none." Whether the API accepts a GitHub or local source is not documented; the 2026-08-06 changelog says fetching an agent "no longer fails when one of an agent's skills comes from a GitHub source", which implies such entries can exist. Treat non-registry sources in `skills` as undocumented and verify against the live page.

**Version ranges are not supported.** Ranges such as `@^2.0` are matched exactly, so a range resolves to nothing. Validation happens when the manifest is read, so `agent push`, `agent pull`, `agent create`, `agent unpack` and `sync` all reject the range with an error telling you to pin an exact version, and exit non-zero (documented on the manifest page; the fix landed per changelog 2026-08-21, Developer Updates: "installing a skill with a version range now fails clearly instead of silently resolving to nothing"). Omit the version to track the latest.

Unpinned registry skills: "When an agent references a registry skill without pinning a version, each Brainbase CLI push now resolves to the latest published version" (changelog, 2026-06-12: Developer Updates).

## Grammar cheat sheet

| Where you write it | Registry skill, pinned | Registry skill, latest | GitHub | Local folder |
| --- | --- | --- | --- | --- |
| `brainbase skill add` | `brainbase://acme/pdf-extract@1.2.0` | not documented (the docs always show `@version`) | `owner/repo`, `owner/repo@ref`, `github:owner/repo/sub@ref`, tree URL | accepted per the intro; syntax not shown |
| `brainbase.agent.yaml` `skills:` | `registry:acme/pdf-extract@1.2.0` | `registry:acme/pdf-extract` | not documented | `./skills/local-linter` |
| API `skills` | `registry:acme/pdf-extract@1.2.0` | `registry:acme/pdf-extract` | not documented | not documented |
| `skill search` / `info` / `publish --name` | `acme/pdf-extract` | | | |

## Provenance: `.brainbase.json`

`skill add`, `skill update` and template installs stamp a `.brainbase.json` inside each skill folder they write, beside `SKILL.md`. It records where the skill came from (GitHub, git, the registry or a local path) so that:

- `skill update` can fetch it again,
- `skill list` can show its source,
- a later `template pack` can tell whether to reference the skill or inline it.

A skill folder without one is treated as one the CLI did not install, so a template install never displaces it to make room for its own skill. The docs do not show the file's schema.

## What the changelog adds

| Date | Entry | What it says about skills or the registry |
| --- | --- | --- |
| 2026-06-04 | Developer Updates (cli, agents) | Skills published with the Brainbase CLI can now be attached to agents and appear in the UI. |
| 2026-06-12 | Developer Updates (cli, playbooks, …) | `agent push` writes playbooks alongside instructions, skills and MCPs; an unpinned registry skill resolves to the latest published version on each push. |
| 2026-06-18 | Developer Updates (cli, agents, api, …) | A marketplace skill installed from the UI no longer surfaces twice in the CLI manifest, so `agent pull` and `agent push` work without an unusable placeholder entry. |
| 2026-07-22 | Brainbase MCP: Manage Your Agents from Claude Code and Codex | The MCP's tools "work with skills and playbooks"; filtered search across the agent and skill registries returns matching results reliably. |
| 2026-08-06 | Developer Updates (agents, cli, api, mcp, platform) | Skills added from the registry now install correctly into an agent's sandbox and from the console; skills install under the name declared in their own instructions; agents reliably boot with every skill they declare; fetching an agent no longer fails when a skill comes from a GitHub source. |
| 2026-08-21 | Developer Updates (cli, security) | `token create --scope publish` mints exactly that scope; installing a skill with a version range now fails clearly. |
| 2026-08-26 | Members' Access Is Now Scoped to Their Assigned Projects | Members see and act only on agents, workflows, playbooks, skills and connectors in the projects they were added to; owners and admins keep full access. |
| 2026-08-28 | Pin an Agent to a Specific Version | While pinned, new tasks run that version's definition, installed skills included. |

None of these entries is marked beta.
