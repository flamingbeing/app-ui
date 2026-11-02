/**
 * @param {HTMLElement} anchor  the button it opens from (its aria-expanded follows)
 * @param {(MenuItem | null)[]} items
 * @param {{ label?: string, title?: string, sheet?: boolean, note?: string, back?: string,
 *   classes?: { layer?: string, veil?: string, menu?: string, icon?: string } }} [o]  label: the menu's name for screen readers;
 *   title: a heading over the list; back: the words of a nested list's Back row (default "Back")
 * @returns {() => void} close
 */
export function openMenu(anchor: HTMLElement, items: (MenuItem | null)[], { label, title, sheet, note, back, classes }?: {
    label?: string;
    title?: string;
    sheet?: boolean;
    note?: string;
    back?: string;
    classes?: {
        layer?: string;
        veil?: string;
        menu?: string;
        icon?: string;
    };
}): () => void;
/**
 * items: a nested list (run is then not called); checked: a radio
 *  item; null in a list: a divider
 */
export type MenuItem = {
    label: string;
    icon?: import("../icons/lucide.js").IconNodes;
    color?: string;
    danger?: boolean;
    checked?: boolean;
    run?: () => unknown;
    items?: (MenuItem | null)[];
};
