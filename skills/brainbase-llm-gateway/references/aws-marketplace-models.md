# AWS Marketplace appliance: model access and Bedrock Mantle throughput

Source: https://docs.brainbaselabs.com/docs/aws-marketplace/quotas (Model access is separate from throughput, Check Bedrock Mantle throughput), https://docs.brainbaselabs.com/docs/aws-marketplace (Prepare your AWS account, Run a real agent task), https://docs.brainbaselabs.com/docs/aws-marketplace/operations (Troubleshoot by symptom, Costs and external dependencies).
Snapshot: 2026-11-03

Applies to the self-hosted appliance installed from AWS Marketplace (public CloudFormation release `2026-09-16.1`, product code `6mq6xj2rkcoaj64hhp4v6vosy`, `us-east-1` only), not to the hosted SaaS. Marketplace billing itself is `brainbase-payments`; sandbox MicroVM capacity is `brainbase-sandboxes`.

## Model access is separate from throughput

Do these checks in the AWS account that will run Brainbase, in `us-east-1`. Access in another account, including the organization management account, is not sufficient. Inspect applied account limits rather than assuming advertised defaults.

The release's LLM gateway calls `bedrock-mantle.us-east-1.api.aws` using an ECS task role and SigV4. It does not require an Anthropic or OpenAI API key. The account must be allowed to use each selected model; a quota increase is not necessarily a model-access approval.

1. Confirm the intended model is in the deployed Brainbase model selector and available to the deployment account through Bedrock Mantle in `us-east-1`.
2. Have an authorized AWS administrator review model terms, Marketplace model-subscription permissions, payment prerequisites and organization restrictions. The Brainbase subscription and third-party model access are separate.
3. For a new account receiving "model not available for this account" or access-denied errors, contact AWS Support or the AWS account team and ask whether frontier-model account enablement is required, not only whether a throughput quota is low. This can be an AWS-internal process that does not appear as a trackable Service Quotas request.
4. After installation, run an actual task with the selected model. A catalog entry or a successful test through a different Bedrock endpoint does not prove the appliance inference path works.

Established accounts may already have access. AWS's Anthropic first-time-use form requirement does not apply to the Mantle path; this does not waive other eligibility, IAM or model restrictions.

| Release model examples | Upstream identifier |
| --- | --- |
| Claude Sonnet 5 | `anthropic.claude-sonnet-5` |
| Claude Opus 5 | `anthropic.claude-opus-5` |
| Claude Opus 4.8 | `anthropic.claude-opus-4-8` |
| Claude Opus 4.7 | `anthropic.claude-opus-4-7` |
| GPT-5.6 Sol | `openai.gpt-5.6-sol` |
| GPT-5.6 Terra | `openai.gpt-5.6-terra` |
| GPT-5.6 Luna | `openai.gpt-5.6-luna` |

Request only what you intend to use. The release also uses `anthropic.claude-haiku-4-5` for title generation; include it when validating the complete experience. The appliance catalog can differ from the hosted SaaS catalog. The selector offers Auto (All); Auto (Open) is not offered because every model in this catalog is closed-weight.

## Check Bedrock Mantle throughput

In Service Quotas (`us-east-1`), select Amazon Bedrock and search for Bedrock Mantle. Its per-model input and output token quotas are separate from Bedrock Runtime quotas. Mantle does not expose an RPM quota. Some models have no published per-account quota; absence is not proof of unlimited capacity or of denied access.

For increases, use AWS Support's Amazon Bedrock limit-increase process and specify `bedrock-mantle`, `us-east-1`, exact model IDs, and requested input/output tokens per minute. Include expected concurrency, context/output sizes and measured usage. If the quota is not exposed, ask AWS which capacity or enablement process applies. AWS reference: https://docs.aws.amazon.com/bedrock/latest/userguide/quotas-mantle.html.

There is no universal Brainbase TPM minimum: long prompts, tool results, parallel agents and output reservations change demand. Start with one small task, measure a representative workload, then add concurrency. A throughput allowance does not guarantee every on-demand request succeeds; transient capacity throttling can still occur.

## Running the first model task

From the install guide (step 6): follow the quickstart in the deployment's UI, choose a model available in this release and approved for this AWS account, keep the first agent minimal, and send a shell smoke test ("print the working directory, create `brainbase-smoke.txt`, read it back"). In Tasks, verify a successful model response, a machine assignment and real tool calls; a machine ID or text-only response alone does not prove sandbox execution. Each optional integration is validated separately.

## Troubleshooting rows that concern models

| Symptom | What to do |
| --- | --- |
| Model unavailable / Bedrock 403 | Separate model/account enablement from IAM/SCP denial. Verify the exact model ID, the Mantle endpoint, and the account with AWS Support. A parent-account approval or a Bedrock Runtime test is not enough. |
| Bedrock 429 / throttling | Check the applicable Mantle input/output quotas and service capacity, reduce concurrent work, request capacity through AWS. Do not switch endpoints merely to reuse a different quota. |
| API returns 502/503 or ECS tasks keep restarting | Inspect ALB target health and stopped-task reasons first; do not assume a model quota failure. |

Operations guidance: track Bedrock throttling/access errors as part of monitoring; HTTP health alone does not prove Bedrock readiness; after an upgrade repeat health, login, model and tool checks.

## Costs and data flow

The Marketplace offer defines Brainbase platform charges, including appliance-hour and estimated model-token-spend dimensions where applicable. The token-spend dimension is a Brainbase platform charge, not a replacement for AWS's Bedrock bill: AWS separately charges for infrastructure, model usage, sandbox compute/storage, networking, email and monitoring. Model calls run using the account's own AWS resources. Do not assume every model listed in the hosted docs is included in the appliance release; validate the selected release before handoff. Support: `help@brainbaselabs.com` (AWS Support handles model enablement and quotas).
