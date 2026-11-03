Source: https://docs.brainbaselabs.com/docs/interfaces (Agent → Interfaces, condensed in full)
Source: https://docs.brainbaselabs.com/docs/harnesses (harness values, for the "which harnesses can build" rule)
Source: https://docs.brainbaselabs.com/api/machines/machine-preview (`interface_preview_only`), https://docs.brainbaselabs.com/api/tasks/list-tasks (`include_interface_threads`), https://docs.brainbaselabs.com/cli/commands/task (reserved metadata keys), https://docs.brainbaselabs.com/cli/reference/control-plane-api (member lookups)
Snapshot: 2026-11-03

# Interfaces: the console workflow

Contents: What an interface is · How to ship a dashboard · Which harnesses can build · Create an interface · Choose who can open it · Build it in chat · Preview while you build · Edit the source · Publish it · What a dashboard can do · Roll back or archive · Interface touchpoints on other pages · Changelog

## What an interface is

An interface is a private dashboard for one of your agents. You describe what it should look like in a conversation with that agent, Brainbase builds and hosts it, and the people you choose sign in with their Brainbase account and use it. They never see the agent's configuration, the console, or anybody else's work.

Use one when the people who need an agent are not the people who build it. A support lead can give their team a page with the three buttons they actually use, instead of teaching them the console.

An agent's dashboards are listed in the **Interfaces** tab on the agent's page. Each has its own screen: a conversation with the agent, where you describe and change the dashboard, beside a workspace where you preview it, publish it and change its settings.

## How to ship a dashboard

1. Choose **New interface**, describe what the dashboard should show, and choose who can open it.
2. Choose **Start building**. The interface's screen opens and the agent starts building in a conversation.
3. Watch it in the **Preview** tab and ask for changes in the same conversation.
4. Choose **Publish**, check that you are among the people who can open it, and publish the build. Or tell the agent to publish, in a message of its own.
5. Open the address as a member of the audience to see it.

## Which harnesses can build

Interfaces works on agents running Kafka (`kafka_cloud`), Claude Code, Codex, Qwen Code and OpenCode. An agent on any other harness cannot build dashboards: that includes the legacy kafka (KLS-hosted) runtime, which has no sandbox to run the build tools in, and Cursor, Factory and Qoder. The tab and the **New interface** page say the agent's harness cannot call the interface tools, and **Build in chat** and **Start building** stay unavailable.

Harness values from the harnesses page, for checking an agent's `harness` field:

| Harness | Harness value | Can build interfaces |
| --- | --- | --- |
| Kafka | `kafka_cloud` | yes |
| Claude Code | `claude_code` | yes |
| Codex | `codex` | yes |
| Qwen (Qwen Code) | `qwen` | yes |
| OpenCode | `opencode` | yes |
| Cursor | `cursor` | no |
| Factory (Droid) | `factory` | no |
| Qoder | `qoder` | no |
| legacy kafka (KLS-hosted) | not listed on the harnesses page | no (no sandbox) |

## Create an interface

Choose **New interface** in the tab, describe what the interface should show, and choose **Who can open it**.

- **Name** is optional. Leave it empty and a short descriptive title is generated when you choose **Start building**. If naming is unavailable, it starts as **New interface**. Rename it in **Settings**; a name you enter yourself is kept.
- **Address** is given when the interface is created. Publishing again swaps what is served without changing the link you shared. To move it, choose **Change** beside the address in **Settings**, enter the new address, and choose **Save address** (through the API, `PUT /v2/interfaces/{interface_id}/address`). The old address keeps redirecting to the new one, and anyone viewing the dashboard has to sign in again.
- **Start building** creates the interface on this agent, opens its screen, and sends your description as the first message.

The tab lists the agent's interfaces as cards or rows, with **Search interfaces** and a sort menu. Each shows its state, who can open it, its dates and its address, with **Build in chat** to open its screen and a menu to open the live page, copy the address, rename or archive it. An orange dot beside a name means a conversation is working on it. Archived ones stay hidden until you turn on **Show archived**, which is also where you **Restore** them. The **New interface** page also shows the four most recently edited interfaces.

## Choose who can open it

Set the audience before the first publish. Publishing an interface with no audience is refused, and a published dashboard opens only for the people in its audience, so include yourself if you want to see it. A new interface set to **Only chosen people** starts with nobody chosen. Until a release is live, the address answers as though it does not exist.

Change it from **Who can open it** in the **Publish** popover, or in the interface's **Settings**. Two settings:

| Setting | Who can open the dashboard |
| --- | --- |
| **Everyone in the organisation** | Anyone in your Brainbase organization who can use this agent. |
| **Only chosen people** | Just the people you tick. Up to 2,000; past that, choose **Everyone in the organisation** instead. |

People in the audience also need access to the agent: an owner or admin of the organization, or a member of a project the agent is in. Anyone else can open the dashboard but cannot start or read conversations in it.

Everyone signs in with their Brainbase account first, and access is checked on every request rather than once at sign-in, so removing somebody takes effect on their next click. Sharing the link with somebody outside the audience gives them nothing.

A dashboard grants no access of its own. Every call a dashboard makes to Brainbase is made as the person using it. Letting somebody open a dashboard does not give them any other rights over the agent, and it does not give them access to the console.

## Build it in chat

Choose **Build in chat** on an interface to open its screen. Anyone who can edit the agent can build there. The screen reopens your newest conversation for that interface; if you have none, the composer opens with a first message that names the dashboard, and the conversation starts when you send it. Tell the agent what the dashboard should do: which conversations to show, what the buttons say, what a person fills in before starting work. Ask for changes the same way.

The workspace beside the conversation:

| Tab or control | What it is |
| --- | --- |
| **Preview** | The dashboard as the open conversation serves it |
| **Code** | The saved source files, editable |
| **Shell**, **Files**, **Browser** | The agent's computer |
| **Settings** | Name, address, audience, versions, releases, **Conversations shown**, **Archive** |
| **Share**, **Publish** | Top right |
| **History** | Top of the chat: latest generation, then **Versions**, **Builds**, **Releases** |

Once **Preview** has loaded, switching to **Code**, **Settings** or another workspace tab keeps the page and its state in the same conversation. Returning to **Preview** shows it immediately without starting it again. **Reload preview** checks and reloads it; opening another conversation loads that conversation's preview.

Conversations:

- An interface can have several. The menu on the interface's name above the chat lists yours on it, newest first, with **New conversation**.
- Each conversation works on that one interface only: asked to touch another, it refuses and names the one it is for. Every other conversation of the agent has no dashboard tools, however it was started.
- Build conversations also appear in the agent's chat view and Tasks list, marked with a small **i**.
- Only one conversation can hold an interface at a time. While one is changing the code, any other is told to wait, and the screen shows a banner saying so, with **Open that conversation** when it is one of yours. The hold ends when the change is committed or fails, or when the conversation holding it stops answering for long enough that the next one can take over.

Versions, builds, releases:

- Each change the agent commits becomes a version, and a version has to build before it can go live.
- A card under the conversation shows the version its change produced and that version's build, with **Publish** once the build succeeds.
- **History** shows the most recent generation, one round of the agent checking the code out, changing it and committing: whether it is queued, running, succeeded or failed, why it failed, and which conversation holds it. Below that are the interface's **Versions**, **Builds** and **Releases**.
- A build that fails says why, and the conversation is where you carry on from there.

## Preview while you build

The **Preview** tab shows what the open conversation is serving, at desktop or phone width, with your own data: it signs you in the same way the published dashboard does, so tables and lists show what they will show you once published.

- Only people who can edit the agent can open a preview.
- When nothing is serving, the tab starts it by itself for the person who owns the conversation: the working copy if the sandbox still has it, otherwise the last saved version, and it says which one you are looking at.
- While the agent is working, or when someone else opens the tab, it waits for you to choose **Start preview**, which is there whenever nothing is serving and the sandbox can start it.
- The tab is not available on every machine type.
- If your browser blocks sign-in inside the panel, the tab says so and offers **Open in new tab**.
- **Share** gives a **Preview link**, the interface's preview address: whoever opens it signs in with their Brainbase account, must be able to edit the agent, and sees their own data. It shows the conversation whose preview was opened last.

## Edit the source

Open **Code**, choose a file, make your changes and choose **Save changes**. Saving records a new version under your name, starts a build and updates the current conversation's preview. It does not publish the changes. The preview server's port, **8000**, is shown in the workspace. If a build cannot be started, choose **Retry build** without editing or saving the file again.

Rules:

- You need permission to edit the agent to save code.
- Wait for an active agent edit to finish before saving.
- If someone has saved a newer version, your draft stays in the editor and the save is refused; compare your changes with the latest source before reloading.
- **Reload source** asks before discarding unsaved edits.
- Drafts are recovered when you change conversations or return to the interface in the same browser tab. Drafts belong to your signed-in account and are cleared when you sign out.
- If the sandbox contains uncommitted or conflicting work, the source is saved but Preview is left alone. Ask the agent to reconcile that work, then choose **Update Preview**.
- You can browse saved code without a running conversation; open a build conversation to preview your changes.

Limits: the editor supports existing UTF-8 text files up to 256 KiB. Generated directories, environment files and symbolic links are excluded.

## Publish it

Publishing deploys a build that succeeded, so it takes a moment and the page follows along. Whatever is already live keeps serving until the new release is ready, and a publish that fails leaves the old one in place. Two ways:

| Way | What happens |
| --- | --- |
| **From the screen** | Choose **Publish** at the top right. The popover says whether the interface is live and shows its address, who can open it (changeable there), and what goes live: the newest build that succeeded, or another version picked with **Change**. A publish that fails says why and offers **Try again**. **Publish** on a version's card or in **History** opens the same popover on that version. |
| **From the conversation** | Tell the agent to publish, in a message of its own. It publishes the latest build that succeeded and replies with the address, who can open it, and that it is live. |

Build and publish are two messages. The agent publishes only when the message that asks for it asks for nothing else. A message that asks for a change and a publish together gets you the build: the agent makes the change, reports the result, and waits for you to look at it and say publish. The instruction has to be your own latest message in the conversation; the agent cannot decide to publish by itself.

## What a dashboard can do

People in the audience sign in at the dashboard's address and use it as themselves. A dashboard reaches a fixed, small set of actions against its own agent, and nothing else on the platform: everything a person needs to use an agent and nothing they need to administer one.

| Action | Notes |
| --- | --- |
| List the agent's conversations, and open one | By default every conversation on the agent except the ones that build this interface. **Conversations shown** in **Settings** switches between **Show all** and **Show only their own** (the conversations each viewer started from this dashboard). |
| Read the messages in a conversation | |
| Start a new conversation | |
| Send a message | |
| Watch the agent work as it happens | |

A conversation started from a dashboard never gains the ability to build, whoever is signed in, so a viewer cannot change the dashboard they are using. The conversations you used to build a dashboard do not appear in it either.

## Roll back or archive

- The **Releases** list, in **History** and in **Settings**, shows every release, newest first, and **Roll back to this** serves an earlier one again at the same address without rebuilding anything.
- Past 500 releases, the list shows the newest 500 and says the older ones are not shown.
- Rollback and audience changes are yours alone; the agent has no way to do either.
- Archiving an interface, from **Archive** in its **Settings**, takes it offline and out of the list, and its screen becomes read-only.
- Restore it from **Show archived** and it comes back as it was: same address, same versions, same audience, serving the release that was live when you archived it. There is nothing to republish.

## Interface touchpoints on other pages

| Where | What it says |
| --- | --- |
| `GET /v2/tasks` (List Tasks) | Query `include_interface_threads` (boolean, optional): include the conversations that are building one of the agent's interfaces, hidden by default. For the console; a dashboard session is refused. |
| `GET /v2/machines/{machine_id}/preview` (Machine preview) | HTTP 422 with `detail.code=interface_preview_only` means port 8000 on this machine serves an interface's unpublished dashboard, which opens only at the interface's preview address, behind sign-in. `detail.message` names that address and `detail.preview_url` carries it (null when the interface is archived or the deployment has no interfaces domain). Other ports on that machine, and every port on other machines, are unaffected. |
| `brainbase task update` metadata | The interface keys `brainbase_interface_id` and `brainbase_interface_viewer` belong to Brainbase; setting or removing one is refused with the key named, and nothing is changed. |
| Control-plane `GET /orgs/{org_id}/members` | Backs the email lookups of `interface create` and `interface access` (no scope required; a resource-scoped credential is refused with `credential_scope_denied`). Owners and admins see everyone; anyone else sees the owners, the admins, themselves, and the members who share a team with them. |
| PAT scopes page | Names no interface endpoint or scope; "the dashboard" there means the console. The CLI interface commands refuse an agent or sandbox credential outright. |
| API use case "Ship a live app with a preview URL" | About machine preview URLs on an ordinary thread, not about Interfaces; see `brainbase-sandboxes`. |

## Changelog

The changelog mirror (snapshot 2026-11-03) contains no entry about Interfaces. Every match for "interface" or "dashboard" refers to the console, usage dashboards, or model capabilities. Treat the docs page as the whole record and fetch https://app.brainbaselabs.com/changelog for anything newer.
