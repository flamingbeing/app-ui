/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, string>} [attrs]
 * @param {...(Node | string)} children
 * @returns {HTMLElementTagNameMap[K]}
 */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, string>, ...children: (Node | string)[]): HTMLElementTagNameMap[K];
/** @param {string} label @param {() => unknown} onClick @param {Record<string, string>} [attrs] */
export function button(label: string, onClick: () => unknown, attrs?: Record<string, string>): HTMLButtonElement;
export function plural(n: number, one: string): string;
