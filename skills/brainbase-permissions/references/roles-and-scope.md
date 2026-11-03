# Organizations, projects, members and roles

Source: docs.brainbaselabs.com/cli/commands/team, /cli/commands/member, /cli/commands/orchestration, /cli/reference/control-plane-api (Organizations and teams), /api/scope/list-teams, /api/scope/list-groups, /api/agents/create-agent, /api/orchestrations/list-orchestrations, /api/machines/delete-machine, /docs/agent/integrations, /docs/interfaces, /docs/monitoring/benchmarks, /docs/monitoring/evaluations, /docs/orchestrations/secrets, /docs/bring-your-own-bedrock, /docs/quickstart, /docs/migrating-to-new-platform, /site/pricing; changelog entries named inline.
Snapshot: 2026-11-03

## Contents

1. Three names for the same thing
2. Roles
3. Agent managers and other "owner" words
4. Who can do what
5. Visibility rules
6. Listing organizations, teams and members
7. Changing membership
8. Orchestrations and groups
9. SSO and plan tiers
10. Gaps

## 1. Three names for the same thing

The container below an organization is called different things on different surfaces. The CLI reference says so outright: "Note the CLI's vocab inversion: `--org` maps to the DB `teams.id` and `--team` maps to the DB `groups.id`."

| Surface | Organization is called | Container inside it is called | Evidence |
|---|---|---|---|
| Console | organization | project ("Agents are grouped in projects"; "choose the **Project** it belongs to"; "default Projects group") | migrating guide, quickstart, changelog 2026-07-01 |
| CLI | `--org <id-or-slug>` | `--team <id>` ("A team is a group inside an organization, and every agent lives in a team") | control-plane API reference, `brainbase team list` |
| Public API | `team_id` (`GET /v2/teams`) | `group_id` (`GET /v2/groups?team_id=`, `POST /v2/agents` `group_id`, `agent_group_access`) | scope endpoints, create-agent |
| Control plane `/v2/cli` | `orgs/{org_id}` | `teams/{team_id}` | control-plane API reference |

Read "project", "team" (CLI) and "group" (API, changelog) as one object unless the page says otherwise. Every agent lives in exactly one. The changelog also uses "group" for the sharing unit ("members of groups an agent is shared with", 2026-07-18; "its group members and org admins", 2026-07-24).

## 2. Roles

| Role | What the docs say |
|---|---|
| `owner` | Sees everyone in the org and every project. Only the owner grants or revokes "Admin manager"; billing and other owner-only settings stay with the owner (changelog 2026-10-02). Enterprise contract terms are visible to admins and owners in Billing (changelog 2026-05-29). |
| `admin` | Full access like an owner across projects ("Organization owners and admins keep full access", changelog 2026-08-26). Edits project access for members. Cannot change or remove other admins unless the owner turned on **Admin manager** for them from that admin's role menu on the Members page. |
| `member` | Sees and acts only on agents, workflows, playbooks, skills, connectors and tasks in the projects they were added to (changelog 2026-08-26). The old **Viewer** role was retired on 2026-08-26; existing Viewers and pending invitations became Members. |
| Admin manager | A flag on an admin, not a fourth role: lets that admin change the role of or remove other admins. |

`GET /v2/cli/orgs` returns every organization the caller belongs to "with the caller's `role` in each"; `brainbase member ls --json` returns each person's `role`. The docs do not list the exact string values beyond `owner`, `admin` and `member` as shown in the `member ls` sample output (`admin`, `member`).

## 3. Agent managers and other "owner" words

- **Agent manager**: "the agent's owner and the team's owners and admins" (Integrations page); `DELETE /v2/machines/{machine_id}` phrases it as "an agent manager (owner / team owner-admin)". The Integrations-from-code page calls the same thing "a person with management rights on the agent"; evaluations and benchmarks say "permission to manage the agent".
- **Agent owner**: the person who created the agent, or who received it. "Team admins and owners can transfer an agent to another team member directly from the agent side panel" (changelog 2026-05-29).
- **Task owner**: fixed when the task is created; a teammate messaging in someone else's task uses the task owner's BYOB credential (Bring Your Own Bedrock page).
- **Machine owner**: `owner_user_id` on a machine; may destroy it alongside agent managers.
- **Wallet owner**: the person whose connected wallet approves agent purchases (changelog 2026-10-02, beta); see `brainbase-payments`.
- **Profile owner**: the changelog of 2026-07-03 says "Only profile owners and organization admins can change permission rules" for Allow/Ask/Deny; the docs page now says agent managers.

## 4. Who can do what

| Action | Who | Source |
|---|---|---|
| Invite, change role, edit project access | Owners and admins (console Members page) | changelog 2026-08-26, 2026-09-25 |
| Change or remove other admins | Owner, or an admin with Admin manager | changelog 2026-10-02 |
| Create a team/project | Web app; the CLI only offers "+ Create a new team" inside `brainbase agent create`'s picker (`POST /v2/cli/orgs/{org_id}/teams`, `publish`) | team command, control-plane API |
| Create an agent in a group via API | Caller must already be a member of that group (`POST /v2/agents` `group_id`) | create-agent |
| See an agent, its tasks, playbooks, skills, connectors | Owners/admins everywhere; members in their projects | changelog 2026-08-26 |
| Change an agent's model and preferences | Any member of the agent's team (not only the creator) | changelog 2026-07-18 |
| View evaluations and results | Teammates and members of groups the agent is shared with | changelog 2026-07-18 |
| Create, change, delete evals via API | Permission to manage the agent; others get `404` | evaluations page |
| View and run benchmarks | Any beta-enabled user with access to the agent | benchmarks page |
| Create, import, edit, version, archive, restore, pin baselines (benchmarks) | Permission to manage the agent | benchmarks page |
| Cancel a benchmark run | The person who started it, or an agent manager | benchmarks page |
| Connect, disconnect, add apps; set Allow/Ask/Deny | Agent managers; other members can view rules | integrations page; changelog 2026-10-29 ("requires the agent's owner or a team admin") |
| Answer an Ask: Allow once / Allow for this task / Deny for this task | Managers and members with access to the task | integrations page |
| Answer an Ask: Always allow / lasting Deny | Managers | integrations page |
| Acknowledge an unknown outcome | Managers of the context's agent (or the parent agent's manager for delegated tasks), from their own session; API keys, PATs, task keys and integration grants refused | integrations page |
| Create or end an integration context | A person with management rights on the agent, own session only | integrations-from-code |
| Clear a context-level Deny on the approval page | Agent manager | integrations-from-code |
| Write orchestration secrets | `publish` credential plus membership in the orchestration's group; sandbox-scoped credentials always refused | orchestration secrets |
| Turn on or access orchestration shared memory | Its group members and org admins | changelog 2026-07-24 |
| Pull an orchestration manifest for a group you are not in | Organization administrators | changelog 2026-07-10 |
| Destroy a machine | Machine owner or agent manager; read/use-only members may inspect | delete-machine |
| Build an interface, save interface code, open a preview | Anyone who can edit the agent | interfaces page |
| Open a published interface | People in its audience who also have access to the agent | interfaces page |
| Change an interface's audience, roll back | A person; the agent cannot | interfaces page |
| Publish or adopt a Shared snapshot | Agent manager from a signed-in management session; worker credentials cannot | file-system page |
| Save an org-level Bedrock credential, block overrides | Org owners and admins | BYOB page |
| Save an agent-level Bedrock credential | Anyone who can edit the agent | BYOB page |
| Allow Slack-started purchase requests ("Team requests from Slack") | Wallet owner, who still approves every payment | changelog 2026-10-02 (beta) |

## 5. Visibility rules

- `brainbase member ls` and `GET /v2/cli/orgs/{org_id}/members` list what the web app's member list shows: "owners and admins see everyone; anyone else sees the owners, the admins, themselves, and the members who share a team with them", and each person's teams are limited to the caller's own. `email` is `null` for a member whose sign-in account no longer exists. Sorted by role in the console (changelog 2026-09-25).
- `GET /v2/cli/orgs/{org_id}/teams/{team_id}/agents` returns everything granted to the team, including agents owned by other members, newest grant first; "Group membership is checked on top of organization membership, so an organization member cannot enumerate a team they do not belong to."
- `GET /v2/groups?team_id=` returns every group for org owners/admins and membership groups for everyone else; `team_id` is required because orchestrations and agent grants need a team context.
- `GET /v2/orchestrations` requires `group_id`; "the access answer is per-group anyway".
- Viewing an agent's related agents no longer reveals names of agents in projects you cannot access (changelog 2026-10-29). Access to threads, stored files and attachments is verified against actual team membership (changelog 2026-08-07).
- `404 Agent not found` means "no such agent, or the caller cannot reach it. The two are deliberately indistinguishable."
- Inherited-secret names and inherited MCP servers are "project-scoped information" and sit behind the same manage authority as the plaintext secrets (`GET /v2/agents/{agent_id}/secrets/inherited`, `GET /v2/agents/{agent_id}/mcp-servers/inherited`); the latter takes a session or user-scoped PAT and answers `404` to a resource-scoped PAT.

## 6. Listing organizations, teams and members

```bash
brainbase team list                               # every org you belong to, with teams and ids
brainbase team list --org <org-id-or-slug>
brainbase team list --json                        # [{ org, teams, error? }]
brainbase member ls --org <org-id-or-slug>
brainbase member ls --org <org-id-or-slug> --json # { org, members: [{ id, email, name, role, teams }] }
```

Sample output:

```text
Brainbase Labs  brainbase-labs-71eef388
  General       75ee7d62-e528-499c-a91f-5c4c268c2bd9
  Engineering   5374e9c1-e3f7-40e5-9a11-0cc1c5722009

ana@example.com  Ana Ortiz  admin   General, Support
ben@example.com  Ben Lee    member  Support
```

| Command | Flag | Meaning |
|---|---|---|
| `team list` | `--org <id-or-slug>` | Limit to one organization |
| `team list` | `--json` | `[{ org, teams, error? }]`; an org whose teams cannot be loaded is reported in place with `error` (on stderr under `--json`); exits non-zero only when no org could be read |
| `member ls` | `--org <id-or-slug>` | Picked automatically when you belong to one org; otherwise required without a terminal |
| `member ls` | `--json` | `{ org, members: [...] }` and nothing else |

Aliases: `brainbase teams list`, `brainbase member list`, `brainbase members ls`. Both commands are read-only. `brainbase interface access` takes the emails `member ls` shows.

Control plane (`https://api.brainbaselabs.com/v2/cli`, PAT or session, no scope needed unless stated):

| Endpoint | Used by | Scope |
|---|---|---|
| `GET /orgs` | `team list`, `agent create`, `agent list`, `orchestration create|list|add-agent`, `template publish`, `skill publish` | none |
| `GET /orgs/{org_id}/teams` | `team list`, `agent create`, `agent list`, `orchestration create|list|add-agent` | none |
| `POST /orgs/{org_id}/teams` | `agent create` ("+ Create a new team") | publish |
| `GET /orgs/{org_id}/teams/{team_id}/agents` | `agent list`; `limit` default `200`, no cursor | none; resource-scoped credential refused with `credential_scope_denied` |
| `GET /orgs/{org_id}/members` | `member ls`, email lookups of `interface create` and `interface access`; `cursor` and `limit` | none; resource-scoped credential refused with `credential_scope_denied` |

Public API:

```bash
curl https://api.brainbaselabs.com/v2/teams  -H 'Authorization: Bearer YOUR_API_KEY'
# { "items": [{ "id", "name", "slug", "avatar_url" }] }
curl 'https://api.brainbaselabs.com/v2/groups?team_id=<uuid>' -H 'Authorization: Bearer YOUR_API_KEY'
# { "items": [{ "id", "team_id", "name", "description", "icon", "icon_color" }] }
```

`brainbase agent list --team <id>` lists a team's agents (team ids are unique, so `--org` is optional); `--all-teams` lists every team in the org.

## 7. Changing membership

The docs document no CLI command or API endpoint for inviting people, changing roles or editing project access; the CLI "reads teams but does not create them". Everything below is console behaviour from the changelog:

- 2026-08-26 "Members' Access Is Now Scoped to Their Assigned Projects": project-scoped access enforced consistently across agents, workflows, playbooks, skills, connectors and tasks; Viewer retired; owners and admins can again edit project access for a member who already has at least one project.
- 2026-09-25 "Fixes and Improvements": removing someone from a project no longer silently re-adds them to the General group on login; admins cannot accidentally strip a member's last project; non-admin members see owners, admins and teammates who share a group, sorted by role.
- 2026-10-02 "Fixes and Improvements": "Owners can turn on 'Admin manager' for an admin from that admin's role menu on the Members page, letting them change the role of or remove other admins. Only the owner can grant or revoke it, and billing and other owner-only settings are unaffected."
- 2026-09-18: project and orchestration cards preview who is a member from the list.
- 2026-05-29: team admins and owners transfer an agent to another team member from the agent side panel.
- 2026-07-01: every workspace gets a default Projects group; Settings, Members, Usage and Billing are dedicated pages.
- 2026-07-24: enterprise plans apply across every organization owned by the same account, restoring the ability to invite members.
- 2026-06-12: organization-level settings tabs appear from any page with the agents sidebar.

On AWS Marketplace installs public self-signup stays disabled; the first user is `FirstUserEmail`, later users are provisioned by the deployment administrator, and changing that parameter "does not remove an earlier user or transfer their team permissions".

## 8. Orchestrations and groups

- `PUT /v2/cli/orchestrations/{orch_id}`: "Every declared member must already have access to the parent team, or the request is refused with `400`."
- Orchestration secrets need `publish` plus group membership; shared memory follows "the orchestration's existing sharing rules, so only its group members and org admins can turn it on or access it".
- A sandbox-scoped credential is refused on all five orchestration endpoints (`agent-scoped PATs cannot access orchestration configuration`).
- An agent can belong to one orchestration at a time (`409` on a second).
- `brainbase mcp connect` refuses a server inherited from an orchestration; authorize it in the web app.

## 9. SSO and plan tiers

- Changelog 2026-05-27 "Enterprise SSO for Kafka Teams": SAML sign-in through the team's own identity provider; first sign-in JIT-provisions the user into the team that owns the SAML connection; existing non-SSO accounts on the same email can be merged with an audit trail; sign-in detects email domains, shows **Continue with SSO**, and blocks password sign-in for SSO-enforced domains; operations teams get onboarding, removal, rollback and drift-check flows.
- Pricing page: Enterprise highlights "SSO, RBAC, hybrid deployment & dedicated support"; the compare table lists "SSO / SAML" and "Role-based access control" under Security & compliance by plan. Fetch https://brainbaselabs.com/pricing for the current matrix.
- The CLI's `brainbase login` opens the web app, so SSO applies to CLI sign-in the same way; the docs do not describe an SSO-specific CLI flow.
- Brainbase MCP OAuth "only grants MCP access — publishing and administrative actions stay outside its reach" (changelog 2026-07-22).

## 10. Gaps

- No docs page defines the role strings, the invite flow, or an API for members and roles.
- "Admin manager" exists only in the changelog.
- The docs do not say whether a project can have its own roles; project membership appears binary (added or not).
- No documented way to see, from the CLI, which projects an agent is granted to beyond `agent list --team`.
