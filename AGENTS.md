# app-ui

Instructions for every AI assistant working here (Claude Code reads this through `CLAUDE.md`).

The UI core for the owner's web apps: `@core/ui`, `@core/theme`, `@core/settings`, the looks and the `/kit/`
galleries. Each release tag is served unchanged at `core.anawj.com/ui/<version>/`; apps pin an exact version in their
import map, so treat every change as one that reaches every app.

## Public here, private elsewhere

Anything merged here is public. Keep only code, docs, general rules and **made-up** sample data. Never commit
secrets, tokens, personal data, real names or patient details. Private notes belong in the owner's private notes
repo; never copy anything from there into this repo, a PR or an issue (neutral pointers like "ask the owner" are fine).

## Rules that bite

- **A released version never changes.** `versions.lock.json` holds every version's file hashes; the deploy refuses a
  tag that no longer matches. Changes go in a new version: bump `package.json`, then `node tools/build-ui.mjs --lock`
  as the last step of the PR (the deploy workflow tags it on merge).
- **Relative imports only** in `ui/`, `theme/`, `settings/`, `kit/` (`tools/check.mjs`): a version must work from any
  base address. No inline script or style in the gallery pages (the Worker's page policy forbids them).
- Nothing app-specific: no app names, collections or wording; apps pass them in.
- Every part or behaviour the gallery gains gets a test and a line in [docs/kit-tests.md](docs/kit-tests.md).

## App defaults

- Installable web apps cancel the browser's automatic install prompt: add
  `<script>addEventListener('beforeinstallprompt', e => e.preventDefault());</script>` to the `<head>` of every page
  that links a manifest. Keep the manifest, icons and service worker: installable, never prompted. No install buttons.

## Checks before merging

```
node tools/check.mjs        # lock, relative imports, gallery page policy
npm test                    # Worker, UI core and tools unit tests
npm run typecheck           # ui, theme, settings, kit under strict
```

Browser tests run on GitHub (README, "Tests"), not locally first; locally run only the one spec you are fixing.

## Working with the owner

- Instructions mostly come from a phone. Work through a request to the end; ask only when a decision is genuinely
  the owner's. When asked to plan, plan and wait.
- Keep each PR small and finished on its own. Start PR titles with the app: "<App>: …".
- Merge your own PRs once the checks pass, then report with the PR link (merge by the number the PR creation
  returned) and call `unsubscribe_pr_activity`: each PR event re-sends the whole context.
- Push once per finished step, not after every small commit (limited build minutes).
- Each app keeps `NOTES.md` (lasting decisions, how to test) and `STATUS.md` (now, waiting on the owner, next,
  dated decisions). Read them before starting; update them when a task finishes. Cheap end of session: `quick-save`.
- Plain words, short; explain technical terms briefly the first time.

## Token savers

- `.claude/settings.json` is only read when a session has exactly one repo attached. Sessions usually attach the
  owner's notes repo as well; then the environment's shared settings apply instead, so keep both in step.
- `.claude/settings.json` denies reading `__/` and `vendor/` folders. Add generated files and very large files to its
  `deny` list (edit their build scripts instead), and say so here. Ask the owner if one is really needed.
- Run only the touched app's tests while iterating; the browser suite runs on GitHub. Screenshots only for visual
  changes (one, viewport-sized); debug logic with text.
