# The entrypoint

Source: https://docs.brainbaselabs.com/docs/agent/entrypoint · https://docs.brainbaselabs.com/api#any-harness (agent spec) · https://docs.brainbaselabs.com/api/agents/create-agent · https://docs.brainbaselabs.com/api/agents/update-agent · https://docs.brainbaselabs.com/cli/reference/agent-manifest · https://docs.brainbaselabs.com/cli/concepts/agents · https://docs.brainbaselabs.com/cli/commands/agent · https://docs.brainbaselabs.com/cli/reference/environment · https://docs.brainbaselabs.com/cli/reference/files · https://docs.brainbaselabs.com/cli/reference/control-plane-api · https://docs.brainbaselabs.com/docs/agent/secrets · https://docs.brainbaselabs.com/docs/secrets-at-brainbase · https://docs.brainbaselabs.com/docs/agent/versions · https://docs.brainbaselabs.com/api/usecases/fix-failing-tests · changelog 2026-06-19
Snapshot: 2026-11-03

## What it is

The entrypoint is a bash script that runs inside the agent's sandbox after secrets load and before the runtime boots. The API wording: it runs after env vars are loaded and `brainbase agent pull` completes, before the in-VM runner is launched. Use it to prepare the environment the agent needs before it starts working:

- **Install dependencies:** package managers, system packages, generated assets.
- **Clone or prepare code:** fetch a repository, check out a branch, create folders the agent expects.
- **Configure the sandbox:** write config files, set permissions, warm caches before the harness starts.

Order at task start: sandbox access first (a paused sandbox is woken; temporary sandbox transitions are retried automatically, so a short delay before setup is normal), then the entrypoint, then the runtime. If the sandbox cannot be started, the task fails during startup and the entrypoint does not run.

## Where it runs and what it can see

| Fact | Value |
| --- | --- |
| Working directory | `cwd=/workspace`, as the sandbox user |
| Output log | `/workspace/.brainbase/entrypoint.log` (the docs page writes it as `.brainbase/entrypoint.log` in the sandbox) |
| Time budget | 600 seconds (10 minutes). A script that runs longer is stopped and the task fails during startup, with the last lines of its output in the failure message. |
| Non-zero exit | Logged; the agent still starts. Check that setup actually succeeded. |
| Secrets | Available as environment variables before the script runs (agent secrets plus any inherited from the agent's orchestration). Read them from env; avoid printing them to logs. |
| Shared folder | Mounted at `/workspace/Shared` when the agent's **Filesystem** switch is on; path also in `BRAINBASE_SHARED_DIR`. |
| Platform variables | `BRAINBASE_TOKEN`, `BRAINBASE_TASK_ID`, `BRAINBASE_AGENT_ID`, `BRAINBASE_API_URL`, `BRAINBASE_SHARED_DIR`, `BB_TASK_KEY`, `MEDIA_API_KEY`, `PROXY_BASE_URL`, `IS_SANDBOX` are set by the platform in every sandbox and are never injected from secrets. |

Keep the script idempotent: it should be safe to run more than once. A sleeping sandbox that resumes keeps its workspace, and Daytona restarts reuse the same workspace and saved files.

## Setting it

### Console

1. Open the agent's **Entrypoint** area (the Entrypoint tab in the developer sidebar, alongside Secrets and Instructions; changelog 2026-06-19).
2. Write the bash setup script.
3. Save.
4. Run a task and confirm the runtime has the expected dependencies.

Leaving the editor empty means the agent has no entrypoint.

### API

- Agent spec on `POST /v2/threads`: `agent.entrypoint` (string) — "Bash that runs inside the sandbox before the agent launches — install dependencies, clone a repo, whatever your agent needs waiting for it when it wakes up. Runs with `cwd=/workspace`. A non-zero exit is logged and the agent still starts; an entrypoint that runs past 10 minutes fails the task." Changing it changes the spec hash, so you get a new `agent_id`.
- `POST /v2/agents` and `PATCH /v2/agents/{agent_id}`: `entrypoint` (string). "Failures are logged but do not block the agent from coming up. Omit or null for none."
- Control-plane (CLI) API: `PUT /agents/{agent_id}` body field `entrypoint`, used by `agent push`.

```json
"agent": {
  "harness": "claude_code",
  "instructions": "You are a research assistant.",
  "secrets": { "TAVILY_API_KEY": "<value>" },
  "entrypoint": "pip install -r requirements.txt"
}
```

The fix-failing-tests use case seeds a whole project this way: it reads a local `seed.sh` into the `entrypoint` string so the sandbox has the buggy code and `pytest` installed before the first turn.

### Manifest (`brainbase.agent.yaml`)

Set exactly one of `entrypoint.file`, `entrypoint.commands`, or `entrypoint.text`.

| Field | Meaning |
| --- | --- |
| `entrypoint.file` | Path to a local script; its contents are used verbatim. |
| `entrypoint.commands` | A list of shell commands. Joined with newlines and prefixed with `set -euo pipefail`, so a failing command stops the script. |
| `entrypoint.text` | An inline script body, used as-is (no fail-fast preamble added). |

```yaml
entrypoint:
  commands:
    - npm install
    - npm run build
```

`brainbase agent push` sends the entrypoint to the cloud. `agent pull` resolves it into `.brainbase/entrypoint.sh` (chmod 0755); the run log is `.brainbase/entrypoint.log`. Both live under the gitignored `.brainbase/`.

Note the wording difference: the manifest reference says a failing command in `entrypoint.commands` "fails the boot"; the entrypoint page and the API say a non-zero exit is recorded and the agent still starts. Treat a non-zero exit as "setup may be incomplete", not as a guaranteed task failure, and verify in the log.

### Run it locally

By default `agent pull` only writes the script. To execute it as part of the pull, with output captured to `.brainbase/entrypoint.log`:

```bash
brainbase agent pull --run-entrypoint          # pull, then run the entrypoint
BRAINBASE_RUN_ENTRYPOINT=1 brainbase agent pull # same, via env
```

`BRAINBASE_RUN_ENTRYPOINT` is listed under CI & automation in the environment reference: set to `1` to make `agent pull` execute the agent entrypoint (equivalent to `--run-entrypoint`). To run other tooling with the agent's secrets loaded locally, use `eval $(brainbase agent env)` or `brainbase run <command>`, which read `.brainbase/secrets.env`.

## Examples from the docs

```bash
set -euo pipefail

if [ ! -d repo ]; then
  git clone https://github.com/acme/internal-tools.git repo
fi

cd repo
npm ci
npm run build
```

Using a secret for a private repository:

```bash
set -euo pipefail

# GitHub's git endpoint takes the token as Basic auth (user x-access-token), not Bearer.
git -c http.extraHeader="Authorization: Basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 | tr -d '\n')" \
    clone https://github.com/acme/private-repo.git repo
cd repo
npm ci
```

## Best practices (from the docs)

- Keep setup fast; slow entrypoints delay every task startup.
- Make commands repeatable and safe if the sandbox already has the file or package.
- Use Secrets for tokens and private configuration; never put values in the manifest, instructions, playbooks or memory.
- Avoid destructive commands unless the agent needs a clean environment every time.
- Prefer pinned package versions for predictable behaviour.

## Versions

The entrypoint is part of an agent version: a version snapshot captures instructions, entrypoint, installed skills, tools, playbooks, harness and default model. A version pin or `brainbase task create --version` freezes the entrypoint; secrets, credentials and machine settings stay current.
