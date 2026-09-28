// Sorting by header: a click on a sortable header writes the viewer's query, and header cells show the sort the query holds —
// whoever wrote it, the viewer here or the controller by a push.

import type { PluginEngineContext } from "ne-standard-ui";
import { gridOf, RootSelector, setAttribute } from "./data-grid-dom.ts";
import { QueryAttribute, readQuery, writeQuery } from "./data-grid-query.ts";
import { cycleSort, sortStateOf } from "./data-grid-sort.ts";

const SortAttribute = "data-ui-grid-sort";
const SortedAttribute = "data-ui-grid-sorted";
const SortPlaceAttribute = "data-ui-grid-sort-place";
const SortMarkSelector = ".ui-data-grid__sort-mark";
const HeaderCellSelector = ":scope > .ui-table__scroll > .ui-table__header > [data-ui-grid-sort]";
const ResizerSelector = ".ui-table__resizer";

export class DataGridSortEngine {
    public constructor(context: PluginEngineContext) {
        const root = context.root;

        this.syncAll(root.querySelectorAll<HTMLElement>(RootSelector));
        // The grids a navigation brings, and a query the server pushed: the attribute lives on an element inside the root.
        context.observeComponents(root, RootSelector, { childList: true, attributeFilter: [QueryAttribute] }, grids => this.syncAll(grids));

        root.addEventListener("click", domEvent => this.handleHeaderPress(domEvent, domEvent instanceof MouseEvent && domEvent.shiftKey), true);
        root.addEventListener("keydown", domEvent => {
            if (domEvent instanceof KeyboardEvent && (domEvent.key === "Enter" || domEvent.key === " ") && domEvent.target instanceof Element && domEvent.target.hasAttribute(SortAttribute))
                this.handleHeaderPress(domEvent, domEvent.shiftKey);
        }, true);
    }

    private syncAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids)
            this.syncSortMarks(grid);
    }

    /** Every sorting header cell says where it stands: its direction for assistive technology and the stylesheet, its place when the sort has several. */
    private syncSortMarks(grid: HTMLElement): void {
        const sorts = readQuery(grid).sorts ?? [];

        for (const cell of grid.querySelectorAll<HTMLElement>(HeaderCellSelector)) {
            const state = sortStateOf(sorts, cell.getAttribute(SortAttribute) ?? "");
            const mark = cell.querySelector<HTMLElement>(SortMarkSelector);

            setAttribute(cell, "aria-sort", state === null ? "none" : state.direction === "Ascending" ? "ascending" : "descending");
            setAttribute(cell, SortedAttribute, state === null ? null : state.direction === "Ascending" ? "asc" : "desc");

            if (mark !== null)
                setAttribute(mark, SortPlaceAttribute, state !== null && sorts.length > 1 ? String(state.place) : null);
        }
    }

    /** A press on a sorting header cell, but not on the resize handle at its edge, which is the column engine's. */
    private handleHeaderPress(domEvent: Event, additive: boolean): void {
        if (domEvent.defaultPrevented || !(domEvent.target instanceof Element) || domEvent.target.closest(ResizerSelector) !== null)
            return;

        const cell = domEvent.target.closest<HTMLElement>(`[${SortAttribute}]`);
        const grid = gridOf(cell);
        const property = cell?.getAttribute(SortAttribute) ?? null;

        if (cell === null || grid === null || property === null || property.length === 0)
            return;

        domEvent.preventDefault();

        const query = readQuery(grid);

        writeQuery(grid, { ...query, sorts: cycleSort(query.sorts ?? [], property, additive) });
    }
}
