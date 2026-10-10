import assert from "node:assert/strict";
import test from "node:test";

import type { PluginEngineContext } from "ne-standard-ui";
import { CellEditAnswers, DataGridEditEngine } from "../src/data-grid-edit-engine.ts";
import { ClientNames, GridEvents } from "../src/data-grid-names.ts";
import { FakeElement, FakeEvent, FakeInput, FakeKeyboardEvent, fakeDocument, fakeWindow, installFakeDom, real } from "./fake-dom.ts";

installFakeDom({ CSS: { escape: (text: string): string => text } });

const names = {
    componentId: "data-ui-id",
    key: "data-ui-key",
    rowFocus: "data-ui-row-focus",
    cellFocus: "data-ui-cell-focus",
    cellKey: "ui-cell-key",
    hiddenClass: "ui-hidden",
    itemsHost: "data-ui-items-host",
    valueHolder: "data-ui-value-holder",
    bindValue: "data-ui-bind-value",
    noRowOpen: "data-ui-no-row-open",
    ownsKeys: "data-ui-owns-keys",
    popupSelector: "[role='listbox'], [role='menu'], [role='dialog']",
    listTriggerSelector: ".ui-select__trigger",
    tableRowClass: "ui-table__row",
    tableScrollClass: "ui-table__scroll",
    textDescription: "data-ui-text-description"
};

// What the engine asked the page to watch, by selector: a test hands it the components a mutation touched.
const observers = new Map<string, (components: Iterable<FakeElement>) => void>();

// What the editor's field refuses, as the framework's validation judges it (`validation.refuses`): nothing unless a test says.
let refused: (value: string) => boolean = () => false;

// What a sent value waits for (`values.whenSettled`): answered at once unless a test holds it.
let settled: () => Promise<void> = () => Promise.resolve();

/** The answers the page waits on, given their turn. */
async function answered(): Promise<void> {
    await new Promise(resolve => setImmediate(resolve));
}

/** An editable cell of the servers or the plan column. */
function editableCell(column: "Seats" | "Plan"): FakeElement {
    return FakeElement.of("ui-data-grid__cell--editable", { "data-ui-grid-editor": column === "Seats" ? "edit-seats" : "edit-plan", "data-ui-grid-column": column });
}

/**
 * One editable grid on the page, a row of a servers cell and a plan cell (and a second row of the same where `rows` is 2), each editor
 * drawn by `draw` for the cell's variant, and what the page heard: the binding's sends and the cell edits.
 */
function createGrid(draw: (variant: string) => FakeElement, answers = new CellEditAnswers(), rows = 1): { grid: FakeElement; cell: FakeElement; next: FakeElement; heard: { sent: number; edits: number } } {
    const root = new FakeElement();
    const grid = FakeElement.of("ui-data-grid", { [names.componentId]: "7", tabindex: "0" });
    const cell = editableCell("Seats");
    const next = editableCell("Plan");
    const heard = { sent: 0, edits: 0 };
    const host = FakeElement.of("", { [names.itemsHost]: "" }).append(FakeElement.of(names.tableRowClass, { [names.key]: "r1" }).append(cell, next));

    fakeDocument.body.replaceChildren(root);
    fakeDocument.activeElement = fakeDocument.body;
    fakeDocument.focused = true;
    fakeWindow.listeners.clear();
    fakeWindow.timers.length = 0;
    refused = () => false;
    settled = () => Promise.resolve();
    if (rows > 1)
        host.append(FakeElement.of(names.tableRowClass, { [names.key]: "r2" }).append(editableCell("Seats"), editableCell("Plan")));

    root.append(grid.append(FakeElement.of(names.tableScrollClass).append(host)));

    // The value binding listens on the root and starts before any package's engine.
    root.addEventListener("change", () => heard.sent++);
    root.addEventListener(GridEvents.cellEdit, () => heard.edits++);

    const context = {
        root,
        rows: {
            renderVariant: (_row: FakeElement, _id: string, variant: string) => draw(variant),
            isKeyTarget: () => true,
            // The core's cell cursor: a row's cells less an editor standing over one, and the cursor moved onto a cell.
            cellsOf: (row: FakeElement) => row.children.filter(child => !child.classList.contains(ClientNames.editorClass)),
            moveCursor: (row: FakeElement, target: FakeElement) => {
                for (const marked of grid.querySelectorAll(`[${names.cellFocus}]`))
                    marked.attributes.delete(names.cellFocus);

                row.attributes.set(names.rowFocus, "");
                target.attributes.set(names.cellFocus, "");
            }
        },
        values: {
            read: (element: FakeElement) => element instanceof FakeInput ? element.value : null,
            hold: () => undefined,
            release: () => undefined,
            write: (element: FakeElement, value: unknown) => {
                if (element instanceof FakeInput)
                    element.value = String(value);

                return true;
            },
            whenSettled: () => settled()
        },
        tables: { columnOrder: () => ["Seats", "Plan"], isColumnHidden: () => false },
        states: { isInert: () => false },
        // The core's first stop of a container, as far as an editor's field goes, and its giving the keyboard back to a row's cell.
        focus: {
            first: (container: FakeElement) => container.querySelector("input, textarea, select, button"),
            giveBack: (element: FakeElement) => {
                if (fakeDocument.activeElement !== fakeDocument.body)
                    return;

                element.attributes.set(names.cellFocus, "");
                grid.focus();
            }
        },
        names,
        validation: { refuses: (field: FakeElement) => field instanceof FakeInput && refused(field.value) },
        // The core's reading: Safari's Enter that ends a composition carries the key code alone.
        shortcuts: { isComposing: (event: { isComposing: boolean; keyCode?: number }) => event.isComposing || event.keyCode === 229 },
        observeComponents: (_root: FakeElement, selector: string, _init: unknown, handler: (components: Iterable<FakeElement>) => void) => {
            observers.set(selector, handler);
            return null;
        }
    };

    new DataGridEditEngine(real<PluginEngineContext>(context), answers);

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

test("Enter after the reader's return sends the value the window switch held back, once", async () => {
    const { grid, cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    field.value = "12";
    fakeDocument.focused = false;
    fakeWindow.dispatch(field, Object.assign(new FakeEvent("change"), { isTrusted: true }));
    fakeDocument.focused = true;
    fakeWindow.dispatch(field, new FakeKeyboardEvent("Enter"));
    fakeWindow.runTimers();
    await answered();

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

test("an editor hidden whole with its column commits and leaves the keyboard on the grid, not the page", async () => {
    const { grid, cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    field.value = "12";
    // `visibility: hidden`, as a column hidden at a narrower width: the field keeps its box and refuses the focus.
    field.visible = false;
    blur(field);
    await answered();

    assert.ok(!isOpen(cell));
    assert.equal(heard.sent, 1);
    assert.equal(heard.edits, 1);
    assert.equal(fakeDocument.activeElement, grid);
});

test("a focus that went elsewhere commits and stays where it went", async () => {
    const { cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    field.value = "12";
    blur(field);
    await answered();

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

    // The editor claims its keys from the grid's rows and its Escape from a dialog, a flyout or a drawer the grid stands in.
    assert.notEqual(field.closest(`[${names.ownsKeys}]`), null);

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

/** A select's editor as it opens: its value input holding the plan, the trigger naming its open list. */
function choiceEditor(): { editor: FakeElement; value: FakeInput; trigger: FakeElement } {
    const value = new FakeInput("hidden");
    const trigger = FakeElement.of("ui-select__trigger", { "aria-expanded": "true", "aria-haspopup": "listbox", tabindex: "0" }, "button");

    value.value = "Starter";
    value.attributes.set(names.valueHolder, "");
    value.attributes.set(names.bindValue, "1");

    return { editor: new FakeElement().append(value, trigger), value, trigger };
}

test("a choice in a cell's list commits and gives the keyboard back to the grid once the list closes", async () => {
    const choice = choiceEditor();
    const { grid, cell, heard } = createGrid(() => choice.editor);

    fakeWindow.dispatch(cell, new FakeEvent("dblclick"));
    choice.trigger.focus();
    choice.value.value = "Pro";
    choice.trigger.attributes.set("aria-expanded", "false");
    fakeWindow.dispatch(choice.value, new FakeEvent("change"));
    fakeWindow.runTimers();
    await answered();

    assert.ok(!isOpen(cell));
    assert.equal(heard.edits, 1);
    assert.equal(fakeDocument.activeElement, grid);
});

test("a choice cell's list is opened once the select has met the page, so it opens on the cell's value, and not for an editor gone", async () => {
    const choice = choiceEditor();
    const { cell } = createGrid(() => choice.editor);
    let pressed = 0;

    choice.trigger.attributes.set("aria-expanded", "false");
    choice.trigger.addEventListener("click", () => pressed++);
    fakeWindow.dispatch(cell, new FakeEvent("dblclick"));

    // The select's engine marks its chosen option on the insertion's record, a microtask ahead of the press.
    assert.equal(pressed, 0);
    await Promise.resolve();
    assert.equal(pressed, 1);

    fakeWindow.dispatch(choice.trigger, new FakeKeyboardEvent("Escape"));
    choice.trigger.attributes.set("aria-expanded", "false");
    fakeWindow.dispatch(cell, new FakeEvent("dblclick"));
    fakeWindow.dispatch(fakeDocument.activeElement!, new FakeKeyboardEvent("Escape"));
    await Promise.resolve();

    assert.equal(pressed, 1);
});

test("a choice that leaves its list open, one choosing many, keeps the editor", () => {
    const choice = choiceEditor();
    const { cell } = createGrid(() => choice.editor);

    fakeWindow.dispatch(cell, new FakeEvent("dblclick"));
    choice.value.value = "Pro";
    fakeWindow.dispatch(choice.value, new FakeEvent("change"));
    fakeWindow.runTimers();

    assert.ok(isOpen(cell));
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

test("Enter that ends an input method's composition, Safari's with its key code alone, leaves the editor open", () => {
    const { cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    field.value = "34";
    fakeWindow.dispatch(field, Object.assign(new FakeKeyboardEvent("Enter"), { keyCode: 229 }));
    fakeWindow.runTimers();

    assert.ok(isOpen(cell));
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

test("a committed editor stays over its cell, taking nothing, until its value is answered, the keyboard back on the cell meanwhile", async () => {
    let answer = (): void => undefined;
    const { grid, cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);
    // The variant's content, inside the editor the grid wraps it in.
    const editor = field.parent?.parent as FakeElement & { inert?: boolean };

    settled = () => new Promise(resolve => {
        answer = resolve;
    });
    field.value = "12";
    fakeWindow.dispatch(field, new FakeKeyboardEvent("Enter"));
    await answered();

    assert.equal(heard.edits, 1);
    assert.ok(isOpen(cell));
    assert.ok(editor.parent !== null && editor.inert === true);
    assert.equal(fakeDocument.activeElement, grid);
    assert.ok(cell.hasAttribute(names.cellFocus));

    answer();
    await answered();

    assert.ok(!isOpen(cell));
    assert.equal(editor.parent, null);
});

test("with a command on the edit, the editor waits for that command's answer, which writes what the cell shows", async () => {
    const answers = new CellEditAnswers();
    const { cell } = createGrid(() => new FakeElement().append(numberField()), answers);
    const taken: FakeEvent[] = [];

    // As the pipeline takes the event, through the registration's `started`.
    cell.closest(".ui-data-grid")?.addEventListener(GridEvents.cellEdit, domEvent => {
        taken.push(domEvent);
        answers.start(real<Event>(domEvent));
    });

    const field = open(cell);

    field.value = "12";
    fakeWindow.dispatch(field, new FakeKeyboardEvent("Enter"));
    await answered();

    assert.ok(isOpen(cell));

    answers.finish(real<Event>(taken[0]));
    await answered();

    assert.ok(!isOpen(cell));
});

test("a double click on a cell whose commit is unanswered opens a fresh editor in its place", () => {
    const { cell } = createGrid(() => new FakeElement().append(numberField()));

    settled = () => new Promise(() => undefined);
    open(cell).value = "12";
    fakeWindow.dispatch(fakeDocument.activeElement as FakeElement, new FakeKeyboardEvent("Enter"));

    const again = open(cell);

    assert.equal(cell.parent?.querySelectorAll(".ui-data-grid__editor").length, 1);
    assert.equal((again.parent?.parent as { inert?: boolean } | null)?.inert, undefined);
});

/** The core offering a key on the cursor's cell (`names.cellKey`); answers the keydown, whose default a taker may spend. */
function offerCellKey(cell: FakeElement, key: string): { offer: CustomEvent; keyboard: FakeKeyboardEvent } {
    const keyboard = new FakeKeyboardEvent(key);
    const offer = new CustomEvent(names.cellKey, { bubbles: true, cancelable: true, detail: { cell, key, keyboard } });

    cell.dispatchEvent(offer);

    return { offer, keyboard };
}

test("Enter, F2 or a typed character on the cursor's editable cell opens its editor; a character replaces the value its field held", async () => {
    const { grid, cell, next } = createGrid(() => new FakeElement().append(numberField()));

    grid.focus();

    for (const key of ["Enter", "F2"]) {
        const { offer, keyboard } = offerCellKey(next, key);

        assert.ok(offer.defaultPrevented, key);
        assert.ok(keyboard.defaultPrevented, key);
        assert.ok(isOpen(next), key);
        assert.ok(next.hasAttribute(names.cellFocus), key);

        fakeWindow.dispatch(fakeDocument.activeElement as FakeElement, new FakeKeyboardEvent("Escape"));
        assert.ok(!isOpen(next));
    }

    let typed = 0;

    cell.parent?.addEventListener("input", () => typed++);

    const { offer, keyboard } = offerCellKey(cell, "7");
    const field = fakeDocument.activeElement;

    await answered();

    assert.ok(offer.defaultPrevented);
    assert.ok(keyboard.defaultPrevented);
    assert.ok(field instanceof FakeInput);
    assert.equal(field.value, "7");
    assert.equal(typed, 1);
});

test("a cell offered while the grid's editing is off, or one that does not edit, is left to the row", () => {
    const { grid, cell } = createGrid(() => new FakeElement().append(numberField()));
    const plain = FakeElement.of("ui-table__cell", { role: "gridcell" });

    (cell.parent as FakeElement).append(plain);
    assert.ok(!offerCellKey(plain, "Enter").offer.defaultPrevented);

    grid.attributes.set("data-ui-grid-readonly", "");
    assert.ok(!offerCellKey(cell, "Enter").offer.defaultPrevented);
    assert.ok(!isOpen(cell));
});

test("Tab from a row's last editable cell commits and opens the next row's first; Shift+Tab comes back", () => {
    const { cell, next } = createGrid(() => new FakeElement().append(numberField()), new CellEditAnswers(), 2);
    const second = (cell.parent as FakeElement).nextElementSibling as FakeElement;

    open(next);
    fakeWindow.dispatch(fakeDocument.activeElement as FakeElement, new FakeKeyboardEvent("Tab"));

    assert.ok(!isOpen(next));
    assert.ok(isOpen(second.children[0]));
    assert.ok(second.children[0].hasAttribute(names.cellFocus));

    fakeWindow.dispatch(fakeDocument.activeElement as FakeElement, Object.assign(new FakeKeyboardEvent("Tab"), { shiftKey: true }));

    assert.ok(isOpen(next));
});

test("an editor carries no id and no cursor mark of its cell's: the cell keeps both", () => {
    const { cell } = createGrid(() => new FakeElement().append(numberField()));

    cell.attributes.set("id", "ui-cell-1");
    cell.attributes.set(names.cellFocus, "");
    open(cell);

    const editor = cell.nextElementSibling as FakeElement;

    assert.ok(editor.classList.contains(ClientNames.editorClass));
    assert.ok(!editor.hasAttribute("id"));
    assert.ok(!editor.hasAttribute(names.cellFocus));
});

test("a cell whose text shows a description is marked two-line as its description comes and goes, and its editor is not", () => {
    const { cell, next } = createGrid(() => new FakeElement().append(numberField()));
    const text = FakeElement.of("ui-text", { [names.componentId]: "9", [names.textDescription]: "" });

    assert.ok(!cell.hasAttribute(ClientNames.twoLine));

    cell.append(text);
    observers.get(".ui-data-grid__cell--editable")?.([cell, next]);

    assert.ok(cell.hasAttribute(ClientNames.twoLine));
    assert.ok(!next.hasAttribute(ClientNames.twoLine));

    open(cell);

    assert.ok(!(cell.nextElementSibling as FakeElement).hasAttribute(ClientNames.twoLine));

    text.removeAttribute(names.textDescription);
    observers.get(".ui-data-grid__cell--editable")?.([cell]);

    assert.ok(!cell.hasAttribute(ClientNames.twoLine));
});

test("a value the row already held closes the editor though the rules fail it: nothing was given to refuse", () => {
    const { cell, heard } = createGrid(() => new FakeElement().append(numberField()));
    const field = open(cell);

    refused = () => true;
    fakeWindow.dispatch(field, new FakeKeyboardEvent("Enter"));

    assert.ok(!isOpen(cell));
    assert.equal(heard.edits, 0);
});
