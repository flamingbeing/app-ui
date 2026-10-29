# Changelog

## 1.0.0-rc.61
- Swiping tab pages in a plain-header look (Tinted glass, the app's own): the page coming in sits level with the one
  going out. The large title's top margin got out of `.ui-screens` for the page in the flow but not for the pages
  beside it, so the incoming title sat one margin lower and jumped up as it landed. `.ui-screens` is a flow root.
- On a phone the tab pages reach down to the tab bar (`.ui-shell` a column, the screens filling it), so a swipe on the
  space under a short page changes tab; that space was the page background, outside the pager. (Notes had this in
  its own CSS.)

## 1.0.0-rc.60
- The update prompt tries the owed reload once when it mounts. On a slow phone the app can finish starting after a
  field was already left (or removed), so the `focusout` it listens for never came and the take-over reload stayed
  owed until the next hide/show.

## 1.0.0-rc.59
- The refused list's heading is a section head (`.ui-section` / `.ui-section-head`), the small grey words over a
  list, not a browser-default h2 bigger than the screen's own headings.
- The iOS look no longer fills a select that is a row's value (a list row, the theme switch's rows): muted words
  and the chevron, as in the other looks and iOS Settings.

## 1.0.0-rc.58
- No swipe pulls the side bar out as a drawer any more: on the first tab page a right swipe stretches the page and
  tells `onPrevMissing`, as without a drawer. The pull claimed the whole touch from its first few pixels, so swipes
  meant to change page were lost. The side-bar button still opens it; a left swipe or a tap on the shade closes it.
  `startGestures`' `drawer` option is still taken and ignored, so apps that pass it need no change.

## 1.0.0-rc.57
- Row swipe actions are gone (`swipeActions`, `ui/swipe-actions.js`, `ui/gestures/swipe.css`, the arbiter's `rows`):
  not wanted. No app used them. `/kit/ios/` keeps its to-do list as plain rows.

## 1.0.0-rc.56
- Sheets: a let-go settles on the nearest height (a clear flick goes on to the next one its way), not on fixed
  distances from where the drag began. `settle(detents, sizes, shown, v, now)`.
- On a phone, a sheet dragged below its lowest height fades its backdrop with it; a close fades on from there.

## 1.0.0-rc.55
- Press feedback: inside something that scrolls a press shows after `PRESS_DELAY` (100 ms), so a scroll never
  flashes a row; on fixed bars and sheets it stays at once (`inScroller`). An earlier press's quick-tap mark no
  longer sticks when the next press comes within 80 ms.
- The Android look: Material's ripple, from the finger to the farthest corner, fading after the lift.

## 1.0.0-rc.54
- An iOS look (`theme/looks/ios.js`), opt-in with `applyTheme({ look: 'ios' })`: iOS 26's system colours in light
  and dark, the grouped ground, inset grouped lists, the iOS switch and segmented control, glass bars, sheets with
  half and full detents; Inter (now in `theme/fonts/`) after `-apple-system`. No app's look changes; the default stays A.
- Row swipe actions (`ui/swipe-actions.js`, `swipeActions`): iOS Mail's swipe, on the shared gesture module; it claims
  the touch as `rows` (arbiter priority 35).
- Gallery: the iOS look is its default, and `/kit/ios/` (linked from the demo controls' Other pages) shows the iOS
  parts together.

## 1.0.0-rc.53
- Gallery: the first screen reads like an app. The list sits straight under the large title; every demo control (the
  words about the gallery, Open the sheet, Push a screen, the other pages, look, density, Less motion and the sync
  state) moves into one "Demo controls" sheet from a new bar button (`slidersHorizontal` icon) next to Select. The
  sync chip sits in the bar on the home screen. Open the sheet and Push a screen close the demo sheet first.
- `select` takes the kit's look: a filled field with no border line; in a row (`.ui-row`) or a theme-switch row it
  is plain muted text at the row's end, as a settings value is.
- The theme switch (`.theme-switch`) is a card of rows like a list, with lines between them; on the settings page it
  lines up with the lists above it.
- In a band's bar (look B) the sync chip takes the band's white text (the state colours failed contrast on it).
- Gallery: four more made-up plants, so the list scrolls at tablet height; the dense page's controls are one card
  with a switch.
- Gallery: the Haptics switch is in the Demo controls sheet with Less motion.


## 1.0.0-rc.52
- One gesture owns a touch: `claim(name)`, `release`, `captured`, `onCaptured`, `PRIORITY` in `ui/gesture.js`. The
  sheet, drawer, Back edge, tab swipe, card pager, row drag, select drag, hold menu and bounce all claim before they
  move; the higher one wins and the others stand down (a press shade clears, a hold stops, a half tab swipe goes
  back). Same feel as before when only one part wants the touch.

## 1.0.0-rc.51
- Sync button: the count is the badge's CSS content (`data-count`), not text, so the button's name is its label alone
  (axe `label-content-name-mismatch` with a count showing). Looks unchanged.

## 1.0.0-rc.50
- Press Back again to close: the first Back on the first tab stays in the app and shows a toast, "Press Back again
  to close"; a second Back within 2 s (`CLOSE_MS`) leaves. Before, one Back let the browser close an installed app,
  so the next open was a cold start with the splash. `tabPages` does it by default (`{ backToClose: false }`: off;
  `toasts`: the app's own toaster; `labels.backAgain`: own words). An app with its own router passes `onClose` to
  `tabBack` (and `first` when it may start on another tab).
- How: one more history entry, the guard, over the first tab's own (`uiTabGuard` in its state); Back lands below it
  and opens the 2 s window, after which the guard comes back. Sheets, the drawer and pushed screens still close
  first; a reload keeps the one guard. Chrome skips an entry added with no tap since until the next tap, so a Back
  before any tap at all may still leave.
## 1.0.0-rc.49
- `syncButton(host, { sync, syncNow?, labels?, idPrefix? })`: the sync chip's tappable twin for a header bar
  (`#sync-btn`). One colour, the bar's; the state is the cloud icon's shape: a tick (saved), an arrow up that lifts
  (sending, with a count of what waits), struck (offline), an exclamation mark (not saved yet; needs you adds a dot),
  faded (connecting). A tap syncs now (default: `sync.nudge('wake')` then `sync.flush()`, app-sync's own) and shows
  sending at least 700 ms. The lift is transform and opacity only, off under reduced motion and Still. A `<button>`
  passed as `host` becomes the button, so an app's markup can place it. Looks theme it with `--ui-sync-dot` and
  `--ui-sync-badge`. New label `syncNow` ("Sync now"); new icons `cloud`, `cloudCheck`, `cloudUpload`, `cloudAlert`.
- The shell gallery's bar shows it; the jank gate times a tap on it.

## 1.0.0-rc.48
- Haptics: `haptic(kind)` with five kinds (`tick`, `threshold`, `long`, `confirm`, `reject`; `HAPTIC_PATTERNS`),
  `haptic()` is a tick. The hold menu takes hold with a long; a sheet dragged past its close line or onto another
  height and the drawer past half give a threshold; a dragged row (`gripDrag`) ticks as it picks up and passes each
  row; `startGestures` ticks switches and segmented controls (`toggleTicks`; `{ ticks: false }` leaves it out).
- Theme: Haptics (`haptics: 'on' | 'off'`, on by default), a per-device choice like Motion, in `themeSwitch`;
  `html[data-haptics="off"]` and `haptic()` gives nothing. The gallery has a Haptics switch.

## 1.0.0-rc.47
- Keyboard (`ui/keyboard.js`, `watchKeyboard`, started by `startGestures`; `{ keyboard: false }` leaves it out):
  while a field has focus and the visible page is over 150 px shorter than its tallest, `html.ui-keyboard-open` and
  a `ui-keyboard` event. The tab bar hides; a sheet and the action bar sit above the keyboard. `--ui-keyboard-h` is
  how far the keyboard covers the layout's bottom.
- Apps: end the viewport meta with `interactive-widget=resizes-content` (docs/ui-kit.md, "The on-screen
  keyboard"); the gallery pages do.

## 1.0.0-rc.46
- Look M, **Android**: Material 3 Expressive as Android 16 draws it. Colour roles from the accent as the seed
  (`theme/m3.js`, tonal spot, light and dark, each role also as `--m3-*`), solid tonal surfaces (no glass), the Roboto
  stack (Inter otherwise; no font hosted), a top app bar that takes its tone on scroll, lists in rounded groups, a
  navigation bar with a pill on the current tab, Material's switch, sheet handle, menus, chips and action button.
  An app opts in with `applyTheme({ look: 'm' })`; the default stays look A.
- New variant `family` (`core` · `android`, `data-family` on `<html>`); `ui/gestures/android.css` restyles every part
  under `[data-family="android"]`, moves by transform and opacity only.
- New part `.ui-fab` (`ui/gestures/fab.css`), the screen's one main action, in every look.

## 1.0.0-rc.45
- Drawer: Android's Back closes the phone's drawer (it is a history entry while open, as a sheet is), and the page
  behind it (bar, pages, tab bar) is `inert`, so Tab and TalkBack stay in the drawer. A side link's page takes the
  drawer's place in history.
- `ui/steps.js` (`stepsSettled`): the counted steps back that sheets used, shared with the drawer; `tabBack` waits
  for them before it adds or takes away its entry, so a step on its way can't undo a tab change.
  `sheetsSettled` stays (same promise).
- Checked: a sheet closed by Esc, the close request Chrome sends a modal dialog for Android's Back, steps back once.

## 1.0.0-rc.44
- Tab pages: a swipe lights its new tab the moment the finger lets go, as Android's tab bars do, not when the
  pages land (the bar no longer lags the swipe). A let-go that springs back keeps the tab it had.

## 1.0.0-rc.43
- Gallery: the install file's colours are the dark ground (`#1c1c1e`), so the Android system bar at the bottom of
  the installed gallery is dark, not light.

## 1.0.0-rc.42
- Back with tabs, as Android apps do it (`ui/tab-back.js`, `tabBack`): switching tabs adds no Back steps; Back on
  any other tab goes to the first tab, and Back on the first tab leaves the app. Leaving the first tab adds one
  history entry, moving between the other tabs only changes its address, and a tap on the first tab takes the entry
  away. `tabPages` does it by default (`{ backToFirst: false }`: no history at all, as before); an app with its own
  router calls `tabBack({ history, events, onFirst }).went(isFirst, url)` after each tab change.

## 1.0.0-rc.41
- Gallery: the shell page drops its body's own tab-bar room (the kit's `.ui-screen::after` already leaves it), so the
  page is no longer taller than it needs to be on a phone.

## 1.0.0-rc.40
- `cardPager(stage, { fill: true })`: the stage reaches from where it starts on the page to the viewport's bottom
  (`100dvh`), less a showing tab bar's room and `--pad`, never under 16rem (`.ui-cards-fill`; card-pager.js keeps
  `--ui-cards-top` up to date as what is above it changes size). A whole card shows with no scroll of its own in the
  common case; a taller one still scrolls in its slot. The swipe is unchanged (transform only).
- The single-pane shell's side bar (600 px and up) counts its padding inside its 100dvh (`box-sizing: border-box`);
  it was 2 x `--pad` taller than the window, so every page there scrolled by that much.
- Gallery: the Jobs page's deck fills. An app whose body adds its own tab-bar room (the starter's
  `padding-bottom` on `body`) on top of the kit's (tabBarRoom) drops it, or a page that fits scrolls by that much.

## 1.0.0-rc.39
- The bounce: `ui/bounce.js`, exported from `@core/ui` as `bounce`. A pull past a list's top or bottom stretches it
  (the same rubber band as the sheets and drags; the bars and fixed parts stay) and springs back on the compositor
  with the finger's speed; a finger catches it on the way; a fling into an end bounces past it and back (not with
  Less motion). Touch only. Works on the page's scroll and any element that scrolls up and down; a sheet body's top
  pull stays the sheet's. The page keeps `overscroll-behavior: none`. `startGestures()` starts it (option `bounce`,
  on by default); `data-no-bounce` leaves a part out. Nothing runs on import.
- Known: a finger that turns back while stretched scrolls at once, so the content runs a little ahead of it until the
  stretch is gone (touch moves can't be held back once the browser scrolls).
- The jank gate adds a pull past the list's top and bottom.
- Sheets: at full height, scrolled to the top, the body no longer stays stuck on sideways-only panning in WebKit
  (Safari has no `pan-down`; there the sheet's own touch handling takes the pull down).

## 1.0.0-rc.38
- `cardPager(stage, { card, start, onShow })`, exported from `@core/ui` (`ui/card-pager.js`): one card at a time, a
  sideways swipe for the next or the previous (a flashcard deck, a review queue). The card beside follows the finger;
  the let-go glides on `glide` (a finger catches it); `onShow` waits until it lands (`afterGesture`); arrow keys go
  too. Leaves fields, sideways scrollers and the screen's edges alone; `refresh()` after the queue changes.
- The tab pager never starts on `[data-swipe-own]` (a card deck's own swipe).
- Gallery: a card deck on the shell's Jobs page; the jank gate swipes it on and back.

## 1.0.0-rc.37
Responsiveness (README, "Responsiveness rules"):
- `ui/motion.js`, exported from `@core/ui`: `glide` (a critically damped spring from the finger's let-go speed, run
  by the compositor through Web Animations, transform and opacity only; `stop()` catches it where it is), `spring`
  (the same on the main thread for other values), `tracker` (the let-go speed), `drag` (pointer drag along one axis,
  glued to the finger, `touch-action` set, rubber band past `bounds`, interruptible), `afterGesture` and
  `gesturing` (hold saves, syncs and re-renders until the fingers lift and the glides land), `pressFeedback` and
  `PRESSABLE`. Nothing runs on import.
- The tab pager, the phone drawer, the detent sheet (drag, detents and close) and the edge swipe back now glide on
  `glide`, so each let-go is a compositor animation a finger can catch; Reduce Motion still never stops a
  finger-driven move or its glide.
- The tab pager lays the pages beside out (and promotes their layers) at the touch, not at the first sideways move,
  so the first move only moves them; a touch that turns out a scroll puts them away once it's done.
- Pressed at once: `startGestures()` (option `press`, on by default) marks a touched control `data-pressed` on the
  touch; the theme, tab bar and glass buttons show it like `:active`.
- CI's jank gate (`e2e/jank.spec.mjs`): a tab swipe and flick and a sheet drag on a phone with the CPU slowed 4x
  (Chromium, frames) and in WebKit (each move's handlers within 8 ms, touch down and lift within 16), within the
  budget; it runs alone after the other browser tests.
- The parts gallery gains "Follow the finger", a `drag` and `glide` demo with a save held by `afterGesture`.

## 1.0.0-rc.36
- The bar no longer flashes on a tab change: its tinted (collapsed) state stays until the new page's title says
  otherwise (it was cleared, then tinted again a frame later between two scrolled pages), and a title beside the
  screen (a page sliding in from the side) no longer counts as scrolled under the bar.
- `data-hold-select` on a select list (`.ui-list[data-select]`): a finger's hold on a row (and Android's long press)
  starts select mode with that row ticked instead of opening its menu; a right-click and the keys still open it.

## 1.0.0-rc.35
- A `linen` ground (`applyTheme({ surface: 'linen' })`): warm paper with soft ink in light, its own warm dark.
- Look A's head and the serif font preset use the kit's `--home-serif` when it sets one (no change for kits without it).
- Gallery: `?kit=home|nuhs|ntf` previews a design kit's `/v1/tokens.css` with its app theme; the gallery's CSP allows
  the three kit origins.

## 1.0.0-rc.34
Swipe feel changes for every app that moves to it:
- Tab pages follow the finger 1:1 from the first move (8 px to tell sideways from up and down), with the next page
  beside it, also with Reduce Motion (Android's Remove animations; rc.30 switched tabs with nothing moved there).
- Quick flicks one after another each go a page (a flick is 0.4 px/ms or faster, however short); none is lost to the
  last one's glide.
- A finger landing on the gliding pages catches them where they are (a tap there opens nothing); let go, they go on
  or land on the nearer page.
- The pager is `touch-action: pan-y`, so the browser never takes a sideways move first; sideways scrollers inside
  (`.ui-scroll-x`) still scroll.
- The no-swipe edge is 28 px at 390 px (max 32; was 24), Android's system Back.
- `startGestures(root, { drawer })` (and `tabPages`'s `drawer`): a right swipe on the first page pulls the phone
  drawer out with the finger over a shade; let go past half or with a flick it opens; a left swipe or a tap on the
  shade closes it. `adaptiveShell` returns `drawer` for this. Without `drawer`, `onPrevMissing` fires as before. The
  drawer's open and close now glide on a spring (the `::before` shade and `ui-drawer-in` are gone).

## 1.0.0-rc.33
- Add-ons (`theme/addons/index.js`, `theme/addons/addons.css`), opt-in and per device, off by default: wallpaper
  (patterns or a photo, dim, a backing for text on the page, optional see-through cards), fonts (stacks, a typed name,
  a font file), custom CSS with `@settings`, icon sets for `.ui-icon` and per-tab icons, saved themes with export and
  import and a night theme, and `#t=` theme links. Saved themes and links take the app's own look schema and lists.
  Nothing changes for an app that doesn't import them.

## 1.0.0-rc.32
- `applyTheme({ layer, ownTheme })`, both optional, for an app that keeps its own palette and light/dark switch:
  `layer` puts the kit palette sheet in that cascade layer (name it first in the page's `@layer` order, so the app's
  own custom properties of the same name win); `ownTheme: true` leaves `data-theme`, `data-dark` and the theme-color
  tags to the app (its `light`, `dark` or `auto` mark), and the kit palette follows that mark. Without them nothing
  changes.

## 1.0.0-rc.31
- Tab bar: an optional centre action, `.ui-tab.ui-tab-action` (a button or a link with a `.ui-tab-icon` and its
  label): a raised 44 px circle in the accent colour, the label for screen readers only, never marked as the current
  tab; in floating and edge bars and every look, light and dark. The shell gallery's New uses it. Bars without one
  are unchanged.

## 1.0.0-rc.30
- Swipe between tabs feels like iOS's paging: let go, the pages glide on with a spring that starts at the finger's
  speed and lands without overshoot (`springPath`, about a third of a second) instead of a fixed 280 ms curve; the
  page goes when the drag plus its throw passes half the width (`pageStep`; was a third, or a flick, even when the
  finger turned back); at either end the page stretches like iOS's rubber band (`rubber`; was a third of the travel).
  The pages beside are laid out as the finger lands, so the first move only moves them (no first-frame hitch).
- The bar's title cross-fades to the coming page's large title at halfway, during the drag and the glide (it used to
  change at the end); bar parts marked `data-swipe-fade` fade out with the swipe and back in on the new page.

## 1.0.0-rc.29
- Content parts (`ui/gestures/content.css`, loaded by `gestures.css`): grouped sections (`.ui-section`,
  `.ui-section-head`, `.ui-section-foot`), row extras (`.ui-row-lead` icon tile with `data-tone="grey|danger"`,
  `.ui-row-thumb`, `.ui-row-trail`, `.ui-row-value`, `.ui-row-chevron`, `.ui-row-input` (a value typed into the row); `.ui-row[data-tone="action|danger"]`,
  `.ui-row[data-align="center"]`), cards (`.ui-card`, `-title`, `-text`, `-actions`), stat tiles (`.ui-stats`,
  `.ui-stat`, `-value`, `-label`), badges (`.ui-badge[data-tone="accent|ok|warn|danger"]`, with a tick, ring or dot so the tone is not colour alone), an empty state
  (`.ui-empty`, `-icon`, `-title`, `-text`) and skeleton rows (`.ui-skeleton[data-shape="line|short|thumb"]`); buttons (`.ui-tint` accent-tinted, `.ui-wide` full width,
  `[data-size="small"]` 32 px), `.ui-buttons` (a stack of buttons); filter chips (`.ui-chips` of `button.ui-chip`
  with `aria-pressed`, a full tap tall, `data-wrap="on"` to wrap). For
  apps moving off the old home kit, whose screens had these parts and the kit did not.
- Fix: `.ui-fill` and `.ui-plain` on a `<button>` (or link) now apply; theme.css's zero-weight `:where()` rules lost
  to its own `button` rule.

## 1.0.0-rc.28
- Sheets: a sheet opened, or a page pushed, while another sheet's close is still stepping back is no longer undone by
  that late step (the sheet waits for it to land before it takes its history entry). `sheetsSettled()` from `@core/ui`
  resolves once every step back has landed: an app's router waits on it before it pushes a page.
- Tab bar room: `tabBarRoom(bar)` (started by `startGestures()`) sets `--ui-tabbar-room`, the room a showing tab bar
  takes at the bottom; each `.ui-screen` keeps that much room under its last row, so nothing sits under the bar.
- Lists: rows in list items (`.ui-list > li > .ui-row`) get the line between them; a row that is a link or a button
  looks like the other rows (no underline, no button chrome, full width).
- Shell: a single-pane shell (`.ui-shell` with `.ui-screens` and no `.ui-panes`) keeps its bar from 600 px, above the
  screens beside the side bar, and the page scrolls; the screen is at most 46rem wide, centred.

## 1.0.0-rc.27
- Ground "Cool grey" (`cool`): the cool light grey behind grouped lists on a phone (#f2f2f7) in light, the palette's
  own dark. An app ported from a kit with that ground keeps it with `applyTheme({ surface: 'cool' })`; the default
  light ground (a near-white tinted 3% with the accent) reads a touch cooler or greyer next to it.

## 1.0.0-rc.26
- The current side bar link uses `--link`, as the current tab does, which the palette keeps 4.5:1 on its tint (the raw
  accent fell to 3.6:1 there for Violet); a test reads every preset in light and dark. The e2e axe helper takes
  `{ within, only }`.

## 1.0.0-rc.25
- Theme switch: `themeSwitch` / `lookSwitch` lay themselves out (`theme/theme.css`, zero specificity): one row per
  setting, its name at the start and its control at the end, two to a row when there is room. Before, a page without
  its own `.theme-switch` rules (any app that does not load the gallery CSS) got the labels and pickers run together.

## 1.0.0-rc.24
- Look E, "Workspace": flat and compact, like a desktop notes app. A slim bar, flush lists on the page background, menus
  as bottom sheets, no glass, a filled search box; the sync chip shows only its icon when all is synced.
- Preset "Violet" (violet on white or charcoal, flat, small corners) and the ground `ink`. An app may name a ground
  of its own: `applyTheme({ surface: 'ink' })` (a device's own preset still wins).
- Closing is animated: a sheet slides down from where it is (also after a drag, or on Esc) and fades on a wide screen;
  a hold menu fades or sinks away (its copy on the way out is inert and has no roles or ids). Still closes at once.
- Select mode: an icon `[data-edit-for]` button keeps its icon (and aria-label) while off; it says Done while on.

## 1.0.0-rc.23
- Data grid: a cell holding one field (an editable cell, such as a name box in a rota) is reachable from the keyboard:
  Enter or F2 goes into the field (its text selected), Esc in it comes back to the cell; arrows in the field stay in
  it, as before. Up and Down now keep the column of a cell the focus came to from outside the grid's own moves (Tab
  in, a tap or the app's own focus), not the column the grid last left.

## 1.0.0-rc.22
- Data grid: `dataGrid(table, { onSelect })` from `@core/ui` (styles in `ui/layout.css`, `.ui-data-grid` in a
  `.ui-data-grid-box`), for tables of small cells such as people by day. The box scrolls both ways at any width with
  the header row, first column and footer kept in view; `data-size="dense"` (32 px cells) or `"extra"` (24 px, the
  target floor); theme tokens only. ARIA grid: one Tab stop, arrows, Home / End, Ctrl+Home / Ctrl+End, PageUp /
  PageDown; a tap, Enter or Space selects a body cell (`aria-selected`) and fires `onSelect` and a bubbling
  `ui-grid-select` event with the row's and column's `data-key`. The app may redraw the table at any time.
  `startLayout()` starts any `table.ui-data-grid` it finds. `gridMove()` and `gridStarts()` are the pure moves.
  The dense gallery has a Grid screen (`?screen=grid`).

## 1.0.0-rc.21
- Toasts: Dismiss and the action button are never under 24 px high (axe target-size, WCAG 2.5.8). The room below the
  toasts is a custom property: set `--ui-toast-bottom` (on `:root`, say) or pass `toaster(host, { bottom })` when the
  app has its own tab bar; otherwise the kit's offset as before (page bottom, over a kit tab bar or action bar).
- Conflict sheet: `fields` option, per field path `{ label, format }`, for the per-field picks (default: the path and
  the value as JSON, as before). A side with no time no longer reads "(undefined)".

## 1.0.0-rc.20
- Hover cards: `hoverCard(root, selector, fill)` from `@core/ui` (styles in `ui/ui.css`, `.ui-hover-card`). Rest the
  mouse on a matching link for a moment and a small card shows what `fill(link)` returns (a note's preview, say); it
  goes when the mouse leaves (with a moment to move onto it), on Esc, scroll or a click. Mouse only (touch and pen
  taps are unchanged); in the top layer, so it shows over a modal sheet. `placeCard()` is the placement (below the
  link, above it when there is no room, inside the window). The parts gallery's prose link has one.

## 1.0.0-rc.19
- Tab pages: a tab left while a screen was pushed over it comes back at the tab's own scroll, not the pushed screen's
  (`screens.baseY()`).
- Conflict sheet: per-field Mine / Theirs picks survive the list redrawing on a queue change while the sheet is open.
- Stepper: a typed value finer than the step moves by exactly one step (2.5 + 1 is 3.5, was 4).
- Hide mode: an icon button named only by its `title` can be hidden (the whitespace around its icon is not a name).

## 1.0.0-rc.18
- Prose (`ui/prose.css`, opt-in: link it, put `ui-prose` on the box): rendered Markdown in an Obsidian-like reading
  style. A readable line length (`--measure`, 42rem), a heading scale, hanging list markers, task lists with the box in
  the bullet's place (ticked ones muted and struck through), code on a neutral wash (`--code-bg`, never the accent),
  an accent bar on quotes, hairline tables that scroll sideways, `kbd`. The parts gallery shows a sample.
- Icon buttons: `.ui-icon-btn` (square, `--button-h`, no box until hovered; `aria-pressed="true"` turns it the accent).

## 1.0.0-rc.17
- Hold menu, iPhone (no `navigator.vibrate`): the haptic fires before the lift's click is armed to be swallowed, and a
  click inside `.ui-haptic` is never the one swallowed, so the haptic ticks and lifting no longer opens the row.
- Select mode: Select all, its Select all / Deselect all label and a drag down the ticks take only the rows a search
  leaves shown.
- Update prompt: a failed check says "Could not check. Try again when online." and a failed version load "not installed
  yet" (as the settings screen and About sheet do), with no unhandled rejection.
- Settings: signed out, a change with an account part (a profile, an import) throws before touching any device value, so
  storage and the screen keep agreeing.
- Worker: `/kit/<folder>` and `/ui/kit/<folder>` without the trailing "/" 302 to the newest gallery's folder (was 404).

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
