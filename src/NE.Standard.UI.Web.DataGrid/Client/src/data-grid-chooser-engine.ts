// The column chooser in the band: the framework's menu, a check entry per column, checked while it shows. A click writes through
// the framework's table columns; marks follow the root's hidden-columns list, so a column the viewport hides below its tier
// unchecks itself. No command stands behind an entry — the engine writes the check state a patch would. The last column still
// showing cannot be unchecked: a grid of no columns is an empty frame with nothing in it to say how it came back.

import type { PluginEngineContext, TableColumns } from "ne-standard-ui";
import { gridOf, ownDescendants, RootSelector } from "./data-grid-dom.ts";

const EntrySelector = ".ui-data-grid__columns-panel .ui-menu-item[data-ui-menu-item-kind=\"check\"]";
const KeyAttribute = "data-ui-key";
const CheckedClass = "ui-menu-item--checked";
const DisabledClass = "ui-disabled";
const HiddenAttribute = "data-ui-table-hidden";

export class DataGridChooserEngine {
    private readonly tables: TableColumns;

    public constructor(context: PluginEngineContext) {
        this.tables = context.tables;

        context.root.addEventListener("click", domEvent => {
            const entry = domEvent.target instanceof Element ? domEvent.target.closest<HTMLElement>(EntrySelector) : null;
            const grid = gridOf(entry);

            if (entry === null || grid === null)
                return;

            // The entry is not a link and not a command; the menu's own click must not travel on and close the flyout over it.
            domEvent.preventDefault();

            if (entry.classList.contains(DisabledClass))
                return;

            this.tables.setColumnHidden(grid, keyOf(entry), entry.classList.contains(CheckedClass));
            this.syncEntries(grid);
        });

        this.syncAll(context.root.querySelectorAll<HTMLElement>(RootSelector));
        // The style holds the viewer's column order (the framework's columns engine writes a variable per column), so the menu
        // follows a dragged column too.
        context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: [HiddenAttribute, "style"] }, grids => this.syncAll(grids));
    }

    private syncAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids) {
            // Every style write inside a grid reaches here, a scrolled host's spacers among them; one with no chooser has nothing to do.
            if (ownDescendants(grid, EntrySelector).length === 0)
                continue;

            this.syncEntries(grid);
            this.syncOrder(grid);
        }
    }

    /** The entries stand in the order the columns do: a menu that listed them as they were written would not answer a row that was rearranged. */
    private syncOrder(grid: HTMLElement): void {
        const entries = ownDescendants(grid, EntrySelector);
        const items = new Map<string, HTMLElement>();

        for (const entry of entries)
            items.set(keyOf(entry), entry.closest<HTMLElement>(`[${KeyAttribute}]`) ?? entry);

        const order = this.tables.columnOrder(grid).filter(key => items.has(key));
        const menu = items.get(order[0])?.parentElement ?? null;

        if (menu === null || order.length < 2 || order.every((key, place) => items.get(key) === menu.children[place]))
            return;

        for (const key of order)
            menu.appendChild(items.get(key)!);
    }

    /** Every entry checked while its column shows; the one column left showing is checked and cannot be unchecked. */
    private syncEntries(grid: HTMLElement): void {
        const entries = ownDescendants(grid, EntrySelector);
        const shown = entries.filter(entry => !this.tables.isColumnHidden(grid, keyOf(entry)));

        for (const entry of entries) {
            const checked = shown.includes(entry);
            const last = checked && shown.length === 1;

            entry.classList.toggle(CheckedClass, checked);
            entry.setAttribute("aria-checked", String(checked));
            entry.classList.toggle(DisabledClass, last);

            if (last)
                entry.setAttribute("aria-disabled", "true");
            else
                entry.removeAttribute("aria-disabled");
        }
    }
}

function keyOf(entry: Element): string {
    return entry.closest(`[${KeyAttribute}]`)?.getAttribute(KeyAttribute) ?? "";
}
