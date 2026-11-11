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

Five later cases pose an agent that only has the Brainbase MCP connected: `mcp-schedule-with-revision-conflict` and `mcp-no-tool-from-shell-less-client` in `brainbase-mcp-tools`, `evals-run-through-mcp`, `sandbox-machine-size-through-mcp` and `interface-publish-without-mcp-tool`. The eval harness exposes no MCP tools, so each prompt states what the agent has connected and the graders read the written answer. They are not in the tables below.

Every prompt ends with "Write your complete answer to `answer.md` in the current directory." The assertions are phrased "answer.md ...", and without that line a run answers in the transcript, writes no file, and the CLI's judge fails almost every positive assertion in both arms (an existing case, `evals-policy-check-manifest`, scored 0.56 with the skill that way).

Run on 2026-11-10 with the line added (one with-skill run each, Sonnet executor, default judge): `mcp-no-tool-from-shell-less-client` 6/6, `mcp-schedule-with-revision-conflict` 6/7, `evals-run-through-mcp` 4/5, `sandbox-machine-size-through-mcp` 5/5, `interface-publish-without-mcp-tool` 5/5, and the two existing `brainbase-evals` cases 6/6 and 5/6. The schedule case's failing assertion contradicted its own prompt and was reworded afterwards; it has not been re-run. The other 26 existing cases have not been re-run with the line, and no without-skill arm was run.

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

## Fresh-agent trigger test (2026-11-03)

The eval runs above hand the model the skill's path. This test checks the other half: that a model with no memory and no prior context picks the right skill by itself. Each of fourteen fresh Sonnet agents was given only what a plugin host injects (the fourteen skill names and descriptions, and where the files live) plus one user prompt, and was left to decide whether to open a skill. Output folders were named t01 to t14 so nothing hinted at the expected skill. Answers were graded against the same assertions as the eval cases.

| Test | Skill expected | Case | Opened it unprompted | Reference files read | Assertions |
|---|---|---|---|---|---|
| t01 | `brainbase-platform` | platform-start-thread-over-api | yes | 1 | 5/5 |
| t02 | `brainbase-cli` | cli-publish-agent-from-ci | yes | 3 | 6/6 |
| t03 | `brainbase-llm-gateway` | llm-switch-model-mid-task | yes | 1 | 5/5 |
| t04 | `brainbase-sandboxes` | sandbox-providers-and-machines | yes | 2 | 4/4 |
| t05 | `brainbase-orchestration` | orch-two-agent-handoff-manifest | yes | 2 | 5/5 |
| t06 | `brainbase-surfaces` | surface-connect-slack-from-ci | yes | 1 | 5/5 |
| t07 | `brainbase-interfaces` | interface-build-and-publish | yes | 0 | 6/6 |
| t08 | `brainbase-benchmarks` | bench-suite-from-csv | yes | 2 | 5/5 |
| t09 | `brainbase-evals` | evals-policy-check-manifest | yes | 1 | 6/6 |
| t10 | `brainbase-permissions` | perm-ci-token-scope | yes | 2 | 5/5 |
| t11 | `brainbase-tools` | tools-add-remote-mcp | yes | 1 | 5/5 |
| t12 | `brainbase-skills` | skills-install-registry-skill | yes | 1 | 6/6 |
| t13 | `brainbase-memory` | memory-customer-context-table | yes | 1 | 5/5 |
| t14 | `brainbase-payments` | pay-auto-topup-credits | yes | 2 | 5/5 |

Every agent opened exactly the expected skill and no other, most went on to the reference file the skill pointed at, and the graders found no factually wrong statement in any answer. This is a host simulation rather than a real plugin load: a true end-to-end run is `claude -p "<prompt>" --plugin-dir /path/to/brainbase-plugin` from an empty directory, which needs a logged-in `claude` CLI.

## End-to-end plugin test, headless Claude Code (2026-11-03)

The real thing: one fresh `claude -p` process per primitive with the plugin loaded through `--plugin-dir`, started in an empty folder (no memory, no project settings), on Sonnet with read-only tools (`Read, Glob, Grep, Skill, WebFetch, WebSearch`), the same fourteen prompts as the host-simulation test, graded against the same assertions. "Invoked" means the host's own Skill tool was called with `brainbase:<skill>`, read from the stream-json transcript.

| Skill | Invoked via Skill tool, unprompted | Reference files read | Turns | Seconds | Assertions |
|---|---|---|---|---|---|
| `brainbase-platform` | yes | 0 | 3 | 19 | 5/5 |
| `brainbase-cli` | yes | 0 | 3 | 18 | 6/6 |
| `brainbase-llm-gateway` | yes | 0 | 3 | 13 | 5/5 |
| `brainbase-sandboxes` | yes | 0 | 3 | 15 | 4/4 |
| `brainbase-orchestration` | yes | 2 | 7 | 34 | 5/5 |
| `brainbase-surfaces` | yes | 2 | 5 | 23 | 5/5 |
| `brainbase-interfaces` | yes | 0 | 3 | 13 | 6/6 |
| `brainbase-benchmarks` | yes | 1 | 7 | 17 | 4/5 |
| `brainbase-evals` | yes | 0 | 6 | 20 | 6/6 |
| `brainbase-permissions` | yes | 0 | 3 | 15 | 5/5 |
| `brainbase-tools` | yes | 1 | 6 | 21 | 5/5 |
| `brainbase-skills` | yes | 2 | 12 | 31 | 5/6 |
| `brainbase-memory` | yes | 0 | 5 | 32 | 5/5 |
| `brainbase-payments` | yes | 1 | 4 | 15 | 5/5 |

Total: 71/73 assertions, invoked 14/14, about $2.89 for the batch. The graders found no factually wrong statement in any answer. The two misses are judgment calls rather than errors: the skills answer declined to recommend `brainbase agent push` from an unlinked, empty folder (the skill itself says to run `agent status` first), and the benchmarks answer pointed at the CLI rather than the console or API import route.

To repeat it, see `docs/fresh-agent-test/`: `run_headless.sh <skill> "<prompt>"` runs one, `run_all_headless.py` runs the batch five at a time, and `prompts.txt` holds the prompts (one tab-separated `skill<TAB>prompt` line each). It needs a logged-in `claude` CLI (`claude auth login`).
