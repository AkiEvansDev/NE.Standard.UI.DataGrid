// The viewer's query as the grid's root carries it: a hidden element every items component renders, its terms as JSON in one
// attribute. An engine writes the attribute and raises `change`; the framework re-sorts a client-held host or sends a bound
// query to the server.

import type { SortTerm } from "./data-grid-sort.ts";

const QueryAttribute = "data-ui-items-query";
const QueryElementSelector = ":scope > [data-ui-value-kind=\"items-query\"]";

/** Raised on the query element after its `change`: the grid's own word for a query the viewer wrote, for a command to hang on. */
export const QueryChangeEventName = "query-change";

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

function findQueryElement(grid: Element): Element | null {
    return grid.querySelector(QueryElementSelector);
}

/** The query on the grid, or an empty one; a query that does not parse reads as empty, and the next write replaces it. */
export function readQuery(grid: Element): ItemsQuery {
    const text = findQueryElement(grid)?.getAttribute(QueryAttribute) ?? null;

    if (text === null || text.length === 0)
        return {};

    try {
        return JSON.parse(text) as ItemsQuery;
    }
    catch {
        return {};
    }
}

/** Writes the query onto the grid and says so: an empty one takes the attribute off, which is what the framework reads as no terms. */
export function writeQuery(grid: Element, query: ItemsQuery): void {
    const element = findQueryElement(grid);

    if (element === null)
        return;

    const filters = query.filters ?? [];
    const sorts = query.sorts ?? [];

    if (filters.length === 0 && sorts.length === 0)
        element.removeAttribute(QueryAttribute);
    else
        element.setAttribute(QueryAttribute, JSON.stringify({ filters, sorts }));

    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event(QueryChangeEventName, { bubbles: true }));
}
