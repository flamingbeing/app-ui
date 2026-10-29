/** @param {unknown} v @returns {IconSet | null}  a set other than the default, or null */
export function cleanIconSet(v: unknown): IconSet | null;
/**
 * The path to draw for an icon: the set's own (paths the app gave it), else the default.
 * @param {string} name @param {string} fallback
 * @param {unknown} [set]  the set (default: <html data-icons>)
 * @param {Record<string, Record<string, string>>} [paths]  set -> icon name -> SVG path
 */
export function iconSetPath(name: string, fallback: string, set?: unknown, paths?: Record<string, Record<string, string>>): string;
/**
 * A saved icon-per-tab choice: tab ids (lowercase letters) to names in the app's list only, at most max; {} when none.
 * @param {unknown} v @param {Record<string, unknown> | string[]} names  the icons a tab may take @param {number} [max]
 * @returns {Record<string, string>}
 */
export function cleanIconPicks(v: unknown, names: Record<string, unknown> | string[], max?: number): Record<string, string>;
export const ICON_SETS: Readonly<{
    line: {
        label: string;
    };
    sharp: {
        label: string;
    };
    soft: {
        label: string;
    };
    thin: {
        label: string;
    };
    even: {
        label: string;
    };
}>;
export function iconSetChoices(): [string, string][];
export type IconSet = keyof typeof ICON_SETS;
