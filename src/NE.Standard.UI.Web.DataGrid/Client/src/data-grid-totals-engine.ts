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

export class DataGridTotalsEngine {
    private readonly formatting: CellFormatting;
    private readonly rows: ItemRows;
    private readonly names: DomNames;
    private readonly hostSelector: string;
    private readonly totalSelector: string;
    // The rows the filters leave: a hidden one stays in the page under the framework's class.
    private readonly shownRowSelector: string;
    private readonly pending = new Set<HTMLElement>();
    private scheduled = false;

    public constructor(context: PluginEngineContext, formatting: CellFormatting) {
        this.formatting = formatting;
        this.rows = context.rows;
        this.names = context.names;
        this.hostSelector = hostSelector(context.names);
        this.totalSelector = `:scope > .${context.names.tableScrollClass} > .${GridClasses.footer} > .${GridClasses.total}[${AggregateAttribute}]`;
        this.shownRowSelector = `:scope > ${rowSelector(context.names)}:not(.${context.names.hiddenClass})`;
        this.syncAll(context.root.querySelectorAll<HTMLElement>(RootSelector));

        // Rows come and go, a filter hides one (its class), an edit changes a cell's value (its raw attribute), a window brings its
        // answer (the host's attribute).
        context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: ["class", RawValueAttribute, context.names.windowAggregates] }, grids => this.queue(grids));

        // A language switch wrote the grid's packs again: a total is a number or a date in them too.
        context.strings.onChange(() => this.syncAll(context.root.querySelectorAll<HTMLElement>(RootSelector)));
    }

    private syncAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids)
            this.syncTotals(grid);
    }

    /** Every total the footer asks for, from the window's answer or from the rows the page holds. */
    private syncTotals(grid: HTMLElement): void {
        const totals = grid.querySelectorAll<HTMLElement>(this.totalSelector);

        if (totals.length === 0)
            return;

        const host = grid.querySelector<HTMLElement>(this.hostSelector);

        if (host === null)
            return;

        const windowed = host.getAttribute(this.names.hostMode) === "windowed";
        const answered = windowed ? readAggregates(host, this.names) : null;
        // A virtualized host draws only the rows in view: the reading is over the items it holds, not over the page.
        const held = windowed ? null : this.rows.itemsOf(host);
        const numbers = this.formatting.numbers.readCulture(grid);
        const dates = this.formatting.temporal.readCulture(grid);

        for (const total of totals) {
            const column = total.getAttribute(ColumnAttribute) ?? "";
            const property = total.getAttribute(GridAttributes.property) ?? column;
            const aggregate = (total.getAttribute(AggregateAttribute) ?? "") as Aggregate;
            // A window is one of many: only the source can total it, and a blank beats the window's sum shown as the column's.
            const value = windowed
                ? answered?.[property] ?? null
                : held !== null
                    ? aggregate === "count" ? held.length : aggregateOf(aggregate, heldValues(held, property, this.rows, this.formatting.numbers))
                    : aggregate === "count" ? host.querySelectorAll(this.shownRowSelector).length : aggregateOf(aggregate, rawValues(host, column, this.shownRowSelector));
            const text = value === null ? "" : formatCellValue(value, readCellShape(total), numbers, dates, this.formatting);

            if (total.textContent !== text)
                total.textContent = text;
        }
    }

    /** Totals once a frame at most: a virtualized scroll swaps rows batch after batch, and the footer's own writes come back as one more. */
    private queue(grids: Iterable<HTMLElement>): void {
        for (const grid of grids)
            this.pending.add(grid);

        if (this.scheduled)
            return;

        this.scheduled = true;
        requestAnimationFrame(() => {
            this.scheduled = false;

            const due = [...this.pending];

            this.pending.clear();
            this.syncAll(due.filter(grid => grid.isConnected));
        });
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

/** The values of one property over the items a host holds whole, read as a cell reads its number; an item with none is skipped. */
function heldValues(items: readonly unknown[], property: string, rows: ItemRows, numbers: NumberFormatting): number[] {
    const values: number[] = [];

    for (const item of items) {
        const value = toNumber(rows.readPath(item, property), numbers);

        if (value !== null)
            values.push(value);
    }

    return values;
}

/** The raw values of one column's cells, over the rows the filters leave; a cell with no number is skipped. */
function rawValues(host: Element, column: string, shownRowSelector: string): number[] {
    const values: number[] = [];

    for (const row of host.querySelectorAll<HTMLElement>(shownRowSelector)) {
        const cell = row.querySelector(`:scope > [${ColumnAttribute}="${CSS.escape(column)}"] [${RawValueAttribute}]`);
        const value = cell === null ? Number.NaN : Number(cell.getAttribute(RawValueAttribute));

        if (Number.isFinite(value))
            values.push(value);
    }

    return values;
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
