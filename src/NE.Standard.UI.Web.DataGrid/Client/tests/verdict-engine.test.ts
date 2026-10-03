// A closed cell judged by its editor's rules whenever its row is shown: a value that fails wears the verdict in a box the cell keeps,
// through the framework's mark and a message line it speaks through; a value put right takes the mark off; a column whose editor
// has no rules, and a nested table's row, are left alone.

import assert from "node:assert/strict";
import test from "node:test";

import type { PluginEngineContext } from "ne-standard-ui";
import { DataGridVerdictEngine, readRules } from "../src/data-grid-verdict-engine.ts";
import { ClientNames } from "../src/data-grid-names.ts";
import { FakeElement, fakeDocument, installFakeDom, real } from "./fake-dom.ts";

installFakeDom();

const names = {
    itemsHost: "data-ui-items-host",
    tableRowClass: "ui-table__row",
    tableScrollClass: "ui-table__scroll",
    validationMessage: "data-ui-validation-message"
};

type Mark = { readonly severity: string | null; readonly words: unknown };

/** One grid whose servers column is judged — its editor component 9, writing `Servers` — and a plan column that is not. */
function createGrid(items: readonly Record<string, unknown>[]): { rows: FakeElement[]; marks: Map<FakeElement, Mark>; redraw: (rows: FakeElement[]) => void } {
    const grid = FakeElement.of("ui-data-grid", { "data-ui-grid-rules": JSON.stringify({ Servers: { editor: 9, path: "Servers" } }) });
    const host = FakeElement.of("", { [names.itemsHost]: "" });
    const itemByRow = new Map<FakeElement, Record<string, unknown>>();
    const marks = new Map<FakeElement, Mark>();
    const rows = items.map(item => {
        const row = FakeElement.of(names.tableRowClass).append(
            FakeElement.of("ui-data-grid__cell--editable", { "data-ui-grid-column": "Servers" }),
            FakeElement.of("ui-data-grid__cell--editable", { "data-ui-grid-column": "Plan" })
        );

        itemByRow.set(row, item);
        return row;
    });
    let observer: ((rows: Iterable<FakeElement>) => void) | null = null;

    fakeDocument.body.replaceChildren(grid.append(FakeElement.of(names.tableScrollClass).append(host.append(...rows))));

    const context = {
        root: fakeDocument.body,
        names,
        rows: { itemOf: (row: FakeElement) => itemByRow.get(row), readPath: (item: Record<string, unknown>, path: string) => item[path] },
        validation: {
            judge: (editor: number, value: unknown) => editor === 9 && value === 0 ? { severity: "error", words: { text: "At least one." } } : null,
            mark: (field: FakeElement, severity: string | null, words: unknown) => marks.set(field, { severity, words })
        },
        observeComponents: (_root: unknown, _selector: string, _init: unknown, handler: (rows: Iterable<FakeElement>) => void) => {
            observer = handler;
            return null;
        }
    };

    new DataGridVerdictEngine(real<PluginEngineContext>(context));

    return { rows, marks, redraw: changed => observer?.(changed) };
}

function verdictOf(cell: FakeElement): FakeElement | undefined {
    return cell.children.find(child => child.classList.contains(ClientNames.verdictClass));
}

test("a value its editor's rules fail wears the verdict in a box of the cell's, with a line the mark speaks through", () => {
    const { rows, marks } = createGrid([{ Servers: 0 }]);
    const box = verdictOf(rows[0].children[0]);

    assert.ok(box !== undefined);
    assert.ok(box.children[0].hasAttribute(names.validationMessage));
    assert.deepEqual(marks.get(box), { severity: "error", words: { text: "At least one." } });
});

test("a value that passes draws nothing, and a column whose editor has no rules is not judged", () => {
    const { rows, marks } = createGrid([{ Servers: 4 }]);

    assert.equal(verdictOf(rows[0].children[0]), undefined);
    assert.equal(verdictOf(rows[0].children[1]), undefined);
    assert.equal(marks.size, 0);
});

test("a row shown again with its value put right takes the mark off", () => {
    const item: Record<string, unknown> = { Servers: 0 };
    const { rows, marks, redraw } = createGrid([item]);
    const box = verdictOf(rows[0].children[0]);

    assert.ok(box !== undefined);
    item.Servers = 3;
    redraw(rows);

    assert.deepEqual(marks.get(box), { severity: null, words: null });
});

test("the renderer's rules are read by column, and a malformed entry or text reads as none", () => {
    assert.deepEqual([...readRules(JSON.stringify({ A: { editor: 1, path: "A" }, B: { editor: "x", path: "B" } }))], [["A", { editor: 1, path: "A" }]]);
    assert.equal(readRules("{").size, 0);
    assert.equal(readRules(null).size, 0);
});
