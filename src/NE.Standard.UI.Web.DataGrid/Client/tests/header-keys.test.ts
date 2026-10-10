// A sorting caption is a stop of the header's keyboard, out of the Tab order (issue #92): Enter and Space on it sort, as a click does,
// and the arrows that walk the header leave the sort alone.

import assert from "node:assert/strict";
import test from "node:test";

import type { PluginEngineContext } from "ne-standard-ui";
import { DataGridSortEngine } from "../src/data-grid-sort-engine.ts";
import { GridAttributes } from "../src/data-grid-names.ts";
import { FakeElement, FakeKeyboardEvent, fakeDocument, fakeWindow, installFakeDom, real } from "./fake-dom.ts";

installFakeDom();

const names = {
    itemsQuery: "data-ui-items-query",
    itemsQueryKind: "items-query",
    valueKind: "data-ui-value-kind",
    tableScrollClass: "ui-table__scroll",
    tableHeaderClass: "ui-table__header",
    tableResizerClass: "ui-table__resizer"
};

/** A grid with one sorting caption, out of the Tab order as the renderer writes it, and the element its query lives on. */
function createGrid(): { caption: FakeElement; query: FakeElement } {
    const root = new FakeElement();
    const caption = FakeElement.of("ui-table__header-cell", { role: "columnheader", tabindex: "-1", [GridAttributes.sort]: "Total", "aria-sort": "none" });
    const query = FakeElement.of("", { [names.valueKind]: names.itemsQueryKind });

    root.append(FakeElement.of("ui-data-grid").append(query, FakeElement.of(names.tableScrollClass).append(FakeElement.of(names.tableHeaderClass).append(caption))));
    fakeDocument.body.replaceChildren(root);

    // The core's plain key: no Ctrl, ⌘ or Alt, and Shift only where allowed.
    const shortcuts = { isPlainKey: (event: KeyboardEvent, allow?: { shift?: boolean }) => !event.ctrlKey && !event.metaKey && !event.altKey && (allow?.shift === true || !event.shiftKey) };

    new DataGridSortEngine(real<PluginEngineContext>({ root, names, shortcuts, observeComponents: () => null }));

    return { caption, query };
}

function sorts(query: FakeElement): unknown {
    const text = query.getAttribute(names.itemsQuery);

    return text === null ? [] : (JSON.parse(text) as { sorts: unknown }).sorts;
}

test("Enter and Space on a sorting caption sort by its column, ascending then descending", () => {
    const { caption, query } = createGrid();

    fakeWindow.dispatch(caption, new FakeKeyboardEvent("Enter"));
    assert.deepEqual(sorts(query), [{ itemProperty: "Total", direction: "Ascending" }]);

    fakeWindow.dispatch(caption, new FakeKeyboardEvent(" "));
    assert.deepEqual(sorts(query), [{ itemProperty: "Total", direction: "Descending" }]);
});

test("Enter with Ctrl or Alt on a caption is no press of it, while Shift adds its column", () => {
    const { caption, query } = createGrid();

    fakeWindow.dispatch(caption, Object.assign(new FakeKeyboardEvent("Enter"), { ctrlKey: true }));
    fakeWindow.dispatch(caption, Object.assign(new FakeKeyboardEvent("Enter"), { altKey: true }));
    assert.deepEqual(sorts(query), []);

    fakeWindow.dispatch(caption, Object.assign(new FakeKeyboardEvent("Enter"), { shiftKey: true }));
    assert.deepEqual(sorts(query), [{ itemProperty: "Total", direction: "Ascending" }]);
});

test("an arrow on a caption, the header's walk, sorts nothing", () => {
    const { caption, query } = createGrid();

    for (const key of ["ArrowLeft", "ArrowRight", "ArrowDown", "Home", "End"])
        fakeWindow.dispatch(caption, new FakeKeyboardEvent(key));

    assert.deepEqual(sorts(query), []);
});
