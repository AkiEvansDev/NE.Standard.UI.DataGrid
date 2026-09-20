// The filters: what's typed into a filter's field becomes a term of the viewer's query (a text match, a range's two ends, a
// chosen value), applied client-side or by the server for a window. The fields are unbound framework components, so the engine
// asks the framework what each holds.

import type { Badges, PluginEngineContext, ValueReading } from "ne-standard-ui";
import { gridOf, ownDescendants } from "./data-grid-dom.ts";
import { readQuery, writeQuery } from "./data-grid-query.ts";
import type { FilterTerm } from "./data-grid-query.ts";

const FilterSelector = "[data-ui-grid-filter]";
const FilterPanelSelector = ".ui-data-grid__filter-panel";
const FiltersCountSelector = ".ui-data-grid__filters-count";
const FilterPartSelector = ".ui-data-grid__filter-part";
const FilterAttribute = "data-ui-grid-filter";
const FilterKindAttribute = "data-ui-grid-filter-kind";
const FilterBoundAttribute = "data-ui-grid-filter-bound";

export class DataGridFilterEngine {
    private readonly values: ValueReading;
    private readonly badges: Badges;

    public constructor(context: PluginEngineContext) {
        this.values = context.values;
        this.badges = context.badges;

        context.root.addEventListener("change", domEvent => {
            const filter = domEvent.target instanceof Element ? domEvent.target.closest<HTMLElement>(FilterSelector) : null;
            const grid = gridOf(filter);

            if (filter === null || grid === null)
                return;


            writeQuery(grid, { ...readQuery(grid), filters: this.readFilterTerms(grid) });
            this.syncFiltersCount(grid);
        }, true);
    }

    /** Every filter's terms, in column order — the search box and the flyout's panel; a filter with nothing in it says nothing. */
    private readFilterTerms(grid: HTMLElement): FilterTerm[] {
        const terms: FilterTerm[] = [];

        for (const filter of ownDescendants(grid, FilterSelector))
            terms.push(...this.readFilterTermsOf(filter));

        return terms;
    }

    private readFilterTermsOf(filter: HTMLElement): FilterTerm[] {
        const property = filter.getAttribute(FilterAttribute) ?? "";
        const kind = filter.getAttribute(FilterKindAttribute) ?? "text";
        const terms: FilterTerm[] = [];

        for (const part of filter.querySelectorAll<HTMLElement>(`:scope > ${FilterPartSelector}`)) {
            const text = this.partValue(part);
            const term = text === null ? null : createTerm(property, kind, part.getAttribute(FilterBoundAttribute), text);

            if (term !== null)
                terms.push(term);
        }

        return terms;
    }

    /** What the part's one field holds, as text, or null for an empty one: the framework finds the value wherever the field keeps it. */
    private partValue(part: HTMLElement): string | null {
        const value = this.values.read(part);
        const text = value === null || value === undefined || typeof value === "boolean" ? "" : String(value).trim();

        return text.length === 0 ? null : text;
    }

    /** The count on the filters button: how many of the flyout's filters hold something, hidden at none. */
    private syncFiltersCount(grid: HTMLElement): void {
        const count = grid.querySelector<HTMLElement>(FiltersCountSelector);

        if (count === null)
            return;

        let inUse = 0;

        for (const filter of ownDescendants(grid, FilterSelector)) {
            if (filter.closest(FilterPanelSelector) !== null && this.readFilterTermsOf(filter).length > 0)
                inUse++;
        }

        this.badges.writeCount(count, inUse);
        count.hidden = inUse === 0;
    }
}

/** One term by the field's kind and, for a range, its end; a number that does not read as one is no term. */
export function createTerm(property: string, kind: string, bound: string | null, text: string): FilterTerm | null {
    const operator = bound === "to" ? "LessOrEqual" : "GreaterOrEqual";

    switch (kind) {
        case "number":
        case "money": {
            const value = parseNumber(text);

            return value === null ? null : { itemProperty: property, operator, value };
        }
        case "date":
            // The picker's canonical text; a row's moment travels as the same ISO shape, which orders as text does.
            return { itemProperty: property, operator, value: bound === "to" ? `${text}T23:59:59` : text };
        case "boolean":
        case "enum":
            return { itemProperty: property, operator: "Equal", value: text };
        default:
            return { itemProperty: property, operator: "LikeIgnoreCase", value: text };
    }
}

/** A number as the framework's field holds it, whatever the page's culture: a point for the decimal, commas grouping an unfocused one. */
export function parseNumber(text: string): number | null {
    const plain = text.replace(/[,\s]/g, "");
    const value = Number(plain);

    return plain.length === 0 || !Number.isFinite(value) ? null : value;
}
