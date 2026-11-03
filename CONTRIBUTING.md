# Contributing

Thanks for helping keep these skills accurate.

1. Read [docs/skill-authoring.md](docs/skill-authoring.md). It explains the layout, the frontmatter, the section order and the grounding rules every skill follows.
2. Ground every change in a public page: [docs.brainbaselabs.com](https://docs.brainbaselabs.com) or the [changelog](https://app.brainbaselabs.com/changelog). Name the page in the reference file's `Source:` lines and update its `Snapshot:` date.
3. Never commit secret values or realistic-looking tokens. Placeholders only.
4. Run the checks before opening a pull request:

   ```bash
   node scripts/validate.mjs
   claude plugin validate .
   ```

5. If a change alters what a skill teaches, re-run that skill's eval cases (`claude plugin eval skills/<name> --allow-tools Write`; these are billed model runs) and update the case's `case.yaml` or graders when the expected answer moves. See [docs/evals.md](docs/evals.md).
6. Bump `version` in `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json` together, and add a line to `CHANGELOG.md`.

Pull request titles follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
