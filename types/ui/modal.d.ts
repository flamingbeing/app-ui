/** The index Tab (or Shift+Tab) lands on, wrapping at both ends. @param {number} count @param {number} at @param {boolean} back */
export function wrapIndex(count: number, at: number, back: boolean): number;
/** @param {string} message @param {{ title?: string, labels?: Record<string, string> }} [o] -> resolves when closed */
export function alertModal(message: string, { title, labels }?: {
    title?: string;
    labels?: Record<string, string>;
}): Promise<void>;
/**
 * @param {string} message
 * @param {{ title?: string, danger?: boolean, yes?: string, labels?: Record<string, string> }} [o]
 *   danger: the yes button is drawn as a danger and Cancel has the focus; yes: its words (default OK)
 * @returns {Promise<boolean>}
 */
export function confirmModal(message: string, { title, danger, yes, labels }?: {
    title?: string;
    danger?: boolean;
    yes?: string;
    labels?: Record<string, string>;
}): Promise<boolean>;
