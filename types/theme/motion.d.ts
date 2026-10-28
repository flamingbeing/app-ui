/**
 * Runs `change` (a DOM update) inside a view transition when it can, else straight away.
 * @param {() => void} change
 */
export function viewSwitch(change: () => void): void;
