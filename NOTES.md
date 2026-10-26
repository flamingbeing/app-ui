# Notes

Lasting rules, owner preferences and lessons (never task chatter), and how to test.

- Split out of app-starter (its `app/public/{ui,theme,settings,kit}` with history) so every app loads one served,
  versioned UI core instead of a copy. Serving: this repo's own Worker on a route, so app-sync needs no change.
- Same release scheme as app-sync: tags + `versions.lock.json`, `dist/` rebuilt from tags on every deploy.
- How to test: README "Tests". WebKit needs its system libraries (`npx playwright install-deps webkit`).
