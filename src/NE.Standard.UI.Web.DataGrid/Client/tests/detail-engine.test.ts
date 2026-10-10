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
    cellFocus: "data-ui-cell-focus",
    cellKey: "ui-cell-key",
    tableRowClass: "ui-table__row",
    tableScrollClass: "ui-table__scroll"
};

/** Where the core's cell cursor was moved to by the engine (`rows.moveCursor`): the rows, in order. */
const moved: FakeElement[] = [];

/** A grid whose rows open their detail on a click, one at a time, and the rows' cells to press; the first row has a chevron. */
function createGrid(): { first: FakeElement; second: FakeElement; drawn: FakeElement[]; grid: FakeElement; chevron: FakeElement } {
    const root = new FakeElement();
    const chevron = new FakeElement("button");
    const first = FakeElement.of(names.tableRowClass).append(FakeElement.of("cell", { role: "gridcell" }), FakeElement.of(GridClasses.detailCell, { role: "gridcell" }).append(chevron));
    const second = FakeElement.of(names.tableRowClass).append(FakeElement.of("cell", { role: "gridcell" }));
    const drawn: FakeElement[] = [];

    fakeDocument.body.replaceChildren(root);
    fakeWindow.listeners.clear();
    fakeWindow.timers.length = 0;
    moved.length = 0;
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
            isKeyTarget: () => true,
            // The core's cell cursor: a row's own cells, as its columns stand.
            cellsOf: (row: FakeElement) => row.children.filter(child => child.getAttribute("role") === "gridcell"),
            moveCursor: (row: FakeElement) => moved.push(row)
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

/** The core offering Enter on the cursor's cell (`names.cellKey`) before it acts; `taken` where an editor took it first. */
function offerEnter(row: FakeElement, taken = false): void {
    const offer = new CustomEvent(names.cellKey, { bubbles: true, cancelable: true, detail: { cell: row.children[0], key: "Enter", keyboard: new FakeKeyboardEvent("Enter") } });

    if (taken)
        offer.preventDefault();

    row.children[0].dispatchEvent(offer);
}

test("Enter left to the row still opens and closes its detail, with the row's open the core raises for it", () => {
    const { first } = createGrid();

    offerEnter(first);
    fakeWindow.dispatch(first, new FakeEvent("open"));
    fakeWindow.runTimers();

    assert.notEqual(detailOf(first), null);

    offerEnter(first);
    fakeWindow.dispatch(first, new FakeEvent("open"));
    fakeWindow.runTimers();

    assert.equal(detailOf(first), null);
});

test("Enter toggles the detail once, though the framework raises the row's click for it too; one an editor took toggles nothing", () => {
    const { first, second } = createGrid();

    // The core's keyboard press of a row (`ui-row-press`): the row's click command, never a click this engine counts.
    offerEnter(first);
    fakeWindow.dispatch(first, new FakeEvent("ui-row-press"));
    fakeWindow.dispatch(first, new FakeEvent("open"));
    fakeWindow.runTimers();

    assert.notEqual(detailOf(first), null);

    offerEnter(second, true);
    fakeWindow.dispatch(second, new FakeEvent("open"));
    fakeWindow.runTimers();

    assert.equal(detailOf(second), null);
});

test("an open detail is a cell spanning its row, and the cursor standing on it goes back to the row as it closes", () => {
    const { first, chevron } = createGrid();

    fakeWindow.dispatch(chevron, new FakeMouseEvent(1));

    const shown = detailOf(first);

    assert.ok(shown !== null);
    assert.equal(shown.getAttribute("role"), "gridcell");
    assert.equal(shown.getAttribute("aria-colindex"), "1");
    assert.equal(shown.getAttribute("aria-colspan"), "2");

    shown.setAttribute(names.cellFocus, "");
    fakeWindow.dispatch(chevron, new FakeMouseEvent(1));

    assert.equal(detailOf(first), null);
    assert.deepEqual(moved, [first]);
});

test("Right and Left on the keyboard's row are the cell cursor's: they open and close no detail", () => {
    const { first, grid } = createGrid();

    first.setAttribute(names.rowFocus, "");

    const right = new FakeKeyboardEvent("ArrowRight");

    fakeWindow.dispatch(grid, right);
    assert.equal(right.defaultPrevented, false);
    assert.equal(detailOf(first), null);
});
