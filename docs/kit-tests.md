# Kit gallery tests

The gallery is `kit/` (served at `core.anawj.com/ui/<version>/kit/`, or `/ui/0.0.0-dev/kit/` on the e2e server): every `@core/ui` gesture part
on made-up plants, signed out. Its browser tests are `e2e/kit.spec.mjs`; each runs with an emulated finger (touch
through the DevTools protocol) at **390, 820 and 1280 px**, fails on any Content-Security-Policy report, and checks axe
(serious and critical) where noted. Pure parts have unit tests in `test/gestures.unit.test.mjs`.

Add a line here, and a test, for every part or behaviour the gallery gains.

| Part | What is tested | axe |
| --- | --- | --- |
| Page | loads, every part starts (menus, large title, screens, one sheet, one select list) | yes |
| Hold menu | 500 ms touch opens it; not before; lifting doesn't open the row; a 30 px move cancels; a tap opens the row | menu open |
| Hold menu | without `navigator.vibrate` (iPhone): the hidden switch ticks and lifting still doesn't open the row | |
| Hold menu | right-click, Shift+F10, the context-menu key; arrows, End, wrap; Esc gives focus back to the row | |
| Hold menu | Delete removes the row with an Undo toast (no confirm); Undo puts it back in place | |
| Hold menu | its Select starts select mode with that row ticked; no hold menu while selecting | |
| Hold to select | `data-hold-select` on the list: a finger's hold starts select mode with that row ticked, no menu, the lift ticks nothing more; a right-click still opens the menu | |
| Hold menu | a menu for a row near the bottom of the screen stays fully on screen | |
| Closing | 390 px: a sheet opened, or a page pushed after `sheetsSettled()`, as another sheet closes stays (its late step back is not taken for Back); a sheet slides down to the bottom edge before it shuts (Esc); a closed hold menu fades out, inert, with no roles or ids, gone within 600 ms; Still closes both at once | |
| Select toggle | an icon `[data-edit-for]` button keeps its icon and name while off and says Done while on | |
| Look E chip and search | look E: the synced chip shows only its icon (the word stays for screen readers), other states show the word; the shell search box has no outline until focused | |
| Side bar contrast | 1280 px: the current side bar link passes colour contrast (axe) in every preset, light and dark, default look | |
| Select mode | Select/Done; listbox + aria-selected; tap ticks (doesn't open); drag down the ticks takes a range; action bar replaces the tab bar; `data-needs` enables buttons; Esc leaves | selecting |
| Sheet | opens at medium; drag up to large, down to medium, down to close (phone); Enter on the grabber cycles; Back closes it; centred dialog from 840 px, bottom edge below | open |
| Components | 390 px: a pushed screen's Back shows in the bar (the screen's own is hidden), names the screen under it and pops; Select all stays on one line; look A's serif on the page title only; selects 44 px high, checkboxes 20 px or more; select mode's count in the text colour, off buttons faded, Delete red; the sheet's Done has no border and its chip row runs edge to edge; look C's action bar runs along the bottom edge | |
| Single pane | `test/single-pane.html`, 390 then 1280 px: rows that are links or buttons in list items look like rows (no underline or button chrome, full width, a line between them); the tab bar's room (`--ui-tabbar-room`) keeps the last line above it; from 600 px no tab bar, no room, and the bar stays beside the side bar | yes |
| Sheet | a drag from a field or a sideways scroller neither moves the sheet nor scrolls the body; the same drag from the body does | |
| Screens | push twice, Back pops with focus on the pusher; bar title follows; edge swipe (forced on) follows the finger, goes back past a third; a short swipe springs back; the tab bar doesn't move | pushed |
| Motion | 390 px: a push slides the new screen in over the old one (the old one's content stays put, out of the flow), Back returns to the same place; menus and bars take `--d-quick` (340 ms); a sheet's drag keeps one box height (transform only) and settles back to its own height on the bottom edge | |
| Tab bar | 390 px, look B: a tab bar along the edge keeps every tab when scrolled (only the floating one shrinks) | |
| Screens | without `?edge=always` (Android, browsers) the screen doesn't follow an edge swipe | |
| Tab bar + title | scrolling down shrinks the tab bar to the current tab and collapses the large title into the bar; up / top brings them back | |
| Still | off until picked; on: no lifted preview, no slide; kept after reload | |
| Reduce Motion | the device setting counts as Still | |
| Other pages | `startGestures()` on a page without the markup starts nothing | |
| Page held still | 390 and 1280 px: a wheel over an open sheet or hold menu doesn't scroll the page (the menu's preview stays on its row); closed, it scrolls again | |
| Home indicator | 390 px with a 34 px bottom inset: a full-height sheet's last row, look B's sheet menu and a toast on a page without a tab bar clear it | |
| Sync chip | 390 px: the chip shows each made-up state in its word (`Saved`, `Sending… (3)`, …), its `data-state` set, a `status` role; axe clean with "Needs you" | |
| Demo controls | 390 px: the list sits straight under the large title, with no demo control on the home screen; the bar's "Demo controls" button opens one sheet holding Open the sheet, Push a screen, the other pages, look, density, Still and the sync state, each scrolled to on screen; axe clean light and dark; Esc gives focus back to the button; Open the sheet swaps the demo sheet for the made-up one (its close gives focus back to the button); Push a screen pushes one screen | |
| Sync button | 390 px: the chip's tappable twin beside it: each made-up state its label (`Saved. Sync now`, `Sending… (3). Sync now`, …) as `aria-label` and `title`, its `data-state` (pending shows `syncing`); one colour in every state, a different cloud icon in each, a count badge where something waits, a dot on needs you; a tap calls the app's sync now and shows sending at least 700 ms, offline keeps its struck cloud; no lift under reduced motion or Still | yes |
| Installable, no pull | each gallery page (settings too): `overscroll-behavior-y: none` (no pull-to-refresh); demo words with no developer notes; the manifest (standalone; `id` and `start_url` `/ui/kit/`, scope `/ui/`, so the installed app opens the newest gallery) and its 192 and 512 icons are served; the page cancels `beforeinstallprompt`; the service worker (scope `kit/`) controls the page after a reload | |

## Shell gallery

`/kit/shell/` is tested by `e2e/shell.spec.mjs` at 390, 820 and 1280 px (axe and CSP reports as above). Pure parts
(`sizeClass`, `matchesSearch`) are in `test/shell.unit.test.mjs`.

| Part | What is tested | axe |
| --- | --- | --- |
| Layout | phone: tab bar, one pane; tablet and laptop: side bar, list and detail side by side, in order; one level-1 heading at every size | yes |
| Open | clicking a row opens it; on a phone it pushes the detail, Back and Esc pop it | |
| Keyboard | Ctrl/Cmd+K focuses the search; typing filters; Esc clears, then leaves; arrows and Enter work the list | |
| Pointer | right-click opens the row menu; Ctrl/Cmd-click adds; Shift-click takes a range; the detail summarises a multi-selection; Esc leaves select mode | |
| Select all | 1280 px, with a search hiding rows: ticks only the shown rows; Deselect all / Select all follows them | |
| Sheets | a side panel at 1280 px, a bottom sheet below; Back and Esc close it | open |
| Tab bar | 390 px: the picked section (`?tab=`) is marked in both bars and its page shows; shrunk on scroll, its tab stays and Tab reaches it | |
| Delete | removing from the detail shows an Undo toast; Undo puts the row back | |
| Resize | the layout follows the width when the window crosses a size class | |
| Other pages | `startGestures()` on a page without the shell markup starts nothing | |
| Desktop details | 1280 px: the detail shows Water and Delete only with a row open, and empties when that row is deleted; right-click opens the menu with its corner at the pointer, the row not lifted; looks A to D have a line between rows in the list pane | |

## Tab pages and swipe

`/kit/shell/` is also tested by `e2e/tabs.spec.mjs` (ui/tab-pages.js, plain tabs and bar buttons, the phone's
drawer), with an emulated finger at 390 px unless named. Pure parts (`swipeIntent`, `pageStep`, `swipeEdge`, `rubber`, `unrubber`, `springPath`, `pathAt`, `releaseVelocity`)
are in `test/gestures.unit.test.mjs`. `e2e/swipe-feel.spec.mjs` runs the feel in Chromium and WebKit (the iPhone's
engine) with a finger of page-sent touch events, one per frame, timed as a 60 Hz finger.

| Part | What is tested | axe |
| --- | --- | --- |
| Plain tabs and bar buttons | looks A to D: `<button class="ui-tab">` has no border and no fill but the current tab's `--tab-active`, its icon above the label; bar buttons have no border or fill, the link colour (the band's text colour in B), New bold | yes |
| Centre action | looks A, B (edge) light and C, B dark: `.ui-tab-action` (New) is a 44 px accent circle in the on-accent colour, raised above the other icons, its label for screen readers only, a 44 px target | yes |
| Tap a tab | shows its page, marks both bars, names the bar; New opens the sheet and is no page | |
| Swipe | left goes to the next page, past New; right comes back; a `ui-tab` event each time; nothing past the ends; a short slow move goes back with nothing left moved | |
| Follows the finger | mid-swipe the page is moved by the finger's travel and the next page sits beside it; in WebKit too, frame by frame, and the glide never goes back or faster than a fast finger | |
| Glide | let go past half (or with a throw), every frame the pages sit side by side and only move onward, the glide takes under 500 ms and the new page lands where it ended (no jump); the bar title is Plants before halfway, Rooms partly faded in after, fully shown at the end | |
| Tab lights at let-go | the swipe's new tab has `aria-current` at the let-go while the pages still glide, not only when they land; a let-go that springs back keeps the tab it had | |
| Spring back | let go short of half and slow, the page springs back, the title stays, a `data-swipe-fade` part fades with the drag and is cleared after; at the first page a pull stretches less and less and springs back to 0 | |
| No swipe | a mostly vertical move, a start within 28 px of either edge at 390 px (Android's Back; max 32), the Jobs chips (a sideways scroller), a field, a pushed screen, `data-swipe="off"` on the tab bar | |
| First page | with `drawer=off`, a right swipe past a third of the finger's own travel (or a flick) fires `onPrevMissing` once; a short move does not | |
| Quick flicks | three short flicks, each while the last still glides, go three pages (none lost to a glide); also in WebKit | |
| Catch | a finger on the gliding pages holds them where they are, and a tap there opens nothing; let go still, they land on the nearer page; also in WebKit | |
| Drawer pull | a right swipe on the first page pulls the side bar out by the finger's travel over a shade (opacity with it), the page stays; let go past half or with a flick it opens, a short slow pull goes back; a left swipe or a tap on the shade closes it; with Reduce Motion the button opens it with no animation; also in WebKit | |
| Sideways scroller | the Jobs chips still scroll sideways under the pager's `touch-action: pan-y` | |
| Card deck | the Jobs page's deck (`cardPager`) tells `onShow` of the first card; a swipe on it goes a card, never a tab; not from within the edge; ArrowRight and ArrowLeft go too | |
| No zoom | `html` and `body` are `touch-action: pan-x pan-y` with overscroll `none` | |
| Reduce Motion | the pages still follow the finger, the next one beside, and glide on (rc.30 switched with nothing moved); also in WebKit | |
| Pressed at once | a touch on a button or tab marks it `data-pressed` at once (jank gate); the tab bar, buttons and glass buttons show it as they show `:active` | |
| Tab slide | a tapped tab's page slides in from its side (280 ms, clipped); Reduce Motion or `data-slide="off"` just switches | |
| Bar on a tab change | between two scrolled pages the bar stays tinted (collapsed) all the way; to a page at the top it clears once (no flash) | |
| Scroll and Back | each page keeps its scroll, also when left from a pushed screen; the current tab over a pushed screen goes back to it; another tab goes back first, leaving no history entry | |
| Back with tabs | leaving the first tab adds one history entry, the other tabs none; Back on another tab goes to the first, Back there leaves; a tap on the first tab takes the entry away | |
| Drawer | look D: the side-bar button opens the side bar over the page; a link goes to its page and closes it; Esc closes and gives focus back; hidden while Back shows | open |
| Drawer and Back | the drawer open (pulled out, or by its button) is a history entry: Back closes it and stays on the page; the bar, pages and tab bar are `inert` while it is open; a side link's page takes the drawer's place in history, so Back then goes to the first page; also in WebKit | |
| Sheet, Esc and Back | a sheet closed by Esc (the close request Chrome's Back sends a modal dialog on Android) steps back once: the tab's entry under it stays; also in WebKit | |
| Tablet | 820 px: a side link's tab page takes both panes; no swipe; Plants brings the list and detail back | yes |

## Keyboard

`ui/keyboard.js`: `keyboardState` in Node (`test/gestures.unit.test.mjs`). `e2e/keyboard.spec.mjs` on `/kit/shell/`
at 390 px, in Chromium and WebKit, with the keyboard played (no browser here shows one): the viewport made shorter
(`interactive-widget=resizes-content`) or a stand-in visual viewport (a browser without it).

| Part | What is tested | axe |
| --- | --- | --- |
| Resizes content | a tapped field in the sheet, then the page 344 px shorter: `html.ui-keyboard-open`, `--ui-keyboard-h` 0, the tab bar hidden, the sheet inside the space above; the page tall again: closed, the tab bar back | |
| Visible part only | a field and the visual viewport 344 px shorter: `--ui-keyboard-h` 344px and the sheet's bottom on the keyboard's top; a blur: closed, 0 | |

## Haptics

`ui/gesture.js` `haptic`, the theme's `haptics`: `cleanChoice` in Node (`test/theme.unit.test.mjs`).
`e2e/haptics.spec.mjs` on `/kit/`, `/kit/shell/` and `/kit/settings/` at 390 px, in Chromium and WebKit, with a
stand-in `navigator.vibrate` that writes down each pattern.

| Part | What is tested | axe |
| --- | --- | --- |
| Drawer | a finger pulling it out past half: one threshold (12); back under half: another; Haptics Off: none | |
| Sheet | the grabber dragged down past the close line: a threshold; back up: another; the sheet stays | |
| Hold, switch | a touch and hold: a long (20); the gallery's Haptics switch turned off: quiet; on again: a tick (8) | |
| Kept | the theme switch's Haptics Off: `data-haptics="off"`, kept on the next page; `haptic()` then gives nothing | |

## Bounce

`ui/bounce.js` in Node (`test/bounce.unit.test.mjs`): nothing runs on import; `rubberSlope` is the rubber band's
slope. `e2e/bounce.spec.mjs` on `/kit/shell/` at 390 px, in Chromium and WebKit with page-sent touch events, then in
Chromium through DevTools protocol touch and the mouse wheel.

| Part | What is tested | axe |
| --- | --- | --- |
| Pull at the top | the list stretches by `rubber(160, screen height)` ±1 px; the bar and the action bar stay; let go, one spring a part, it lands with no transform left | |
| Pull at the bottom | stretches up; a finger landing on the spring back catches it where it is (no animation left) and it lands after | |
| No stretch | a sideways swipe (the pager's) and a screen with `data-no-bounce` | |
| Sheet | the sheet body at large stretches past its bottom, never past its top (the sheet's own drag) | |
| Fling (Chromium) | a fast fling that ends short of the bottom bounces once it gets there and lands; with Less motion it doesn't | |
| Wheel (Chromium) | a mouse wheel to the end never bounces | |

## Motion and the jank gate

`ui/motion.js` in Node (`test/motion.unit.test.mjs`): `glide` hands each part the spring path as linear keyframes,
`stop()` gives where it is and cancels, `done` says whether it landed; `spring` lands on its end, onward only;
`tracker` reads the let-go speed; `afterGesture` holds work while a glide moves, runs each job once, and can be
cancelled. The budget is README, "Responsiveness rules".

`e2e/jank.spec.mjs` on `/kit/shell/?edge=always` at 390 px, Chromium with the CPU slowed 4x and DevTools protocol
touch (a move every 16 ms) on the plain look (no GPU in CI: glass blur drawn in software drops frames at random),
then WebKit unslowed with the glass, page-sent touch and pointer events (a move every 16 ms); one test at a time, after
every other spec. In Chromium each gesture is judged from the first move: drag frames (to the lift) and the glide's
frames (to the frame it lands in), and long tasks over both. In WebKit (software drawing in CI) the page's own work is
judged: each move's handlers within 8 ms, the touch down's and the lift's within 16 ms, and pressed set by the touch.

| Part | What is tested | axe |
| --- | --- | --- |
| Tab swipe | a swipe from Plants to Rooms and a quick flick back: drag frames within 20 ms but one, none over 50 ms, glide frames none over 50 ms, no task over 50 ms; the page lands | |
| Sheet drag | the New sheet's grabber dragged up to large, down to medium, then down and away: the same budget each; the detents and the close land | |
| Bounce pull | a pull past the list's top, then past its bottom, and the spring back: the same budget each | |
| Pressed | a touch on the Jobs tab shows `data-pressed` within 50 ms; it clears on the lift | |
| Sync tap | a tap on the shell bar's sync button: the icon's lift is a CSS animation (transform, opacity); every frame while it shows sending within 20 ms but one, none over 50 ms; one tap counted. WebKit: the tap's handlers within 16 ms | |
| Android look | look M: the tab swipe (its navigation pill moving) and the sheet dragged up to large, the same budget each | |

## Settings screen gallery

`/kit/settings/` is tested by `e2e/settings.spec.mjs`: `settingsScreen` on a made-up plant app's options, held by a
stand-in for `@core/settings` on the page.

| Part | What is tested | axe |
| --- | --- | --- |
| Page | 390 and 1280 px, looks A to D: the groups in order with the theme switch in "This device", one level-1 heading, controls 24 px or more, nothing wider than the screen | yes |
| Rows | a switch (the whole row's label flips it), a picker and a number field save to the settings; kept after reload | |
| Refused | a value the option refuses shows why in the status line, the field goes back to the value in force | |
| Profile | picking one shows its defaults; a change by hand shows the note; picking another clears it | |
| Followed | a change made elsewhere shows at once | |
| Settings file | Export downloads the account options only, under the app's file name; Import says "Imported: N changes, M left out", "Nothing to change", or why the file isn't one | |
| Switch | Space flips it, named by its row; Less motion (`data-motion="still"`) takes its slide away | |
| About | the last group: the Version row shows the update api's version; Check for updates says "newest", then "Updated."; the About row opens the About sheet (name, version); closing it retries the owed update | sheet open |

### Looks, density and the glass guard (`e2e/looks.spec.mjs`)

| Part | What is tested | axe |
| --- | --- | --- |
| Looks A, B, C, D, E, M | at 390, 820 and 1280 px: the look's `data-*` marks (`data-family` android for M, core for the rest) and glass class; band or plain title; floating or edge tab bar; card or flush list; C's glass only on pills; D's bar title showing from the start, no large title on show, lists on the page background; screenshots kept (`look-<id>-<width>[-select\|-menu].png`) | page, selecting, menu open |
| Look B's menu | under 840 px the hold menu from touch or Shift+F10 is a bottom sheet (a mouse's right-click opens at the pointer) on the bottom edge, named in its head (no lifted copy) with the tab bar hidden; from 840 px it opens beside the row | menu open |
| Dark | 390 and 1280 px, each look: the gallery and the shell are clean; look B's band takes white text; menus, sheets and the action bar are solid (no blur, no see-through) | gallery, shell |
| Ticks | square in B, round in A and C | |
| Wide bar | 1280 px, looks A to D, gallery and dense page: the top bar is full width, its title centred and its start in line with the large title's words; an edge tab bar keeps its tabs together in the middle | |
| Density | rows 60 / 50 / 44 px; taps never under 44; a link's `?look=` is a preview, a pick is kept after reload | |
| Glass guard | little memory turns glass off, kept, with the reason in Settings; Solid and "Glass, even here" still win | yes |
| Design kits | `?kit=ntf` swaps the page's `/v1/tokens.css` to `design.anantf.com` and sets wine on the linen ground; `?kit=nuhs` to `design.anawj.com`, navy on white; no `?kit` keeps the default kit | |

### Android look (`e2e/android.spec.mjs`, `test/m3.unit.test.mjs`)

| Part | What is tested | axe |
| --- | --- | --- |
| Colour roles | (unit) each tone is its CIELAB L* and fits sRGB; hue kept, tertiary turned 60°, neutrals near grey; the baseline seed lands near Material's own colours; on-colours 4.5:1; the surface containers in order; the page palette passes the contrast floors light, dark and OLED for nine seeds; only look M gets `--m3-*` | |
| Look M, light and dark | `data-family="android"`; the `--m3-*` roles set and the accent the primary; the Roboto stack first; no glass; an 80 px navigation bar with the pill on the current tab only, moved by opacity and transform; the top app bar's tone layer at opacity 0, then 1 once scrolled | page |
| Sheet and menu | the sheet's handle 32 × 4 px, its corners 28 px | sheet |
| Switch and action button | `/kit/parts/?look=m`: the switch 52 × 32 px, its thumb larger when on (transform), a click toggles it; the action button a 16 px rounded square in the primary container at the bottom end | switches, button |
| Other looks | the default look keeps `data-family="core"`, no `--m3-*`, no Roboto Flex | |
| Gallery smoke | `/kit/?look=m` and `/kit/parts/?look=m` in Chromium, Firefox and WebKit: no page error, axe, no CSP report | yes |

### Layout parts and extra-dense (`e2e/dense.spec.mjs`)

| Part | What is tested | axe |
| --- | --- | --- |
| Both dense screens | in looks A to D at 390, 820 and 1280 px: every target 24 px or more (a radio or checkbox measured by its label), nothing wider than the screen; screenshots kept (`dense-<screen>-<look>-<width>.png`) | yes |
| Sizes | extra-dense is 32 / 24 px; unticking it gives the density's own sizes; Comfortable gets 44 / 36 px | |
| Readable, lined up | looks A to D at 390 px: no text under 12 px, stepper fields 32 px tall, the screen's left edge matches the controls', the collapsed bar title centred, an unset key time reads "Not set" in normal weight | |
| Segmented | arrows pick and move focus; a second tap clears a clearable one, Space does not; a plain one keeps its pick | |
| Stepper | − and + step by the step, stay in min/max, an empty box starts at `data-start`; buttons out of the Tab order; (unit) a typed value finer than the step moves by one step | |
| Toolbar | one Tab stop; arrows wrap, Home, End; Tab leaves it | |
| Undo | clearing the boxes and setting a key time show an Undo toast, never a dialog | |
| Look B's band | the bar keeps the band's colour once the title has scrolled under it | |
| Data grid | at 390 and 1280 px: the box scrolls sideways, the page does not; cells 32 px (dense), 24 px (extra), the screen's tap size (none); the header row and first column stay in view scrolled to the far corner; screenshots kept (`dense-grid-extra-<width>.png`, `dense-grid-scrolled-<width>.png`) | yes |
| Data grid keys | one Tab stop; arrows (down past a group row keeps the column), Home, End (scrolls the box), Ctrl+Home, Ctrl+End; Enter selects; the pick survives a redraw | yes |
| Data grid tap | a tap selects one body cell at a time; header cells are never selected; (unit) `gridStarts`, `gridMove` at the edges and across colspans | |


### Cheap Android stand-in (`e2e/cheap-android.spec.mjs`)

| Part | What is checked | Screenshot |
|---|---|---|
| Glass guard, little memory | a phone that reports 2 GB shows Solid at once (verdict kept: memory); scrolling the gallery still gives frames | |
| Glass guard, slow frames | no memory figure plus 30 ms of work per frame: glass shows until the first scroll, then Solid (verdict kept: frames), and stays so after a reload | |
| Android look | look M on a 2 GB phone: solid from the start, scrolls (median frame attached), the top app bar collapses | |


### Reference parts (`e2e/parts.spec.mjs`, `test/ui-parts.unit.test.mjs`)

| Part | What is checked | Screenshot |
|---|---|---|
| Undo toast | Undo puts a deleted row back where it was; a second delete replaces the first toast; axe with a toast showing | |
| Undo toast (unit) | the message and Undo run the undo; one at a time; own words and time | |
| Loading and errors | skeleton rows with `aria-busy` while loading, then the list; the error shows with Try again, which recovers; axe in each state | |
| About sheet | version, the newest-version answer, outside code listed from the import map with versions and licences; Esc closes and focus returns; axe with the sheet open | |
| About sheet (unit) | `packagesFromImportMap` leaves out the app's own files and reads versions from addresses | |
| Drafts | typing is kept and a reload finds it again; Send clears it; axe | |
| Drafts (unit) | a reload takes over a released slot, a held slot stays; blocked storage reads nothing and save throws | |
| Drag to reorder | dragging the grip with a finger moves the row to the new place; axe | |
| Follow the finger | the knob (`drag`, `glide`) goes with a finger and glides to the end it was let go nearer; a short move back glides back; the save (`afterGesture`) shows after each lift; axe | |
| Share out | Copy and Share (no share sheet) copy and say so; (unit) a closed share sheet is not an error | |
| Back closes the dialog | Back closes the newest dialog first, then the one under it; the page stays (unit: dismissAll, reset) | |
| Conflict sheet | per-field picks survive a queue change while the sheet is open, and Keep these choices sends them all | |
| Conflict sheet | `fields` gives a field its label and value format; others keep the path and JSON; no "(undefined)" when a side has no time | |
| Toast | Dismiss and the action are 24 px or more (axe target-size); `--ui-toast-bottom` and `toaster(host, { bottom })` set the room below (an app's own tab bar) | |
| Screen history (unit) | go pushes, Back returns, a deep link gets its parent trail | |
| Hide mode | a tap hides a button or card; the main button and inputs stay; kept after reload; Show all (unit: the saved list is cleaned) | |
| Settings rows | ⓘ opens the rest of the help (axe with it open); Reset this page puts the section's rows back and Undo returns them | |

### An app's own page (`e2e/app-shell.spec.mjs`, `e2e/pages/app-shell.html`)

| Part | What is checked | Screenshot |
|---|---|---|
| List-only shell | with no `.ui-pane-detail`, opening a row sends `ui-open` and marks it current; nothing is pushed on a phone; the list takes the width (390, 1280 px) | |
| Bar ends | `.ui-bar-side` ends keep the title in the middle; `.ui-bar-end` puts its buttons at the end | |
| Switch | an app's `input { min-width: 10rem; flex: 1 }` leaves `.ui-switch` at 3.1rem | |
| Toasts | three stacked toasts sit above the tab bar | |
| Current tab | in Navy, light and dark, the current tab is 4.5:1 or more on the page | |
| Tab page on resize | a tab page without `.ui-tab-page`, opened on a phone, still shows (both panes' room) at 820 px, and again back at 390 | |
| Settings part list | an app's list card in a settings part is as wide as the groups' cards | |
| Update prompt | a failed check or version load says so ("Could not check…", "not installed yet"); no unhandled rejection | |
| `idPrefix` | two sync chips on one page get their own ids; without `idPrefix` the ids are as before | |
| Sync chip icons | each state draws an `svg.ui-icon` in its own colour (saved, offline and attention differ), with the count as a badge on the icon | |
| Buttons | a button is flex-displayed and centred, `--button-h` high, with `--radius-button` larger than a list card's corner | |
| Theme-color | the page has two `theme-color` metas (light and dark) holding the page ground | |
| No glyph icons | `tools/check.mjs` fails on an emoji, dingbat or pictograph character in a published file | |
| Prose | 390 and 1280 px: a task row has no bullet and its box sits on the text line, left of the words; a code block is not the accent; the box keeps to `--measure`; icon buttons are square | yes |
| Hover card | 1280 px with a mouse: resting on the prose link shows the card below it (`aria-describedby`), axe passes, moving away removes it; 390 px touch: a tap shows none | yes |
| Action button | `/kit/parts/`, look A: 56 px tall at the bottom end, the page's end leaves room under it (`android.spec.mjs`) | |
| Content parts | `/kit/parts/` gallery: sections, row extras, card, stats, badges, empty state and skeleton rows start clean under axe in every browser (`gallery.spec.mjs`) | |

### Add-ons (`test/addons.unit.test.mjs`)

| Part | What is tested | axe |
| --- | --- | --- |
| Wallpaper | choices, dim steps, pattern CSS on the kit's `--text`; the floor and backing keep text at 4.5:1; see-through cards stay at 80% or more | |
| Fonts | stacks, an app's own stacks, typed names cleaned, the writing font following the interface font | |
| Custom CSS | `url()`, `@import` and unbalanced braces refused; `@settings` sliders, colours and switches become variables; odd values dropped | |
| Colour grid | grid lookup, snapping, the 18-bit code round trip, recents | |
| Icon sets | the default is no mark; old set names read as the same set; per-set paths; per-tab picks only from the app's list | |
| Per-device choice | off unless chosen; a dim without a wallpaper, a blank typed font or refused CSS is dropped | |
| Saved themes | save, match, the patch, export and import (other apps' files refused), the limit, the night theme | |
| Theme links | a made-up look schema: a look and a bundled theme go out and come back the same; a broken link throws | |
