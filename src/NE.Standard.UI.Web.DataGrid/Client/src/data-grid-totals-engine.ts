// The footer under the rows: a total per column that asked for one. Computed here — from the typed cells' raw values for a host
// holding every row in the page, from the items a virtualized host holds; for a windowed source, the server sends the total with
// the window, carried as a host attribute. Every way writes through the same formatter the cells use.

import type { ItemRows, PluginEngineContext } from "ne-standard-ui";
import { formatCellValue, RawValueAttribute, readCellShape, toNumber } from "./data-grid-cell.ts";
import type { CellFormatting } from "./data-grid-cell.ts";
import { HostSelector, RootSelector } from "./data-grid-dom.ts";

const TotalSelector = ":scope > .ui-table__scroll > .ui-data-grid__footer > .ui-data-grid__total[data-ui-grid-aggregate]";
const RowSelector = ":scope > .ui-table__row:not(.ui-hidden)";
const ColumnAttribute = "data-ui-grid-column";
const PropertyAttribute = "data-ui-grid-property";
const AggregateAttribute = "data-ui-grid-aggregate";
const HostModeAttribute = "data-ui-host-mode";
const WindowAggregatesAttribute = "data-ui-window-aggregates";

export type Aggregate = "sum" | "average" | "count" | "min" | "max";

export class DataGridTotalsEngine {
    private readonly formatting: CellFormatting;
    private readonly rows: ItemRows;
    private readonly pending = new Set<HTMLElement>();
    private scheduled = false;

    public constructor(context: PluginEngineContext, formatting: CellFormatting) {
        this.formatting = formatting;
        this.rows = context.rows;
        this.syncAll(context.root.querySelectorAll<HTMLElement>(RootSelector));

        // Rows come and go, a filter hides one (its class), an edit changes a cell's value (its raw attribute), a window brings its
        // answer (the host's attribute).
        context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: ["class", RawValueAttribute, WindowAggregatesAttribute] }, grids => this.queue(grids));
    }

    private syncAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids)
            this.syncTotals(grid);
    }

    /** Every total the footer asks for, from the window's answer or from the rows the page holds. */
    private syncTotals(grid: HTMLElement): void {
        const totals = grid.querySelectorAll<HTMLElement>(TotalSelector);

        if (totals.length === 0)
            return;

        const host = grid.querySelector<HTMLElement>(HostSelector);

        if (host === null)
            return;

        const windowed = host.getAttribute(HostModeAttribute) === "windowed";
        const answered = windowed ? readAggregates(host) : null;
        // A virtualized host draws only the rows in view: the reading is over the items it holds, not over the page.
        const held = windowed ? null : this.rows.itemsOf(host);
        const numbers = this.formatting.numbers.readCulture(grid);
        const dates = this.formatting.temporal.readCulture(grid);

        for (const total of totals) {
            const column = total.getAttribute(ColumnAttribute) ?? "";
            const property = total.getAttribute(PropertyAttribute) ?? column;
            const aggregate = (total.getAttribute(AggregateAttribute) ?? "") as Aggregate;
            // A windowed source's rows in the page are one window of many: only the source can total them, and a source that sent
            // nothing leaves the footer blank rather than showing the window's sum as the column's.
            const value = windowed
                ? answered?.[property] ?? null
                : held !== null
                    ? aggregate === "count" ? held.length : aggregateOf(aggregate, heldValues(held, property, this.rows))
                    : aggregate === "count" ? host.querySelectorAll(RowSelector).length : aggregateOf(aggregate, rawValues(host, column));
            const text = value === null ? "" : formatCellValue(value, readCellShape(total), numbers, dates, this.formatting);

            if (total.textContent !== text)
                total.textContent = text;
        }
    }

    /**
     * Totals once a frame at most: a scroll through a virtualized host swaps rows batch after batch, each a reading over every item
     * it holds, and the footer's own writes come back as one more batch.
     */
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
function readAggregates(host: Element): Readonly<Record<string, unknown>> | null {
    const text = host.getAttribute(WindowAggregatesAttribute);

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
function heldValues(items: readonly unknown[], property: string, rows: ItemRows): number[] {
    const values: number[] = [];

    for (const item of items) {
        const value = toNumber(rows.readPath(item, property));

        if (value !== null)
            values.push(value);
    }

    return values;
}

/** The raw values of one column's cells, over the rows the filters leave; a cell with no number is skipped. */
function rawValues(host: Element, column: string): number[] {
    const values: number[] = [];

    for (const row of host.querySelectorAll<HTMLElement>(RowSelector)) {
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
