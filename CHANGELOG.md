# Changelog

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
