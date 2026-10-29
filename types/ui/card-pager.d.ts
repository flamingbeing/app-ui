/**
 * @typedef {{ index: () => number, go: (step: 1 | -1) => boolean, refresh: () => void, stop: () => void }} CardPager
 *   index: the card shown; go: animate one card on or back (false when there is none); refresh: render the three
 *   cards again (the queue changed); stop: remove the listeners
 */
/**
 * @param {HTMLElement} stage  the box the cards fill (`.ui-cards`)
 * @param {{ card: (i: number) => HTMLElement | null, start?: number, onShow?: (i: number) => void, mouse?: boolean, fill?: boolean }} o
 *   card(i): the card at i, or null when there is none (the deck's ends; i may go below 0 for a deck with history);
 *   onShow(i): a card is shown (the first one too, and again after refresh()), once its glide has landed;
 *   fill: the stage reaches from where it starts on the page to the viewport's bottom, less a showing tab bar's room
 *   and --pad (its bottom margin or gap), never under 16rem (`.ui-cards-fill`, motion.css)
 * @returns {CardPager}
 */
export function cardPager(stage: HTMLElement, { card, start, onShow, mouse, fill: fills }: {
    card: (i: number) => HTMLElement | null;
    start?: number;
    onShow?: (i: number) => void;
    mouse?: boolean;
    fill?: boolean;
}): CardPager;
/**
 * index: the card shown; go: animate one card on or back (false when there is none); refresh: render the three
 * cards again (the queue changed); stop: remove the listeners
 */
export type CardPager = {
    index: () => number;
    go: (step: 1 | -1) => boolean;
    refresh: () => void;
    stop: () => void;
};
