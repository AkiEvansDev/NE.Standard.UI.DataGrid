// The filters: each field becomes a term of the viewer's query. The fields are unbound, so the engine asks the framework what each
// holds, and writes a pushed query back into them so they say what filters.

import type { Badges, ComponentStates, DomNames, PluginEngineContext, PropertyWriting, ValueReading } from "ne-standard-ui";
import { gridOf, ownDescendants, ownFirst, RootSelector } from "./data-grid-dom.ts";
import { GridAttributes, GridClasses } from "./data-grid-names.ts";
import { readQuery, readQueryText, writeQuery } from "./data-grid-query.ts";
import type { FilterTerm } from "./data-grid-query.ts";

const FilterAttribute = GridAttributes.filter;
const FilterKindAttribute = GridAttributes.filterKind;
const FilterBoundAttribute = GridAttributes.filterBound;
const FilterSelector = `[${FilterAttribute}]`;
const FilterPanelSelector = `.${GridClasses.filterPanel}`;
const FiltersCountSelector = `.${GridClasses.filtersCount}`;
const FiltersClearSelector = `.${GridClasses.filtersClear}`;
const FilterPartSelector = `.${GridClasses.filterPart}`;

export class DataGridFilterEngine {
    private readonly values: ValueReading;
    private readonly badges: Badges;
    private readonly properties: PropertyWriting;
    private readonly states: ComponentStates;
    private readonly names: DomNames;
    // A part's one field: the framework component standing in it.
    private readonly fieldSelector: string;

    // The query text this engine last wrote on each grid; one that differs is the controller's push, written back into the fields.
    private readonly written = new WeakMap<HTMLElement, string | null>();

    public constructor(context: PluginEngineContext) {
        this.values = context.values;
        this.badges = context.badges;
        this.properties = context.properties;
        this.states = context.states;
        this.names = context.names;
        this.fieldSelector = `[${context.names.componentId}]`;

        this.fillAll(context.root.querySelectorAll<HTMLElement>(RootSelector));
        context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: [context.names.itemsQuery] }, grids => this.fillAll(grids));

        context.root.addEventListener("click", domEvent => {
            const clear = domEvent.target instanceof Element ? domEvent.target.closest<HTMLElement>(FiltersClearSelector) : null;
            const grid = gridOf(clear);

            if (clear !== null && grid !== null && !this.states.isInert(clear))
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

    /** Empties the panel's filters as a push would; the query drops their terms itself, since a select takes its emptied value a moment later. */
    private clearPanel(grid: HTMLElement): void {
        const cleared = new Set<HTMLElement>();

        for (const filter of ownDescendants(grid, FilterSelector)) {
            if (filter.closest(FilterPanelSelector) === null)
                continue;

            cleared.add(filter);

            for (const part of filter.querySelectorAll<HTMLElement>(`:scope > ${FilterPartSelector}`)) {
                const field = part.querySelector(this.fieldSelector);

                if (field !== null)
                    this.properties.set(field, "Value", null);
            }
        }

        this.writeFilters(grid, cleared);
    }

    /** The query's filters read again from the fields — but for those just emptied, which say nothing — and the count after them. */
    private writeFilters(grid: HTMLElement, cleared: ReadonlySet<HTMLElement> = new Set()): void {
        const filters = ownDescendants(grid, FilterSelector);
        const query = readQuery(grid, this.names);
        const terms: FilterTerm[] = [];

        // Every filter's terms, in column order — the search box and the flyout's panel; a filter with nothing in it says nothing.
        for (const filter of filters) {
            if (!cleared.has(filter))
                terms.push(...this.readFilterTermsOf(filter));
        }

        writeQuery(grid, this.names, { ...query, filters: mergeFilterTerms(query.filters ?? [], filters.flatMap(fieldsOf), terms) });
        this.written.set(grid, readQueryText(grid, this.names));
        this.syncFiltersCount(grid);
    }

    private fillAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids) {
            const text = readQueryText(grid, this.names);

            if (this.written.has(grid) && this.written.get(grid) === text)
                continue;

            this.written.set(grid, text);
            this.fillFields(grid);
        }
    }

    /** Every filter's fields made to say what the query holds for them — the controller's push; the field being typed in is left alone. */
    private fillFields(grid: HTMLElement): void {
        const terms = readQuery(grid, this.names).filters ?? [];

        for (const filter of ownDescendants(grid, FilterSelector)) {
            const property = filter.getAttribute(FilterAttribute) ?? "";
            const kind = filter.getAttribute(FilterKindAttribute) ?? "text";

            for (const part of filter.querySelectorAll<HTMLElement>(`:scope > ${FilterPartSelector}`)) {
                const field = part.querySelector(this.fieldSelector);

                if (field === null || field.contains(document.activeElement))
                    continue;

                const value = fieldValueOf(terms, property, kind, part.getAttribute(FilterBoundAttribute));

                if ((value === null ? null : String(value)) !== this.partValue(part, kind))
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
            const text = this.partValue(part, kind);
            const term = text === null ? null : createTerm(property, kind, part.getAttribute(FilterBoundAttribute), text);

            if (term !== null)
                terms.push(term);
        }

        return terms;
    }

    /**
     * What the part's one field holds, as text, or null for an empty one: the framework finds the value wherever the field keeps it, a
     * number field's as the invariant text its binding sends, which reads back as the number a term compares by.
     */
    private partValue(part: HTMLElement, kind: string): string | null {
        const value = this.values.read(part);
        const text = value === null || value === undefined || typeof value === "boolean" ? "" : String(value).trim();

        if (text.length === 0)
            return null;

        if (kind !== "number" && kind !== "money")
            return text;

        // Its number's own text, for a push of the same number ("1000.50" and 1000.5) to compare equal and write nothing.
        const number = parseNumber(text);

        return number === null ? null : String(number);
    }

    /** The count on the filters button, hidden at none, with Clear filters live beside it — off the query, since a select just written reads its old value. */
    private syncFiltersCount(grid: HTMLElement): void {
        const count = ownFirst(grid, FiltersCountSelector);

        if (count === null)
            return;

        const terms = readQuery(grid, this.names).filters ?? [];
        let inUse = 0;

        for (const filter of ownDescendants(grid, FilterSelector)) {
            if (filter.closest(FilterPanelSelector) !== null && showsTerm(filter, terms))
                inUse++;
        }

        this.badges.writeCount(count, inUse);
        count.hidden = inUse === 0;

        const clear = ownFirst(grid, FiltersClearSelector);

        if (clear !== null)
            this.states.setDisabled(clear, inUse === 0);
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

/** The query's terms after the fields spoke: a term a field could have written gives way to theirs; any other stays, since no field can take it back. */
export function mergeFilterTerms(current: readonly FilterTerm[], fields: readonly FilterField[], fromFields: readonly FilterTerm[]): FilterTerm[] {
    const kept = current.filter(term => !fields.some(field => field.property === term.itemProperty && fieldValueOf([term], field.property, field.kind, field.bound) !== null));

    return [...kept, ...fromFields];
}

/** What a filter field shows for its property's terms — `createTerm` reversed; null for a term the field would write back differently. */
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
            // The picker's text is the ISO shape a row's moment travels in, which orders as text. The end is "before the next day":
            // any last moment written out would miss a row with a fraction or a zone after it.
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

/** A number in the invariant text a term's value travels in; null for any other text — a culture's "1,5" is no number, not 15. */
export function parseNumber(text: string): number | null {
    const value = Number(text);

    return text.trim().length === 0 || !Number.isFinite(value) ? null : value;
}
