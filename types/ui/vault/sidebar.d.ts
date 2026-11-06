/**
 * @param {{ id: string, label: string, side?: 'left' | 'right', views: SidebarViewDef[] | (() => SidebarViewDef[]), view?: string,
 *   onView?: (id: string) => void, footer?: Node | (() => Node), steps?: import('./side-drawer.js').Steps,
 *   pushed?: () => (HTMLElement | null | undefined)[], onChange?: (open: boolean) => void, warm?: boolean, none?: string }} o
 *   id: the drawer's (the parts' ids start with it: `<id>-pill`, `<id>-views`, `<id>-view-<view id>`); views: the views
 *   on now (read each time, so a view can come and go); view: the one to show first; onView: one was picked (keep it);
 *   footer: what sits under the picker; steps: the page's createTransients(); pushed: what slides aside (the content,
 *   the pill); warm: draw the other views while idle once it opens (default true); none: the pill's words with no views
 * @returns {Sidebar}
 */
export function sidebar(o: {
    id: string;
    label: string;
    side?: "left" | "right";
    views: SidebarViewDef[] | (() => SidebarViewDef[]);
    view?: string;
    onView?: (id: string) => void;
    footer?: Node | (() => Node);
    steps?: import("./side-drawer.js").Steps;
    pushed?: () => (HTMLElement | null | undefined)[];
    onChange?: (open: boolean) => void;
    warm?: boolean;
    none?: string;
}): Sidebar;
export type IconNodes = import("../../icons/lucide.js").IconNodes;
/**
 * el: the view; tools: buttons in the row over the picker while it shows; shown: it has just come into sight
 */
export type SidebarView = {
    el: HTMLElement;
    tools?: HTMLElement[];
    shown?: () => void;
};
export type SidebarViewDef = {
    id: string;
    label: string;
    icon: IconNodes;
    render: () => SidebarView | HTMLElement | Promise<SidebarView | HTMLElement>;
};
export type Sidebar = import("./side-drawer.js").SideDrawer & {
    drawer: import("./side-drawer.js").SideDrawer;
    show: (id: string) => Promise<SidebarView | null>;
    current: () => string;
    foot: HTMLElement;
    refresh: () => void;
    view: (id: string) => SidebarView | undefined;
};
