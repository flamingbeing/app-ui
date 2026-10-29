/**
 * Less motion: the device's Reduce Motion, or Still in the theme switch (data-motion="still" on <html>). Read each
 * time, as either can change while the page is open.
 * @returns {boolean}
 */
export function still(): boolean;
/**
 * Places a gesture never starts from: fields, dialogs (outside the sheet part's own handling), drag handles, things
 * that scroll sideways, and anything marked data-no-gesture.
 * @param {EventTarget | null} target
 * @param {{ inDialog?: boolean }} [opts]  inDialog: the caller is a dialog's own part, so dialogs don't count
 */
export function noGesture(target: EventTarget | null, { inDialog }?: {
    inDialog?: boolean;
}): boolean;
/**
 * A haptic of one kind, unless Haptics is Off on this device (the theme switch: data-haptics="off" on <html>):
 * navigator.vibrate where there is one (Android); on iPhone (iOS 18 and later) toggling a hidden <input switch>
 * through its label gives the system's own tap, the only one a web page can reach there (one tap for every kind).
 * @param {keyof typeof HAPTIC_PATTERNS} [kind]
 */
export function haptic(kind?: keyof typeof HAPTIC_PATTERNS): void;
/**
 * A tick when a switch flips or a segmented control picks (a change from the person, under root).
 * @param {ParentNode & EventTarget} [root] @returns {() => void} stop
 */
export function toggleTicks(root?: ParentNode & EventTarget): () => void;
/**
 * Claims this touch for a part. @param {keyof typeof PRIORITY} name
 * @returns {boolean}  true: the part has it (it had it already, or nobody or a lower part did); false: stand down
 */
export function claim(name: keyof typeof PRIORITY): boolean;
/** Gives the touch back early (a part that stood down by itself). @param {keyof typeof PRIORITY} name */
export function release(name: keyof typeof PRIORITY): void;
/**
 * Runs won(name) each time a part captures a touch (another part's win is a stand-down).
 * @param {(name: string) => void} won @returns {() => void} stop
 */
export function onCaptured(won: (name: string) => void): () => void;
/**
 * Adds listeners and gives back one function that removes them all.
 * @returns {{ on: (t: EventTarget, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions | boolean) => void, stop: () => void }}
 */
export function listeners(): {
    on: (t: EventTarget, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions | boolean) => void;
    stop: () => void;
};
/** A first move's direction (pure): 'x' sideways, 'y' a scroll, null not far enough to tell. Sideways is under
 * about 40° from the horizontal; 8 px tells (a phone sends its first move about there). @param {number} mx @param {number} my */
export function swipeIntent(mx: number, my: number): "x" | "y" | null;
/** A critically damped spring's path (pure), one position per 60 Hz frame from `from` to `to`, starting at v px/ms
 * (the finger's speed, so the page doesn't jerk when let go). The speed is capped so it lands without passing `to`
 * (no page waits beyond it). The last position is exactly `to`.
 * @param {number} from @param {number} to @param {number} v @param {number} [response] */
export function springPath(from: number, to: number, v: number, response?: number): number[];
/** Where a glide run with springPath's frames (linear, one frame each) is now: the frame its time has reached, so a
 * finger can catch it there. @param {Animation} a @param {number[]} path */
export function pathAt(a: Animation, path: number[]): number;
/**
 * The speed a finger lets go at (pure), px per ms: over about its last 100 ms, up to `now` (a phone sends no moves
 * while a finger is still, so one that stopped before it lifted throws nothing, and one that slowed throws less).
 * @param {[number, number][]} samples  [time, position] @param {number} now  the let-go's time
 */
export function releaseVelocity(samples: [number, number][], now: number): number;
/**
 * Velocity (px per ms) over the last few samples [time, position].
 * @param {[number, number][]} samples
 */
export function velocity(samples: [number, number][]): number;
/** a hold: this long (ms) without moving more than SLOP (px) */
export const HOLD_MS: 500;
export const SLOP: 10;
export const HAPTIC_PATTERNS: Readonly<{
    tick: 8;
    threshold: 12;
    long: 20;
    confirm: number[];
    reject: number[];
}>;
export const PRIORITY: Readonly<{
    sheet: 60;
    drawer: 50;
    back: 45;
    tabs: 40;
    rows: 35;
    cards: 30;
    drag: 25;
    select: 20;
    hold: 15;
    bounce: 10;
}>;
export function captured(): string | null;
/** How far ahead a let-go swipe's speed is projected, in ms (iOS's paging: the throw counts, not just the drag). */
export const THROW_MS: 200;
export function rubber(d: number, w: number): number;
export function unrubber(r: number, w: number): number;
/** How quickly a let-go glide settles: the spring's response in s (iOS's paging feel). */
export const SPRING_S: 0.3;
