import assert from "node:assert/strict";
import test from "node:test";

import type { PluginEngineContext } from "ne-standard-ui";
import { DataGridEditEngine, revealDelta } from "../src/data-grid-edit-engine.ts";
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

// What the editor's field refuses, as the framework's validation judges it (`validation.refuses`): nothing unless a test says.
let refused: (value: string) => boolean = () => false;

/**
 * One editable grid on the page, a row of a servers cell and a plan cell, each editor drawn by `draw` for the cell's variant, and
 * what the page heard: the binding's sends and the cell edits.
 */
function createGrid(draw: (variant: string) => FakeElement): { grid: FakeElement; cell: FakeElement; next: FakeElement; heard: { sent: number; edits: number } } {
    const root = new FakeElement();
    const grid = FakeElement.of("ui-data-grid", { [names.componentId]: "7", tabindex: "0" });
    const cell = FakeElement.of("ui-data-grid__cell--editable", { "data-ui-grid-editor": "edit-seats", "data-ui-grid-column": "Seats" });
    const next = FakeElement.of("ui-data-grid__cell--editable", { "data-ui-grid-editor": "edit-plan", "data-ui-grid-column": "Plan" });
    const heard = { sent: 0, edits: 0 };

    fakeDocument.body.replaceChildren(root);
    fakeDocument.activeElement = fakeDocument.body;
    fakeDocument.focused = true;
    fakeWindow.listeners.clear();
    fakeWindow.timers.length = 0;
    refused = () => false;
    root.append(grid.append(FakeElement.of(names.tableScrollClass).append(FakeElement.of("", { [names.itemsHost]: "" }).append(FakeElement.of(names.tableRowClass, { [names.key]: "r1" }).append(cell, next)))));

    // The value binding listens on the root and starts before any package's engine.
    root.addEventListener("change", () => heard.sent++);
    root.addEventListener(GridEvents.cellEdit, () => heard.edits++);

    const context = {
        root,
        rows: { renderVariant: (_row: FakeElement, _id: string, variant: string) => draw(variant), isKeyTarget: () => true },
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
        tables: { columnOrder: () => ["Seats", "Plan"], isColumnHidden: () => false },
        states: { isInert: () => false },
        // The core's first stop of a container, as far as an editor's field goes.
        focus: { first: (container: FakeElement) => container.querySelector("input, textarea, select, button") },
        names,
        validation: { refuses: (field: FakeElement) => field instanceof FakeInput && refused(field.value) },
        observeComponents: () => null
    };

    new DataGridEditEngine(real<PluginEngineContext>(context));

    return { grid, cell, next, heard };
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

test("Escape after an edit sends nothing, the change Chromium raises as the editor leaves included", () => {
    const { grid, cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);
    const escape = new FakeKeyboardEvent("Escape");

    field.value = "9";
    fakeWindow.dispatch(field, escape);

    assert.ok(!isOpen(cell));
    assert.ok(escape.defaultPrevented);
    assert.equal(heard.sent, 0);
    assert.equal(heard.edits, 0);
    assert.equal(fakeDocument.activeElement, grid);
});

test("Escape after a commit on the same cell takes the second edit back", () => {
    const { cell, heard } = createGrid(() => new FakeElement().append(numberField()));

    open(cell).value = "5";
    fakeWindow.dispatch(fakeDocument.activeElement as FakeElement, new FakeKeyboardEvent("Enter"));

    const again = open(cell);

    again.value = "9";
    fakeWindow.dispatch(again, new FakeKeyboardEvent("Escape"));

    assert.ok(!isOpen(cell));
    assert.equal(heard.sent, 1);
    assert.equal(heard.edits, 1);
});

/** A select's editor with its list open, as a choice cell opens: the trigger names the list, the focus on an option in it. */
function selectEditor(): FakeElement {
    const trigger = FakeElement.of("ui-select__trigger", { "aria-expanded": "true", "aria-haspopup": "listbox", tabindex: "0" }, "button");
    const option = FakeElement.of("ui-select__option", { role: "option", tabindex: "0" });

    return new FakeElement().append(trigger, FakeElement.of("ui-select__list", { role: "listbox" }).append(option));
}

test("Tab from a select whose list is open moves on to the next cell's editor", () => {
    const { cell, next } = createGrid(variant => variant === "edit-seats" ? selectEditor() : new FakeElement().append(numberField()));

    fakeWindow.dispatch(cell, new FakeEvent("dblclick"));

    const option = cell.parent?.querySelector("[role='option']") ?? null;
    const tab = new FakeKeyboardEvent("Tab");

    assert.ok(option !== null);
    option.focus();
    fakeWindow.dispatch(option, tab);

    assert.ok(tab.defaultPrevented);
    assert.ok(!isOpen(cell));
    assert.ok(isOpen(next));
    assert.ok(fakeDocument.activeElement instanceof FakeInput);
});

test("Tab inside a popup that is not a list stays the popup's", () => {
    const button = FakeElement.of("", { tabindex: "0" }, "button");
    const { cell, next } = createGrid(() => new FakeElement().append(numberField(), FakeElement.of("", { role: "dialog" }).append(button)));

    open(cell);
    button.focus();

    const tab = new FakeKeyboardEvent("Tab");

    fakeWindow.dispatch(button, tab);

    assert.ok(!tab.defaultPrevented);
    assert.ok(isOpen(cell));
    assert.ok(!isOpen(next));
});

test("an editor past the box's edge scrolls in by what it lacks, its start first, and one inside scrolls nothing", () => {
    // A box from 100 to 500, its pinned cells ending at 220.
    assert.equal(revealDelta(560, 700, 220, 500), 200);
    assert.equal(revealDelta(150, 270, 220, 500), -70);
    assert.equal(revealDelta(300, 400, 220, 500), 0);
    // Wider than the room: its start at the pinned edge, not its end at the box's.
    assert.equal(revealDelta(400, 800, 220, 500), 180);
});

test("a commit with nothing changed sends nothing, where the field fills its value only after it meets the page", () => {
    const { cell, heard } = createGrid(() => {
        const input = new FakeInput("hidden");

        input.attributes.set(names.valueHolder, "");
        input.attributes.set(names.bindValue, "1");
        // As a select's engine writes its value input from the root's markup, on its next turn.
        fakeWindow.setTimeout(() => {
            input.value = "Trial";
        });

        return new FakeElement().append(input, FakeElement.of("", { tabindex: "0" }, "button"));
    });

    fakeWindow.dispatch(cell, new FakeEvent("dblclick"));
    fakeWindow.runTimers();
    fakeWindow.dispatch(fakeDocument.activeElement as FakeElement, new FakeKeyboardEvent("Enter"));

    assert.ok(!isOpen(cell));
    assert.equal(heard.sent, 0);
    assert.equal(heard.edits, 0);
});

test("Enter on a value the field refuses keeps the editor open, the focus in its field, and sends nothing", () => {
    const { cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    refused = value => value === "0";
    field.value = "0";
    fakeWindow.dispatch(field, new FakeKeyboardEvent("Enter"));
    fakeWindow.dispatch(field, Object.assign(new FakeEvent("change"), { isTrusted: true }));
    fakeWindow.runTimers();

    assert.ok(isOpen(cell));
    assert.equal(fakeDocument.activeElement, field);
    assert.equal(heard.sent, 0);
    assert.equal(heard.edits, 0);
});

test("Tab from a refused value stays on its cell", () => {
    const { cell, next } = createGrid(variant => variant === "edit-seats" ? new FakeElement().append(numberField()) : selectEditor());
    const field = open(cell);

    refused = value => value === "0";
    field.value = "0";
    fakeWindow.dispatch(field, new FakeKeyboardEvent("Tab"));

    assert.ok(isOpen(cell));
    assert.ok(!isOpen(next));
    assert.equal(fakeDocument.activeElement, field);
});

test("a focus that went elsewhere from a refused value comes back to the field, as a form's submit takes it back", () => {
    const { cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    refused = value => value === "0";
    field.value = "0";
    blur(field);

    assert.ok(isOpen(cell));
    assert.equal(fakeDocument.activeElement, field);
    assert.equal(heard.edits, 0);
});

test("a double click on another cell leaves a refused editor where it is", () => {
    const { cell, next } = createGrid(variant => variant === "edit-seats" ? new FakeElement().append(numberField()) : selectEditor());
    const field = open(cell);

    refused = value => value === "0";
    field.value = "0";
    fakeWindow.dispatch(next, new FakeEvent("dblclick"));

    assert.ok(isOpen(cell));
    assert.ok(!isOpen(next));
});

test("Escape takes a refused value back and closes, sending nothing", () => {
    const { grid, cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    refused = value => value === "0";
    field.value = "0";
    fakeWindow.dispatch(field, new FakeKeyboardEvent("Enter"));
    fakeWindow.dispatch(field, new FakeKeyboardEvent("Escape"));

    assert.ok(!isOpen(cell));
    assert.equal(heard.sent, 0);
    assert.equal(heard.edits, 0);
    assert.equal(fakeDocument.activeElement, grid);
});

test("an editor hidden whole over a refused value closes without it", () => {
    const { grid, cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    refused = value => value === "0";
    field.value = "0";
    field.visible = false;
    blur(field);

    assert.ok(!isOpen(cell));
    assert.equal(heard.sent, 0);
    assert.equal(heard.edits, 0);
    assert.equal(fakeDocument.activeElement, grid);
});

test("a value the row already held closes the editor though the rules fail it: nothing was given to refuse", () => {
    const { cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    refused = () => true;
    fakeWindow.dispatch(field, new FakeKeyboardEvent("Enter"));

    assert.ok(!isOpen(cell));
    assert.equal(heard.edits, 0);
});
