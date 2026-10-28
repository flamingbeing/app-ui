/**
 * @param {HTMLElement} host  the block is added here, hidden until shown
 * @param {{ title: string, hint?: string, action?: { label: string, onClick: () => unknown } }} o
 * @returns {{ show: (on: boolean) => void, stop: () => void }}
 */
export function emptyState(host: HTMLElement, { title, hint, action }: {
    title: string;
    hint?: string;
    action?: {
        label: string;
        onClick: () => unknown;
    };
}): {
    show: (on: boolean) => void;
    stop: () => void;
};
