/**
 * @typedef {object} Spec
 * @property {string} key
 * @property {'device' | 'account'} scope
 * @property {unknown} default
 * @property {(v: unknown) => unknown} clean
 * @property {boolean} portable
 */
/** Check the app's options and profiles once, at module creation, so a typo fails at start and not on a phone.
 * @param {{ options?: Record<string, any>, profiles?: Record<string, any> }} o */
export function compile({ options, profiles }?: {
    options?: Record<string, any>;
    profiles?: Record<string, any>;
}): {
    specs: Map<string, Spec>;
    profiles: Map<string, {
        id: string;
        label: string;
        defaults: Record<string, unknown>;
    }>;
    governed: Set<string>;
};
/** @typedef {ReturnType<typeof compile>} Config */
/** A saved value cleaned again on the way out (a copy from another device may be junk); null and junk count as unset.
 * @param {Spec} spec @param {unknown} v */
export function savedValue(spec: Spec, v: unknown): unknown;
/** The value in force.
 * @param {Config} cfg @param {string} key @param {unknown} saved  the saved value (undefined: none)
 * @param {string | null} profile  the active profile's id */
export function valueOf(cfg: Config, key: string, saved: unknown, profile: string | null): unknown;
/** True when a saved value differs from what the active profile gives, so the person has made it "Custom".
 * @param {Config} cfg @param {string | null} profile @param {(key: string) => unknown} savedOf */
export function isCustom(cfg: Config, profile: string | null, savedOf: (key: string) => unknown): boolean;
export const KEY: RegExp;
export const PROFILE_ID: RegExp;
export const RESERVED: Set<string>;
export function same(a: unknown, b: unknown): boolean;
export type Spec = {
    key: string;
    scope: "device" | "account";
    default: unknown;
    clean: (v: unknown) => unknown;
    portable: boolean;
};
export type Config = ReturnType<typeof compile>;
