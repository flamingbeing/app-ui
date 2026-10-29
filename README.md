# app-ui

The UI core for the owner's web apps, served at exact versions from `core.anawj.com/ui/<version>/`:

- `ui/`: `@core/ui`, the gesture parts and the adaptive shell ([docs/ui-kit.md](docs/ui-kit.md)).
- `theme/`: `@core/theme`, the device's theme choice, the looks, glass and motion; `theme/early.js` runs before first
  paint.
- `settings/`: `@core/settings`, settings kept through the app's sync engine (passed in).
- `kit/`: the galleries (`/kit/`, `/kit/shell/`, `/kit/dense/`, `/kit/settings/`, `/kit/parts/`) the browser tests drive; installable (manifest, service
  worker), never prompted.
- `icons/`: shared icons.

## Using it in an app

Pin one version in the import map and link the styles from the same base:

```html
<script type="importmap">
{ "imports": { "@core/ui": "https://core.anawj.com/ui/1.0.0-rc.1/ui/index.js",
               "@core/theme": "https://core.anawj.com/ui/1.0.0-rc.1/theme/index.js",
               "@core/settings": "https://core.anawj.com/ui/1.0.0-rc.1/settings/index.js" } }
</script>
```

For types, add `github:flamingbeing/app-ui#v1.0.0-rc.1` as a devDependency and point `paths` at `node_modules/app-ui`.
`/ui/versions.json` lists the served versions (`latest` is the last stable one).

## Responsiveness rules

Every gesture in the kit, and any an app adds, keeps to these (`ui/motion.js` does the work; `e2e/jank.spec.mjs`
holds the kit to them):

- **Transform and opacity only** while anything moves: no layout, no `top`, `height` or `width` per frame. Lay out
  what a gesture will show before the finger moves (the tab pager lays the pages beside out at the touch).
- **Follow the finger** 1:1 from the first move that shows the axis (8 px), with `touch-action` set so the browser
  never takes that axis (`pan-y` for a sideways drag, `pan-x` for an up-and-down one); past an end, a rubber band.
  Reduce Motion never stops a finger-driven move or the glide that finishes it; only extra flourishes skip.
- **Let go into a spring**: the finger's speed goes to a critically damped spring (`glide`), run by the compositor
  (Web Animations), so a busy main thread can't stutter it. `spring` is the main-thread fallback for values that
  aren't a transform or opacity.
- **Interruptible**: a finger on a glide stops it where it is (`stop()` gives the place) and drags on from there.
- **Defer work until the lift**: saves, syncs and re-renders a gesture starts go through `afterGesture(fn)`, which
  runs them once the fingers are up and the glides have landed, a frame after the landing paints. Listeners on touch
  and scroll are passive unless they must cancel.
- **Pressed at once**: `startGestures()` marks a touched button, tab, menu item or row `data-pressed` on the touch
  (no wait for `:active`), cleared on lift, scroll or cancel.
- **The budget** (the jank gate, CI): on a 390 px phone with the CPU slowed 4x (Chromium, DevTools protocol touch),
  a tab swipe, a tab flick and a sheet dragged up, down and away keep every drag frame within 20 ms but one, no frame
  over 50 ms (drag or glide) and no task over 50 ms; a touched tab shows pressed within 50 ms. WebKit (the iPhone's
  engine) runs the same gestures unslowed. It runs alone after the other browser tests, one test at a time, with no
  retries; a failure is a slow frame to fix, never a number to loosen.

## Releases

`versions.lock.json` holds every version's file hashes. To release: bump `package.json`, run
`node tools/build-ui.mjs --lock`, merge. The Deploy workflow tags `vX.Y.Z` and deploys; it rebuilds `dist/` from every
tag (`tools/build-ui.mjs`) and stops if a released version's files changed. The Worker (`worker/sites.js`) runs on the
route `core.anawj.com/ui/*`, in front of app-sync's Worker on the same host.

## Tests

- `npm test`: Worker, UI core and tools unit tests. `npm run typecheck`. `node tools/check.mjs`.
- `npx playwright test`: the real Worker in Node (`e2e/serve.mjs`) serves this checkout as `/ui/0.0.0-dev/`. Every spec
  in Chromium; `e2e/gallery.spec.mjs` (each gallery page starts clean: no page error, axe, no CSP report) also in
  Firefox and WebKit. The base config comes from app-devkit: copy its `playwright/` folder to `.devkit/` once locally
  (CI's setup-browser does it). `PW_CHROMIUM=<path>` uses a Chromium already on the machine.
- The jank gate (`e2e/jank.spec.mjs`, projects `jank` and `jank-webkit`) runs after the rest; alone:
  `npx playwright test --project=jank --no-deps`.
- What the gallery tests cover: [docs/kit-tests.md](docs/kit-tests.md).
