# Bring Your Own Bedrock (Kimi K3 on your AWS account)

Source: https://docs.brainbaselabs.com/docs/bring-your-own-bedrock, https://docs.brainbaselabs.com/docs/models (Kimi K3 note), https://docs.brainbaselabs.com/docs/agent/sandboxes (How billing works).
Snapshot: 2026-11-03

## Contents

1. What it does
2. Where to set it (scopes and resolution)
3. Credentials
4. Region and data location
5. Test connection
6. IAM policies
7. Supported agent types
8. Errors and fixes
9. Limits and data flow
10. Removing a credential

## 1. What it does

Kimi K3 (`moonshotai/Kimi-K3`) calls run on your own Amazon Bedrock account instead of Brainbase's hosted provider. AWS bills those calls to you, and they use no Brainbase credits. Sandbox time still uses credits, and a team with no credits is still blocked from running tasks.

This applies to Kimi K3 only. Every other model keeps its current provider. With no credential saved, Kimi K3 runs exactly as it does today. When a credential applies, Brainbase never falls back to its hosted provider: if your AWS account refuses a call, the turn fails with the reason, and you fix it on the AWS side or in the credential.

## 2. Where to set it

| Scope | Where | Who can manage it |
| --- | --- | --- |
| Organization | Settings > Kimi K3 on your AWS account | Org owners and admins |
| User | Settings > Your AWS credential for Kimi K3, for the org you have selected | You. It applies only to tasks you own in that org. |
| Agent | The agent's Secrets page | Anyone who can edit the agent |

Each scope holds one credential. For every Kimi K3 call, Brainbase uses the most specific credential that applies: the agent's credential, then the task owner's user credential, then the org credential. A failing credential never falls back to a less specific one.

- **Task owner:** fixed when the task is created. A teammate who sends messages in someone else's task uses the task owner's credential.
- **Override switch:** org owners and admins can block member (user) and agent overrides. Overrides are allowed by default. When blocked, only the org credential is used.
- **Leaving an org:** the user's credential for that org is deleted.
- **Changes apply on the next call:** a new, replaced or deleted credential takes effect on the next model call, including inside a thread that is already running.
- **Admin overrides table:** org owners and admins see the user and agent credentials in the org: who saved each one, its region, and the AWS account when known. They never see the secret.
- **Which source served a task:** each task shows which credential served its Kimi K3 turns, including turns that failed at AWS. The agent page shows which source Kimi K3 will use when you start a task.

An org credential is shared spend: every member's agents on that org spend on that AWS account. With overrides allowed, anyone who can edit an agent can point that agent's Kimi K3 calls at an AWS account they control. Block overrides if that is unwanted.

## 3. Credentials

The form accepts one of two credential types:

- **IAM access key:** an access key ID and secret access key, with an optional session token. A session token means temporary credentials that expire within hours; the form warns about it. Replace them when they expire.
- **Bedrock API key:** a key created in the Amazon Bedrock console. It works only in the region it was created in.

A saved secret is never shown again. Brainbase shows the credential type, a masked key hint, the region, the data location, who saved it and when, and the last test result. For IAM keys it also shows the AWS account ID to people who can manage that credential and to org admins; for Bedrock API keys the account shows as unknown.

Replacing or deleting a credential destroys the old secret in Brainbase. If two people save the same scope at the same time, the later save is refused with a conflict message. Creating, replacing, deleting and testing a credential, and moving an agent with a credential to another org, are recorded in an audit trail with the scope, the masked key hint and who made the change. Changing the override switch is recorded with who changed it and the org.

AWS recommends temporary credentials over long-term access keys. Brainbase accepts access keys and Bedrock API keys; it does not assume an IAM role in your account. The model should never see or relay these values: the user enters them in the console form.

## 4. Region and data location

Pick the region of your AWS account and a data location. The form offers only the data locations valid for the selected region.

| Data location | Allowed regions | Notes |
| --- | --- | --- |
| Global (default) | Any of the 32 regions below | AWS can route the request to any supported commercial region. |
| US only | `us-east-1`, `us-east-2`, `us-west-1`, `us-west-2`, `ca-central-1`, `ca-west-1` | From `ca-central-1` and `ca-west-1`, AWS may also serve the request in that Canadian region. |
| India only | `ap-south-1`, `ap-south-2` | Only the two India regions are used. |

The 32 source regions available with Global:

| Area | Regions |
| --- | --- |
| US and Canada | `us-east-1`, `us-east-2`, `us-west-1`, `us-west-2`, `ca-central-1`, `ca-west-1` |
| Europe | `eu-central-1`, `eu-central-2`, `eu-north-1`, `eu-south-1`, `eu-south-2`, `eu-west-1`, `eu-west-2`, `eu-west-3` |
| Asia Pacific | `ap-east-2`, `ap-northeast-1`, `ap-northeast-2`, `ap-northeast-3`, `ap-south-1`, `ap-south-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-southeast-3`, `ap-southeast-4`, `ap-southeast-5`, `ap-southeast-6`, `ap-southeast-7` |
| Middle East, Israel, Africa | `il-central-1`, `me-central-1`, `me-south-1`, `af-south-1` |
| South America | `sa-east-1` |

Title generation and context compaction still run on Brainbase's hosted Claude, not on your Bedrock account, so some conversation content is processed outside the chosen data location (section 9).

## 5. Test connection

Test connection runs automatically after every save, and you can run it again yourself. One test runs at a time per credential, each person can run 5 a minute, and an org (or an agent's credential) can run 50 a day. A test that hits a limit says when to retry; a test after a save is skipped when the limit is reached. It makes one minimal Kimi K3 call on your account (a fraction of a cent) and shows success or the error from section 8. For IAM keys, a successful test also shows the AWS account ID when AWS reports it; if that lookup fails, the test still passes without an account ID.

## 6. IAM policies

The policies grant only what Kimi K3 calls need; adapt them to your account's conventions. Replace `<source-region>` with the region saved in Brainbase and `<account-id>` with the 12-digit AWS account ID. Each allows `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` on the Kimi K3 inference profile, and on the foundation models that profile routes to only when the call comes through that profile.

Global data location (`bedrock-kimi-k3-global-policy.json`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "InvokeKimiK3InferenceProfile",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "arn:aws:bedrock:<source-region>:<account-id>:inference-profile/global.moonshotai.kimi-k3"
    },
    {
      "Sid": "InvokeKimiK3FoundationModels",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/moonshotai.kimi-k3",
        "arn:aws:bedrock:::foundation-model/moonshotai.kimi-k3"
      ],
      "Condition": {
        "StringLike": {
          "bedrock:InferenceProfileArn": "arn:aws:bedrock:<source-region>:<account-id>:inference-profile/global.moonshotai.kimi-k3"
        }
      }
    }
  ]
}
```

US only data location (`bedrock-kimi-k3-us-policy.json`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "InvokeKimiK3InferenceProfile",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "arn:aws:bedrock:<source-region>:<account-id>:inference-profile/us.moonshotai.kimi-k3"
    },
    {
      "Sid": "InvokeKimiK3FoundationModels",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/moonshotai.kimi-k3",
        "arn:aws:bedrock:us-east-2::foundation-model/moonshotai.kimi-k3",
        "arn:aws:bedrock:us-west-1::foundation-model/moonshotai.kimi-k3",
        "arn:aws:bedrock:us-west-2::foundation-model/moonshotai.kimi-k3",
        "arn:aws:bedrock:ca-central-1::foundation-model/moonshotai.kimi-k3",
        "arn:aws:bedrock:ca-west-1::foundation-model/moonshotai.kimi-k3"
      ],
      "Condition": {
        "StringLike": {
          "bedrock:InferenceProfileArn": "arn:aws:bedrock:<source-region>:<account-id>:inference-profile/us.moonshotai.kimi-k3"
        }
      }
    }
  ]
}
```

India only data location (`bedrock-kimi-k3-india-policy.json`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "InvokeKimiK3InferenceProfile",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "arn:aws:bedrock:<source-region>:<account-id>:inference-profile/in.moonshotai.kimi-k3"
    },
    {
      "Sid": "InvokeKimiK3FoundationModels",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": [
        "arn:aws:bedrock:ap-south-1::foundation-model/moonshotai.kimi-k3",
        "arn:aws:bedrock:ap-south-2::foundation-model/moonshotai.kimi-k3"
      ],
      "Condition": {
        "StringLike": {
          "bedrock:InferenceProfileArn": "arn:aws:bedrock:<source-region>:<account-id>:inference-profile/in.moonshotai.kimi-k3"
        }
      }
    }
  ]
}
```

Two additions depend on how you connect (`bedrock-kimi-k3-additional-statements.json`):

- **Bedrock API keys:** add a statement allowing `bedrock:CallWithBearerToken` for the IAM user or role that owns the key.
- **Agents on the Codex harness:** Codex calls Bedrock through the Responses API; also allow `bedrock:InvokeModel` on `arn:aws:bedrock:<source-region>:<account-id>:project/default`.

```json
[
  { "Sid": "BedrockApiKeyAuth", "Effect": "Allow", "Action": "bedrock:CallWithBearerToken", "Resource": "*" },
  { "Sid": "CodexResponsesApi", "Effect": "Allow", "Action": "bedrock:InvokeModel",
    "Resource": "arn:aws:bedrock:<source-region>:<account-id>:project/default" }
]
```

## 7. Supported agent types

Kimi K3 on your Bedrock account works with OpenCode, Pi, Kafka, Qwen and Codex agents. Claude Code and Kafka Legacy agents cannot use it: while a credential applies, their Kimi K3 turns fail with a message naming the supported agent types. Remove the credential, choose a different model, or switch to a supported agent type.

## 8. Errors and fixes

When AWS refuses a call, the turn ends with a message mapped from the AWS error. The message never contains secret material, account IDs or ARNs. Context-length errors still trigger the harness's normal context compaction. Throttling and temporary capacity errors are retried automatically before the turn fails; quota, authentication and permission errors are not retried.

| Message | Cause | Fix |
| --- | --- | --- |
| The AWS key ID is not recognized. It may be deleted or mistyped. | Access key deleted or mistyped. | Check the key ID in IAM, or create a new key and replace the credential. |
| The AWS secret does not match the key ID. | Wrong secret for that key ID. | Re-enter both values, or create a new key. |
| These temporary AWS credentials have expired. Replace them, or use a long-term key. | Session token expired. | Replace with fresh temporary credentials, or use a long-term key. |
| This Bedrock API key was not accepted. It may be invalid, expired, revoked, or created for a different region than the one saved. | Key invalid, expired, revoked, or wrong region. | Create a new Bedrock API key in the saved region, or change the saved region to match. |
| AWS denied access to Kimi K3. The IAM policy must allow invoking the Kimi K3 inference profile and model. | IAM policy does not allow the call. | Allow the actions and resources in section 6. The message names the missing action when AWS reports it. |
| AWS is still verifying this AWS account for Bedrock in this region. Verification normally takes under two hours. Try again later. | AWS has not finished verifying the account for Bedrock in that region. | Wait, then run Test connection again. Contact AWS support if it persists. |
| Kimi K3 is not available with this region and data location, or the request was invalid. | Model not offered for that region/data location, or AWS refused a field; the message ends with AWS's explanation. | Pick a region and data location from section 4; if listed, read AWS's explanation. |
| Your AWS account's Bedrock quota for Kimi K3 is used up. Request a quota increase in AWS. | Bedrock quota reached. | Request an increase in AWS Service Quotas. |
| AWS is throttling Bedrock requests on your account. | Requests faster than the account's rate limit. | Retry shortly, or request a quota increase. |
| AWS Bedrock is temporarily out of capacity. | Temporary capacity error. | Retry shortly; try another region if it continues. |
| AWS Bedrock timed out. / AWS Bedrock did not respond in time. | AWS did not answer in time. | Retry. Check AWS service health for the region. |
| AWS Bedrock did not respond within 20 seconds. Try again. | A connection test did not finish in time. | Run Test connection again. |
| AWS did not accept these credentials. | Rejected for an unspecified reason. | Re-enter the credential, or create a new key and replace it. |
| AWS Bedrock rejected the request as invalid. | AWS refused the request itself, not the credential. | Retry; if it persists, contact Brainbase support with the time of the failure. |
| AWS Bedrock returned an unexpected response. | Unreadable response. | Retry; if it persists, contact Brainbase support with the time. |
| The saved AWS Bedrock credential for Kimi K3 could not be used, so this turn was not run. | Brainbase could not load or check the credential, or the agent's org does not match the task. | Check or replace the credential; contact support if it persists. |
| Could not connect to AWS Bedrock. / The connection to AWS Bedrock failed. | Connection failed or was cut. | Retry. Check AWS service health for the region. |
| This model's maximum context length was exceeded. Please reduce the length of the messages. | Conversation longer than Kimi K3 accepts. | Usually nothing: the harness compacts and continues. Start a new task if it persists. |
| The saved AWS region and data location are not a supported combination for Kimi K3. | Region does not serve the saved data location. | Replace the credential with a combination from section 4. |
| The saved AWS credential is incomplete and cannot be used. | A required value is missing. | Replace the credential. |
| Kimi K3 is set to run on your own AWS Bedrock account, which works with OpenCode, Pi, Kafka, Qwen and Codex agents, but not Claude Code or Kafka Legacy. | Unsupported agent type. | Switch agent type, choose a different model, or remove the credential. |

## 9. Limits and data flow

- **Title generation and compaction** run on Brainbase's hosted Claude and use Brainbase credits, so some conversation content is processed outside your chosen data location.
- **Automatic model selection:** when `auto` picks Kimi K3, the call uses your Bedrock account.
- **Task owner's credential:** a teammate's messages in someone else's task use the task owner's credential.
- **Orchestrations and subagents:** members and subagents resolve their own credentials; content passed between them can cross from one AWS account to another.
- **Org credential:** lets every member's agents spend on that AWS account.
- **Sandboxes:** the credential is never placed in the agent's sandbox; it is used only when Brainbase makes the model call.
- **Sandbox billing:** sandbox time is charged in addition to model calls; with BYOB the model calls go to AWS but sandbox time still uses credits (docs/agent/sandboxes).

## 10. Removing a credential

Deleting or replacing a credential in Brainbase does not revoke it in AWS. To stop a key from working, disable or rotate it in IAM, or delete the Bedrock API key in the Bedrock console. Encrypted copies of a deleted credential can persist in Brainbase database backups until the backup retention window ends.
