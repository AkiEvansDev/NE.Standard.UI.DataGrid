// The viewer's query, as JSON on the hidden element every items component renders; written with a `change` the framework answers.

import type { DomNames } from "ne-standard-ui";
import { GridEvents } from "./data-grid-names.ts";
import type { SortTerm } from "./data-grid-sort.ts";

/** One filter term, the shape `UIItemFilterTerm` travels in. */
export type FilterTerm = {
    readonly itemProperty: string;
    readonly operator: string;
    readonly value?: unknown;
};

export type ItemsQuery = {
    readonly filters?: readonly FilterTerm[] | null;
    readonly sorts?: readonly SortTerm[] | null;
};

/** The query's text on the grid, as its attribute `names.itemsQuery` holds it, or null for none. */
export function readQueryText(grid: Element, names: DomNames): string | null {
    return findQueryElement(grid, names)?.getAttribute(names.itemsQuery) ?? null;
}

function findQueryElement(grid: Element, names: DomNames): Element | null {
    return grid.querySelector(`:scope > [${names.valueKind}="${names.itemsQueryKind}"]`);
}

/** The query on the grid, or an empty one; a query that does not parse reads as empty, and the next write replaces it. */
export function readQuery(grid: Element, names: DomNames): ItemsQuery {
    const text = readQueryText(grid, names);

    if (text === null || text.length === 0)
        return {};

    try {
        return JSON.parse(text) as ItemsQuery;
    }
    catch {
        return {};
    }
}

/** Writes the query and raises `change` and `query-change`; an empty one takes the attribute off, an unchanged one writes nothing. */
export function writeQuery(grid: Element, names: DomNames, query: ItemsQuery): void {
    const element = findQueryElement(grid, names);

    if (element === null)
        return;

    const filters = query.filters ?? [];
    const sorts = query.sorts ?? [];
    const text = filters.length === 0 && sorts.length === 0 ? null : JSON.stringify({ filters, sorts });

    if (text === element.getAttribute(names.itemsQuery))
        return;

    if (text === null)
        element.removeAttribute(names.itemsQuery);
    else
        element.setAttribute(names.itemsQuery, text);

    element.dispatchEvent(new Event("change", { bubbles: true }));
    // The grid's own word for a query the viewer wrote, for a command to hang on.
    element.dispatchEvent(new Event(GridEvents.queryChange, { bubbles: true }));
}
