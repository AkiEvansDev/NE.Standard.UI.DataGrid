// The pager under a paging grid: the line saying which rows the page holds and the buttons that ask for another window.

import type { ClientStrings, ComponentStates, DomNames, NumberFormatting, PluginEngineContext } from "ne-standard-ui";
import { gridOf, hostSelector, readNumberAttribute, RootSelector, rowSelector } from "./data-grid-dom.ts";
import { GridAttributes, GridClasses, GridWords } from "./data-grid-names.ts";

const PagingAttribute = GridAttributes.paging;
const PagerSelector = `:scope > .${GridClasses.pager}`;
const StatusSelector = `.${GridClasses.pageStatus}`;
const PageAttribute = GridAttributes.page;

// What a page holds when the host names no size — one the author never set — and no rows are on the page to read it off.
const DefaultPageSize = 50;

/** What the host says about its window. */
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
    private readonly states: ComponentStates;
    private readonly names: DomNames;
    private readonly hostSelector: string;

    public constructor(context: PluginEngineContext) {
        const root = context.root;

        this.strings = context.strings;
        this.numbers = context.numbers;
        this.states = context.states;
        this.names = context.names;
        this.hostSelector = hostSelector(context.names);
        this.syncAll(root.querySelectorAll<HTMLElement>(RootSelector));

        // The window's attributes live on the host, inside the root; a page turned or a query re-read lands as one of them.
        context.observeComponents(root, RootSelector, {
            childList: true,
            attributeFilter: [PagingAttribute, context.names.windowOffset, context.names.windowTotal, context.names.windowMoreAfter]
        }, grids => this.syncAll(grids));

        root.addEventListener("click", domEvent => {
            const button = domEvent.target instanceof Element ? domEvent.target.closest<HTMLElement>(`[${PageAttribute}]`) : null;
            const host = gridOf(button)?.querySelector<HTMLElement>(this.hostSelector) ?? null;

            if (button === null || host === null || this.states.isInert(button))
                return;

            const offset = pageOffset(readPageState(host, this.names), button.getAttribute(PageAttribute) ?? "");

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

    /** The line and the buttons, from the host's window: "1–20 of 100,000", the far ends turned off where there is nothing beyond. */
    private syncPager(grid: HTMLElement): void {
        const host = grid.querySelector<HTMLElement>(this.hostSelector);
        const pager = grid.querySelector<HTMLElement>(PagerSelector);

        if (host === null || pager === null || !grid.hasAttribute(PagingAttribute))
            return;

        const state = readPageState(host, this.names);
        const status = pager.querySelector<HTMLElement>(StatusSelector);

        if (status !== null) {
            const from = state.count === 0 ? 0 : state.offset + 1;
            const to = state.offset + state.count;
            // In the page's culture, as the footer's count beside it is, not in the browser's.
            const culture = this.numbers.readCulture(grid);
            const figure = (value: number): string => this.numbers.format(value, "N0", culture);

            // Marked with its key and figures, so a language switch writes the line again in place.
            if (state.total === null)
                this.strings.write(status, null, GridWords.pageRange, { from: figure(from), to: figure(to) });
            else
                this.strings.write(status, null, GridWords.pageOf, { from: figure(from), to: figure(to), total: figure(state.total) });
        }

        for (const button of pager.querySelectorAll(`[${PageAttribute}]`))
            this.states.setDisabled(button, pageOffset(state, button.getAttribute(PageAttribute) ?? "") === null);
    }
}

/** The page as the host describes it; a host naming no size pages by the rows it holds, so a page never steps by a number nobody chose. */
function readPageState(host: Element, names: DomNames): PageState {
    const count = host.querySelectorAll(`:scope > ${rowSelector(names)}`).length;
    const size = readNumberAttribute(host, names.windowSize) ?? 0;

    return {
        offset: readNumberAttribute(host, names.windowOffset) ?? 0,
        count,
        size: size > 0 ? size : count > 0 ? count : DefaultPageSize,
        total: readNumberAttribute(host, names.windowTotal),
        moreAfter: host.getAttribute(names.windowMoreAfter) === "true"
    };
}

/**
 * Where the window a button asks for starts; null when it leads nowhere. Back and last land on a page boundary, so the viewer
 * steps through the pages First counts from.
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
