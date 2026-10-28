/** @typedef {{ solid: boolean, why: '' | 'memory' | 'frames' }} Verdict */
/** @param {number[]} xs @returns {number} */
export function median(xs: number[]): number;
/**
 * @param {{ memory?: number | undefined, frames?: number[] }} seen  deviceMemory (GB), frame gaps (ms) from the probe
 * @returns {Verdict | null}  null: nothing to go on yet (no memory figure under the floor, no frames)
 */
export function verdict({ memory, frames }: {
    memory?: number | undefined;
    frames?: number[];
}): Verdict | null;
/** @returns {Verdict | null}  what this device found before */
export function kept(): Verdict | null;
/** @param {Verdict | null} v  null forgets (the gallery's re-check) */
export function keep(v: Verdict | null): void;
/**
 * Runs the guard once per device: the memory check at once; else the frame probe on the first scroll, timing
 * PROBE_FRAMES animation frames while the page is visible. Nothing to do when a verdict is kept.
 * @param {(v: Verdict) => void} found  called when a new verdict is kept (choice.js shows the glass again)
 * @returns {() => void} stop
 */
export function startGuard(found: (v: Verdict) => void): () => void;
export const MEMORY_FLOOR: 4;
export const SLOW_FRAME_MS: 20;
export const PROBE_FRAMES: 30;
export function guardSolid(): boolean;
export type Verdict = {
    solid: boolean;
    why: "" | "memory" | "frames";
};
