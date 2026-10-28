/** @param {SettingsOptions} options @returns {{ name: 'settings', needs: string[], start: (ctx: any, deps: any) => Promise<SettingsApi>, stop: () => void }} */
export function settings(options: SettingsOptions): {
    name: "settings";
    needs: string[];
    start: (ctx: any, deps: any) => Promise<SettingsApi>;
    stop: () => void;
};
export type SettingsOptions = import("./types").SettingsOptions;
export type SettingsApi = import("./types").SettingsApi;
