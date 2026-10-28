/** @typedef {import('./schema.js').Config} Config */
/** @param {Config} cfg @param {Record<string, unknown>} values  the saved account values @param {string | null} profile
 * @param {() => Date} [now] */
export function writeFile(cfg: Config, values: Record<string, unknown>, profile: string | null, now?: () => Date): {
    settings: Record<string, unknown>;
    profile?: string | undefined;
    kind: string;
    version: number;
    exportedAt: string;
};
/** What a file may set: the portable options whose value passes their clean, and a profile the app has. Throws with a
 * plain sentence when the text is not a settings file at all.
 * @param {Config} cfg @param {string} text
 * @returns {{ settings: Record<string, unknown>, profile: string | null, dropped: string[] }} */
export function readFile(cfg: Config, text: string): {
    settings: Record<string, unknown>;
    profile: string | null;
    dropped: string[];
};
export const KIND: "core-settings";
export const VERSION: 1;
export type Config = import("./schema.js").Config;
