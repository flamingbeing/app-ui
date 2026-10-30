// Lazy modules: a page's screens and heavy extras (Excel, an editor, PDF) load the first time they are needed, not
// with the app, so the first screen draws sooner; once it is up, warmUp() loads the rest one at a time in idle
// moments, so changing tab stays instant. The service worker keeps them all, so this works offline too. Lifted from
// the logbook (its MODS, need, withMod and warmUp). A failed import is forgotten so the next need() asks again, though
// a browser keeps a failed module import for the life of the page: only a reload really retries it.

/**
 * @template {Record<string, () => Promise<any>>} L
 * @param {L} loaders  name → () => import('./screen.js'), a literal import() each, so a build can split it off
 * @returns {{
 *   need: <N extends keyof L>(name: N) => Promise<Awaited<ReturnType<L[N]>>>,
 *   withMod: <N extends keyof L, T>(name: N, fn: (m: Awaited<ReturnType<L[N]>>) => T) => Promise<T | Awaited<T>>,
 *   loaded: <N extends keyof L>(name: N) => Awaited<ReturnType<L[N]>> | undefined,
 *   warmUp: (names?: (keyof L)[], o?: { delay?: number }) => void,
 * }}
 *   need: the module, loading it once; withMod: calls fn at once when the module is loaded (so the order of things stays
 *   as it was), else once it loads; loaded: the module if loaded, else undefined; warmUp: after delay ms (default 1500),
 *   loads names (default all) one per idle moment; a failure stops it (the network is likely down), and the page that
 *   failed says so when opened. Only the first warmUp() call runs.
 */
export function lazyModules(loaders) {
  /** @type {Record<string, any>} */
  const mod = {};
  /** @type {Record<string, Promise<any>>} */
  const loading = {};
  /** @param {keyof L} name */
  const need = name => {
    const n = /** @type {string} */ (name);
    if (mod[n]) return Promise.resolve(mod[n]);
    return (loading[n] ||= loaders[n]().then(m => (mod[n] = m), err => { delete loading[n]; throw err; }));
  };
  let warmed = false;
  return {
    need,
    withMod: (name, fn) => (mod[/** @type {string} */ (name)] ? Promise.resolve(fn(mod[/** @type {string} */ (name)])) : need(name).then(fn)),
    loaded: name => mod[/** @type {string} */ (name)],
    warmUp(names = Object.keys(loaders), { delay = 1500 } = {}) {
      if (warmed) return;
      warmed = true;
      const left = [...names];
      /** @param {() => void} fn */
      const idle = fn => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 200));
      const next = () => { const n = left.shift(); if (n !== undefined) need(n).then(() => idle(next), err => console.warn(err)); };
      setTimeout(() => idle(next), delay);
    },
  };
}
