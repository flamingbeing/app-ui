# Changelog

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
