/** a saved value -> a TabState (anything else: the defaults); an option's clean @param {unknown} v @returns {TabState} */
export function cleanTabs(v: unknown): TabState;
/**
 * The bar as the person arranged it (pure).
 * @param {string[]} all  the tabs the app has now, in its default order
 * @param {Partial<TabState> | null | undefined} state
 * @param {TabRules} [rules]
 * @returns {{ order: string[], shown: string[], hidden: string[] }}  order: every tab; shown: on the bar; hidden: off it
 */
export function arrangeTabs(all: string[], state: Partial<TabState> | null | undefined, { max, min, fixed, offByDefault }?: TabRules): {
    order: string[];
    shown: string[];
    hidden: string[];
};
/**
 * Show or hide one tab (pure): the new state, or why not (too few: the bar keeps min; full: it holds max, so the
 * person picks which shown tab it replaces, then replaceTab).
 * @param {string[]} all @param {Partial<TabState> | null | undefined} state @param {string} id @param {boolean} show @param {TabRules} [rules]
 * @returns {{ state: TabState } | { tooFew: true } | { full: string[] }}  full: the tabs it could replace
 */
export function setTabOn(all: string[], state: Partial<TabState> | null | undefined, id: string, show: boolean, rules?: TabRules): {
    state: TabState;
} | {
    tooFew: true;
} | {
    full: string[];
};
/** id goes on the bar in the place of instead, which goes off it (pure). @param {string[]} all
 * @param {Partial<TabState> | null | undefined} state @param {string} id @param {string} instead @param {TabRules} [rules] @returns {TabState} */
export function replaceTab(all: string[], state: Partial<TabState> | null | undefined, id: string, instead: string, rules?: TabRules): TabState;
/** One tab moved in the order (pure). @param {string[]} all @param {Partial<TabState> | null | undefined} state
 * @param {number} from @param {number} to  indexes in arrangeTabs' order @param {TabRules} [rules] @returns {TabState} */
export function moveTab(all: string[], state: Partial<TabState> | null | undefined, from: number, to: number, rules?: TabRules): TabState;
/**
 * Put the bar's tabs in the person's order and mark the ones off it. Each tab is the bar's child with data-tab-id.
 * @param {HTMLElement} bar  nav.ui-tabbar
 * @param {{ order: string[], shown: string[] }} arranged  from arrangeTabs
 */
export function applyTabs(bar: HTMLElement, { order, shown }: {
    order: string[];
    shown: string[];
}): void;
/**
 * The editor: the tabs in the bar's order, each with a grip to drag, a switch for on the bar or off it, and Up and
 * Down. A full bar asks, in place, which tab this one replaces.
 * @param {HTMLElement} host
 * @param {{ tabs: { id: string, label: string }[], get: () => Partial<TabState> | null | undefined,
 *   set: (s: TabState) => unknown, watch?: (fn: () => void) => () => void, rules?: TabRules,
 *   labels?: Record<string, string> }} o  tabs: the app's tabs now, in its default order; get and set: the saved
 *   state; watch: calls fn on a change made elsewhere (another device, Reset); labels: words over LABELS
 * @returns {() => void} stop
 */
export function tabArranger(host: HTMLElement, { tabs, get, set, watch, rules, labels }: {
    tabs: {
        id: string;
        label: string;
    }[];
    get: () => Partial<TabState> | null | undefined;
    set: (s: TabState) => unknown;
    watch?: (fn: () => void) => () => void;
    rules?: TabRules;
    labels?: Record<string, string>;
}): () => void;
/** How many tabs a phone's tab bar holds unless the app says otherwise. */
export const MAX_TABS: 5;
/**
 * order: the tabs as the person put them (a tab it leaves
 *   out keeps its default place); hidden: the tabs off the bar
 */
export type TabState = {
    order: string[];
    hidden: string[];
};
/**
 * max: tabs the bar
 *   holds (default MAX_TABS); min: tabs it keeps (default 2); fixed: always on the bar and last unless moved (such as
 *   Settings, where the tabs off the bar are listed); offByDefault: off the bar until someone puts them there
 */
export type TabRules = {
    max?: number;
    min?: number;
    fixed?: string[];
    offByDefault?: string[];
};
