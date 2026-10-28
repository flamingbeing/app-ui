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
| Hold menu | a menu for a row near the bottom of the screen stays fully on screen | |
| Select mode | Select/Done; listbox + aria-selected; tap ticks (doesn't open); drag down the ticks takes a range; action bar replaces the tab bar; `data-needs` enables buttons; Esc leaves | selecting |
| Sheet | opens at medium; drag up to large, down to medium, down to close (phone); Enter on the grabber cycles; Back closes it; centred dialog from 840 px, bottom edge below | open |
| Components | 390 px: a pushed screen's Back shows in the bar (the screen's own is hidden), names the screen under it and pops; Select all stays on one line; look A's serif on the page title only; selects 44 px high, checkboxes 20 px or more; select mode's count in the text colour, off buttons faded, Delete red; the sheet's Done has no border and its chip row runs edge to edge; look C's action bar runs along the bottom edge | |
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
drawer), with an emulated finger at 390 px unless named. Pure parts (`swipeIntent`, `pageStep`, `swipeEdge`) are in
`test/gestures.unit.test.mjs`.

| Part | What is tested | axe |
| --- | --- | --- |
| Plain tabs and bar buttons | looks A to D: `<button class="ui-tab">` has no border and no fill but the current tab's `--tab-active`, its icon above the label; bar buttons have no border or fill, the link colour (the band's text colour in B), New bold | yes |
| Tap a tab | shows its page, marks both bars, names the bar; New opens the sheet and is no page | |
| Swipe | left goes to the next page, past New; right comes back; a `ui-tab` event each time; nothing past the ends; a short slow move goes back with nothing left moved | |
| Follows the finger | mid-swipe the page is moved by the finger's travel and the next page sits beside it | |
| No swipe | a mostly vertical move, a start within max(24 px, an eighth of the width) of either edge, the Jobs chips (a sideways scroller), a field, a pushed screen, `data-swipe="off"` on the tab bar | |
| First page | a right swipe past a third (or a flick) fires `onPrevMissing` once (an app opens its drawer); a short move does not | |
| No zoom | `html` and `body` are `touch-action: pan-x pan-y` with overscroll `none` | |
| Reduce Motion | the swipe changes the tab with nothing moved | |
| Tab slide | a tapped tab's page slides in from its side (280 ms, clipped); Reduce Motion or `data-slide="off"` just switches | |
| Scroll and Back | each page keeps its scroll, also when left from a pushed screen; the current tab over a pushed screen goes back to it; another tab goes back first, leaving no history entry | |
| Drawer | look D: the side-bar button opens the side bar over the page; a link goes to its page and closes it; Esc closes and gives focus back; hidden while Back shows | open |
| Tablet | 820 px: a side link's tab page takes both panes; no swipe; Plants brings the list and detail back | yes |

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
| Looks A, B, C, D | at 390, 820 and 1280 px: the look's `data-*` marks and glass class; band or plain title; floating or edge tab bar; card or flush list; C's glass only on pills; D's bar title showing from the start, no large title on show, lists on the page background; screenshots kept (`look-<id>-<width>[-select\|-menu].png`) | page, selecting, menu open |
| Look B's menu | under 840 px the hold menu from touch or Shift+F10 is a bottom sheet (a mouse's right-click opens at the pointer) on the bottom edge, named in its head (no lifted copy) with the tab bar hidden; from 840 px it opens beside the row | menu open |
| Dark | 390 and 1280 px, each look: the gallery and the shell are clean; look B's band takes white text; menus, sheets and the action bar are solid (no blur, no see-through) | gallery, shell |
| Ticks | square in B, round in A and C | |
| Wide bar | 1280 px, looks A to D, gallery and dense page: the top bar is full width, its title centred and its start in line with the large title's words; an edge tab bar keeps its tabs together in the middle | |
| Density | rows 60 / 50 / 44 px; taps never under 44; a link's `?look=` is a preview, a pick is kept after reload | |
| Glass guard | little memory turns glass off, kept, with the reason in Settings; Solid and "Glass, even here" still win | yes |

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


### Cheap Android stand-in (`e2e/cheap-android.spec.mjs`)

| Part | What is checked | Screenshot |
|---|---|---|
| Glass guard, little memory | a phone that reports 2 GB shows Solid at once (verdict kept: memory); scrolling the gallery still gives frames | |
| Glass guard, slow frames | no memory figure plus 30 ms of work per frame: glass shows until the first scroll, then Solid (verdict kept: frames), and stays so after a reload | |


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
