# Phone and meetings surfaces

Source: https://docs.brainbaselabs.com/docs/agent/surfaces (available surfaces, Meeting behavior), /cli/concepts/connecting (Meetings, Phone, provider setup), /cli/commands/agent (connect, surface, destructive actions and provider operations), /cli/reference/control-plane-api (Surfaces), /cli/reference/pat-scopes, /cli/reference/environment (`BRAINBASE_MEETING_MCP_URL`), /docs/agent-lifecycle/deploying, /docs/orchestrations/tools (`brainbase_meeting`); changelog 2026-06-03, 2026-06-12, 2026-07-03, 2026-07-07, 2026-07-10, 2026-07-17, 2026-09-11, 2026-10-09
Snapshot: 2026-11-03

Contents: phone (what it does, numbers, whitelist, greeting, status, release, errors) · meetings (connect, identity, settings, calendar auto-join, instructions, MCP, billing, disconnect)

## Phone

### What the phone surface does

The agent receives inbound calls from approved callers. Connecting phone buys a phone number for the agent, which starts recurring charges. The docs do not give the number's price, describe outbound calling, or list phone models beyond noting that GPT-4o and GPT-4o Mini were removed from the phone integration's model picker (changelog 2026-09-11); check the live Surfaces page and pricing. Phone has no manifest capability flag and no built-in MCP server; `brainbase agent connections` still reports it (with the number as its detail).

### Searching and buying a number

Search, purchase and release go through the web app: they need a `brainbase login` session and refuse a PAT (unset `BRAINBASE_TOKEN`; `BRAINBASE_WEB_URL` picks the web app). Purchase and release need `--yes` every time, at a terminal, without one, and with `--json`; they never prompt.

```bash
brainbase agent surface phone search --area-code 415
brainbase agent surface phone search --country GB --contains 0800
brainbase agent surface phone purchase +14155550123 --yes
brainbase agent connect phone --number +14155550123 --yes    # same thing
brainbase agent surface phone status
```

| Action | Flags |
| --- | --- |
| `search` | `--country <ISO2>` (defaults to `US`), `--area-code <digits>`, `--contains <pattern>` |
| `purchase <number> --yes` | Buys the number; confirm the recurring charge with the user first |
| `release --yes` | Gives the number up for good; `brainbase agent disconnect phone --yes` does the same |
| `status` | Effective settings, the number behind the connection, capabilities (control plane; PAT with `read` is fine) |

Do not retry a purchase that reports an unknown outcome: when the request fails in a way that leaves the result unclear, the command checks the agent's phone status and, if the number did not appear, exits 1 with code `purchase_outcome_unknown`. Provisioning may still be running. Run `brainbase agent surface phone status` and reconcile before buying again, or you may pay for two numbers. A release that cannot be confirmed reports `release_unconfirmed` the same way.

### Approved callers (whitelist) and greeting

These go through the control plane and accept a PAT (`read` for list, `publish` for add/remove).

```bash
brainbase agent surface phone whitelist list
brainbase agent surface phone whitelist add +14155550199 --label "On-call"
brainbase agent surface phone whitelist remove <entry-id>      # single step; accepts --yes without requiring it
brainbase agent surface phone configure --greeting "Thanks for calling Acme."
brainbase agent surface phone configure --greeting ""           # an empty greeting is valid
```

Endpoints: `GET /v2/cli/agents/{agent_id}/surfaces/phone/whitelist`, `POST .../phone/whitelist`, `DELETE .../phone/whitelist/{entry_id}`, `PATCH .../surfaces/phone` for the greeting.

## Meetings

### What the meeting surface does

The agent joins meetings, takes notes, and follows up. A meeting connection is just the display name (and optional avatar) the agent joins calls under; there is no third-party handshake. After a call the transcript is added to the resumed thread so the agent can summarize, file follow-ups, or run workflows on what was said (changelog 2026-06-03). The welcome page mentions Zoom meetings; the docs do not list other providers, so check the live page.

### Connect

```bash
brainbase agent connect meeting --bot-name "Notetaker"
brainbase agent connect meeting --bot-name "Notetaker" --bot-image-url https://…
```

Without `--bot-name` the CLI prompts at a terminal and exits non-zero naming the flag without one. Idempotent: re-running rotates the stored values. Control plane: `PUT /v2/cli/agents/{agent_id}/connections/meeting` (`bot_name`, optional `bot_image_url`; `publish`) or `PUT .../surfaces/meeting` for `agent surface meeting connect`. Accepts a PAT. The saved name and avatar carry through to the meeting attendee (changelog 2026-06-12).

### Identity and settings

```bash
brainbase agent surface meeting                       # status
brainbase agent surface meeting configure --bot-name <name> --bot-image-url <url> --vision true|false --agent-delegation true|false
brainbase agent surface meeting image upload avatar.png   # PNG, JPEG, GIF or WebP, at most 2 MiB
brainbase agent surface meeting image clear
```

- `--vision` matches the Meetings card's **Let the bot see the screen** toggle: whether, by default, the bot can look at what is shared on screen or camera during a call. New meeting installations start with it on; existing ones keep their behaviour until changed (changelog 2026-10-09).
- `--agent-delegation` is listed in the CLI reference without a description; the docs do not explain it. Check the live Meetings card.
- Endpoints: `POST .../surfaces/meeting/image` (upload), `PATCH .../surfaces/meeting` (configure, image clear).

### Calendar auto-join

Console: on the Meetings surface open **Calendar auto-join** and select **Generate calendar email**. The agent joins any calendar event that has this email as a guest (CC or invite it to any Google or Outlook event). **Join early (minutes)** sets how long before the start it joins: 10 by default, between 10 and 1440. Auto-join is opt-in per agent; agents without a calendar email behave as before. Recurring auto-joined meetings book exactly one bot (changelog 2026-07-10), and transient provider rate-limit or capacity responses are retried with backoff (changelog 2026-07-03).

```bash
brainbase agent surface meeting calendar status
brainbase agent surface meeting calendar create --lead-minutes 15
brainbase agent surface meeting calendar configure --lead-minutes 30
```

The server rounds and clamps the lead time to 10–1440 minutes. Endpoints: `GET .../surfaces/meeting/calendar` (`read`), `POST .../surfaces/meeting/calendar` (create), `PATCH .../surfaces/meeting/calendar` (configure), both `publish`.

### Instructions for before and after

If the agent should prepare before a meeting or perform follow-up afterward, put those expectations in its **Instructions**; the Meetings connector settings point at Instructions as where that behaviour is authored (changelog 2026-07-01).

### Built-in meeting MCP

While a meeting install exists, `agent pull`, `unpack`, `sync` and first install write the built-in meeting connector MCP (override `BRAINBASE_MEETING_MCP_URL`, default `https://meeting.mcp.brainbaselabs.com`), and the manifest's `capabilities.meeting` reads `true`. The synthesized `brainbase_meeting` built-in does not appear in `brainbase mcp list`; an agent's own enabled server of that name overrides it. The Meeting MCP accepts Brainbase personal access tokens and live API keys with an explicit profile selection, alongside OAuth (changelog 2026-07-17).

### Billing

Meeting time spends credits per started minute, measured from the recorded meeting session rather than calendar invites, settled once per call. Changelog 2026-07-07 announced 10 credits per started minute; changelog 2026-07-10 said calls were free through August 15 and would then bill at 1 credit per started minute, "an update from the 10 credits per minute rate announced earlier this week", with the promo callout shown on the Meetings connector before enabling it. The docs pages give no rate; read the live Meetings card or Billing before quoting one. See `brainbase-payments` for credits.

### Disconnect

```bash
brainbase agent disconnect meeting            # prompts at a terminal
brainbase agent disconnect meeting --yes      # required with no terminal
brainbase agent disconnect meeting --json     # authorises on its own for Slack and meeting
```

`DELETE /v2/cli/agents/{agent_id}/connections/meeting` removes the install; idempotent. Run `brainbase agent pull` afterwards to drop the built-in meeting MCP. A version pin never freezes the meeting connection.
