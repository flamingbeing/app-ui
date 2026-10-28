// Look E, workspace: flat and compact like a desktop notes app on a phone. A slim bar over a hairline (no large
// title), lists flush on the page with faint inset lines and no card, medium-weight rows, small corners, a flat
// full-width tab bar, the hold menu as a sheet from the bottom, no glass. Data only (looks.js says what each key means).
/** @type {import('../looks.js').Look} */
export default {
  id: 'e',
  name: 'Workspace',
  desc: 'Flat and compact, flush lists, menus as sheets',
  variants: { header: 'slim', menu: 'sheet', glass: 'none', tick: 'round', tabbar: 'edge' },
  tokens: {
    'look-font-head': 'inherit',
    'title-size': '1.5rem', 'title-weight': '700', 'title-track': '-.015em',
    'bar-line': 'color-mix(in srgb, var(--line) 30%, transparent)',
    'card-r': 'var(--radius)', 'list-inset': '0', 'list-bg': 'transparent',
    'list-edge': 'transparent', 'list-sep': 'color-mix(in srgb, var(--line) 22%, transparent)', 'list-shadow': 'none',
    'row-weight': '500',
    'control-r': 'var(--radius)', 'pill-r': 'calc(var(--radius-l) * 1.2)',
    'menu-r': 'var(--radius-l)', 'sheet-r': 'calc(var(--radius-l) * 1.33)',
    'tick-size': '20px', 'tab-active': 'transparent',
    'glass-tint': '0%',
  },
};
