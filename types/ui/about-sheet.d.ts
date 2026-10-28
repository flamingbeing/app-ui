/**
 * The outside packages an import map lists: its own files (relative targets) left out, a version read from the address.
 * @param {{ imports?: Record<string, string> } | null | undefined} map
 * @param {Record<string, string>} [licences]  licence name by package name, for the ones the app knows
 * @returns {{ name: string, version: string, licence: string }[]}
 */
export function packagesFromImportMap(map: {
    imports?: Record<string, string>;
} | null | undefined, licences?: Record<string, string>): {
    name: string;
    version: string;
    licence: string;
}[];
/**
 * @param {{ name: string, update: import('./types').UpdateApi | null, licences?: Record<string, string>,
 *   importMap?: { imports?: Record<string, string> } | null, labels?: Record<string, string> }} o
 *   name: the app's name; licences: licence by package name; importMap: defaults to the page's own
 * @returns {Promise<void>}  resolves when closed
 */
export function aboutSheet({ name, update, licences, importMap, labels }: {
    name: string;
    update: import("./types").UpdateApi | null;
    licences?: Record<string, string>;
    importMap?: {
        imports?: Record<string, string>;
    } | null;
    labels?: Record<string, string>;
}): Promise<void>;
