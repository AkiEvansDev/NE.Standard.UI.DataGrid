// Sorting by header: a click writes the viewer's query, and the header cells show the sort the query holds, whoever wrote it.

import type { ComponentStates, DomNames, PluginEngineContext } from "ne-standard-ui";
import { gridOf, RootSelector, setAttribute } from "./data-grid-dom.ts";
import { ClientNames, GridAttributes, GridClasses } from "./data-grid-names.ts";
import { readQuery, writeQuery } from "./data-grid-query.ts";
import { cycleSort, sortStateOf } from "./data-grid-sort.ts";

const SortAttribute = GridAttributes.sort;
const SortMarkSelector = `.${GridClasses.sortMark}`;

export class DataGridSortEngine {
    private readonly names: DomNames;
    private readonly states: ComponentStates;
    private readonly headerCellSelector: string;
    private readonly observer: MutationObserver | null;
    private readonly cleanups: (() => void)[] = [];

    public constructor(context: PluginEngineContext) {
        const root = context.root;

        this.names = context.names;
        this.states = context.states;
        this.headerCellSelector = `:scope > .${context.names.tableScrollClass} > .${context.names.tableHeaderClass} > [${SortAttribute}]`;

        this.syncAll(root.querySelectorAll<HTMLElement>(RootSelector));
        // The grids a navigation brings, and a query the server pushed: the attribute lives on an element inside the root.
        this.observer = context.observeComponents(root, RootSelector, { childList: true, attributeFilter: [context.names.itemsQuery] }, grids => this.syncAll(grids));

        const onClick = (domEvent: Event): void => this.handleHeaderPress(domEvent, domEvent instanceof MouseEvent && domEvent.shiftKey);
        // Shift adds the column to the sort; another chord on a caption is not its press.
        const onKeyDown = (domEvent: Event): void => {
            if (domEvent instanceof KeyboardEvent && (domEvent.key === "Enter" || domEvent.key === " ") && context.shortcuts.isPlainKey(domEvent, { shift: true }) && domEvent.target instanceof Element && domEvent.target.hasAttribute(SortAttribute))
                this.handleHeaderPress(domEvent, domEvent.shiftKey);
        };

        root.addEventListener("click", onClick, true);
        root.addEventListener("keydown", onKeyDown, true);
        this.cleanups.push(
            () => root.removeEventListener("click", onClick, true),
            () => root.removeEventListener("keydown", onKeyDown, true)
        );
    }

    public dispose(): void {
        this.observer?.disconnect();

        for (const cleanup of this.cleanups)
            cleanup();

        this.cleanups.length = 0;
    }

    private syncAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids)
            this.syncSortMarks(grid);
    }

    /** Every sorting header cell shows its direction and, when the sort has several, its place. */
    private syncSortMarks(grid: HTMLElement): void {
        const sorts = readQuery(grid, this.names).sorts ?? [];

        for (const cell of grid.querySelectorAll<HTMLElement>(this.headerCellSelector)) {
            const state = sortStateOf(sorts, cell.getAttribute(SortAttribute) ?? "");
            const mark = cell.querySelector<HTMLElement>(SortMarkSelector);

            setAttribute(cell, "aria-sort", state === null ? "none" : state.direction === "Ascending" ? "ascending" : "descending");
            setAttribute(cell, ClientNames.sorted, state === null ? null : state.direction === "Ascending" ? "asc" : "desc");

            if (mark !== null)
                setAttribute(mark, ClientNames.sortPlace, state !== null && sorts.length > 1 ? String(state.place) : null);
        }
    }

    /** A press on a sorting header cell, but not on the resize handle at its edge, which is the column engine's. */
    private handleHeaderPress(domEvent: Event, additive: boolean): void {
        if (domEvent.defaultPrevented || !(domEvent.target instanceof Element) || domEvent.target.closest(`.${this.names.tableResizerClass}`) !== null)
            return;

        const cell = domEvent.target.closest<HTMLElement>(`[${SortAttribute}]`);
        const grid = gridOf(cell);
        const property = cell?.getAttribute(SortAttribute) ?? null;

        if (cell === null || grid === null || property === null || property.length === 0 || this.states.isInert(grid))
            return;

        domEvent.preventDefault();

        const query = readQuery(grid, this.names);

        writeQuery(grid, this.names, { ...query, sorts: cycleSort(query.sorts ?? [], property, additive) });
    }
}
