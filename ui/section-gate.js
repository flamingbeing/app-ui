// A settings section's `visible`: a function, or the key of an option read from the settings api. gate() reads it now
// and calls `change(visible)` whenever it flips: a key is watched by that key, a function re-runs on any change.
// No `visible` means always visible (nothing is watched).

/**
 * @param {Pick<import('../settings/types').SettingsApi, 'get' | 'watch'>} settings
 * @param {(() => boolean) | string | undefined} visible
 * @param {(visible: boolean) => void} change  called only when the answer changes
 * @returns {{ now: () => boolean, stop: () => void }}
 */
export function gate(settings, visible, change) {
  const read = () => {
    if (visible === undefined) return true;
    try { return !!(typeof visible === 'string' ? settings.get(visible) : visible()); } catch { return false; }
  };
  let last = read();
  const off = visible === undefined ? null : settings.watch(typeof visible === 'string' ? visible : null, () => {
    const v = read();
    if (v !== last) { last = v; change(v); }
  });
  return { now: () => last, stop: () => { off?.(); } };
}
