# GitHub surface

Source: https://docs.brainbaselabs.com/docs/agent/github, /docs/agent/surfaces, /cli/concepts/connecting (GitHub), /cli/commands/agent (connect, surface, GitHub and Linear setup), /cli/reference/environment (`BRAINBASE_GITHUB_MCP_URL`), /docs/orchestrations/tools (`brainbase_github` built-in), /docs/aws-marketplace/operations; changelog 2026-07-18, 2026-08-28, 2026-09-11
Snapshot: 2026-11-03

Contents: how the connection works · connect in the console · connect from the CLI · triggers · code reviews · chat on PRs and issues · working with the code · hiding other bots' comments · tools · disconnecting · best practices

## How the connection works

Connect an agent to GitHub and it reviews pull requests as they open, answers @mentions in PR and issue comments, and clones repositories into its sandbox to check what it says. Each agent gets its own GitHub App, owned by you or your organization, created from a manifest Brainbase prepares; there are no keys or webhook URLs to copy by hand. Everything it posts appears under the App's name and avatar.

1. On the agent's **Surfaces** page, name the App. The name becomes the handle you mention: **Acme Reviewer** becomes `@acme-reviewer`.
2. **Create GitHub App** hands you to GitHub to confirm. The App is created with the full set of permissions the agent can ever need: write access to repository contents, pull requests, issues and checks, read access to metadata. Contents write access sits unused until you turn on push access; git credentials are per-repository and read-only by default.
3. GitHub drops you into the App's install screen to choose repositories. Repository access is managed entirely on GitHub; change it any time from the App's settings page.
4. Back in Brainbase the GitHub card shows **Connected** with the App's handle, and the trigger toggles appear.

One agent, one App: each App is bound to the agent whose Surfaces page created it. To put two agents on the same repositories, give each its own App.

GitHub work runs in the agent's sandbox, so the agent needs a coding harness such as Claude Code or Codex. On other harnesses the App replies asking you to switch instead of starting a run.

## Connect in the console

1. Open the agent's Surfaces area and expand GitHub.
2. Name the GitHub App and enter the GitHub organization that should own it, or leave the organization empty to create it under your personal account.
3. Click **Create GitHub App**, confirm the App on GitHub, then pick the repositories to install it on.

Connecting GitHub returns you to Brainbase to finish setup, and reconnecting a previously removed App restores the integration automatically (changelog 2026-07-18).

## Connect from the CLI

Needs a `brainbase login` session (unset `BRAINBASE_TOKEN`); the approval still happens in a browser.

```bash
brainbase agent connect github
brainbase agent connect github --app-name "Release Bot" --github-org acme

# in CI: get the link, hand it on, and resume later
brainbase agent connect github --json
brainbase agent surface github wait --installation <installation-id>

brainbase agent surface github status [--installation <id>]
brainbase agent surface github configure --auto-review false --allow-push true
```

- `--app-name` names the App to create and `--github-org` installs it on an organization rather than your account; both apply only when the agent has no App yet. Once it has one, the link goes straight to that App's install page, and an already-connected agent is reported as is with nothing started.
- `connect` prints a setup link and a resume command, opens the link, and waits (`--timeout <seconds>` default `600`, `--no-open`, `--no-wait`). Under `--json` it prints `{ agent_id, surface, connected: false, pending: true, installation_id, url, next_command }` and exits. A timed-out wait exits 1, Ctrl-C 130; a revoked, disconnected or failed installation ends the wait with exit 1.
- `configure` flags, each `true` or `false`: `--auto-review`, `--mention-chat`, `--review-on-push`, `--blind-to-other-bots`, `--require-posted-review`, `--allow-push`. `PATCH /v2/cli/agents/{agent_id}/surfaces/github` needs the `installation_id` it applies to.
- While GitHub is connected, `agent pull` installs the built-in GitHub connector MCP (override `BRAINBASE_GITHUB_MCP_URL`, default `https://brainbase-github-mcp.onrender.com`) and `capabilities.github` reads `true`. The synthesized `brainbase_github` built-in does not appear in `brainbase mcp list`; an agent's own enabled server of that name overrides it.

## Triggers

| Trigger | Fires when | Default | CLI flag |
| --- | --- | --- | --- |
| **Auto-review pull requests** | A pull request is opened or marked ready for review. The agent reviews it and posts a formal PR review. | On | `--auto-review` |
| **Respond to @mentions** | Someone mentions `@your-app` in a PR or issue comment, or in a reply on one of the agent's inline review comments. The agent answers in place. | On | `--mention-chat` |
| **Re-review on new commits** | Commits are pushed to an open PR. Rapid pushes are batched for about a minute, then the agent re-reviews the delta once. | Off | `--review-on-push` |
| **Require a posted review** | Not a trigger: when an auto-review or re-review ends without posting a review, the agent retries once, and withdraws its acknowledgement if it still has not posted one. Leave it off for agents that are not reviewers. | Off | `--require-posted-review` |

- The agent reacts with 👀 when it picks up an event and delivers its answer on the PR or issue.
- Everything on one pull request is a single conversation: first review, follow-up mentions and re-reviews continue the same task.
- Actions by other bots never trigger the agent, so two bots cannot set each other off.
- Every trigger is a normal agent run; watch it live and read the trace in the agent's Tasks view.

## Code reviews

A review lands as a formal GitHub pull request review: inline comments anchored to changed lines plus a summary body. What it looks for comes from the agent's Instructions (coding standards, security posture, house rules, strictness).

Reviews can carry a merge-readiness score. When the review includes a line like `Merge readiness: 4/5` (or the agent passes a score explicitly), the verdict is also posted as a **Brainbase Review** check run on the reviewed commit: green at 4/5 and above, neutral below, never a red failure.

Advisory by design: reviews are posted as **comment** reviews; an attempt to approve or request changes is downgraded to a comment, so a review never satisfies a required review and never blocks a merge. To gate merges on the score, make the **Brainbase Review** check required in branch protection. For another pass, mention the App on the PR or turn on re-review on new commits. Apps connected before check-run support need the App's new **checks** permission accepted once on GitHub before the check run appears.

## Chat on pull requests and issues

Mention `@your-app` in any PR or issue comment and the agent replies there: inside the same inline review thread, or as a comment in the conversation tab. Because the whole PR is one task, it remembers its own review and earlier questions.

## Working with the code

Inside its sandbox `git clone https://github.com/your-org/your-repo` works: credentials are minted on demand per repository, live about an hour, and reach git through a credential helper (no tokens on disk or in URLs). The agent can build, run tests and verify a finding before posting it.

- Git access is **read-only by default**: clone and fetch any repository the App is installed on, and only those.
- Turn on **Push branches and open pull requests** (`--allow-push true`; the "Git access" capability, off by default for every installation, changelog 2026-08-28) to let the agent push branches and open PRs; existing installations keep read-only access until you turn it on. Leave it off for review-only agents.
- Apps connected before push access rolled out may need a one-time permission approval on GitHub before writes work.

## Hiding other bots' comments

Other review bots' findings reach the agent as PR context and can anchor its judgment. The **Hide other bots' comments** toggle (`--blind-to-other-bots`, off by default; changelog 2026-08-28) hides other bots' comments and reviews and the threads they started, strips the summaries major review bots write into PR descriptions, and closes API routes that would leak their output. Anything posting as a GitHub App counts as a bot, review bots and CI bots alike. Turn it on for an independent reviewer; leave it off when the agent should act on other bots' output, like fixing findings a CI bot reported.

## Tools

Connecting GitHub equips the agent with the `brainbase_github` tool server automatically; nothing to add on the Tools page.

| Tool | What it does |
| --- | --- |
| `github_get_pull_request` | Read a PR's title, description, state, branches, and stats. |
| `github_get_pr_diff` | Read the PR's unified diff. |
| `github_list_pr_files` | List changed files with per-file patches. |
| `github_get_file_contents` | Read any file, at any branch or commit, in an installed repository. |
| `github_list_comments` | Read conversation and inline review comments. |
| `github_list_reviews` | Read a PR's review history. |
| `github_compare` | Compare any two refs: commits and file changes. |
| `github_create_review` | Post a formal review: summary, inline comments, optional merge-readiness score. |
| `github_create_issue_comment` | Comment on a PR or issue conversation. |
| `github_reply_to_review_comment` | Reply inside an inline review thread. |
| `github_update_comment` | Edit one of its own comments. |
| `github_add_reaction` | React to a PR, issue, or comment. |
| `github_create_branch` | Create a branch; requires **Push branches and open pull requests**. |
| `github_create_pull_request` | Open a pull request; requires **Push branches and open pull requests**. |
| `github_whoami` | Look up the App's own handle and identity. |
| `github_api_call` | Read-only escape hatch to the GitHub REST API for anything not covered above. |

## Disconnecting

Switching the GitHub card off (or **Disconnect**; CLI `brainbase agent disconnect github --yes`, `--yes` required every time, `DELETE /v2/cli/agents/{agent_id}/surfaces/github`) deactivates the connection: webhooks are ignored and the GitHub tools are detached. The App stays on GitHub; uninstall it from your GitHub settings to remove repository access entirely, which also deactivates the Brainbase side automatically. Reinstalling the same App reconnects it. Run `brainbase agent pull` afterwards to drop the built-in MCP server. A version pin never freezes the GitHub connection. On an AWS Marketplace appliance the GitHub connector uses Brainbase-operated endpoints while in use.

## Best practices (from the docs)

Name the App the way you want to mention it. Put the review policy in Instructions (priorities, house rules, what earns a high merge-readiness score). Keep push access off for review-only agents. Turn on Hide other bots' comments when reviewing alongside other bots. Leave re-review on new commits off on busy repositories unless you want a run per push burst. Read a few early runs end-to-end in Tasks before rolling the App out to more repositories.
