# The UI kit (`@core/ui`)

Gesture parts, the adaptive shell, the looks and the placement rules every app built on app-starter follows. The code is in
`ui/`; the galleries are `/kit/` (the gesture parts) and `/kit/shell/` (the sample list app in the shell).
Tests are listed in [kit-tests.md](kit-tests.md); stage notes in [ui-kit-progress.md](ui-kit-progress.md).

## The shell (`ui/shell/`)

One page, three layouts, picked by the window width (Material 3 size classes). `data-size` on the shell and on `<html>`
says which; a `ui-size` event fires when it changes (a window resize or a tablet turning).

| Width | Class | Layout |
| --- | --- | --- |
| under 600 px | phone | tab bar at the bottom, one pane at a time; opening a row pushes the detail screen (Back pops it) |
| 600–839 px | tablet | side bar, list and detail side by side; sheets stay bottom sheets |
| 840 px and up | laptop | wider side bar, list and detail side by side; sheets become centred dialogs, or a side panel |

Use it with the markup in `kit/shell/index.html`: a `.ui-shell` holding `.ui-sidebar`, `main.ui-screens.ui-panes`
(a `.ui-pane-list` and a `.ui-pane-detail` screen) and `nav.ui-tabbar`. Start it after `startGestures()`:

```js
const kit = startGestures();
const shell = adaptiveShell(document.querySelector('.ui-shell'), { screens: kit.screens, render: (row, detail) => { … } });
```

- **No router change.** The detail is an ordinary pushed `.ui-screen`; from 600 px the CSS shows both panes at once,
  so the screen stack's history entries (`{ uiScreens }`, `{ uiSheet }`) are unchanged.
- `shell.open(row)` selects a row (`aria-current="true"`) and fills the detail. Several rows ticked show a summary
  (`.ui-detail-multi`) instead of one item (`.ui-detail-one`).
- **Tab pages.** A tab bar button (or side link) with `data-tab-page="#id"` shows that `.ui-screen` of the
  `.ui-screens` host as the bottom screen; the one with `aria-current="page"` starts. In the shell, give the extra
  pages `class="ui-screen ui-tab-page" hidden` beside the panes (from 600 px a tab page takes both columns). A tab
  without `data-tab-page` (one that opens a sheet) is not a page. Each page keeps its scroll; tapping the current tab
  over a pushed screen goes back to it; the host sends `ui-tab` (`detail.page`, `detail.tab`). `startGestures()`
  starts it (`kit.tabs`: `go`, `current`); `tabPages()` is exported for a page without the rest.
- **Swipe between tabs** (phones, under 600 px): a sideways swipe on the page moves to the next or previous tab page,
  the pages following the finger. Let go, they glide on as iOS's paging does: a spring that starts at the finger's
  speed and settles without overshoot, to the next page when the drag plus its throw passes half the width, else
  back; at either end the page stretches like iOS's rubber band. The bar's title cross-fades to the new page's large
  title at halfway; mark other bar parts that belong to one page `data-swipe-fade` to fade them with it. Not on a pushed screen, in a field, editor, sideways scroller, dialog, sheet or
  open menu, in select mode, with text selected, or within 24 px of either edge (Back); a mostly vertical move
  scrolls. Less motion switches without the slide. Turn it off with `data-swipe="off"` on the tab bar.
- **Tab icons and bar buttons.** `<button class="ui-tab">` looks like a link tab (no border or fill); a
  `<span class="ui-tab-icon" aria-hidden="true">` before the label puts an icon above it. Buttons in `.ui-bar` are
  plain link-coloured text (`.ui-primary` bold; on the band, the band's text colour); `.ui-bar-menu` in the bar's
  lead is a side-bar button, hidden while Back shows.
- **Centre action.** Add `ui-tab-action` to a tab in the middle of the bar (`<button class="ui-tab ui-tab-action">`
  or a link, with a `.ui-tab-icon` and its label) for the app's main action: a raised 44 px accent circle, the label
  read by screen readers only, never shown as the current tab. Floating and edge bars, every look; a bar without it
  is unchanged.
- **Sheets.** From 840 px a sheet is a centred dialog. Give it `data-wide="panel"` and it docks to the right edge at
  full height instead (a form beside the list).

### Keyboard and pointer

| Input | Does |
| --- | --- |
| Right-click, Shift+F10, the context-menu key | the hold menu on the row |
| Click, Enter | open the row (when not selecting) |
| Up / Down | move between rows |
| Ctrl/Cmd-click | add or remove a row; starts select mode from the open row |
| Shift-click | tick the range from the open row (or the last clicked) to this one |
| Ctrl/Cmd+K | focus the search, wherever focus is (not while a dialog is open) |
| Esc | in search: clear, then leave; in select mode: leave it; a phone's pushed detail: go back; a menu or dialog closes first |
| Back (browser, Android) | pops the pushed screen or closes the open sheet |

## The on-screen keyboard (`ui/keyboard.js`)

- Every app page's viewport meta ends in `interactive-widget=resizes-content`
  (`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">`).
  Why: Chrome on Android (108+) otherwise shrinks only the visible part of the page, so fixed bars and `100dvh` sheets
  sit under the keyboard. With it the page shrinks to the space above the keyboard.
- `startGestures` watches the keyboard (`{ keyboard: false }` leaves it out): while a field has focus and the visible
  page is over 150 px shorter than its tallest, `html.ui-keyboard-open` is set and a `ui-keyboard` event (detail.open)
  fires. The tab bar hides; a sheet and the select-mode action bar sit above the keyboard. `--ui-keyboard-h` is how
  far the keyboard covers the layout's bottom (0 with `resizes-content`; it lifts them where a browser ignores it).

## Haptics (`ui/gesture.js` `haptic`)

- `haptic(kind)`, five kinds as `navigator.vibrate` patterns (`HAPTIC_PATTERNS`): `tick` 8 ms (a step: a row ticked,
  a switch flipped, a dragged row passing another), `threshold` 12 ms (a drag crossing where its let-go would land
  somewhere else: a sheet past its close line or onto another height, the drawer past half), `long` 20 ms (a touch
  and hold taking hold), `confirm` and `reject` (10-40-10, 20-60-20: for an app's done or refused action). On
  iPhone, which has no `vibrate`, every kind is the one system tap a hidden switch gives.
- Not on tab changes or plain taps: those are everywhere, and a buzz on each wears out.
- Haptics is a per-device theme choice (`haptics: 'on' | 'off'`, on by default), shown as `html[data-haptics="off"]`
  and picked in `themeSwitch` ("Haptics"); `haptic()` gives nothing while it is off.
- `startGestures` ticks every switch (`input[role=switch]`, `input[switch]`) and segmented control a person changes
  (`toggleTicks`; `{ ticks: false }` leaves it out).

## Placement rules

Where each thing goes, on every size.

- **Search:** phone, a pull-down field under the title (always one swipe away); tablet and laptop, the top of the
  side bar, and Ctrl/Cmd+K anywhere.
- **New item:** one primary button, top right on a phone, in the list header on bigger screens. Never a floating round
  button over content.
- **Filters:** chips under the title; more than five go into a Filter sheet.
- **Item actions:** hold (phone) or right-click (laptop) for the menu; the detail screen repeats them as buttons.
- **Select mode:** from the hold menu or Select in the header; actions in a bottom bar (phone) or the list header
  (tablet and laptop).
- **Sync, account, sign out:** in Settings, plus a small sync dot in the bar only when something is wrong.
- **Undo over "Are you sure":** toasts with Undo for moves and deletes; a typed confirmation only for wiping data.

## Settings rules

What Settings lets you change, by where it lives.

- **Per device:** look, density, light / dark / follow system, solid bars, text size (follows the phone first),
  reduce motion.
- **Per account:** name, sign-in, which group the account belongs to, notifications.
- **Per app:** only things that change what the app does (units, a default section, list sort), never layout.
- **Not offered:** custom colours per screen, moving buttons around. Fewer knobs keeps every look testable.

### The settings screen (`settingsScreen`)

`settingsScreen(host, { settings, sections, file, labels })` draws Settings from a `@core/settings` api; it returns
`stop()`. The gallery is `/kit/settings/`.

```js
settingsScreen(el, { settings, file: 'plants-settings.json', sections: [
  { title: 'Plants', rows: [{ key: 'sort', label: 'Sort the list by', choices: [['due', 'Next watering'], ['name', 'Name']] }] },
  { title: 'Reminders', rows: [{ key: 'reminders', label: 'Watering reminders' }, { key: 'hour', label: 'Remind at', min: 0, max: 23 }] },
  { title: 'This device', mount: host => themeSwitch(host) },
] });
```

- A row with `choices` is a picker; an option whose value is a number is a number field; anything else is a switch.
  `sub` adds a small line under the label.
- The app names its rows and sections; `labels` changes the screen's own words (`SETTINGS_WORDS`).
- When the app has profiles, a "Profile" group comes first, with a note when a value was changed by hand.
- The settings file (Export, Import) comes last; `file: false` leaves it out.
- A refused value (its clean says no, or an account option while signed out) shows the reason in the status line and
  the control goes back to the value in force. Changes made elsewhere show at once.
- **About.** Pass `about: { name, update }` (the `@core/update` api, or `null` for "dev") and an About group comes
  last: a Version row, Check for updates (its answer under it) and an About row that opens `aboutSheet` (the name,
  the version and the outside code from the import map; `licences` and `importMap` pass through). This is where the
  version goes: not as a line over the app. `updatePrompt` stays exported for older apps; new ones use this row.

## Looks, density and the glass guard (`@core/theme`)

`@core/theme` (in `theme/`) and `@core/ui` (in `ui/`) live in this repo (app-ui), served at exact versions. Each device
chooses three things, kept in `choice.js`: **look × theme × density**, plus Bars and sheets (glass or Solid). The
gallery at `/kit/` shows every part in every look; its tests are listed in [kit-tests.md](kit-tests.md).

### Looks

A look is data, not a fork. Each one is a file in `theme/looks/` with:

- **variants**: a few named choices that `choice.js` shows as `data-*` marks on `<html>`. The CSS styles from them.

  | Variant | Values |
  | --- | --- |
  | `header` | `plain` (the large title sits on the page) · `band` (the title sits on a band of the accent colour) · `slim` (no large title: the bar always shows the name) |
  | `menu` | `popover` (the hold menu opens beside its row) · `sheet` (it opens from the bottom on phones, under 840 px) |
  | `glass` | `bars` (all floating chrome) · `pill` (only the floating pills: the action bar, toasts and a floating tab bar) · `none` |
  | `tick` | `round` · `square` (the ticks in select mode) |
  | `tabbar` | `float` (a pill over the content) · `edge` (full width along the bottom) |
  | `family` | `core` (every look but M) · `android` (look M: `ui/gestures/android.css` restyles every part as Material 3) |

- **tokens**: custom properties that `palette-css.js` puts on `:root`. Every look sets the same keys: the heading font,
  the title size, weight and tracking, the bar line, list card radius, inset, background, edge, separator and shadow, the row
  weight, the radii of controls, pills, menus and sheets, the tick size, the active tab's background, and the glass
  tint (how much of the accent colour the glass takes).

- **palette** (optional): `'m3'` makes the page colours Material 3 colour roles from the accent as the seed
  (`theme/m3.js`: tonal palettes, Android's tonal spot scheme, light and dark), each role also as an `--m3-*` token.

The seven looks so far:

| Look | Name | In short |
| --- | --- | --- |
| A | Tinted glass | Glass bars with a hint of the accent, a floating tab bar, card lists, round ticks |
| B | Colour band | The title on a band of the accent, solid bars, bottom-sheet menus, square ticks, a tab bar along the edge |
| C | Dense and quiet | Flush lists, small titles, glass only on the floating pills |
| D | Slim | A slim bar always showing the name, lists as cards inset from the edges, an icon tab bar along the edge, no band or glass |
| E | Workspace | Flat and compact like a desktop notes app: a slim bar, flush lists on the page, menus as bottom sheets, a filled search box, the sync chip as its icon alone when all is synced |
| M | Android | Material 3 Expressive as Android 16 draws it: tonal colour roles from the accent, solid tonal surfaces (no glass), Roboto where the phone has it (Inter otherwise; no font is hosted), a top app bar that takes its tone on scroll, lists in rounded groups with 2 px gaps, a navigation bar with a pill on the current tab, Material's switch, sheet handle, menus and action button |
| iOS | iOS | As close to iOS 26 as the web allows: the system colours (light and dark), the grouped grey ground, inset grouped lists with icon tiles, the iOS switch and segmented control, a collapsing large title, glass bars, sheets with half and full detents, row swipe actions; Inter (shipped in `theme/fonts/`) stands in for SF Pro, after `-apple-system`. Its accent (`#007aff`) and grouped ground apply only when the app and device name none |

The app picks its own look with `applyTheme({ look: 'b' })` (an app opts into the Android look with `applyTheme({ look: 'm' })`; nothing else changes), and may name a ground (`surface: 'ink'`: white, or charcoal in dark; `'cool'`: a phone's cool grey; `'linen'`: warm paper with soft ink, its own warm dark) for presets with no ground of their own; a device's own pick of ground wins over both. A device's own pick wins. Without either, the look is A.

**How an app opts in to the iOS look:** one line, `applyTheme({ look: 'ios' })`.

A design kit is the origin of the page's `/v1/tokens.css` (fonts and `--home-*` tokens, read before any script). A kit may set `--home-serif`; look A's head and the serif font preset then use it. In the gallery, `?kit=home|nuhs|ntf` previews a kit's tokens with its app theme.

### Density

`comfortable` · `regular` (default) · `compact` set the row height to **60 / 50 / 44 px**, along with the gaps and the
text size. Taps are never smaller than 44 px. A busy screen can opt into extra-dense ([below](#layout-parts-and-extra-dense)).

### Glass guard

On weak phones, glass costs a repaint on every frame. The guard (`theme/guard.js`) turns it down to Solid when:

- `navigator.deviceMemory` is 4 GB or less (only Chromium reports it), or
- a probe on the first scroll times 30 frames and their median is over 20 ms.

The verdict is kept on this device (`localStorage` key `core-glass-guard`). Settings then says why glass is off.
The person's own Solid always wins. "Glass, even here" (`always`) overrides the guard. Glass is only ever on floating
chrome, with at most three layers and two blur tiers. Reduce transparency, more contrast, and browsers without
`backdrop-filter` all get Solid from CSS.

### Switchers

- Settings (`themeSwitch`) has Look and Density with the rest of the theme choices.
- The gallery has its own Look and Density pickers (`lookSwitch`). `/kit/?look=b&density=compact` shows a look without
  keeping it; picking from the switcher keeps it. `?guard=again` forgets the guard's verdict so it runs again.

### Adding a look

No component code. If a look seems to need a fork of a part, add a variant instead, and ask first.

1. Copy `theme/looks/c.js` to a new file (say `d.js`). Give it an `id`, a `name` and a one-line `desc`, then
   pick its variants and set every token. `test/looks.unit.test.mjs` fails if a key is missing or a variant is
   unknown.
2. Import it in `theme/looks.js` and add it to `LOOKS`. Its words show up in both switchers on their own.
3. Add it to `LOOKS` in `e2e/looks.spec.mjs` with the variants it should show. It then gets axe and screenshots at 390,
   820 and 1280 px. Add a row to [kit-tests.md](kit-tests.md).
4. Run `node tools/sw-files.mjs app` (the new file is part of the shell), then the checks in `AGENTS.md`.
5. Check the gallery by eye in light and dark: `/kit/?look=d`.

A new variant value takes one more step. Add it to `VARIANTS` in `looks.js`, add the CSS that styles
`[data-<variant>="<value>"]` (in `ui.css`, the part's file in `ui/gestures/` or `glass.css`), add the mark to `early.js`'s list if the
variant is new, and give it a test.

## Content parts (`ui/gestures/content.css`)

Plain CSS, loaded by `gestures.css`, on the palette and density tokens (see `/kit/parts/`):

- **Sections:** `.ui-section` holding `.ui-section-head` (small caps words, an optional link or button at the end), a
  `.ui-list` and `.ui-section-foot` (a muted note).
- **Row extras** inside `.ui-row`: `.ui-row-lead` (30 px icon tile, `data-tone="grey|danger"`) or `.ui-row-thumb`
  (44 px), then `.ui-row-main`, then `.ui-row-trail` (badges, buttons), `.ui-row-value` (muted number),
  `.ui-row-input` (a value typed into the row) or `.ui-row-chevron`. `data-tone="action|danger"` colours the row's words; `data-align="center"` centres them.
- **Cards and stats:** `.ui-card` (`-title`, `-text`, `-actions`); `.ui-stats` of `.ui-stat` (`-value`, `-label`).
- **Badges:** `.ui-badge`, `data-tone="accent|ok|warn|danger"`.
- **Action button** (`ui/gestures/fab.css`): `<button class="ui-fab" aria-label="…">` with an icon, and a
  `.ui-fab-label` for the wide kind; the screen's one main action, fixed at the bottom end above a showing tab bar; `.is-small`
  drops the words; it steps aside while a sheet or menu is open, and the page gets room under it. Look M draws it as
  Material's rounded square (`.is-large`: 96 px).
- **Buttons:** with theme.css's `button`, `.ui-fill` (primary) and `.ui-plain` (link-like): `.ui-tint` (accent-tinted), `.ui-wide` (full width),
  `data-size="small"` (32 px), `.ui-buttons` (a stack of buttons with the list's inset).
- **Filter chips:** `.ui-chips` holding `button.ui-chip` with `aria-pressed` (ticked when on), a full tap tall;
  scrolls sideways, or wraps with `data-wrap="on"`. A `.ui-chip` elsewhere stays the small status chip.
- **Empty and loading:** `.ui-empty` (`-icon`, `-title`, `-text`); `.ui-skeleton` with `data-shape="line|short|thumb"`.

## Row swipe actions (`ui/swipe-actions.js`, `ui/gestures/swipe.css`)

`swipeActions(list, { lead, trail, onAction })` on the `.ui-row`s of a list, as iOS Mail: a row slid sideways shows
its actions behind it (`lead(row)`: under its start, `trail(row)`: under its end, each `[{ id, label, tone, full }]`
from the outer edge in; tone `danger|warn|grey|ok|purple`, else the accent). Let go past half of them and the row stays
open; past `FULL_AT` (0.6) of the row's width the first action, if `full`, takes the row and runs on let-go. A tap on an
action runs it; a tap elsewhere, a scroll or Escape closes. Transform only, on motion.js's drag and glide; the
edge strip stays Back's. Returns `{ close, stop }`. Give each action another way in (a hold menu, the row's screen).
In any look; the iOS look gives it iOS's colours. The gallery's `/kit/ios/` page shows it.

## Layout parts and extra-dense

`ui/layout.css` and `ui/layout.js` (load the CSS after `ui.css`; `startLayout()` starts the parts that need script).
Every part follows the look's tokens and the density, so it needs no code per look. The gallery is `/kit/dense/`: a
timed readings screen and a case-entry screen on made-up data (`?screen=readings|log`, `?look=`, `?density=`).

| Part | Markup | Notes |
| --- | --- | --- |
| Grid | `.ui-grid` (`data-cols="2\|3\|4\|6"`, `.ui-span` for a full row) | equal tiles; without `data-cols` they wrap at `--grid-min`; 6 and 4 columns halve on phones |
| Stack | `.ui-stack` (`data-dir="row"`, `data-gap="pad"`, `.ui-push`) | one under another, or a wrapping row |
| Split | `.ui-split` (`data-split="side"`) | two parts side by side when both fit, else stacked; no media query, so it works in a laptop's detail pane too |
| Toolbar | `.ui-toolbar` with `role="toolbar"` and an `aria-label` (`.ui-primary`, `.ui-push`) | one Tab stop; arrows, Home and End move between buttons |
| Segmented | `fieldset.ui-segmented` with a `legend` and native radios in labels (`data-clearable`) | arrows pick, screen readers say "2 of 7"; clearable: a second tap clears (a key never does) |
| Stepper | `.ui-stepper` with `[data-step="-1"]` and `[data-step="1"]` buttons around an `input type=number` (`data-start`) | the field is the Tab stop and takes typing and arrows; the buttons step in its `step`, kept in `min`/`max`; an empty box starts at `data-start` |
| Field | `.ui-field` | a small label over a stepper or segmented control |

**Extra-dense** is opt-in per screen: `data-dense="extra"` on the screen (or a part of it). Main targets 32 px (a
stepper's field too: it takes typing), small ones (`--tap-s`: segments, stepper buttons, tags) 24 px, the WCAG 2.2
target-size minimum; text 14 px, labels and small print never under 12 px. Keep the screen on the page's own edge
(its `--pad` is smaller), and show an empty value as a quiet "Not set", never as a word that reads like a value. Never go
under 24 px: if a screen doesn't fit, cut or split it instead. A device set to Comfortable gets 44 / 36 px there,
since its owner asked for bigger targets. Use it for data entry that a trained person repeats many times a day,
not for a screen someone meets once. `e2e/dense.spec.mjs` measures every target on the gallery screens.


## Add-ons (`@core/theme` addons, opt-in)

`theme/addons/index.js` and `theme/addons/addons.css` (link it after the kit's CSS). Every add-on is off until a
device turns it on, and is kept on that device only (localStorage `core-addons`, an app may pass its own key; photos
and font files in IndexedDB under a name the app gives).

- **Wallpaper** (`wallpaper.js`): a pattern or the person's own photo behind every page, with a dim. Text straight on
  the page (mark it `.ui-on-wall`) gets a backing just strong enough for 4.5:1. See-through cards (`wallFrost`, mark
  cards `.ui-card`) are a separate opt-in: content is solid unless a person turns this on.
- **Fonts** (`fonts.js`): a stack, a font installed on the device by name, or a font file kept on the device; sets
  `--font` and `--font-editor`. The kit ships no font files; pass your stacks.
- **Custom CSS** (`custom-css.js`): anything that loads from elsewhere is refused; `/* @settings */` gives sliders,
  colours and switches; off on the app's theme pages (`off`) and with `?nocss`.
- **Icon sets** (`icon-sets.js`): `<html data-icons>` restyles `.ui-icon`; an app may give a set its own paths and let
  a tab take an icon from the app's list.
- **Saved themes** (`saved-themes.js`) and **theme links** (`theme-link.js`, `#t=`): the app passes its look schema,
  presets and lists; the kit holds the engine only.
- **Per device** (`store.js`): `addonChoice()`, `chooseAddons(patch)`, `applyAddons(choice, { photos, fonts, stacks, off })`.
  Call `applyAddons` again after light or dark changes.
