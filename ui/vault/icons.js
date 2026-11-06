// The vault shell's icons: the kit's Lucide icons, drawn a touch finer (1.75) as the vault look has them.
import { icon } from '../../icons/lucide.js';

/**
 * @param {import('../../icons/lucide.js').IconNodes} nodes @param {string} [cls]  added after ui-vault-icon
 * @returns {SVGSVGElement}
 */
export function vaultIcon(nodes, cls = '') {
  const svg = icon(nodes, { class: `ui-vault-icon${cls ? ` ${cls}` : ''}` });
  svg.setAttribute('stroke-width', '1.75');
  return svg;
}
