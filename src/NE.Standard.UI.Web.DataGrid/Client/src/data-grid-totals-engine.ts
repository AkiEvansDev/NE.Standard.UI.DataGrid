// The footer under the rows: a total per column that asked for one, computed here or, for a windowed source, sent by the server
// with the window; written through the cells' formatter.

import type { DomNames, ItemRows, NumberFormatting, PluginEngineContext } from "ne-standard-ui";
import { formatCellValue, readCellShape, toNumber } from "./data-grid-cell.ts";
import type { CellFormatting } from "./data-grid-cell.ts";
import { hostSelector, RootSelector, rowSelector } from "./data-grid-dom.ts";
import { GridAttributes, GridClasses } from "./data-grid-names.ts";

const AggregateAttribute = GridAttributes.aggregate;
const ColumnAttribute = GridAttributes.column;
const RawValueAttribute = GridAttributes.raw;

export type Aggregate = "sum" | "average" | "count" | "min" | "max";

/** What a grid's totals were last read from, where they stand on what the page holds rather than on the rows drawn. */
type TotalsBasis = {
    readonly host: Element;
    readonly basis: string;
};

export class DataGridTotalsEngine {
    private readonly formatting: CellFormatting;
    private readonly rows: ItemRows;
    private readonly names: DomNames;
    private readonly hostSelector: string;
    private readonly totalSelector: string;
    // The rows the filters leave: a hidden one stays in the page under the framework's class.
    private readonly shownRowSelector: string;
    private readonly observer: MutationObserver | null;
    private readonly stopStrings: (() => void) | void;
    private readonly pending = new Set<HTMLElement>();
    private queued = false;
    private frameId: number | null = null;
    // A virtualized host's totals, and a window's, are read again only when what they stand on moved (`movedSince`): a scroll swaps the
    // rows drawn batch after batch, and a hundred thousand items read per batch is the cost this spares.
    private readonly bases = new WeakMap<HTMLElement, TotalsBasis>();

    public constructor(context: PluginEngineContext, formatting: CellFormatting) {
        this.formatting = formatting;
        this.rows = context.rows;
        this.names = context.names;
        this.hostSelector = hostSelector(context.names);
        this.totalSelector = `:scope > .${context.names.tableScrollClass} > .${GridClasses.footer} > .${GridClasses.total}[${AggregateAttribute}]`;
        this.shownRowSelector = `:scope > ${rowSelector(context.names)}:not(.${context.names.hiddenClass})`;
        this.syncAll(context.root.querySelectorAll<HTMLElement>(RootSelector));

        // Rows come and go, a filter hides one (its class), an edit changes a cell's value (its raw attribute), a virtualized host
        // patches or re-projects its items (its version attribute), a window brings its answer (the host's attribute), a column is hidden or shown (the root's).
        this.observer = context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: ["class", RawValueAttribute, context.names.itemsVersion, context.names.windowAggregates, context.names.tableHidden] }, grids => this.queue(grids));

        // A language switch wrote the grid's packs again: a total is a number or a date in them too, whatever it was read from.
        this.stopStrings = context.strings.onChange(() => this.syncAll(context.root.querySelectorAll<HTMLElement>(RootSelector), true));
    }

    public dispose(): void {
        this.observer?.disconnect();

        if (typeof this.stopStrings === "function")
            this.stopStrings();

        if (this.frameId !== null && typeof cancelAnimationFrame === "function")
            cancelAnimationFrame(this.frameId);

        this.queued = false;
        this.frameId = null;
        this.pending.clear();
    }

    private syncAll(grids: Iterable<HTMLElement>, rewrite = false): void {
        for (const grid of grids)
            this.syncTotals(grid, rewrite);
    }

    /** Every total the footer asks for, from the window's answer or from the rows the page holds. */
    private syncTotals(grid: HTMLElement, rewrite: boolean): void {
        const totals = grid.querySelectorAll<HTMLElement>(this.totalSelector);

        if (totals.length === 0)
            return;

        const host = grid.querySelector<HTMLElement>(this.hostSelector);

        if (host === null)
            return;

        const windowed = host.getAttribute(this.names.hostMode) === "windowed";

        if (!this.movedSince(grid, host, windowed, totals.length) && !rewrite)
            return;

        const answered = windowed ? readAggregates(host, this.names) : null;
        // A virtualized host draws only the rows in view: the reading is over the items it holds, not over the page.
        const held = windowed ? null : this.rows.itemsOf(host);
        const specs = Array.from(totals, total => {
            const column = total.getAttribute(ColumnAttribute) ?? "";

            return {
                total,
                column,
                property: total.getAttribute(GridAttributes.property) ?? column,
                aggregate: (total.getAttribute(AggregateAttribute) ?? "") as Aggregate
            };
        });
        const heldByProperty = !windowed && held !== null ? collectHeldValues(held, specs, this.rows, this.formatting.numbers) : null;
        const domReading = !windowed && held === null ? collectDomValues(host, specs, this.shownRowSelector) : null;
        let numbers: ReturnType<NumberFormatting["readCulture"]> | null = null;
        let dates: ReturnType<CellFormatting["temporal"]["readCulture"]> | null = null;

        for (const { total, column, property, aggregate } of specs) {
            // A window is one of many: only the source can total it, and a blank beats the window's sum shown as the column's.
            const value = windowed
                ? answered !== null && Object.hasOwn(answered, property) ? answered[property] : null
                : held !== null
                    ? aggregate === "count" ? held.length : aggregateOf(aggregate, heldByProperty!.get(property) ?? [])
                    : aggregate === "count" ? domReading!.count : aggregateOf(aggregate, domReading!.byColumn.get(column) ?? []);
            let text = "";

            if (value !== null) {
                const shape = readCellShape(total);
                const numberCulture = shape.kind === "number" || shape.kind === "money" ? (numbers ??= this.formatting.numbers.readCulture(grid)) : (null as never);
                const dateCulture = shape.kind === "date" ? (dates ??= this.formatting.temporal.readCulture(grid)) : (null as never);

                text = formatCellValue(value, shape, numberCulture, dateCulture, this.formatting);
            }

            if (total.textContent !== text)
                total.textContent = text;
        }
    }

    /**
     * Whether a grid's totals stand on something other than the last pass read — a virtualized host's items' version, a window's
     * answer, the columns hidden, how many totals; always for a host whose drawn rows are its items, which are the totals' reading.
     */
    private movedSince(grid: HTMLElement, host: Element, windowed: boolean, count: number): boolean {
        const version = windowed ? null : this.rows.itemsVersion(host);

        if (!windowed && version === null)
            return true;

        const basis = `${version ?? ""}|${host.getAttribute(this.names.windowAggregates) ?? ""}|${grid.getAttribute(this.names.tableHidden) ?? ""}|${count}`;
        const last = this.bases.get(grid);

        if (last?.host === host && last.basis === basis)
            return false;

        this.bases.set(grid, { host, basis });

        return true;
    }

    /** Totals once a frame at most: a virtualized scroll swaps rows batch after batch, and the footer's own writes come back as one more. */
    private queue(grids: Iterable<HTMLElement>): void {
        for (const grid of grids)
            this.pending.add(grid);

        if (this.queued)
            return;

        this.queued = true;

        const handle = requestAnimationFrame(() => {
            this.queued = false;
            this.frameId = null;

            const due = [...this.pending];

            this.pending.clear();
            this.syncAll(due.filter(grid => grid.isConnected));
        });

        if (this.queued && typeof handle === "number")
            this.frameId = handle;
    }
}

/** The answer the source sent beside its window, by property; nothing when it sent none or it does not parse. */
function readAggregates(host: Element, names: DomNames): Readonly<Record<string, unknown>> | null {
    const text = host.getAttribute(names.windowAggregates);

    if (text === null || text.length === 0)
        return null;

    try {
        return JSON.parse(text) as Record<string, unknown>;
    }
    catch {
        return null;
    }
}

/** Collects numeric values for all non-count totals in a single pass over `items`. */
function collectHeldValues(items: readonly unknown[], specs: readonly { readonly property: string; readonly aggregate: Aggregate }[], rows: ItemRows, numbers: NumberFormatting): Map<string, number[]> {
    const byProperty = new Map<string, number[]>();

    for (const spec of specs) {
        if (spec.aggregate !== "count" && !byProperty.has(spec.property))
            byProperty.set(spec.property, []);
    }

    if (byProperty.size === 0)
        return byProperty;

    const entries = [...byProperty.entries()];

    for (const item of items) {
        for (const [property, bucket] of entries) {
            const value = toNumber(rows.readPath(item, property), numbers);

            if (value !== null)
                bucket.push(value);
        }
    }

    return byProperty;
}

/** Collects raw cell numbers for all non-count totals in a single pass over visible DOM rows. */
function collectDomValues(host: Element, specs: readonly { readonly column: string; readonly aggregate: Aggregate }[], shownRowSelector: string): { readonly count: number; readonly byColumn: Map<string, number[]> } {
    const shownRows = host.querySelectorAll<HTMLElement>(shownRowSelector);
    const byColumn = new Map<string, number[]>();
    const selectors: { readonly selector: string; readonly bucket: number[] }[] = [];

    for (const spec of specs) {
        if (spec.aggregate !== "count" && !byColumn.has(spec.column)) {
            const bucket: number[] = [];

            byColumn.set(spec.column, bucket);
            selectors.push({ selector: `:scope > [${ColumnAttribute}="${CSS.escape(spec.column)}"] [${RawValueAttribute}]`, bucket });
        }
    }

    if (selectors.length > 0) {
        for (const row of shownRows) {
            for (const { selector, bucket } of selectors) {
                const cell = row.querySelector(selector);
                const value = cell === null ? Number.NaN : Number(cell.getAttribute(RawValueAttribute));

                if (Number.isFinite(value))
                    bucket.push(value);
            }
        }
    }

    return { count: shownRows.length, byColumn };
}

/** One number over the values, or null with none to work from — a count is the one that is never null. */
export function aggregateOf(aggregate: Aggregate, values: readonly number[]): number | null {
    if (aggregate === "count")
        return values.length;

    if (values.length === 0)
        return null;

    switch (aggregate) {
        case "sum":
            return values.reduce((total, value) => total + value, 0);
        case "average":
            return values.reduce((total, value) => total + value, 0) / values.length;
        case "min":
            return extremeOf(values, -1);
        case "max":
            return extremeOf(values, 1);
        default:
            return null;
    }
}

/** The largest value for a positive sign, the smallest for a negative one — a loop, since spreading a large list overflows the stack. */
function extremeOf(values: readonly number[], sign: 1 | -1): number {
    let extreme = values[0];

    for (let i = 1; i < values.length; i++) {
        if ((values[i] - extreme) * sign > 0)
            extreme = values[i];
    }

    return extreme;
}
