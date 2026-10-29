// Look M, Android: Material 3 Expressive as Android 16 draws it. Colour roles from the accent as the seed (m3.js, tonal
// spot), solid surfaces with tonal elevation (no glass), Roboto where the phone has it, a medium top app bar whose
// headline collapses into it, lists in rounded groups with 2 px gaps, a navigation bar with a pill under the current
// tab, square ticks, menus beside the row. Its own parts and restyles are in ui/gestures/android.css (data-family).
// Data only (looks.js says what each key means). Corners are Material's shape scale in px, not the theme's radii.
/** @type {import('../looks.js').Look} */
export default {
  id: 'm',
  name: 'Android',
  desc: 'Material 3 like Android 16: tonal colour, rounded groups, a navigation bar with a pill',
  variants: { header: 'plain', menu: 'popover', glass: 'none', tick: 'square', tabbar: 'edge', family: 'android' },
  palette: 'm3',
  tokens: {
    'look-font-head': 'var(--m3-font)',
    'title-size': '1.75rem', 'title-weight': '400', 'title-track': '0',
    'bar-line': 'transparent',
    'card-r': '20px', 'list-inset': '16px', 'list-bg': 'var(--surface)',
    'list-edge': 'transparent', 'list-sep': 'transparent', 'list-shadow': 'none',
    'row-weight': '400',
    'control-r': '20px', 'pill-r': '9999px',
    'menu-r': '16px', 'sheet-r': '28px',
    'tick-size': '18px', 'tab-active': 'transparent',
    'glass-tint': '0%',
  },
};
