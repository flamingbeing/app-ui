/**
 * An icon as an <svg class="ui-icon"> (hidden from screen readers: the button or chip around it carries the name).
 * Sized by `.ui-icon` in ui.css (1.25em); stroke and fill come from the text colour.
 * @param {IconNodes} nodes  one of the exports above
 * @param {{ class?: string }} [o]  class: added after ui-icon
 * @returns {SVGSVGElement}
 */
export function icon(nodes: IconNodes, o?: {
    class?: string;
}): SVGSVGElement;
/** @typedef {readonly (readonly [string, Readonly<Record<string, string | number>>])[]} IconNodes */
/** @type {IconNodes} */ export const check: IconNodes;
/** @type {IconNodes} */ export const x: IconNodes;
/** @type {IconNodes} */ export const chevronLeft: IconNodes;
/** @type {IconNodes} */ export const chevronUp: IconNodes;
/** @type {IconNodes} */ export const chevronDown: IconNodes;
/** @type {IconNodes} */ export const chevronRight: IconNodes;
/** @type {IconNodes} */ export const menu: IconNodes;
/** @type {IconNodes} */ export const info: IconNodes;
/** @type {IconNodes} */ export const refreshCw: IconNodes;
/** @type {IconNodes} */ export const cloudOff: IconNodes;
/** @type {IconNodes} */ export const cloud: IconNodes;
/** @type {IconNodes} */ export const cloudCheck: IconNodes;
/** @type {IconNodes} */ export const cloudUpload: IconNodes;
/** @type {IconNodes} */ export const cloudAlert: IconNodes;
/** @type {IconNodes} */ export const triangleAlert: IconNodes;
/** @type {IconNodes} */ export const loaderCircle: IconNodes;
/** @type {IconNodes} */ export const trash2: IconNodes;
/** @type {IconNodes} */ export const gripVertical: IconNodes;
/** @type {IconNodes} */ export const slidersHorizontal: IconNodes;
/** @type {IconNodes} */ export const copy: IconNodes;
/** @type {IconNodes} */ export const qrCode: IconNodes;
/** @type {IconNodes} */ export const share2: IconNodes;
/** @type {IconNodes} */ export const bell: IconNodes;
/** @type {IconNodes} */ export const mapPin: IconNodes;
/** @type {IconNodes} */ export const camera: IconNodes;
/** @type {IconNodes} */ export const mic: IconNodes;
/** @type {IconNodes} */ export const search: IconNodes;
/** @type {IconNodes} */ export const plus: IconNodes;
/** @type {IconNodes} */ export const circle: IconNodes;
/** @type {IconNodes} */ export const circleDot: IconNodes;
export type IconNodes = readonly (readonly [string, Readonly<Record<string, string | number>>])[];
