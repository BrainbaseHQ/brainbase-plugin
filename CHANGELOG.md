# Changelog

## Unreleased

### Changed

- README gains a "Network and data" section listing every service the skills can direct an agent to and what the plugin itself does and does not do.
- Marketplace review fixes: the private-repo clone example in `brainbase-sandboxes` sends the token in a `git -c http.extraHeader` header instead of embedding it in the URL; the orchestration MCP host override is described with a plain `<thread_id>` placeholder; the plugin's display name is "Brainbase Skills" to keep it apart from the "Brainbase MCP" plugin; the fresh-agent test prompts live in `prompts.txt`; a few sentences no longer read as a password-manager command.
- `brainbase-interfaces` names both audience choices wherever an audience is set; `brainbase-orchestration` opens its trigger workflow with the three trigger kinds; `brainbase-skills` states which pin freezes skill contents (a source-string pin does, an agent-version pin does not). Found by the iteration-1 evals and confirmed fixed in iteration 2.

### Added

- Two eval cases per skill under `skills/<name>/evals/` in the `claude plugin eval` layout (28 cases, 138 assertions), with the iteration-1 benchmark recorded in `docs/evals.md`: 98% assertion pass rate with the skills versus 16% without.

## 0.1.0 (2026-11-03)

- Initial release: fourteen skills covering the Brainbase platform, the CLI, models and the LLM gateway, sandboxes, orchestration, surfaces, interfaces, benchmarks, evals, permissions, tools, skills, memory, and payments.
- Content grounded in the public docs (docs.brainbaselabs.com) and the public changelog (app.brainbaselabs.com/changelog), snapshot of 2026-11-03.
