Source: https://docs.brainbaselabs.com/cli/reference/environment; https://docs.brainbaselabs.com/cli/reference/files; https://docs.brainbaselabs.com/cli/authentication; https://docs.brainbaselabs.com/docs/agent/secrets (reserved names)
Snapshot: 2026-11-03

# Environment variables, credential precedence, files and state

## Contents

- Credential precedence
- Service routing and host resolution
- Host variables
- Built-in MCP overrides
- Authentication, integration-credential, CI and state variables
- Global state: `~/.brainbase/`
- Per-folder state: `<folder>/.brainbase/`
- Per-skill marker: `.brainbase.json`

## Credential precedence

Control-plane, runtime and registry commands use the same order:

1. `BRAINBASE_TOKEN` (a `bbpat_…` PAT).
2. `~/.brainbase/auth.json`: a valid login session, or an expired one the CLI can renew.
3. `~/.brainbase/token.json`: the PAT saved by `token create`, when the session cannot be used.

A saved PAT belonging to a different account from the login session is not used; older token files without an account id are still accepted. Falling back from a session to a saved PAT prints a notice on stderr. `brainbase whoami --json` shows the active credential and any renewal failure. Commands that call the web app (`integrations`, GitHub and Linear setup, the Linear manifest and disconnect, phone search, purchase and release, and `token create|rename|revoke`) need a login session and refuse while `BRAINBASE_TOKEN` is set.

## Service routing and host resolution

Three service surfaces share one authentication:

| Surface | Default host | Used by |
| --- | --- | --- |
| MAS control plane | `https://api.brainbaselabs.com/v2/cli` | Agent and orchestration operations (`references/control-plane-api.md`). |
| Registry and model gateway | `https://api.v1.brainbaselabs.com` | `template`, `skill`, and harness model-proxy traffic when tracking is on. |
| Web app | `BRAINBASE_WEB_URL`, or the console you logged in through | `integrations`, surface provider operations, login. |

Control-plane base URL resolution: `BRAINBASE_CONTROL_PLANE_URL` + `/v2/cli`; else legacy `BRAINBASE_API_URL` + `/api/cli`; else `https://api.brainbaselabs.com/v2/cli`. The first wins when both are set. Declarative `machine_kind` / `default_model` writes, orchestration creation and schedule-trigger writes require the MAS `/v2/cli` plane; on the legacy KLS `/api/cli` path the CLI refuses them before sending.

Registry requests resolve `BRAINBASE_REGISTRY_URL`, then `BRAINBASE_API_URL`, then the server stored by `brainbase login`, then `https://api.v1.brainbaselabs.com`. Model-proxy requests use the same order with `BRAINBASE_PROXY_URL` first.

## Host variables

| Variable | Purpose |
| --- | --- |
| `BRAINBASE_WEB_URL` | Web app URL for `login`, the console links `agent create`, `agent list --json`, `link` and `status` print, and the commands that call the web app directly. Default `https://app.brainbaselabs.com`; after a login, the console you logged in through. |
| `BRAINBASE_CONTROL_PLANE_URL` | MAS control-plane host; the CLI appends `/v2/cli`. Default `https://api.brainbaselabs.com`. |
| `BRAINBASE_API_URL` | Legacy API host. With no control-plane override, control-plane requests use its `/api/cli` surface; also the fallback for registry and proxy traffic. |
| `BRAINBASE_REGISTRY_URL` | Registry API host, independently. |
| `BRAINBASE_PROXY_URL` | Model-proxy host used when harness tracking is enabled. |

## Built-in MCP overrides

The CLI installs built-in MCP servers beside an agent's own. Orchestration is always installed; memory and browser are on unless the agent turns them off; Slack, meeting, GitHub and Linear appear only while that connection is active (`brainbase agent connections`). Each value is a base origin, not a full endpoint: the CLI appends `/t/${BRAINBASE_THREAD_ID}/mcp` itself (the placeholder stays literal and is resolved by the harness), so a complete URL doubles the path.

| Variable | Default |
| --- | --- |
| `BRAINBASE_MEMORY_MCP_URL` | `https://brainbase-memory-mcp.onrender.com` |
| `BRAINBASE_BROWSER_MCP_URL` | `https://brainbase-browser-mcp.onrender.com` |
| `BRAINBASE_SLACK_MCP_URL` | `https://brainbase-slack-mcp.onrender.com` |
| `BRAINBASE_MEETING_MCP_URL` | `https://meeting.mcp.brainbaselabs.com` |
| `BRAINBASE_GITHUB_MCP_URL` | `https://brainbase-github-mcp.onrender.com` |
| `BRAINBASE_LINEAR_MCP_URL` | `https://brainbase-linear-mcp.onrender.com` (installed while Linear is connected) |
| `BRAINBASE_ORCHESTRATION_MCP_URL` | `https://brainbase-orchestration-mcp.onrender.com` (one `create_task_for_<recipient>` tool per outgoing edge) |

Read when the CLI writes harness MCP config (`agent pull`, `agent unpack`, `sync`, first install) and written into the generated `.mcp.json` / `mcp.json`; changing one has no effect until you re-run `agent pull`. Trailing slashes are stripped; an empty value counts as unset. Every built-in entry authenticates as `Authorization: Bearer ${BRAINBASE_TOKEN}` and the host is not validated, so point these only at hosts you trust.

## Authentication, integration-credential, CI and state variables

| Variable | Purpose |
| --- | --- |
| `BRAINBASE_TOKEN` | A long-lived PAT (`bbpat_…`). Overrides `~/.brainbase/token.json` and the browser session. Inside a sandbox this name is set by the platform and reserved (never injected from agent secrets, along with `BRAINBASE_TASK_ID`, `BRAINBASE_AGENT_ID`, `BRAINBASE_API_URL`, `BRAINBASE_SHARED_DIR`, `BB_TASK_KEY`, `MEDIA_API_KEY`, `PROXY_BASE_URL`, `IS_SANDBOX`). |
| `BRAINBASE_SKIP_AUTH` | `1` bypasses the local auth gate for development; server calls still need a credential. |
| `BRAINBASE_SLACK_BOT_TOKEN` | Slack bot token for `agent connect slack`. Overridden by `--bot-token`. |
| `BRAINBASE_SLACK_SIGNING_SECRET` | Slack signing secret. Overridden by `--signing-secret`. |
| `BRAINBASE_LINEAR_CLIENT_SECRET` | Linear OAuth client secret for `agent connect linear` and `agent surface linear connect` / `reconnect`. Overridden by `--client-secret`. |
| `BRAINBASE_LINEAR_WEBHOOK_SIGNING_SECRET` | Linear webhook signing secret for the same commands. Overridden by `--webhook-signing-secret`. |
| `BRAINBASE_STDIN_TIMEOUT_MS` | How long piped stdin may stay silent before `agent connect` stops waiting (default `5000`; clamped 100ms–10min). Silence after some bytes arrived is an error, not a short read. |
| `BRAINBASE_NON_INTERACTIVE` | `1` forces non-interactive mode even in a terminal: ordinary prompts auto-resolve to defaults, destructive commands refuse and name `--yes`. |
| `CI` | Any non-empty value does the same. Most CI providers set it. |
| `BRAINBASE_RUN_ENTRYPOINT` | `1` makes `agent pull` execute the entrypoint (same as `--run-entrypoint`). |
| `BRAINBASE_MCP_CHECK_TIMEOUT_MS` | Per-server wait for `mcp check` (default `8000`; non-positive values fall back). |
| `BRAINBASE_HOME` | Local config dir (default `~/.brainbase`). |
| `CODEX_HOME` | Codex global root (default `~/.codex`). |
| `QWEN_HOME`, `OPENCODE_HOME`, `OPENCLAW_HOME`, `CURSOR_HOME`, `FACTORY_HOME`, `QODER_HOME` | Global roots for those harnesses (defaults `~/.qwen`, `~/.opencode`, `~/.openclaw`, `~/.cursor`, `~/.factory`, `~/.qoder`). |
| `PI_CODING_AGENT_DIR` | Global root for the `pi` harness (default `~/.pi/agent`). |
| `BRAINBASE_DEBUG` | Print full stack traces on error. |

## Global state: `~/.brainbase/`

Override the location with `BRAINBASE_HOME`.

```text
~/.brainbase/
├── auth.json          # signed-in session (JWT + user), mode 0600
├── token.json         # long-lived CLI PAT (bbpat_…) with minting account id, mode 0600
├── installed.json     # registry of every installed template on this machine
├── registry/          # packed templates available to install
│   └── <creator>/<slug>/<version>/
└── cache/             # transient caches
```

`installed.json` backs `template list --all` and `template remove`.

## Per-folder state: `<folder>/.brainbase/`

Created when you link or pull an agent. An auto-generated `.gitignore` (`*` and `!.gitignore`) keeps the entire directory out of source control; only `brainbase.agent.yaml` at the folder root is committed.

```text
<linked-folder>/
├── brainbase.agent.yaml   # the committed manifest (source of truth)
└── .brainbase/            # entire directory is gitignored
    ├── state.json              # cached cloud metadata (slug, url, org/team, tracking)
    ├── sync-state.json         # per-checkout last-sync revision + per-component hashes
    ├── secrets.env             # agent secrets, .env format
    ├── instructions.md         # pulled instructions body
    ├── playbooks/              # pulled playbook bodies (<slug>.md)
    ├── entrypoint.sh           # resolved entrypoint script (chmod 0755)
    ├── entrypoint.log          # entrypoint run log
    ├── resolved-mcps.json      # MCP servers the last unpack resolved
    ├── installed-mcps.json     # MCP entries unpack wrote into harness config
    ├── link.json               # LEGACY: read once for migration, never written
    ├── orchestration-link.json # set when the folder is linked to an orchestration
    ├── orchestration-sync-state.json # orchestration drift baseline
    └── .gitignore              # auto-created: `*` + `!.gitignore`
```

| File | Purpose |
| --- | --- |
| `state.json` | Cached cloud metadata for the claimed agent. Not the source of truth; regenerated from the cloud. With the manifest's `id`, this records which agent the folder is linked to. |
| `sync-state.json` | Last-sync revision and per-component hashes; drift is per checkout and never committed, so two clones track drift independently. |
| `secrets.env` | Written by `agent pull` (the agent's own secrets only, never inherited orchestration ones); read by `agent push`, `agent env` and `run`. Never commit it. |
| `instructions.md` / `playbooks/` | Bodies written by `pull`; `unpack` lays them into the harness's paths. |
| `entrypoint.sh` / `entrypoint.log` | The resolved sandbox entrypoint and its run log. |
| `link.json` | Legacy, migrated once into `state.json`. |
| `resolved-mcps.json` | Every MCP server the last `agent unpack` resolved (own plus built-ins) as a JSON array; `mcp check` reads it when no native harness config was written. |
| `installed-mcps.json` | The MCP entries `unpack` wrote into native harness config, each with harness, scope and a fingerprint, so a later unpack removes only its own entries. |
| `orchestration-link.json` | Orchestration id, team, organization and link time. Delete it after `orchestration delete` to recreate with `orchestration create`. |
| `orchestration-sync-state.json` | Orchestration state at the last pull or push (member revisions, edges, schedule triggers, metadata); `orchestration status` and `push` compare against it. |

## Per-skill marker: `.brainbase.json`

Stamped beside `SKILL.md` by `skill add`, `skill update` and template installs, recording the source (GitHub, git, registry or local path) so `skill update` can fetch again, `skill list` can show it, and `template pack` can decide whether to reference or inline the skill. A skill folder without one is treated as not installed by the CLI and is never displaced by a template install.
