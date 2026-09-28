// The pager under a paging grid: the line saying which rows the page holds, read off the host's window attributes, and four
// buttons that ask for the window starting elsewhere.

import type { ClientStrings, NumberFormatting, PluginEngineContext } from "ne-standard-ui";
import { gridOf, HostSelector, readNumberAttribute, RootSelector, RowSelector } from "./data-grid-dom.ts";

const PagingAttribute = "data-ui-grid-paging";
const PagerSelector = ":scope > .ui-data-grid__pager";
const StatusSelector = ".ui-data-grid__page-status";
const PageAttribute = "data-ui-grid-page";
const WindowOffsetAttribute = "data-ui-window-offset";
const WindowTotalAttribute = "data-ui-window-total";
const WindowSizeAttribute = "data-ui-window-size";
const WindowMoreAfterAttribute = "data-ui-window-more-after";

const PageOfKey = "ui.grid.page-of";
const PageRangeKey = "ui.grid.page-range";

// What a page holds when the host names no size — one the author never set — and no rows are on the page to read it off.
const DefaultPageSize = 50;

/** What the host says about its window: where it starts, how many rows it holds, how many make a page, how many the source has, and whether more follow. */
export type PageState = {
    readonly offset: number;
    readonly count: number;
    readonly size: number;
    readonly total: number | null;
    readonly moreAfter: boolean;
};

export class DataGridPagerEngine {
    private readonly strings: ClientStrings;
    private readonly numbers: NumberFormatting;

    public constructor(context: PluginEngineContext) {
        const root = context.root;

        this.strings = context.strings;
        this.numbers = context.numbers;
        this.syncAll(root.querySelectorAll<HTMLElement>(RootSelector));

        // The window's attributes live on the host, inside the root; a page turned or a query re-read lands as one of them.
        context.observeComponents(root, RootSelector, {
            childList: true,
            attributeFilter: [PagingAttribute, WindowOffsetAttribute, WindowTotalAttribute, WindowMoreAfterAttribute]
        }, grids => this.syncAll(grids));

        root.addEventListener("click", domEvent => {
            const button = domEvent.target instanceof Element ? domEvent.target.closest<HTMLButtonElement>(`[${PageAttribute}]`) : null;
            const host = gridOf(button)?.querySelector<HTMLElement>(HostSelector) ?? null;

            if (button === null || host === null || button.disabled)
                return;

            const offset = pageOffset(readPageState(host), button.getAttribute(PageAttribute) ?? "");

            if (offset === null)
                return;

            domEvent.preventDefault();
            void context.windows.requestOffsetAsync(host, offset);
        }, true);
    }

    private syncAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids)
            this.syncPager(grid);
    }

    /** The line and the buttons, from the host's window: "1–20 of 100,000", the far ends dimmed where there is nothing beyond. */
    private syncPager(grid: HTMLElement): void {
        const host = grid.querySelector<HTMLElement>(HostSelector);
        const pager = grid.querySelector<HTMLElement>(PagerSelector);

        if (host === null || pager === null || !grid.hasAttribute(PagingAttribute))
            return;

        const state = readPageState(host);
        const status = pager.querySelector<HTMLElement>(StatusSelector);

        if (status !== null) {
            const from = state.count === 0 ? 0 : state.offset + 1;
            const to = state.offset + state.count;
            // In the page's culture, as the footer's count beside it is, not in the browser's.
            const culture = this.numbers.readCulture(grid);
            const figure = (value: number): string => this.numbers.format(value, "N0", culture);
            const text = state.total === null
                ? this.strings.format(PageRangeKey, { from: figure(from), to: figure(to) })
                : this.strings.format(PageOfKey, { from: figure(from), to: figure(to), total: figure(state.total) });

            if (status.textContent !== text)
                status.textContent = text;
        }

        for (const button of pager.querySelectorAll<HTMLButtonElement>(`[${PageAttribute}]`))
            button.disabled = pageOffset(state, button.getAttribute(PageAttribute) ?? "") === null;
    }
}

/** The page as the host describes it; a host naming no size pages by the rows it holds, so a page never steps by a number nobody chose. */
function readPageState(host: Element): PageState {
    const count = host.querySelectorAll(`:scope > ${RowSelector}`).length;
    const size = readNumberAttribute(host, WindowSizeAttribute) ?? 0;

    return {
        offset: readNumberAttribute(host, WindowOffsetAttribute) ?? 0,
        count,
        size: size > 0 ? size : count > 0 ? count : DefaultPageSize,
        total: readNumberAttribute(host, WindowTotalAttribute),
        moreAfter: host.getAttribute(WindowMoreAfterAttribute) === "true"
    };
}

/**
 * Where the window a button asks for starts; null when the button leads nowhere. Forward steps by the rows the current window
 * holds; back and last land on a page boundary, so the pages the viewer steps through are the ones First starts counting from.
 */
export function pageOffset(state: PageState, page: string): number | null {
    switch (page) {
        case "first":
            return state.offset > 0 ? 0 : null;
        case "previous":
            return state.offset > 0 ? Math.max(0, (Math.ceil(state.offset / state.size) - 1) * state.size) : null;
        case "next":
            return state.moreAfter ? state.offset + state.count : null;
        case "last": {
            // With no count there is no last page to name: the next one is as far as the pager can say.
            if (state.total === null)
                return state.moreAfter ? state.offset + state.count : null;

            const lastStart = Math.max(0, Math.floor((state.total - 1) / state.size) * state.size);

            return state.offset < lastStart ? lastStart : null;
        }
        default:
            return null;
    }
}
