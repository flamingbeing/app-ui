// The vault shell's one shade: the dim layer behind every sheet (menu sheets, settings), made the first time one opens.
// It sits below the top layer, so a sheet's own transparent backdrop takes the taps. Nothing runs on import.

/** @type {HTMLElement | null} */
let shade = null;
/** the shade, made and put on the page once @returns {HTMLElement} */
export function shadeEl() {
  if (!shade || !shade.isConnected) {
    shade = Object.assign(document.createElement('div'), { className: 'ui-vault-shade' });
    shade.setAttribute('aria-hidden', 'true');
    document.body.append(shade);
  }
  return shade;
}
