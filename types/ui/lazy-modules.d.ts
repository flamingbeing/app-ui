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
export function lazyModules<L extends Record<string, () => Promise<any>>>(loaders: L): {
    need: <N extends keyof L>(name: N) => Promise<Awaited<ReturnType<L[N]>>>;
    withMod: <N extends keyof L, T>(name: N, fn: (m: Awaited<ReturnType<L[N]>>) => T) => Promise<T | Awaited<T>>;
    loaded: <N extends keyof L>(name: N) => Awaited<ReturnType<L[N]>> | undefined;
    warmUp: (names?: (keyof L)[], o?: {
        delay?: number;
    }) => void;
};
