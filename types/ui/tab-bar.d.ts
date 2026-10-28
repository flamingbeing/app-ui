/** -> the next accumulated scroll and whether the bar is small, from the last state and a scroll step (pure) */
export function tabBarStep(s: {
    acc: number;
    small: boolean;
}, y: number, d: number): {
    acc: number;
    small: boolean;
};
/**
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @param {{ scroller?: HTMLElement | Window }} [opts]  what scrolls (default the page)
 * @returns {() => void} stop
 */
export function shrinkingTabBar(bar: HTMLElement, { scroller }?: {
    scroller?: HTMLElement | Window;
}): () => void;
