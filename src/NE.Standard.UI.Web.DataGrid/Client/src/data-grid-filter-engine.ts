// The filters: what's typed into a filter's field becomes a term of the viewer's query (a text match, a range's two ends, a
// chosen value), applied client-side or by the server for a window. The fields are unbound framework components, so the engine
// asks the framework what each holds — and writes a query the controller pushed back into them, so the fields say what filters.

import type { Badges, PluginEngineContext, PropertyWriting, ValueReading } from "ne-standard-ui";
import { gridOf, ownDescendants, ownFirst, RootSelector } from "./data-grid-dom.ts";
import { QueryAttribute, readQuery, readQueryText, writeQuery } from "./data-grid-query.ts";
import type { FilterTerm } from "./data-grid-query.ts";

const FilterSelector = "[data-ui-grid-filter]";
const FilterPanelSelector = ".ui-data-grid__filter-panel";
const FiltersCountSelector = ".ui-data-grid__filters-count";
const FiltersClearSelector = ".ui-data-grid__filters-clear";
const FilterPartSelector = ".ui-data-grid__filter-part";
const FilterAttribute = "data-ui-grid-filter";
const FilterKindAttribute = "data-ui-grid-filter-kind";
const FilterBoundAttribute = "data-ui-grid-filter-bound";

export class DataGridFilterEngine {
    private readonly values: ValueReading;
    private readonly badges: Badges;
    private readonly properties: PropertyWriting;

    // The query text this engine last wrote on each grid: a query on the grid that differs from it was written by someone else —
    // the controller's push — and is written back into the fields.
    private readonly written = new WeakMap<HTMLElement, string | null>();

    public constructor(context: PluginEngineContext) {
        this.values = context.values;
        this.badges = context.badges;
        this.properties = context.properties;

        this.fillAll(context.root.querySelectorAll<HTMLElement>(RootSelector));
        context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: [QueryAttribute] }, grids => this.fillAll(grids));

        context.root.addEventListener("click", domEvent => {
            const clear = domEvent.target instanceof Element ? domEvent.target.closest<HTMLButtonElement>(FiltersClearSelector) : null;
            const grid = gridOf(clear);

            if (clear !== null && grid !== null)
                this.clearPanel(grid);
        });

        context.root.addEventListener("change", domEvent => {
            const filter = domEvent.target instanceof Element ? domEvent.target.closest<HTMLElement>(FilterSelector) : null;
            const grid = gridOf(filter);

            if (filter === null || grid === null)
                return;

            this.writeFilters(grid);
        }, true);
    }

    /**
     * Every filter of the flyout emptied as a push would empty it, and the query written without them: the search box keeps its
     * text. Not read back from the emptied fields — a select takes its new value onto its field a moment later, so the first
     * press used to write the old choice again and only a second one cleared it.
     */
    private clearPanel(grid: HTMLElement): void {
        const cleared = new Set<HTMLElement>();

        for (const filter of ownDescendants(grid, FilterSelector)) {
            if (filter.closest(FilterPanelSelector) === null)
                continue;

            cleared.add(filter);

            for (const part of filter.querySelectorAll<HTMLElement>(`:scope > ${FilterPartSelector}`)) {
                const field = part.querySelector("[data-ui-id]");

                if (field !== null)
                    this.properties.set(field, "Value", null);
            }
        }

        this.writeFilters(grid, cleared);
    }

    /** The query's filters read again from the fields — but for those just emptied, which say nothing — and the count after them. */
    private writeFilters(grid: HTMLElement, cleared: ReadonlySet<HTMLElement> = new Set()): void {
        const filters = ownDescendants(grid, FilterSelector);
        const query = readQuery(grid);
        const terms: FilterTerm[] = [];

        // Every filter's terms, in column order — the search box and the flyout's panel; a filter with nothing in it says nothing.
        for (const filter of filters) {
            if (!cleared.has(filter))
                terms.push(...this.readFilterTermsOf(filter));
        }

        writeQuery(grid, { ...query, filters: mergeFilterTerms(query.filters ?? [], filters.flatMap(fieldsOf), terms) });
        this.written.set(grid, readQueryText(grid));
        this.syncFiltersCount(grid);
    }

    private fillAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids) {
            const text = readQueryText(grid);

            if (this.written.has(grid) && this.written.get(grid) === text)
                continue;

            this.written.set(grid, text);
            this.fillFields(grid);
        }
    }

    /**
     * Every filter's fields made to say what the query holds for their property: a term the controller pushed shows in its
     * field, and a field whose term it took away empties. A field the viewer is typing in is theirs and left alone.
     */
    private fillFields(grid: HTMLElement): void {
        const terms = readQuery(grid).filters ?? [];

        for (const filter of ownDescendants(grid, FilterSelector)) {
            const property = filter.getAttribute(FilterAttribute) ?? "";
            const kind = filter.getAttribute(FilterKindAttribute) ?? "text";

            for (const part of filter.querySelectorAll<HTMLElement>(`:scope > ${FilterPartSelector}`)) {
                const field = part.querySelector("[data-ui-id]");

                if (field === null || field.contains(document.activeElement))
                    continue;

                const value = fieldValueOf(terms, property, kind, part.getAttribute(FilterBoundAttribute));

                if ((value === null ? null : String(value)) !== this.partValue(part))
                    this.properties.set(field, "Value", value);
            }
        }

        this.syncFiltersCount(grid);
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

    /**
     * The count on the filters button: how many of the flyout's filters the query gives something to show, hidden at none; the clear
     * button is live beside it. Counted off the query the fields say, not the fields: a select just written reads its old value.
     */
    private syncFiltersCount(grid: HTMLElement): void {
        const count = ownFirst(grid, FiltersCountSelector);

        if (count === null)
            return;

        const terms = readQuery(grid).filters ?? [];
        let inUse = 0;

        for (const filter of ownDescendants(grid, FilterSelector)) {
            if (filter.closest(FilterPanelSelector) !== null && showsTerm(filter, terms))
                inUse++;
        }

        this.badges.writeCount(count, inUse);
        count.hidden = inUse === 0;

        const clear = ownFirst<HTMLButtonElement>(grid, FiltersClearSelector);

        if (clear !== null)
            clear.disabled = inUse === 0;
    }
}

/** Whether any of a filter's fields has a term of the query to show. */
function showsTerm(filter: HTMLElement, terms: readonly FilterTerm[]): boolean {
    return fieldsOf(filter).some(field => fieldValueOf(terms, field.property, field.kind, field.bound) !== null);
}

/** One field of a filter as a term sees it: the property it filters, the kind of term it writes, and for a range which end it is. */
export type FilterField = {
    readonly property: string;
    readonly kind: string;
    readonly bound: string | null;
};

/** A filter's fields, one per part. */
function fieldsOf(filter: HTMLElement): FilterField[] {
    const property = filter.getAttribute(FilterAttribute) ?? "";
    const kind = filter.getAttribute(FilterKindAttribute) ?? "text";

    return [...filter.querySelectorAll<HTMLElement>(`:scope > ${FilterPartSelector}`)].map(part => ({ property, kind, bound: part.getAttribute(FilterBoundAttribute) }));
}

/**
 * The query's terms once the fields have spoken: a term one of the fields could have written is that field's and gives way to
 * what the fields say now; any other — the controller's, on a property no field shows or in a shape no field writes — stays,
 * since the viewer has no way to take it back.
 */
export function mergeFilterTerms(current: readonly FilterTerm[], fields: readonly FilterField[], fromFields: readonly FilterTerm[]): FilterTerm[] {
    const kept = current.filter(term => !fields.some(field => field.property === term.itemProperty && fieldValueOf([term], field.property, field.kind, field.bound) !== null));

    return [...kept, ...fromFields];
}

/**
 * What a filter field shows for the query's terms on its property — the reverse of `createTerm`, and only of it: a text match's
 * text, a range end's number or day, a chosen value. Null for a term the field would write back differently, since showing it
 * would change the query under the viewer at their next edit.
 */
export function fieldValueOf(terms: readonly FilterTerm[], property: string, kind: string, bound: string | null): unknown {
    const upper = bound === "to";

    for (const term of terms) {
        if (term.itemProperty !== property || term.value === null || term.value === undefined)
            continue;

        switch (kind) {
            case "number":
            case "money":
                if (term.operator === (upper ? "LessOrEqual" : "GreaterOrEqual")) {
                    const value = typeof term.value === "number" ? term.value : parseNumber(String(term.value));

                    if (value !== null)
                        return value;
                }

                break;
            case "date": {
                // A range's end is written as "before the next day", its start as the day itself.
                const day = term.operator === (upper ? "Less" : "GreaterOrEqual") ? dayOf(String(term.value)) : null;
                const shown = day !== null && upper ? shiftDay(day, -1) : day;

                if (shown !== null)
                    return shown;

                break;
            }
            case "boolean":
            case "enum":
                if (term.operator === "Equal")
                    return String(term.value);

                break;
            default:
                if (term.operator === "LikeIgnoreCase")
                    return String(term.value);

                break;
        }
    }

    return null;
}

/** The `yyyy-MM-dd` day a term's value names: the day itself, or its midnight written without a zone; null for anything else. */
function dayOf(text: string): string | null {
    return /^\d{4}-\d{2}-\d{2}(?:T00:00(?::00(?:\.0+)?)?)?$/.test(text) ? text.slice(0, 10) : null;
}

/** The day `days` away from a `yyyy-MM-dd` date, in the same shape; null for text of any other shape. */
function shiftDay(text: string, days: number): string | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

    if (match === null)
        return null;

    // setUTCFullYear rather than Date.UTC, which reads a year under a hundred as 19xx.
    const day = new Date(0);

    day.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days);

    return day.toISOString().slice(0, 10);
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
        case "date": {
            // The picker's canonical text; a row's moment travels as the same ISO shape, which orders as text does. The end of a
            // range is "before the next day": any last moment written out would still miss a row with a fraction or a zone after it.
            const next = bound === "to" ? shiftDay(text, 1) : null;

            return next === null ? { itemProperty: property, operator, value: text } : { itemProperty: property, operator: "Less", value: next };
        }
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
