/**
 * @param {{ title: string, body: (Node | string)[], done?: string, className?: string }} o
 *   done: the head's close word (left out: no head button); className: added to the sheet
 * @returns {{ sheet: HTMLDialogElement, close: () => void, closed: Promise<void> }}  closed: resolves once it is shut and gone
 */
export function popSheet({ title, body, done, className }: {
    title: string;
    body: (Node | string)[];
    done?: string;
    className?: string;
}): {
    sheet: HTMLDialogElement;
    close: () => void;
    closed: Promise<void>;
};
