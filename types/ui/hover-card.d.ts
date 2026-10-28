/**
 * Where the card goes: below the link, or above it when there is no room below; kept inside the window.
 * @param {{ left: number, top: number, bottom: number }} at  the link's box (viewport px)
 * @param {{ width: number, height: number }} card
 * @param {{ width: number, height: number }} view
 * @returns {{ left: number, top: number }}
 */
export function placeCard(at: {
    left: number;
    top: number;
    bottom: number;
}, card: {
    width: number;
    height: number;
}, view: {
    width: number;
    height: number;
}): {
    left: number;
    top: number;
};
/**
 * @param {HTMLElement} root  links inside it get cards
 * @param {string} selector  which elements are links, e.g. 'a.wikilink[data-note]'
 * @param {(link: HTMLElement) => Node | null} fill  the card's content for that link (null: no card)
 * @param {{ wait?: number }} [o]  wait: ms the mouse rests before the card shows (default 400)
 * @returns {{ hide: () => void, stop: () => void }}
 */
export function hoverCard(root: HTMLElement, selector: string, fill: (link: HTMLElement) => Node | null, { wait }?: {
    wait?: number;
}): {
    hide: () => void;
    stop: () => void;
};
