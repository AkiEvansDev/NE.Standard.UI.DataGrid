import assert from "node:assert/strict";
import test from "node:test";

import type { PluginEngineContext } from "ne-standard-ui";
import { DataGridDetailEngine } from "../src/data-grid-detail-engine.ts";
import { ClientNames, GridAttributes, GridClasses } from "../src/data-grid-names.ts";
import { FakeElement, FakeEvent, FakeKeyboardEvent, fakeDocument, fakeWindow, installFakeDom, real } from "./fake-dom.ts";

/** A click as the browser counts it: the first of a double click is 1, the second 2. */
class FakeMouseEvent extends FakeEvent {
    public readonly detail: number;

    public constructor(detail: number) {
        super("click");
        this.detail = detail;
    }
}

installFakeDom({ MouseEvent: FakeMouseEvent });

const names = {
    componentId: "data-ui-id",
    itemsHost: "data-ui-items-host",
    noRowOpen: "data-ui-no-row-open",
    noRowDrag: "data-ui-no-row-drag",
    rowFocus: "data-ui-row-focus",
    tableRowClass: "ui-table__row",
    tableScrollClass: "ui-table__scroll"
};

/** A grid whose rows open their detail on a click, one at a time, and the rows' cells to press; the first row has a chevron. */
function createGrid(): { first: FakeElement; second: FakeElement; drawn: FakeElement[]; grid: FakeElement; chevron: FakeElement } {
    const root = new FakeElement();
    const chevron = new FakeElement("button");
    const first = FakeElement.of(names.tableRowClass).append(FakeElement.of("cell"), FakeElement.of(GridClasses.detailCell).append(chevron));
    const second = FakeElement.of(names.tableRowClass).append(FakeElement.of("cell"));
    const drawn: FakeElement[] = [];

    fakeDocument.body.replaceChildren(root);
    fakeWindow.listeners.clear();
    fakeWindow.timers.length = 0;
    const grid = FakeElement.of("ui-data-grid", { [names.componentId]: "7", [GridAttributes.expandOnClick]: "" })
        .append(FakeElement.of(names.tableScrollClass).append(FakeElement.of("", { [names.itemsHost]: "" }).append(first, second)));

    root.append(grid);

    const context = {
        root,
        rows: {
            renderVariant: () => {
                const content = new FakeElement();

                drawn.push(content);

                return content;
            },
            isKeyTarget: () => true
        },
        names,
        states: { isInert: () => false },
        observeComponents: () => null
    };

    new DataGridDetailEngine(real<PluginEngineContext>(context));

    return { first, second, drawn, grid, chevron };
}

function click(row: FakeElement, detail: number): void {
    fakeWindow.dispatch(row.children[0], new FakeMouseEvent(detail));
}

/** Both clicks of a double click, then the row's `open` the framework raises for it. */
function doubleClick(row: FakeElement): void {
    click(row, 1);
    click(row, 2);
    fakeWindow.dispatch(row, new FakeEvent("open"));
}

/** The detail element a row holds, or null while it is in. */
function detailOf(row: FakeElement): FakeElement | null {
    return row.hasAttribute(ClientNames.expanded) ? row.querySelector(`:scope > .${ClientNames.detailClass}`) : null;
}

test("a double click puts the details back as they stood before its first click, the one it closed included", () => {
    const { first, second } = createGrid();

    click(first, 1);

    const shown = detailOf(first);

    doubleClick(second);

    assert.notEqual(shown, null);
    assert.equal(detailOf(first), shown);
    assert.equal(detailOf(second), null);
});

test("an open detail is marked as no part of the row to lift, so a press in it never drags the row", () => {
    const { first } = createGrid();

    click(first, 1);

    assert.equal(detailOf(first)?.hasAttribute(names.noRowDrag), true);
});

test("a double click on an open row keeps the detail it had, not one drawn again", () => {
    const { first, drawn } = createGrid();

    click(first, 1);

    const shown = detailOf(first);

    doubleClick(first);

    assert.equal(detailOf(first), shown);
    assert.equal(first.querySelectorAll(`:scope > .${ClientNames.detailClass}`).length, 1);
    assert.equal(drawn.length, 2);
});

test("a double click inside an open detail is the detail's, whatever an earlier click left", () => {
    const { first } = createGrid();

    click(first, 1);

    const shown = detailOf(first);

    assert.ok(shown !== null);
    fakeWindow.dispatch(shown, new FakeMouseEvent(1));
    fakeWindow.dispatch(shown, new FakeMouseEvent(2));
    fakeWindow.dispatch(first, new FakeEvent("open"));

    assert.equal(detailOf(first), shown);
});

test("Enter on the row still opens and closes its detail", () => {
    const { first } = createGrid();

    fakeWindow.dispatch(first, new FakeKeyboardEvent("Enter"));
    fakeWindow.dispatch(first, new FakeEvent("open"));
    fakeWindow.runTimers();

    assert.notEqual(detailOf(first), null);

    fakeWindow.dispatch(first, new FakeKeyboardEvent("Enter"));
    fakeWindow.dispatch(first, new FakeEvent("open"));
    fakeWindow.runTimers();

    assert.equal(detailOf(first), null);
});

test("Enter on the row toggles its detail once, though the framework raises the row's click for it too", () => {
    const { first } = createGrid();

    // The core's keyboard press of a row (`ui-row-press`): the row's click command, never a click this engine counts.
    fakeWindow.dispatch(first, new FakeKeyboardEvent("Enter"));
    fakeWindow.dispatch(first, new FakeEvent("ui-row-press"));
    fakeWindow.dispatch(first, new FakeEvent("open"));
    fakeWindow.runTimers();

    assert.notEqual(detailOf(first), null);
});

test("Right opens the keyboard's row's detail and Left closes it, as its chevron does by a click", () => {
    const { first, grid, chevron } = createGrid();

    first.setAttribute(names.rowFocus, "");

    const right = new FakeKeyboardEvent("ArrowRight");

    fakeWindow.dispatch(grid, right);
    assert.equal(right.defaultPrevented, true);
    assert.notEqual(detailOf(first), null);
    assert.equal(chevron.getAttribute("aria-expanded"), "true");

    // Again Right leaves it open; Left closes it.
    fakeWindow.dispatch(grid, new FakeKeyboardEvent("ArrowRight"));
    assert.notEqual(detailOf(first), null);

    fakeWindow.dispatch(grid, new FakeKeyboardEvent("ArrowLeft"));
    assert.equal(detailOf(first), null);
});

test("Right on a row with no chevron leaves the key alone", () => {
    const { second, grid } = createGrid();

    second.setAttribute(names.rowFocus, "");

    const right = new FakeKeyboardEvent("ArrowRight");

    fakeWindow.dispatch(grid, right);
    assert.equal(right.defaultPrevented, false);
    assert.equal(detailOf(second), null);
});
