/** @param {ThemeLinkOptions} o */
export function themeLinks(o: ThemeLinkOptions): {
    themeLink: (base: string, t: {
        name?: unknown;
        look?: LinkLook;
        mode?: unknown;
    }) => string;
    themeFromLink: (hash: unknown) => {
        name: string;
        look: LinkLook;
        mode?: string;
    } | null;
    isThemeLink: (hash: unknown) => boolean;
};
export type LinkLook = import("./saved-themes.js").Look;
export type LinkField = {
    kind: "enum";
    values: readonly unknown[];
} | {
    kind: "int" | "tune";
    min: number;
    step: number;
} | {
    kind: "bool" | "off" | "colour" | "icons";
};
export type ThemeLinkOptions = {
    /**
     * every setting a link may carry, in a fixed order that only grows at the end;
     * a colour is 'light.<token>' / 'dark.<token>' (look.colours.light.<token>)
     */
    keys: readonly string[];
    /**
     * what a (non-colour) setting may hold
     */
    field: (key: string) => LinkField | undefined;
    /**
     * the app's look cleaner (only known settings and values)
     */
    lookOf: (look: LinkLook) => LinkLook;
    /**
     * drops what the app won't take from a link (colours that clash, fonts that
     * aren't bundled); after lookOf
     */
    safe?: ((look: LinkLook) => LinkLook) | undefined;
    /**
     * the app's bundled themes (a link to one is its id)
     */
    presets?: {
        id: string;
        name: string;
        look: LinkLook;
    }[] | undefined;
    /**
     * (format 3) how many of `keys` every format 3 reader knows: their values skip the kind
     */
    known?: number | undefined;
    /**
     * (format 3) the tab ids a per-tab icon is written with (only grows at the end)
     */
    tabs?: readonly string[] | undefined;
    /**
     * (format 3) the icon names, likewise
     */
    icons?: readonly string[] | undefined;
    /**
     * the address's key ('t')
     */
    hashKey?: string | undefined;
    /**
     * what the person is told
     */
    messages?: Partial<Record<"missing" | "older" | "newer" | "broken", string>> | undefined;
};
