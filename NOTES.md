# Notes

Lasting rules, owner preferences and lessons (never task chatter), and how to test.

- Split out of app-starter (its `app/public/{ui,theme,settings,kit}` with history) so every app loads one served,
  versioned UI core instead of a copy. Serving: this repo's own Worker on a route, so app-sync needs no change.
- Same release scheme as app-sync: tags + `versions.lock.json`, `dist/` rebuilt from tags on every deploy.
- How to test: README "Tests". WebKit needs its system libraries (`npx playwright install-deps webkit`).
- Tab pages are the screen stack's bottom screen (`screenStack().base`), so pushed screens, the bar title and Back
  work unchanged on every page. Swipe tests: Chromium's own edge Back takes a touch starting at the left edge, so the
  edge tests park a spare history entry first. CDP drops a `touchMove` to the same point, so a "held" finger moves 1 px.
- No `@layer` while `tokens.css` (design.flamingbeing.com) has unlayered base rules: unlayered CSS beats every layer,
  so its `:where(button){color:inherit}` and focus reset win over the kit's layered rules (seen as failed axe contrast
  and plain bar buttons in rc.12's try).
- axe runs with `preload: false`: its CSSOM preload copies `@import`-ed sheets into inline `<style>`s, which the
  Worker's page CSP reports a moment later (flaky "style-src-elem inline" fails).
- Swipe feel in WebKit: Playwright has no touch input there (`Touch` is not constructible), so `e2e/swipe-feel.spec.mjs`
  dispatches `Event`s with `touches` defined on them. Give each a 60 Hz `timeStamp`: the let-go speed reads off it,
  and a busy machine's headless frames run 40–80 ms, which turned flicks into drags (flaky). WebKit with emulated
  Reduce Motion paints a move a frame late, so read positions with `expect.poll`.
- CDP touch moves arrive every 35–50 ms in headless Chromium; a test reading the page right after a move polls.
- Jank gate (`e2e/jank.spec.mjs`): rAF frame times are the main thread's, so during a compositor glide a late rAF is
  not a dropped frame on screen; the gate holds drag frames (the page draws them) to 20 ms but one and glide frames
  only to 50 ms. Send the CDP touch moves on Node timers, not a page `evaluate` per move (that work itself dropped
  frames at 4x). Run it alone: next to other workers its frames drop at random.
