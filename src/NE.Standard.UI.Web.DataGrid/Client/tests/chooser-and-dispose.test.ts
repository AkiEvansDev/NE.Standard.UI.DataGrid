import assert from "node:assert/strict";
import test from "node:test";

import type { PluginEngineContext } from "ne-standard-ui";
import { DataGridChooserEngine } from "../src/data-grid-chooser-engine.ts";
import { CellEditAnswers } from "../src/data-grid-edit-engine.ts";
import { DataGridEngine } from "../src/data-grid-engine.ts";
import { DetailColumnKey, GridClasses } from "../src/data-grid-names.ts";
import { FakeElement, FakeEvent, fakeDocument, fakeWindow, fakeWindowGlobals, installFakeDom, real } from "./fake-dom.ts";

installFakeDom(fakeWindowGlobals);

const names = {
    componentId: "data-ui-id",
    key: "data-ui-key",
    selectedKey: "data-ui-selected-key",
    selectedKeys: "data-ui-selected-keys",
    itemsHost: "data-ui-items-host",
    itemsQuery: "data-ui-items-query",
    itemsQueryKind: "items-query",
    valueKind: "data-ui-value-kind",
    cellKey: "ui-cell-key",
    tableRowClass: "ui-table__row",
    tableScrollClass: "ui-table__scroll",
    tableHeaderClass: "ui-table__header",
    tableResizerClass: "ui-table__resizer",
    tableHidden: "data-ui-table-hidden",
    windowAggregates: "data-ui-window-aggregates",
    hiddenClass: "ui-hidden",
    textDescription: "data-ui-text-description",
    menuItemClass: "ui-menu-item",
    menuItemKind: "data-ui-menu-item-kind",
    menuItemCheckedClass: "ui-menu-item--checked",
    disabledClass: "ui-disabled"
};

function createChooserEntry(key: string): FakeElement {
    const entry = FakeElement.of(names.menuItemClass, { [names.menuItemKind]: "check" });

    FakeElement.of("", { [names.key]: key }).append(entry);

    return entry;
}

test("the last shown data column stays locked even while the detail column is also shown", () => {
    const root = new FakeElement();
    const detailEntry = createChooserEntry(DetailColumnKey);
    const costEntry = createChooserEntry("Cost");
    const totalEntry = createChooserEntry("Total");
    const panel = FakeElement.of(GridClasses.columnsPanel).append(detailEntry.parentElement!, costEntry.parentElement!, totalEntry.parentElement!);
    const grid = FakeElement.of(GridClasses.root).append(panel);
    const hidden = new Set<string>(["Total"]);

    root.append(grid);
    fakeDocument.body.replaceChildren(root);

    const engine = new DataGridChooserEngine(real<PluginEngineContext>({
        root,
        names,
        tables: {
            isColumnHidden: (_table: Element, key: string) => hidden.has(key),
            setColumnHidden: (_table: Element, key: string, value: boolean | null) => {
                if (value)
                    hidden.add(key);
                else
                    hidden.delete(key);
            },
            columnOrder: () => [DetailColumnKey, "Cost", "Total"]
        },
        states: {
            isInert: (element: Element) => element.classList.contains(names.disabledClass),
            setDisabled: (element: Element, disabled: boolean) => {
                element.classList.toggle(names.disabledClass, disabled);
                element.setAttribute("aria-disabled", String(disabled));
            }
        },
        ownDescendants: (owner: FakeElement, selector: string, boundarySelector: string) => [...owner.querySelectorAll(selector)].filter(element => element.closest(boundarySelector) === owner),
        observeComponents: () => null
    }));

    // With Total hidden, Cost is the last data column shown and cannot be unchecked; Detail can still be unchecked.
    assert.equal(costEntry.classList.contains(names.disabledClass), true);
    assert.equal(detailEntry.classList.contains(names.disabledClass), false);

    fakeWindow.dispatch(costEntry, new FakeEvent("click"));
    assert.equal(hidden.has("Cost"), false);

    fakeWindow.dispatch(detailEntry, new FakeEvent("click"));
    assert.equal(hidden.has(DetailColumnKey), true);
    assert.equal(costEntry.classList.contains(names.disabledClass), true);

    engine.dispose();
    fakeWindow.dispatch(totalEntry, new FakeEvent("click"));
    assert.equal(hidden.has("Total"), true);
});

test("disposing DataGridEngine disconnects every observer, unsubscribes handlers and removes listeners", () => {
    const root = new FakeElement();
    let disconnected = 0;
    let stringStops = 0;
    let patchStops = 0;

    fakeDocument.body.replaceChildren(root);
    fakeWindow.listeners.clear();

    const engine = new DataGridEngine(real<PluginEngineContext>({
        root,
        dom: { ensureId: (element: FakeElement, prefix: string) => (element.id ||= `${prefix}1`) },
        names,
        numbers: { parseInvariant: () => null },
        temporal: {},
        strings: {
            onChange: () => () => {
                stringStops++;
            }
        },
        propertyPatchEngine: {
            addValueChangeHandler: () => () => {
                patchStops++;
            }
        },
        rows: {},
        values: { release: () => undefined },
        badges: {},
        properties: {},
        tables: { isColumnHidden: () => false, setColumnHidden: () => undefined, columnOrder: () => [] },
        states: { isInert: () => false, setDisabled: () => undefined },
        focus: {},
        validation: {},
        shortcuts: { isPlainKey: () => true, isComposing: () => false },
        ownDescendants: () => [],
        observeComponents: () => real<MutationObserver>({
            disconnect: () => {
                disconnected++;
            }
        })
    }), new CellEditAnswers());

    assert.ok(root.listenerCount() > 0);
    assert.equal(fakeWindow.listeners.get("change")?.length, 1);

    engine.dispose();

    assert.equal(disconnected, 10);
    assert.equal(stringStops, 2);
    assert.equal(patchStops, 1);
    assert.equal(fakeWindow.listeners.get("change")?.length ?? 0, 0);
    assert.equal(root.listenerCount(), 0);
});
