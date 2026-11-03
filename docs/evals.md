# Eval cases and benchmark

Every skill carries two eval cases under `skills/<name>/evals/<case>/`, in the layout `claude plugin eval` reads:

```
evals/<case>/
├── prompt.md        settings block, then the user's message
├── case.yaml        the expected outcome in prose
└── graders/NN-*.md  one verifiable assertion per file (type: llm, focus: trace)
```

Prompts are written the way a real user would ask, and assertions check facts the docs settle (an endpoint, a flag, a limit, a rule), so a run passes only when the answer gets the Brainbase specifics right rather than hedging them as unverified.

## Running them

```bash
claude plugin eval skills/brainbase-cli --allow-tools Write
```

The CLI runs each case with and without the skill and writes its report under `evals/results/`. These are real, billed model runs; a skill's two cases cost roughly four executor runs plus grading.

## Benchmark, iteration 1 (2026-11-03)

Setup: 28 cases, one run per configuration, Sonnet executors with web tools allowed in both configurations (so the baseline reflects what a model finds on the live docs unaided). Graded against the 136 assertions by separate grader agents using the skill files as the source of truth.

| Metric | With skill | Without skill | Delta |
|---|---|---|---|
| Assertion pass rate | 98% | 16% | +82 points |
| Wall-clock per run | 33.7s ± 7.2s | 36.2s ± 19.0s | -2.4s |
| Tokens per run | 85.9k ± 4.8k | 70.5k ± 2.4k | +15.5k |

Per case (assertions passed / total):

| Case | Skill | With | Without |
|---|---|---|---|
| platform-start-thread-over-api | brainbase-platform | 5/5 | 1/5 |
| platform-explain-harnesses | brainbase-platform | 4/4 | 3/4 |
| cli-publish-agent-from-ci | brainbase-cli | 6/6 | 0/6 |
| cli-write-agent-manifest | brainbase-cli | 6/6 | 0/6 |
| llm-switch-model-mid-task | brainbase-llm-gateway | 5/5 | 0/5 |
| llm-cursor-missing-secret | brainbase-llm-gateway | 4/4 | 0/4 |
| sandbox-gpu-cost-and-files | brainbase-sandboxes | 5/5 | 3/5 |
| sandbox-providers-and-machines | brainbase-sandboxes | 4/4 | 2/4 |
| orch-two-agent-handoff-manifest | brainbase-orchestration | 5/5 | 1/5 |
| orch-event-trigger-and-sharing | brainbase-orchestration | 3/4 | 0/4 |
| surface-connect-slack-from-ci | brainbase-surfaces | 5/5 | 2/5 |
| surface-github-pr-reviews | brainbase-surfaces | 5/5 | 0/5 |
| interface-build-and-publish | brainbase-interfaces | 4/5 | 3/5 |
| interface-rollback-and-audience | brainbase-interfaces | 5/5 | 0/5 |
| bench-suite-from-csv | brainbase-benchmarks | 5/5 | 0/5 |
| bench-api-bakeoff | brainbase-benchmarks | 5/5 | 4/5 |
| evals-policy-check-manifest | brainbase-evals | 6/6 | 0/6 |
| evals-push-refuses-archive | brainbase-evals | 4/4 | 0/4 |
| perm-ci-token-scope | brainbase-permissions | 5/5 | 0/5 |
| perm-ask-rule-who-answers | brainbase-permissions | 5/5 | 0/5 |
| tools-add-remote-mcp | brainbase-tools | 5/5 | 0/5 |
| tools-integration-error-codes | brainbase-tools | 5/5 | 0/5 |
| skills-install-registry-skill | brainbase-skills | 5/5 | 0/5 |
| skills-publish-to-registry | brainbase-skills | 4/4 | 0/4 |
| memory-customer-context-table | brainbase-memory | 5/5 | 0/5 |
| memory-disable-and-share | brainbase-memory | 4/4 | 1/4 |
| pay-agent-purchase-flow | brainbase-payments | 5/5 | 1/5 |
| pay-auto-topup-credits | brainbase-payments | 5/5 | 0/5 |

What the numbers mean:

- **Baselines mostly hedged or guessed.** Without the skill the model usually said it could not verify Brainbase's syntax, invented names (`brainbase skills install`, an `mcpServers` JSON block, viewer/editor roles), or searched a different product's docs and told the user the feature did not exist. The baseline scored on the sandbox, harness and benchmark cases because it found the live pricing and harness pages.
- **The two with-skill misses were completeness, not accuracy.** The interfaces answer skipped the "only chosen people (up to 2,000)" audience option; the orchestration answer never mentioned schedule triggers. Both assertions bundled two facts and have since been split.
- **One factual slip with the skill**, uncaught by any assertion: the skills-install answer said a version pin in a `registry:` source string does not freeze contents. The skill says it does (the caveat applies to agent-version pins).
- **Cost of the skill** is about 15k tokens per run, which is SKILL.md plus one reference file, and no extra time.

The assertion texts above were refined after this run on grader feedback (four tightened, three added), so a re-run scores against slightly stricter graders than the numbers here.

## Iteration 2 (2026-11-03): fixing the three gaps

Three skill edits, each re-run on its case with the same executor and graded against the current assertions (the iteration-1 answer regraded alongside as the baseline):

| Case | Skill change | Old answer | New answer |
|---|---|---|---|
| interface-build-and-publish | Workflow 2 and the operating rules now name both audience choices wherever an audience is set | 5/6 | 6/6 |
| orch-event-trigger-and-sharing | Workflow 5 opens by naming the three trigger kinds and which are console-only | 4/4 | 4/4 |
| skills-install-registry-skill | The pinning rule now says which pin freezes what: a source-string pin freezes contents, an agent-version pin does not | 5/6 | 6/6 |

The old skills-install answer held the only factually wrong sentence found across the whole benchmark (it said a `@1.2.3` source pin does not freeze contents). The reworded rule removes the ambiguity, and a new assertion now checks it.
