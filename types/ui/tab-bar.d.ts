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
/**
 * The room the floating tab bar takes at the bottom of the screen, from its top to the bottom edge, as
 * --ui-tabbar-room on the page (0 while it is hidden): tabbar.css gives each screen that much room under its last row.
 * startGestures() starts it; an app that builds its own parts calls it once.
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @returns {() => void} stop
 */
export function tabBarRoom(bar: HTMLElement): () => void;
