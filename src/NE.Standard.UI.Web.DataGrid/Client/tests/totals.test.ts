import assert from "node:assert/strict";
import test from "node:test";

import type { PluginEngineContext } from "ne-standard-ui";
import type { CellFormatting } from "../src/data-grid-cell.ts";
import { aggregateOf, DataGridTotalsEngine } from "../src/data-grid-totals-engine.ts";
import { GridAttributes, GridClasses } from "../src/data-grid-names.ts";
import { FakeElement, fakeDocument, installFakeDom, real } from "./fake-dom.ts";

// A pass is run as soon as it is asked for, where the page would wait for the next frame.
installFakeDom({ CSS: { escape: (text: string): string => text }, requestAnimationFrame: (callback: () => void) => callback() });

test("a total is one number over the values, and a count stands even over none", () => {
    assert.equal(aggregateOf("sum", [1, 2, 3.5]), 6.5);
    assert.equal(aggregateOf("average", [2, 4]), 3);
    assert.equal(aggregateOf("min", [5, -1, 3]), -1);
    assert.equal(aggregateOf("max", [5, -1, 3]), 5);
    assert.equal(aggregateOf("count", [5, -1, 3]), 3);
    assert.equal(aggregateOf("count", []), 0);
    assert.equal(aggregateOf("sum", []), null);
    assert.equal(aggregateOf("average", []), null);
});

test("a least or greatest over more values than a call can take as arguments still answers", () => {
    const values = Array.from({ length: 300_000 }, (_, index) => index % 1000 - 500);

    assert.equal(aggregateOf("min", values), -500);
    assert.equal(aggregateOf("max", values), 499);
});

/** A grid over a virtualized host holding `items`, a sum of their seats in its footer, and how often its totals read the items. */
function virtualizedGrid(items: readonly { readonly Seats: number }[]): { grid: FakeElement; total: FakeElement; reads: () => number; mutate: () => void; switchLanguage: () => void; held: { version: number } } {
    const total = FakeElement.of(GridClasses.total, { [GridAttributes.aggregate]: "sum", [GridAttributes.column]: "Seats" });
    const host = FakeElement.of("", { "data-ui-items-host": "", "data-ui-host-mode": "virtualized" });
    const grid = FakeElement.of("ui-data-grid").append(FakeElement.of("ui-table__scroll").append(host, FakeElement.of(GridClasses.footer).append(total)));
    const root = FakeElement.of("page").append(grid);
    const held = { version: 1 };
    let reads = 0;
    let observed: ((grids: Iterable<FakeElement>) => void) | null = null;
    let switched: (() => void) | null = null;

    fakeDocument.body.replaceChildren(root);

    const context = {
        root,
        names: {
            tableScrollClass: "ui-table__scroll",
            hiddenClass: "ui-hidden",
            tableRowClass: "ui-table__row",
            itemsHost: "data-ui-items-host",
            hostMode: "data-ui-host-mode",
            windowAggregates: "data-ui-window-aggregates",
            tableHidden: "data-ui-table-hidden"
        },
        rows: {
            itemsOf: () => {
                reads++;
                return items;
            },
            itemsVersion: () => held.version,
            readPath: (item: Record<string, unknown>, path: string) => item[path]
        },
        observeComponents: (_root: FakeElement, _selector: string, _init: unknown, handler: (grids: Iterable<FakeElement>) => void) => {
            observed = handler;
            return null;
        },
        strings: {
            onChange: (listener: () => void) => {
                switched = listener;
            }
        }
    };
    const numbers = { readCulture: () => ({}), parseInvariant: (text: string) => Number(text) };
    const formatting = { numbers, temporal: { readCulture: () => ({}) }, strings: {} };

    new DataGridTotalsEngine(real<PluginEngineContext>(context), real<CellFormatting>(formatting));

    return { grid, total, reads: () => reads, mutate: () => observed?.([grid]), switchLanguage: () => switched?.(), held };
}

test("a virtualized grid's totals read its items again only when they moved, a column was hidden or the language switched; never for a scroll", () => {
    const items = [{ Seats: 3 }, { Seats: 4 }];
    const { grid, total, reads, mutate, switchLanguage, held } = virtualizedGrid(items);

    assert.equal(total.textContent, "7");
    assert.equal(reads(), 1);

    // A scroll: rows swapped and their classes changed, the items as they were.
    mutate();
    mutate();

    assert.equal(reads(), 1);

    items.push({ Seats: 5 });
    held.version++;
    mutate();

    assert.equal(total.textContent, "12");
    assert.equal(reads(), 2);

    grid.setAttribute("data-ui-table-hidden", "[\"Plan\"]");
    mutate();
    switchLanguage();

    assert.equal(reads(), 4);
});
