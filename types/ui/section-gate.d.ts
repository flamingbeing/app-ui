/**
 * @param {Pick<import('../settings/types').SettingsApi, 'get' | 'watch'>} settings
 * @param {(() => boolean) | string | undefined} visible
 * @param {(visible: boolean) => void} change  called only when the answer changes
 * @returns {{ now: () => boolean, stop: () => void }}
 */
export function gate(settings: Pick<import("../settings/types").SettingsApi, "get" | "watch">, visible: (() => boolean) | string | undefined, change: (visible: boolean) => void): {
    now: () => boolean;
    stop: () => void;
};
