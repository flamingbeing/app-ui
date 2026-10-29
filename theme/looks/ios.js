// Look iOS: as close to iOS 26 as the web allows. A large bold title on the page that collapses into the bar as it
// scrolls under it, the bar turning to glass over the content; inset grouped lists on the grouped grey (black in
// dark) with hairline separators inset to the text; glass capsule buttons in the bar; a floating glass tab bar; iOS
// switches, segmented controls with a sliding thumb, sheets floating clear of the edges; menus beside the row. SF Pro
// on Apple devices (-apple-system), Inter standing in elsewhere (SF Pro may not ship off Apple devices). The finer
// iOS details (system colours, type scale, controls) are in ui/gestures/ios.css, which only acts on this look.
// Data only (looks.js says what each key means). accent and surface are only fallbacks: an app's own colour and
// ground, and a device's picks, win.
/** @type {import('../looks.js').Look} */
export default {
  id: 'ios',
  name: 'iOS',
  desc: 'iOS 26: large titles, grouped lists, glass bars',
  variants: { header: 'plain', menu: 'popover', glass: 'bars', tick: 'round', tabbar: 'float' },
  accent: '#007aff',
  surface: 'grouped',
  tokens: {
    'look-font-head': 'var(--ios-font-display)',
    'title-size': '2.125rem', 'title-weight': '700', 'title-track': '.011em',
    'bar-line': 'transparent',
    'card-r': '1.625rem', 'list-inset': '1rem', 'list-bg': 'var(--surface)',
    'list-edge': 'transparent', 'list-sep': 'var(--ios-separator)', 'list-shadow': 'none',
    'row-weight': '400',
    'control-r': '.625rem', 'pill-r': '999px',
    'menu-r': '1.375rem', 'sheet-r': '2.375rem',
    'tick-size': '22px', 'tab-active': 'var(--ios-fill-tab)',
    'glass-tint': '0%',
  },
};
