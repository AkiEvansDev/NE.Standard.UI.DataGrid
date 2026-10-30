// The grid's `selection-change` event: raised when the viewer changes `SelectedKeys` or `SelectedKey`, and silent for the initial
// render or a list the server pushed.

import assert from "node:assert/strict";
import test from "node:test";

import type { PluginEngineContext, PropertyValueChange } from "ne-standard-ui";
import { DataGridSelectionEngine } from "../src/data-grid-selection-engine.ts";
import { GridEvents } from "../src/data-grid-names.ts";
import { FakeElement, fakeDocument, fakeWindowGlobals, installFakeDom, real } from "./fake-dom.ts";

installFakeDom(fakeWindowGlobals);

const names = {
    itemsHost: "data-ui-items-host",
    selectedKey: "data-ui-selected-key",
    selectedKeys: "data-ui-selected-keys",
    tableScrollClass: "ui-table__scroll"
};

function createGrid(): { grid: FakeElement; host: FakeElement; sync: () => void; push: (change: PropertyValueChange) => void; events: number } {
    const host = FakeElement.of("", { [names.itemsHost]: "", [names.selectedKeys]: "[]" });
    const grid = FakeElement.of("ui-data-grid").append(FakeElement.of(names.tableScrollClass).append(host));
    const root = new FakeElement().append(grid);
    let observe: ((grids: Iterable<FakeElement>) => void) | null = null;
    let onPush: ((change: PropertyValueChange) => void) | null = null;
    const state = {
        grid,
        host,
        events: 0,
        sync: () => observe?.([grid]),
        push: (change: PropertyValueChange) => onPush?.(change)
    };

    fakeDocument.body.replaceChildren(root);
    grid.addEventListener(GridEvents.selectionChange, () => {
        state.events++;
    });

    new DataGridSelectionEngine(real<PluginEngineContext>({
        root,
        names,
        propertyPatchEngine: {
            addValueChangeHandler: (handler: (change: PropertyValueChange) => void) => {
                onPush = handler;
            }
        },
        observeComponents: (_root: FakeElement, _selector: string, _options: unknown, callback: (grids: Iterable<FakeElement>) => void) => {
            observe = callback;
            return null;
        }
    }));

    return state;
}

test("a viewer's change to the chosen keys raises selection-change once; a server push does not", () => {
    const state = createGrid();

    assert.equal(state.events, 0);

    state.host.setAttribute(names.selectedKeys, "[\"a\"]");
    state.sync();
    assert.equal(state.events, 1);

    state.sync();
    assert.equal(state.events, 1);

    state.host.setAttribute(names.selectedKeys, "[\"a\",\"b\"]");
    state.push({ propertyName: "SelectedKeys", value: ["a", "b"], local: false, components: [real(state.grid)], dynamicParameters: [] });
    state.sync();
    assert.equal(state.events, 1);
});
