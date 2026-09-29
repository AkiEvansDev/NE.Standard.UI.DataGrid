// How a click on a header changes the sort: the arithmetic alone, so it is tested without a page.

export type SortDirection = "Ascending" | "Descending";

/** One term of the viewer's query, the shape `UIItemSortTerm` travels in. */
export type SortTerm = {
    readonly itemProperty: string;
    readonly direction: SortDirection;
};

/** The sorts after a click on `property`: ascending, descending, off; `additive` (Shift) keeps the others. */
export function cycleSort(sorts: readonly SortTerm[], property: string, additive: boolean): SortTerm[] {
    const index = sorts.findIndex(sort => sort.itemProperty === property);
    const current = index < 0 ? null : sorts[index].direction;
    const next: SortDirection | null = current === null ? "Ascending" : current === "Ascending" ? "Descending" : null;

    if (!additive)
        return next === null ? [] : [{ itemProperty: property, direction: next }];

    if (index < 0)
        return [...sorts, { itemProperty: property, direction: "Ascending" }];

    const result = [...sorts];

    if (next === null)
        result.splice(index, 1);
    else
        result[index] = { itemProperty: property, direction: next };

    return result;
}

/** Where a column stands in the sorts: its direction and its one-based place, or null when it is not sorted. */
export function sortStateOf(sorts: readonly SortTerm[], property: string): { readonly direction: SortDirection; readonly place: number } | null {
    const index = sorts.findIndex(sort => sort.itemProperty === property);

    return index < 0 ? null : { direction: sorts[index].direction, place: index + 1 };
}
