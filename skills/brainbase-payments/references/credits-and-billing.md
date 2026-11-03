# Credits and billing

Source: https://brainbaselabs.com/pricing (plans), https://docs.brainbaselabs.com/docs/agent/sandboxes (credit value, out of credits), https://docs.brainbaselabs.com/docs/aws-marketplace and /docs/aws-marketplace/operations (Marketplace billing), https://docs.brainbaselabs.com/cli/commands/task (billing failure output), https://docs.brainbaselabs.com/cli/reference/orchestration-manifest and /api/orchestrations/create-orchestration (`credit_limit`)
Source: https://app.brainbaselabs.com/changelog entries 2026-05-29, 2026-06-18, 2026-07-01, 2026-07-03 (two), 2026-07-08, 2026-07-10, 2026-07-18, 2026-07-24, 2026-08-14, 2026-08-25, 2026-09-04 (two), 2026-09-18, 2026-09-25, 2026-10-02, 2026-10-29, 2026-10-30
Snapshot: 2026-11-03

## Contents

- The credit
- Plans (pricing page)
- The prepaid wallet and top-ups
- Auto-Reload (automatic top-ups)
- Free and bonus credits
- Out of credits and spend limits
- Usage and Billing pages
- Enterprise billing
- AWS Marketplace billing
- Console paths and roles the sources name

## The credit

- One credit is $0.01. Sandbox time and model usage are paid from the same balance (docs, sandboxes).
- The wallet is prepaid: buy credits first, then usage debits them. Two billing models exist side by side: the self-serve prepaid wallet, and contract or usage-billed plans (Enterprise; Teams' usage beyond included limits). Billing and Usage show only the concepts that apply to the account's plan (changelog, 2026-09-18).
- Sandbox-mode and live-mode credits are tracked separately; switching modes never mixes balances or lets a live purchase count against sandbox usage (changelog, 2026-07-03).
- Team credit tracking uses one consistent billing owner across debits and enforcement (changelog, 2026-07-10). Subagent turns bill the parent thread's billing owner (2026-06-11). Sandbox attribution is preserved from the run that used the sandbox (2026-07-14).

## Plans (pricing page)

| | Individuals | Teams | Enterprise |
|---|---|---|---|
| Price | $0 / month | $500 / month | Custom |
| Free credits | $25 in credits | $500 included | Custom |
| Deployed agents | Unlimited | Unlimited | Unlimited |
| Data retention / trace retention | 7 days | 30 days | Custom |
| Highlights | Versioning, observability & community support | Orchestration, evals & priority support | SSO, RBAC, hybrid deployment & dedicated support |
| Users | Unlimited | Unlimited | Unlimited |
| Concurrent sandboxes | 20 | 200 | Custom |
| Role-based access control | — | Basic | Custom |

Compare-table rows with no plan marked "—" (so included on every plan): Managed Agents API, Any model or harness, Multi-agent orchestration, Agent hand-offs, Shared tools & memory, Versioning, Unit & regression testing, Code evals, LLM-as-judge, Custom benchmarks, Scheduled eval runs, Full observability, SOC 2 Type II, Community support.

Rows marked "—" on two of the three plans: Bring Your Own Keys (BYOK), Custom retention policies, SSO / SAML, HIPAA BAA, Hybrid / on-prem deployment, Shared Slack channel, Dedicated SLA. Rows marked "—" on one plan: Agent-as-judge, Data export to your cloud, Priority support. The mirror drops the page's check-mark icons, so it does not record which column each "—" sits in; the plan highlights imply the two-dash rows are Enterprise-only and the one-dash rows exclude Individuals. Confirm on the live page before stating it.

Pricing page FAQ facts:

- An agent run is a single end-to-end execution of a deployed agent, from the incoming request to the final response, including tool calls and sub-agents. Orchestrated teams of agents are billed per underlying agent run.
- Individuals is free and requires no credit card. Teams is a flat $500/month platform fee billed monthly, with additional usage beyond included limits billed at the end of each cycle. Enterprise is billed on a custom contract. Upgrade or downgrade at any time.
- Enterprise can run agents and the data plane in the customer's own cloud or on-prem while using Brainbase's control plane.
- Early-stage startups and open-source projects are invited to contact the team for a plan.
- "Get started with $25 in free credits — no credit card required." This conflicts with the changelog of 2026-10-30, which grants the $25 only after verifying a phone number and a credit or debit card. Point the user at the live signup flow.

## The prepaid wallet and top-ups

Changelog, 2026-07-03, "Prepaid Credit Wallet, Top-Ups, and Team Upgrade Bonus Credits":

- A redesigned Billing page shows the credit wallet balance and recent credit activity in one place, with a top-up flow that buys credits in whole-dollar increments.
- Saved payment methods make repeat top-ups a single click after the first purchase, without leaving Brainbase.
- Team plan upgrades grant a one-time bonus credit that lands in the wallet automatically once the upgrade completes.
- New signup accounts receive a starter credit grant.
- Enterprise workspaces see a contact path from Billing rather than a self-serve checkout.
- Purchases fulfil even if the payment provider's confirmation callback is briefly delayed; the credit lands as soon as the user returns to Brainbase, and duplicate confirmations are ignored so a top-up never grants twice.

Later entries:

- Manual top-ups record a Stripe receipt link; the Billing activity row shows a **View receipt** button (2026-07-10, which added the same for auto-reload top-ups).
- Wallet top-ups unblock new runs immediately; Team plan upgrades stay active under duplicate payment confirmations (2026-07-10).
- Billing shows the current billing period and credit refresh date (2026-08-14).
- Buying credits or saving a card for auto top-up may ask for bank confirmation (3D Secure). If a card's security code does not match, the payment is refunded, no credits are added and Billing explains why (2026-10-29).
- Upgrading from Free to Team no longer risks cancelling the subscription just paid for; clicking Upgrade while a Team checkout is open returns to that checkout (2026-10-29).

## Auto-Reload (automatic top-ups)

Changelog, 2026-07-08, "Automatic Wallet Top-Ups When Your Credit Balance Runs Low":

- Turn on **Auto-Reload** from the Billing page once a payment method is saved. Choose the balance threshold that triggers a top-up and the dollar amount to reload each time.
- When the wallet drops below the threshold, Brainbase charges the saved card off-session and adds the credits automatically. Runs in progress are not interrupted while the charge settles.
- The Billing page shows a live state for each auto-reload: pending, active, or paused after a failure.
- If a charge fails, auto-reload pauses briefly before retrying and never double-charges the same top-up; fix the card and resume from the same page.

Later entries:

- Successful auto-reload top-ups record the Stripe receipt link, so the activity row shows **View receipt** (2026-07-10).
- Enabling an auto-reload rule immediately checks the prepaid balance and tops up if already low; a background scan catches wallets that dip below the threshold between charges (2026-07-10).
- Saving a card for auto top-up may require 3D Secure (2026-10-29).
- After three failed automatic payments in a row, auto top-up turns itself off and Billing asks for an updated payment method (2026-10-29).

## Free and bonus credits

| Grant | Rule | Entry |
|---|---|---|
| Starter credit grant | New signup accounts receive one | 2026-07-03 |
| Phone verification | Free signup credits activate by verifying a mobile number on the Billing page; paid top-ups and balances are not gated | 2026-07-10 |
| Claim entry points | Onboarding wizard, a compact sidebar banner, and the Billing page; they disappear once credits are activated | 2026-07-18 |
| Manual review | New email/password signups go through a brief manual review before free trial credits are applied | 2026-09-18 |
| Held grant approved | When staff approve a held signup credit grant, the account owner gets an email | 2026-10-29 |
| $25 automatic | Verifying a phone number and a credit or debit card grants $25 right away, without manual review. The claim completes automatically once phone, card and first agent are verified, on whichever page the user finishes | 2026-10-30 |
| Free-credit model gate | Free credits run on a set of open models in the web app until the first top-up. A model the free credits cannot run shows a **Top up** badge with a link to add credits; new agents and tasks default to a model the credits can run | 2026-10-30 |
| API and CLI | Unlock after the first top-up; onboarding takes everyone into the guided web setup | 2026-10-30 |
| Team upgrade bonus | One-time bonus credit grant lands automatically once the upgrade completes | 2026-07-03 |
| Referral promo | The old referral promo, invite dialog and email invite flow were removed; their credit granting is off | 2026-07-10 |

## Out of credits and spend limits

What happens when the balance or a limit is hit:

| Where | Behaviour | Source |
|---|---|---|
| Tasks | A team with no credits left cannot run tasks until credits are added | docs, sandboxes |
| Task failure (console) | The task reports clearly that the account is out of credits; a dialog offers to get or add credits | changelog 2026-09-18, 2026-09-25, 2026-10-29 |
| Task failure (CLI) | `brainbase task get <task-id>` prints the reason under `failure`, with the detail returned by the service, when Brainbase stopped the task because there were no credits left or a billing limit was reached. Add credits or raise the applicable billing limit, then run the task again | docs, CLI task |
| Never-started tasks | Tasks refused before setup are closed with a note and can be deleted, instead of showing as running forever | changelog 2026-10-29 |
| Many tasks at once | Starting many tasks at once (for example from an orchestration) no longer fails some with a billing-unavailable error | changelog 2026-10-29 |
| Eval judges | With no credits left or a spending limit reached, the judge call is rejected and the evaluation is recorded as errored with no verdict | docs, evaluations |
| Benchmark runs | A run that hits a credit or plan limit pauses instead of scoring the blocked case as a failure; the run page shows the reason and a **Resume** button, or `POST /v2/agents/{agent_id}/benchmarks/runs/{run_id}/resume` | docs, benchmarks; changelog 2026-09-11 |
| Schedule triggers | A recurring schedule trigger that cannot afford its next run pauses itself and says why, instead of retrying forever | changelog 2026-09-04 |
| Limit dialogs | The Upgrade plan action in the credits, workflows and playbooks limit dialogs opens the in-app Billing page (buy credits, top up or upgrade) instead of the external payment portal | changelog 2026-07-10 |
| Bring Your Own Bedrock | Model calls bill to AWS, but sandbox time still uses credits and a team with no credits is still blocked | docs, bring-your-own-bedrock |
| Usage alerts | Accounts approaching their credit limit get the usage-alert email once per threshold crossing | changelog 2026-09-25 |

Spend limits:

- **Project limits** (Usage page): formerly "Team budgets". Set a project's spend limit with a slider up to the org limit; the value is comma-formatted as you drag. A marker on the usage chart shows current-period spend against the limit, with a tooltip (changelog, 2026-08-25). The sources do not say which roles may change it.
- **Orchestration `credit_limit`**: `orchestration.credit_limit` (number, optional, "Optional orchestration credit limit") in `brainbase.orchestration.yaml`; `credit_limit` (number, optional) on `POST /v2/orchestrations` and in the orchestration object. Enforcement details are not documented.
- **Subagent pre-checks**: team credit-limit checks before a Claude Code or Codex subagent starts were announced as following separately (changelog, 2026-06-11); no later entry confirms them.

## Usage and Billing pages

- Settings, Members, Usage and Billing are dedicated pages with stable URLs (changelog, 2026-07-01).
- Usage breaks out sandbox spend as its own total, with daily Chat, Sandbox and Workflow breakdowns and a per-task view of where sandbox time went (2026-07-14).
- Usage separates credits spent in the selected window from the cumulative plan total (2026-07-24) and can filter to the current billing period (2026-08-14).
- The agent Tasks page can filter tasks by credits (docs, monitoring/tasks).
- Model pickers show pricing; displayed pricing for 22 of the 35 catalog models was corrected to match billing on 2026-08-28, and Inkling's picker price changed from $0 to its real rate on 2026-09-04.

## Enterprise billing

| Capability | Detail | Entry |
|---|---|---|
| Contract terms | Enterprise admins and owners review contract terms in Billing | 2026-05-29 |
| Invoices | The billing tab lists every invoice, with per-line classification into Plan charges, Overages and Other, each linking to the hosted invoice | 2026-06-18 |
| Card on file | Enterprise admins add or replace the card from the contract card through a hosted checkout; on-file status shows inline | 2026-06-18 |
| Live payment status | Invoice and subscription status update in real time as payments succeed, fail or are voided | 2026-06-18 |
| Due-on-receipt contracts | Require a card on file before they can be promoted to fully migrated | 2026-06-18 |
| Billing contact | A dedicated billing contact receives invoices, receipts and card-expiry notices instead of the earliest team owner | 2026-07-03 |
| Self-serve | Enterprise workspaces see a contact path from Billing, not a checkout | 2026-07-03 |
| Teams under an enterprise account | Usage-based billing and plan entitlements are attributed and applied consistently | 2026-08-14 |
| Live data | Billing and Usage for Enterprise reflect live wallet and invoice data instead of stale counters or a hardcoded credit price | 2026-09-18 |
| Period and next invoice | Billing shows the exact billing period and next invoice date, with a simpler account picker when only one account exists | 2026-09-25 |

## AWS Marketplace billing

- Customers who deploy Kafka through AWS Marketplace get a dedicated **Subscription** panel reflecting AWS entitlement status instead of Stripe billing, plans and credits screens; plan limits and team-invite restrictions do not block these deployments (changelog, 2026-09-04).
- Product: **Brainbase - Agent Platform**, product code `6mq6xj2rkcoaj64hhp4v6vosy`; CloudFormation release `2026-09-16.1` in `us-east-1`. A public offer and a private offer are alternative commercial terms, not two stacks; verify a private offer's intended account and offer ID before accepting (docs, aws-marketplace).
- The Marketplace offer defines Brainbase platform charges, including the appliance-hour and estimated model-token-spend dimensions where applicable. The token-spend dimension is a Brainbase platform charge, not a replacement for AWS's Bedrock bill (docs, aws-marketplace/operations).
- AWS separately charges for infrastructure, model usage, sandbox compute and storage, networking, email and monitoring. Idle application services, NAT, ALB, database and retained storage still incur charges. Configure AWS budgets; the guide is not a fixed monthly cost quote.
- Marketplace purchase does not grant model access, Bedrock Mantle throughput, Lambda MicroVM memory or SES production access; those are separate AWS approvals (docs, aws-marketplace, quotas).
- Infrastructure deletion and Marketplace cancellation are separate actions; review the agreement's cancellation and renewal terms (docs, aws-marketplace/operations).

## Console paths and roles the sources name

| Path | Source |
|---|---|
| Billing: wallet balance, recent credit activity, top-up, saved payment methods, Auto-Reload, View receipt, billing period, credit refresh date | changelog 2026-07-03, 2026-07-08, 2026-07-10, 2026-08-14 |
| Usage: Project limits slider and chart marker, sandbox/chat/workflow breakdowns, period filter | changelog 2026-08-25, 2026-07-14, 2026-08-14 |
| Members: an owner can grant an admin "Admin manager" to manage other admins; "billing and other owner-only settings are unaffected" | changelog 2026-10-02 |
| Enterprise admins: card on file; enterprise admins and owners: contract terms | changelog 2026-06-18, 2026-05-29 |

The sources do not give click-level paths beyond these labels or say which roles can move project limits. Fetch the live console and see `brainbase-permissions`.
