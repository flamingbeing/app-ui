/**
 * @param {{ url?: string, title?: string, labels?: Record<string, string> }} [o]
 *   url: the link (default the page's own address); title: the screen's name (the sheet's title, and the code's
 *   name for screen readers); labels: words over LABELS
 * @returns {Promise<void>}  resolves once the sheet is closed
 */
export function qrSheet({ url, title, labels }?: {
    url?: string;
    title?: string;
    labels?: Record<string, string>;
}): Promise<void>;
/** The light edge round the code, in modules (the standard asks for 4). */
export const QR_QUIET: 4;
