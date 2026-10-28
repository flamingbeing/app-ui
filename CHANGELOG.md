# Changelog

## 1.0.0-rc.16
- Tab swipe: no start within max(24 px, an eighth of the width) of either edge (`swipeEdge`); the sideways test is
  looser (1.3:1, about 37°). A right swipe on the first page calls `onPrevMissing` (`startGestures(root, { onPrevMissing })`
  or `tabPages(..., { onPrevMissing })`), so an app can open its drawer.
- Page: `overscroll-behavior: none` and `touch-action: pan-x pan-y` on `html` and `body` (no pinch or double-tap zoom).
- Sheet: the first drag has no forced layout (height measured at open and after each settle) and, on a phone, the sheet
  gets `will-change: transform` while dragging.

## 1.0.0-rc.15
- Kit gallery, installed: opens the newest version. The manifest's `id` and `start_url` are `/ui/kit/` (the Worker 302s
  it to the newest gallery) and its scope is `/ui/`, so one home-screen app follows every release instead of staying on
  the version it was installed from.

## 1.0.0-rc.14
- Icons: `icons/lucide.js` (Lucide, ISC; `icon(nodes)` and one named export per icon, so only the icons an app imports
  ship; `icon` is also exported from `@core/ui`). The kit's text glyphs are gone (toast close, settings info, gallery
  tabs, menu, grip), and `tools/check.mjs` fails on any emoji, dingbat or pictograph character in published files.
- Sync chip: an icon per state (check, spinning refresh while sending, cloud-off, alert) in the state's colour, the count
  as a badge on the icon, the word beside it (`.ui-chip-icon`, `.ui-chip-badge`, `.ui-chip-text`).
- Theme variables: `--radius-button` (the look's control corner, always rounder than `--card-r`), `--radius-input`,
  `--editor-bg` (white / near-black), `--card-bg`, `--button-bg`, `--button-text`, `--button-h`, `--font-ui`,
  `--font-editor`, `--font-size`, and the formatting bar's `--fmt-bg`, `--fmt-text`, `--fmt-h`.
- Buttons are inline-flex and centred, one height (`--button-h`); `.ui-fill` (accent) and `.ui-plain` (no box) variants.
- Look D (Slim): lists are cards inset from the screen edges (`--list-inset: var(--gap)`, `--card-r: var(--radius-l)`).
  `--card-r` is `0px` (not `0`) in look C and at Square corners, so it can sit in `calc()`.
- `applyTheme` sets `<meta name="theme-color">` (one per scheme, the page's ground) so the browser bar follows the theme.

## 1.0.0-rc.13
- A tapped tab (or side link) slides its page in from the side the tab sits on (`SLIDE_MS`, 280 ms, the logbook's page
  motion), at every width; `.ui-screens` clips while it runs (`is-sliding`) so the start offset can't widen the page.
  Reduce Motion or Still: it just switches. Off for an app: `data-slide="off"` on the tab bar (or `<html>`), or
  `tabPages(bar, { …, slide: false })`. Apps that did this from the `ui-tab` event (notes) drop their copy.

## 1.0.0-rc.12
- Shipped, not gallery-only: `.ui-detail-actions` (the detail pane's buttons; danger ones in red), `.ui-back` at the
  top of a pushed screen, `.toasts` placement, `.ui-tab` on one line (`white-space: nowrap`), and the bar's two ends
  `.ui-bar-side` / `.ui-bar-end` (equal flexible sides keep `.ui-bar-title` in the middle; apps drop their own copies).
- `ui/gestures.css` is split by part into `ui/gestures/*.css` (base, bar, tabbar, menu, sheet, screens, list, settings,
  action-bar, motion). `gestures.css` still loads them all, in order, so a `<link>` or Vite import of it is unchanged;
  link one part alone for just that part.
- `adaptiveShell`: the detail pane is optional. Without `.ui-pane-detail` a list-only shell opens a row by marking it
  current and sending `ui-open` (new, sent every time a row opens: `detail.row`, `detail.size`); from 600 px the list
  takes the width. No hidden placeholder pane needed.
- The current tab is in the link colour (held to 4.5:1 on the page, the surface and the selection) instead of the
  accent, which was 4.1:1 in Navy.
- Tab pages in the shell need no `.ui-tab-page`: any other screen beside the panes takes both panes' room while it
  shows, so a page opened on a phone is still the one showing when the window grows to tablet or laptop.
- A list card an app mounts in a settings part (`mount`) lines up with the groups' cards (it was inset twice).
- Tab icons: the `.ui-tab-icon` slot (rc.11) takes any glyph or inline SVG; no icon set ships yet.
- Toasts sit above a showing tab bar or action bar, however many are stacked (wide shells without one: at the bottom).
- `.ui-switch` has `min-width: 0; max-width: 3.1rem`: an app's bare `input { min-width: 10rem; flex: 1 }` no longer
  stretches it.
- The bar is glass only once collapsed: intended (at the top it is the page's ground, one piece with the large title),
  now documented in `ui/gestures/bar.css`.
- Kit class names start `ui-`: `.ui-chip`, `.ui-error`, `.ui-danger`, `.ui-small`, `.ui-inline`, `.ui-attention`,
  `.ui-sides`, `.ui-conflict-list`, `.ui-refused`. The parts emit both names; the bare ones (`.chip`, `.error`,
  `.danger`, `.small`, `.row`, `.attention`, `.sides`) keep working and go in 1.0. The sheets' CSS no longer hangs on
  `#conflict-list` / `#refused`.
- No fixed ids needed: `syncChip`, `updatePrompt`, `signInSheet`, `conflictSheet` and `refusedList` take `idPrefix`
  (put before each id: two on one page, or ids the app already uses); the default keeps today's ids. The About sheet's
  title id is numbered.
- Presets and looks: `<html>` no longer gets `data-preset`. A preset (the switch's style) acts only through the
  palette's custom properties; the look's marks are the only shape marks. Nothing in the kit read it.
- `package.json`: no longer `private`; `sideEffects` (the CSS and `theme/early.js`); TypeScript declarations in
  `types/` (from the JSDoc, `npm run types`; `npm run typecheck` checks they are current) with `types` conditions on
  the exports.
- Hide mode keeps the tab bar and action bar out (it named `.ui-tab-bar`, which no part has).
- `@layer`: not yet. Layered kit CSS loses to the design tokens' unlayered base rules (`:where(button)` colour and
  font, focus outline), so the kit stays unlayered until `tokens.css` puts its base in a layer.
- Tests: axe runs without its CSS preload (it copies each `@import`-ed sheet into an inline `<style>`, which the page's
  CSP reports).

## 1.0.0-rc.11
- Plain tabs: `.ui-tab` resets the theme's button border and fill, so `<button class="ui-tab">` looks like the link
  tabs; a `<span class="ui-tab-icon" aria-hidden="true">` before the label puts an icon above it.
- Bar buttons ship: buttons in `.ui-bar` are borderless, link-coloured text (`.ui-primary` bold; on look B's band,
  the band's text colour). The gallery-only copies are gone, so `/kit/` shows what apps get. `.ui-bar-menu` in the
  bar's lead is a side-bar button: on a phone it opens the shell's side bar as a drawer (hidden while Back shows).
- Tab pages and swipe between tabs (`tabPages`, started by `startGestures()` as `kit.tabs`): tabs and side links with
  `data-tab-page="#id"` show that `.ui-screen` as the bottom screen (`screenStack().base`), each keeping its scroll; a
  `ui-tab` event after each change. On a phone a sideways swipe moves to the next or previous page, the pages following
  the finger; never on a pushed screen, in fields, editors, sideways scrollers, sheets, menus or select mode, with text
  selected, or within 24 px of either edge; a vertical move scrolls; Reduce Motion switches without the slide; off with
  `data-swipe="off"` on the tab bar. A tab without `data-tab-page` (one that opens a sheet) is no page. In the shell,
  extra pages are `.ui-tab-page` screens beside the panes and take both columns from 600 px.
- About in Settings: `settingsScreen(host, { …, about: { name, update } })` adds an About group last: the Version row,
  Check for updates and the About sheet, with the owed-update retries `updatePrompt` has. `updatePrompt` stays.
- Look D "Slim" (`look: 'd'`): the bar always shows the name (header variant `slim`, no large title on show), flat
  lists on the page background (new token `list-bg` in every look), an icon tab bar along the edge, no band or glass.
- Gallery: the shell's tab bar is buttons with icons (Plants, Rooms, New, Jobs, Settings) over real tab pages, with a
  side-bar button; `/kit/settings/` shows the About group.

## 1.0.0-rc.10
- Opt-in parts for `@core/ui` (named exports; nothing runs on import and nothing changes for an app that doesn't import
  them): `draftSlot` / `listDrafts` (an unsent editor kept in storage; copes with blocked storage and duplicated tabs),
  `gripDrag` / `moveIn` (drag a list row by its grip; `ui.css`, "drag-reorder"), `shareText` / `copyText` (the system
  share sheet, else the clipboard; the page's toaster says what happened), `createTransients` (Back closes the top
  dialog first) and `createNavigation` (screen history with scroll positions and a parent trail for deep links), and
  hide mode (`applyHidden`, `cleanHideList`, `keptBecause`, `targetOf`, `entryFor`; `ui.css`, "hide mode").
- Settings rows: `settingsScreen` rows take `more` (the rest of the help behind an ⓘ button) and a section takes
  `reset: true` ("Reset this page": its rows back to the defaults, then Undo, no "Are you sure?"). Existing screens
  are unchanged.
- Gallery: `/kit/parts/` gains the five parts; `/kit/settings/` shows the ⓘ and Reset rows.

## 1.0.0-rc.9
- New reference parts in `@core/ui` (named exports; an app imports only what it uses):
  `undoToast(toasts, { ms, labels })` (Undo, a timer, one at a time), `loadState(host, { rows, labels })` (skeleton rows,
  or the error with Try again; still under Still / Reduce Motion) and `aboutSheet({ name, update, licences, importMap })`
  (version, "Get the newest version" through the update api, the outside code listed from the page's import map;
  `packagesFromImportMap` is the pure part). New default words in `LABELS`.
- Gallery: `/kit/parts/`, the three parts on made-up data.

## 1.0.0-rc.8
- New: the settings screen, `settingsScreen(host, { settings, sections, file, labels })` from `@core/ui`. It shows a
  `@core/settings` api's options as grouped rows (a switch, a picker or a number field each), the profile picker with a
  note when a value was changed by hand, and the settings file (Export, Import with what changed). It follows changes
  made elsewhere at once; a refused value says why and the control goes back. A section can hold the app's own part,
  such as `themeSwitch` for "This device". Styles in `ui/gestures.css`, "settings screen".
- Gallery: `/kit/settings/`, the screen on a made-up plant app's options (a stand-in for `@core/settings`, signed out).

## 1.0.0-rc.7
- No pull-to-refresh (owner's review): `ui/gestures.css` sets `overscroll-behavior-y: none` on the page, so a pull
  down at the top no longer reloads it (and loses a sheet's or a form's state).
- The gallery is installable to try as a home-screen app: a manifest, 192 and 512 px icons and a service worker
  (network first, the last copy offline). The browser's own install prompt is cancelled (`kit/installable.js`, a file
  because the page policy has no inline scripts); no install buttons. The Worker serves `.webmanifest` and `.png`.
- Gallery: the sync chip on made-up states (pick one to see its word and count). Demo words read as an app's would:
  plant care notes in the sheet instead of "Note 1: a made-up paragraph…", no "On a phone this is a pushed screen",
  no second "Next" line on the readings screen, "Less motion" for Still.

## 1.0.0-rc.6
- Shell, laptop (owner's review): with no row open the detail shows no Water or Delete; deleting the open row empties
  the detail again. The list pane has a faint line between rows in every look (look B's phone cards have none).
- Right-click with a mouse opens the row menu with its corner at the pointer, flipped near an edge, and the row is not
  lifted; touch and Shift+F10 are unchanged.
- An edge tab bar (look B, C) keeps its tabs together in the middle on a wide screen instead of spreading them out.
- Galleries on a laptop: the top bar (and look B's band) runs the full width, its ends lined up with the content.

## 1.0.0-rc.5
- Extra-dense (owner's review): labels and small print never under 12 px; a stepper's field is 32 px tall (its
  buttons stay 24 px wide). Segments, tags and stepper buttons keep the 24 px floor.
- Dense gallery: the screens keep the page's left edge; key-time numbers sit beside the name, not on the border; an
  unset time says "Not set" quietly; empty boxes show "–"; the previous/next arrows are the text colour; the
  collapsed bar title is centred; the look and density pickers are full size.

## 1.0.0-rc.4
- Components (owner's review): a pushed screen's Back shows in the top bar's leading slot (`[data-bar-lead]`, else
  the bar's start) instead of below an empty bar; bar buttons stay on one line.
- Sheets: Done is a word in the link colour, the title a little larger; a row of chips that scrolls sideways runs to
  the sheet's edges; a centred dialog with a mouse has no drag handle.
- Selects, text fields and checkboxes are styled: 44 px high, a drawn chevron with room for the words, 22 px boxes
  in the accent.
- Select mode's action bar: the count in the text colour, off buttons faded, Delete red; along the bottom edge in a
  look whose tab bar is there (look C).
- The look's heading face (look A's serif) is for page titles only; sheet, section and bar titles use the text face.
- Large titles have a full gap above them (look C's sat right under the bar).

## 1.0.0-rc.3
- Contrast and glass (owner's review): the selection colour (the ground of a current tab, side bar item or key) is
  floored against the text, muted, link and danger colours drawn on it, so dark mode passes axe again.
- Look B in dark: the band is the accent deepened under white text (`--band`, `--on-band`), not the pale accent.
- Menus, sheets, dialogs and the action bar are solid card colour (text no longer ghosts through); the glass left on
  the bar, tab bar and toasts is thicker (at least 86% card colour, 24 px blur).
- Look B's sheet menu names the row in its head instead of lifting a copy over the list; the tab bar hides under it;
  a menu item is marked on hover only where there is a pointer (a finger's last touch no longer pre-marks one).

## 1.0.0-rc.2
- Motion and press (owner's review): a press shows at once (rows, tabs, menu items and buttons get a wash; glass
  buttons scale in 60 ms); menus, bars, fades and toasts take `--d-quick` (340 ms), sheets and dialogs keep 480 ms.
- A pushed screen slides in over the old one instead of below it (then jumping up); Back slides it off over the old
  one, scrolled back to where it was.
- On a phone a sheet's drag and settle move it by transform only (no layout per frame).
- Only a floating tab bar (look A) shrinks to the current tab when scrolled; one along the edge keeps every tab. The
  tab bar no longer transitions its padding.

## 1.0.0-rc.1
- First release: `@core/ui`, `@core/theme`, `@core/settings`, the looks and the `/kit/` galleries, moved from
  app-starter with their history and tests. Served at `core.anawj.com/ui/1.0.0-rc.1/`.
