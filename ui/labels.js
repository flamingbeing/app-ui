// The default word for each sync state (the sync chip's) and for the modals and toasts. An app overrides any of them with the part's `labels`.
/** @type {Readonly<Record<string, string>>} */
export const LABELS = Object.freeze({
  synced: 'Saved',
  pending: 'Sending…',
  offline: 'Offline, kept on this device',
  attention: 'Needs you',
  unknown: 'Connecting…',
  'at-risk': 'Not saved on this device yet',
  syncNow: 'Sync now',   // the sync button's tap, after the state's word
  // the modals' and toasts' words (modal.js, toast.js), overridable the same way
  ok: 'OK',
  cancel: 'Cancel',
  dismiss: 'Dismiss',
  // Back on the first tab, kept in the app (tab-pages.js)
  backAgain: 'Press Back again to close',
  // the reference parts' words (undo-toast.js, load-state.js, about-sheet.js)
  undo: 'Undo',
  loading: 'Loading…',
  retry: 'Try again',
  close: 'Close',
  getNewest: 'Get the newest version',
  checking: 'Checking…',
  updated: 'Updated.',
  checkFailed: 'Could not check. Try again when online.',
  newest: 'This is the newest version (or the update waits until nothing is open).',
  notInstalled: 'not installed yet',
  licences: 'Open-source code in this app',
  // share out (share.js)
  copied: 'Copied',
  copiedPaste: 'Copied: paste it where you want it',
  copyFailed: 'Could not copy on this device',
  // arrange tabs (tab-arrange.js): {n} a number, {tab} a tab's name
  tabsOnBar: 'Tabs on the bar',
  onBar: 'On the tab bar',
  alwaysOnBar: 'Always on the bar',
  dragTab: 'Drag',
  moveUp: 'Move up',
  moveDown: 'Move down',
  keepTabs: 'Keep at least {n} tabs on the bar',
  barFull: 'The tab bar holds {n} tabs.',
  putInPlace: 'Put {tab} in place of:',
  tabsHint: 'Up to {n} tabs fit on the bar. Drag a tab, or use its arrows, to move it.',
});
