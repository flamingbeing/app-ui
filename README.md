# app-ui

The UI core for the owner's web apps, served at exact versions from `core.anawj.com/ui/<version>/`:

- `ui/`: `@core/ui`, the gesture parts and the adaptive shell ([docs/ui-kit.md](docs/ui-kit.md)).
- `theme/`: `@core/theme`, the device's theme choice, the looks, glass and motion; `theme/early.js` runs before first
  paint.
- `settings/`: `@core/settings`, settings kept through the app's sync engine (passed in).
- `kit/`: the galleries (`/kit/`, `/kit/shell/`, `/kit/dense/`) the browser tests drive; installable (manifest, service
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
- What the gallery tests cover: [docs/kit-tests.md](docs/kit-tests.md).
