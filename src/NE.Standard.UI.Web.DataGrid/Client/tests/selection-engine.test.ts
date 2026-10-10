// The grid's column of boxes from the keyboard: Enter on the cursor's box cell turns the row's box, as Space does, rather than
// raising the row's open; a row that refuses the choice, another cell and a key an editor took are left alone.

import assert from "node:assert/strict";
import test from "node:test";

import type { PluginEngineContext } from "ne-standard-ui";
import { DataGridSelectionEngine } from "../src/data-grid-selection-engine.ts";
import { GridAttributes } from "../src/data-grid-names.ts";
import { FakeElement, FakeKeyboardEvent, fakeDocument, installFakeDom, real } from "./fake-dom.ts";

installFakeDom();

const names = {
    itemsHost: "data-ui-items-host",
    cellKey: "ui-cell-key",
    selected: "data-ui-selected",
    selectedKey: "data-ui-selected-key",
    selectedKeys: "data-ui-selected-keys",
    unselectable: "data-ui-unselectable",
    hiddenClass: "ui-hidden",
    tableRowClass: "ui-table__row",
    tableScrollClass: "ui-table__scroll"
};

/** A grid of two rows, each a box cell and a plain one; `toggled` lists the rows the framework was asked to take or release. */
function createGrid(): { rows: FakeElement[]; toggled: FakeElement[] } {
    const row = (): FakeElement => FakeElement.of(names.tableRowClass).append(
        FakeElement.of("cell", { role: "gridcell", [GridAttributes.select]: "" }).append(FakeElement.of("", { type: "checkbox" }, "input")),
        FakeElement.of("cell", { role: "gridcell" })
    );
    const rows = [row(), row()];
    const root = new FakeElement();
    const toggled: FakeElement[] = [];

    root.append(FakeElement.of("ui-data-grid").append(FakeElement.of(names.tableScrollClass).append(FakeElement.of("", { [names.itemsHost]: "" }).append(...rows))));
    fakeDocument.body.replaceChildren(root);

    const context = {
        root,
        names,
        selection: { toggle: (target: FakeElement) => toggled.push(target), isSelected: () => false, setSelected: () => undefined },
        states: { isInert: () => false, setDisabled: () => undefined },
        propertyPatchEngine: { addValueChangeHandler: () => undefined },
        observeComponents: () => null
    };

    new DataGridSelectionEngine(real<PluginEngineContext>(context));

    return { rows, toggled };
}

/** The core offering a key on the cursor's cell (`names.cellKey`) before it acts; answers whether a taker claimed it. */
function offer(cell: FakeElement, key: string, taken = false): boolean {
    const keyboard = new FakeKeyboardEvent(key);
    const domEvent = new CustomEvent(names.cellKey, { bubbles: true, cancelable: true, detail: { cell, key, keyboard } });

    if (taken)
        domEvent.preventDefault();

    cell.dispatchEvent(domEvent);

    return domEvent.defaultPrevented && !taken;
}

test("Enter on a row's box cell turns its box instead of raising the row's open", () => {
    const { rows, toggled } = createGrid();

    assert.equal(offer(rows[1].children[0], "Enter"), true);
    assert.deepEqual(toggled, [rows[1]]);
});

test("another cell, another key, a key already taken and a row that refuses the choice are left to the row", () => {
    const { rows, toggled } = createGrid();

    assert.equal(offer(rows[0].children[1], "Enter"), false);
    assert.equal(offer(rows[0].children[0], "F2"), false);
    assert.equal(offer(rows[0].children[0], "Enter", true), false);

    rows[1].setAttribute(names.unselectable, "");
    assert.equal(offer(rows[1].children[0], "Enter"), false);
    assert.deepEqual(toggled, []);
});
