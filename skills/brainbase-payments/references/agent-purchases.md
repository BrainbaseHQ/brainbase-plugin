# Agent purchases: the Payments beta

Source: https://app.brainbaselabs.com/changelog entries 2026-09-24 (Wallet-Connected Purchase Approvals for Agents), 2026-09-25 (Fixes and Improvements), 2026-09-28 (Payments (Beta) Now Open to Every Account, With Higher Limits), 2026-10-02 (Payments: Team Requests From Slack and Clearer Receipts), 2026-10-02 (Fixes and Improvements)
Source: there is no page for Payments on https://docs.brainbaselabs.com; the API reference, CLI reference and agent manifest reference contain no payments, wallet or purchase fields
Snapshot: 2026-11-03

Everything in this file is beta and comes from the changelog. Fetch the live changelog and open the agent's Payments page in the console before relying on any line below.

## Contents

- Timeline by changelog entry
- Current behaviour (as of the 2026-10-02 entries)
- What the sources do not say

## Timeline by changelog entry

### 2026-09-24: Wallet-Connected Purchase Approvals for Agents (Beta)

Tags: agents, platform. "An early rollout for test approvals only — no purchase is completed yet."

- Connect a payment wallet on the agent Payments page, then review and approve or decline a purchase request an agent is asking to make.
- The approval or decline is delivered back to the agent's task automatically, so the run continues without the owner checking back manually.
- Limited early rollout: approvals are test-only and do not execute a real purchase.
- Fixed: in the hosted approval flow a local-only test button could appear and produce a confusing error after the request had already been approved.
- Fixed: payment status could briefly show as missing right after approving or continuing a request.

### 2026-09-25: Fixes and Improvements, section "Payments (beta)"

- The Payments page now shows what the agent bought through Link, including delivery details and whether the merchant order actually went through, so the owner can review and, if needed, recover a purchase in one place. "This continues our beta wallet-approval rollout."

This is the first entry that describes a real merchant order. The entry does not say that test-only mode ended.

### 2026-09-28: Payments (Beta) Now Open to Every Account, With Higher Limits

Tags: agents, platform. Beta.

- Payments is no longer limited to a pilot group; it appears in the sidebar for every signed-in account.
- The previous $5 pilot limit on agent purchases is removed, so larger orders are no longer rejected. No replacement cap is stated.
- The Payments page shows shipping, fees and discounts as part of an order total, not just the subtotal.
- A request that ends up in an unclear state can be recovered by the user with a new **Recover request** action instead of staying stuck.
- Status wording is clearer about what is agent-reported versus independently confirmed.
- **Cancel** is available in more request states.
- Owners can mark a request resolved.
- Payment reads and cancellations retry automatically through brief backend contention instead of surfacing an error on the first hiccup.

### 2026-10-02: Payments: Team Requests From Slack and Clearer Receipts

Tags: agents, integrations, platform. Beta.

- A **Team requests from Slack** switch on the Payments page lets the wallet owner allow Slack-started conversations with an agent to request a Link purchase from the owner's connected wallet. The wallet owner still approves every payment in Link.
- Payments results and approvals now also reach agents running on Cloudflare and E2B sandboxes.
- Each payment card shows the merchant, amount and status once, with a plain-language summary; timestamps are shown in the viewer's local time.
- Disconnecting the Link wallet asks for confirmation first.
- Approving or denying a request in Link reaches the agent's task within seconds instead of several minutes.
- An agent with an open request no longer says the payment failed while the decision is pending.
- If disconnecting the Link wallet has not finished, the wallet panel offers **Connect** alongside **Retry disconnect**, so the owner is not stuck until the old disconnect clears.

### 2026-10-02: Fixes and Improvements, section "Payments (beta)"

- The agent Payments page keeps working even when part of the underlying data is malformed or temporarily unavailable, instead of failing to load.

No later entry in the snapshot (through 2026-10-30) mentions Payments.

## Current behaviour (as of the 2026-10-02 entries)

### Who and where

| Item | Behaviour | Entry |
|---|---|---|
| Availability | Every signed-in account; the Payments page is in the sidebar | 2026-09-28 |
| Scope | Per agent: "the agent Payments page" | 2026-09-24 |
| Wallet | A payment wallet the changelog calls Link, connected from the wallet panel on the Payments page | 2026-09-24, 2026-10-02 |
| Approver | The wallet owner, in Link, for every payment | 2026-10-02 |
| Requesters | The agent's task; with the switch on, also Slack-started conversations with the agent | 2026-10-02 |
| Sandboxes | Results and approvals reach agents on the default provider and on Cloudflare and E2B sandboxes | 2026-10-02 |
| API, CLI, manifest | None in the sources | — |

### The request lifecycle

1. The agent, inside a task, asks to buy something. A purchase request appears as a payment card on the Payments page.
2. The owner approves or declines in Link. While the decision is pending the agent waits and does not report the payment as failed.
3. The decision is delivered to the task within seconds and the run continues with the outcome.
4. The payment card then shows the merchant, amount, status, a plain-language summary, delivery details, whether the merchant order went through, and the order total with shipping, fees and discounts.

### Payments page actions

| Action | What it does | Entry |
|---|---|---|
| Connect / Disconnect (wallet panel) | Connect the Link wallet; disconnecting asks to confirm; Connect is offered next to Retry disconnect while a disconnect is unfinished | 2026-09-24, 2026-10-02 |
| Cancel | Cancel a request; available in "more request states" than before (the states are not listed) | 2026-09-28 |
| Recover request | Pull a request out of an unclear state | 2026-09-28 |
| Mark resolved | Owners can mark a request resolved | 2026-09-28 |
| Team requests from Slack (switch) | Allow Slack-started conversations to request a Link purchase from the owner's wallet | 2026-10-02 |

### Status wording

- Statuses distinguish what the agent reported from what Brainbase independently confirmed (2026-09-28). Treat "agent-reported" as unverified: the agent's own claim that a purchase went through is not the merchant's confirmation.
- Each card shows the status once, with a summary; timestamps are local time (2026-10-02).

### Limits and reliability

- No dollar cap since the $5 pilot limit was removed (2026-09-28).
- Reads and cancellations retry through brief backend contention (2026-09-28); the page tolerates malformed or missing data (2026-10-02 fixes).

## What the sources do not say

- When test-only approvals ended and real purchases began. The 2026-09-24 entry is explicit that no purchase was completed; later entries describe real orders without announcing the switch.
- Which company operates "Link", how a wallet is funded, which payment methods it accepts, or whether purchases draw on Brainbase credits (nothing suggests they do; the wallet is separate from the credit wallet).
- Which merchants or checkout flows an agent can use, how the agent is told to buy (tool name, capability or instruction), or whether the capability must be enabled per agent.
- The full list of request states, the exact status labels, who besides the owner can see the Payments page, and whether approvals can be delegated.
- Any API, CLI, manifest field, webhook or event for purchase requests.
- Refunds, disputes or receipts beyond the payment card's summary.

For any of these, read the live changelog, open the Payments page in the console, and ask Brainbase support (help@brainbaselabs.com) rather than inferring.
