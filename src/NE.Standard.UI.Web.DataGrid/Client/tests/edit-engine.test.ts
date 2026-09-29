import assert from "node:assert/strict";
import test from "node:test";

import type { PluginEngineContext } from "ne-standard-ui";
import { DataGridEditEngine } from "../src/data-grid-edit-engine.ts";
import { ClientNames, GridEvents } from "../src/data-grid-names.ts";
import { FakeElement, FakeEvent, FakeInput, FakeKeyboardEvent, fakeDocument, fakeWindow, installFakeDom, real } from "./fake-dom.ts";

installFakeDom({ CSS: { escape: (text: string): string => text } });

const names = {
    componentId: "data-ui-id",
    key: "data-ui-key",
    rowFocus: "data-ui-row-focus",
    itemsHost: "data-ui-items-host",
    valueHolder: "data-ui-value-holder",
    bindValue: "data-ui-bind-value",
    noRowOpen: "data-ui-no-row-open",
    popupSelector: "[role='listbox'], [role='menu'], [role='dialog']",
    listTriggerSelector: ".ui-select__trigger",
    tableRowClass: "ui-table__row",
    tableScrollClass: "ui-table__scroll"
};

/** One editable grid on the page, its editor drawn by `draw`, and what the page heard: the binding's sends and the cell edits. */
function createGrid(draw: () => FakeElement): { grid: FakeElement; cell: FakeElement; heard: { sent: number; edits: number } } {
    const root = new FakeElement();
    const grid = FakeElement.of("ui-data-grid", { [names.componentId]: "7", tabindex: "0" });
    const cell = FakeElement.of("ui-data-grid__cell--editable", { "data-ui-grid-editor": "edit-seats", "data-ui-grid-column": "Seats" });
    const heard = { sent: 0, edits: 0 };

    fakeDocument.body.replaceChildren(root);
    fakeDocument.activeElement = fakeDocument.body;
    fakeDocument.focused = true;
    fakeWindow.listeners.clear();
    fakeWindow.timers.length = 0;
    root.append(grid.append(FakeElement.of(names.tableScrollClass).append(FakeElement.of("", { [names.itemsHost]: "" }).append(FakeElement.of(names.tableRowClass, { [names.key]: "r1" }).append(cell)))));

    // The value binding listens on the root and starts before any package's engine.
    root.addEventListener("change", () => heard.sent++);
    root.addEventListener(GridEvents.cellEdit, () => heard.edits++);

    const context = {
        root,
        rows: { renderVariant: draw, isKeyTarget: () => true },
        values: {
            read: (element: FakeElement) => element instanceof FakeInput ? element.value : null,
            hold: () => undefined,
            release: () => undefined,
            write: (element: FakeElement, value: unknown) => {
                if (element instanceof FakeInput)
                    element.value = String(value);

                return true;
            }
        },
        tables: { columnOrder: () => ["Seats"], isColumnHidden: () => false },
        states: { isInert: () => false },
        names,
        observeComponents: () => null
    };

    new DataGridEditEngine(real<PluginEngineContext>(context));

    return { grid, cell, heard };
}

/** A number field holding 33, as the servers column's editor draws it. */
function numberField(): FakeInput {
    const input = new FakeInput("number");

    input.value = "33";
    input.attributes.set(names.bindValue, "1");

    return input;
}

/** Opens the cell's editor by a double click and answers its field, focused. */
function open(cell: FakeElement): FakeInput {
    fakeWindow.dispatch(cell, new FakeEvent("dblclick"));

    const field = fakeDocument.activeElement;

    assert.ok(field instanceof FakeInput);
    assert.ok(cell.classList.contains(ClientNames.editingCellClass));

    return field;
}

/** The field loses the focus to nothing, as the browser's blur does; the grid follows once the blur's own work is done. */
function blur(field: FakeElement): void {
    field.blur();
    fakeWindow.runTimers();
}

function isOpen(cell: FakeElement): boolean {
    return cell.classList.contains(ClientNames.editingCellClass);
}

test("the window losing the focus leaves the editor open, and the change its blur raises is not sent", () => {
    const { cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    field.value = "12";
    fakeDocument.focused = false;
    fakeWindow.dispatch(field, Object.assign(new FakeEvent("change"), { isTrusted: true }));
    fakeWindow.dispatch(field, Object.assign(new FakeEvent("focusout"), { relatedTarget: null }));
    fakeWindow.runTimers();

    assert.ok(isOpen(cell));
    assert.equal(fakeDocument.activeElement, field);
    assert.equal(heard.sent, 0);
    assert.equal(heard.edits, 0);
});

test("Enter after the reader's return sends the value the window switch held back, once", () => {
    const { grid, cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    field.value = "12";
    fakeDocument.focused = false;
    fakeWindow.dispatch(field, Object.assign(new FakeEvent("change"), { isTrusted: true }));
    fakeDocument.focused = true;
    fakeWindow.dispatch(field, new FakeKeyboardEvent("Enter"));
    fakeWindow.runTimers();

    assert.ok(!isOpen(cell));
    assert.equal(heard.sent, 1);
    assert.equal(heard.edits, 1);
    assert.equal(fakeDocument.activeElement, grid);
});

test("a change raised from script goes out while the window is away", () => {
    const { cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    fakeDocument.focused = false;
    fakeWindow.dispatch(field, new FakeEvent("change"));

    assert.equal(heard.sent, 1);
});

test("a part that hid under the focus gives it back to the editor's field, which stays open", () => {
    const part = FakeElement.of("", { tabindex: "-1" }, "button");
    const { cell, heard } = createGrid(() => new FakeElement().append(numberField(), part));
    const field = open(cell);

    part.focus();
    part.laidOut = false;
    blur(part);

    assert.ok(isOpen(cell));
    assert.equal(fakeDocument.activeElement, field);
    assert.equal(heard.edits, 0);
});

test("an editor hidden whole with its column commits and leaves the keyboard on the grid, not the page", () => {
    const { grid, cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    field.value = "12";
    // `visibility: hidden`, as a column hidden at a narrower width: the field keeps its box and refuses the focus.
    field.visible = false;
    blur(field);

    assert.ok(!isOpen(cell));
    assert.equal(heard.sent, 1);
    assert.equal(heard.edits, 1);
    assert.equal(fakeDocument.activeElement, grid);
});

test("a focus that went elsewhere commits and stays where it went", () => {
    const { cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    field.value = "12";
    blur(field);

    assert.ok(!isOpen(cell));
    assert.equal(heard.edits, 1);
    assert.equal(fakeDocument.activeElement, fakeDocument.body);
});

test("Enter while the field's opener says its list is open is the list's", () => {
    const opener = FakeElement.of("ui-select__trigger", { "aria-expanded": "true", tabindex: "0" });
    const { cell, heard } = createGrid(() => new FakeElement().append(numberField(), opener));
    const field = open(cell);
    const enter = new FakeKeyboardEvent("Enter");

    fakeWindow.dispatch(field, enter);

    assert.ok(isOpen(cell));
    assert.ok(!enter.defaultPrevented);
    assert.equal(heard.edits, 0);
});
