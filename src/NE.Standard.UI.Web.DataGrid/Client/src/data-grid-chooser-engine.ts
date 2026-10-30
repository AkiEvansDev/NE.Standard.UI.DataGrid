// The column chooser in the band: a check entry per column, following the root's hidden-columns list, so a column the viewport
// hides below its tier unchecks itself.

import type { ComponentStates, DomNames, OwnDescendants, PluginEngineContext, TableColumns } from "ne-standard-ui";
import { gridOf, RootSelector } from "./data-grid-dom.ts";
import { DetailColumnKey, GridClasses } from "./data-grid-names.ts";

export class DataGridChooserEngine {
    private readonly tables: TableColumns;
    private readonly states: ComponentStates;
    private readonly names: DomNames;
    private readonly ownDescendants: OwnDescendants;
    // A column's entry: the menu's check entry in the chooser's panel.
    private readonly entrySelector: string;
    private readonly observer: MutationObserver | null;
    private readonly removeClick: () => void;

    public constructor(context: PluginEngineContext) {
        this.tables = context.tables;
        this.states = context.states;
        this.names = context.names;
        this.ownDescendants = context.ownDescendants;
        this.entrySelector = `.${GridClasses.columnsPanel} .${context.names.menuItemClass}[${context.names.menuItemKind}="check"]`;

        const onClick = (domEvent: Event): void => {
            const entry = domEvent.target instanceof Element ? domEvent.target.closest<HTMLElement>(this.entrySelector) : null;
            const grid = gridOf(entry);

            if (entry === null || grid === null)
                return;

            // The entry is not a link and not a command; the menu's own click must not travel on and close the flyout over it.
            domEvent.preventDefault();

            if (this.states.isInert(entry))
                return;

            this.tables.setColumnHidden(grid, this.keyOf(entry), entry.classList.contains(this.names.menuItemCheckedClass));
            this.syncEntries(grid);
        };

        context.root.addEventListener("click", onClick);
        this.removeClick = () => context.root.removeEventListener("click", onClick);

        this.syncAll(context.root.querySelectorAll<HTMLElement>(RootSelector));
        // The style holds the viewer's column order (the framework's columns engine writes a variable per column), so the menu
        // follows a dragged column too.
        this.observer = context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: [context.names.tableHidden, "style"] }, grids => this.syncAll(grids));
    }

    public dispose(): void {
        this.observer?.disconnect();
        this.removeClick();
    }

    private keyOf(entry: Element): string {
        return entry.closest(`[${this.names.key}]`)?.getAttribute(this.names.key) ?? "";
    }

    private syncAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids) {
            // Every style write inside a grid reaches here, a scrolled host's spacers among them; one with no chooser has nothing to do.
            if (this.ownDescendants(grid, this.entrySelector, RootSelector).length === 0)
                continue;

            this.syncEntries(grid);
            this.syncOrder(grid);
        }
    }

    /** The entries stand in the columns' order, so the menu follows a rearranged row. */
    private syncOrder(grid: HTMLElement): void {
        const entries = this.ownDescendants(grid, this.entrySelector, RootSelector);
        const items = new Map<string, HTMLElement>();

        for (const entry of entries)
            items.set(this.keyOf(entry), entry.closest<HTMLElement>(`[${this.names.key}]`) ?? entry);

        const order = this.tables.columnOrder(grid).filter(key => items.has(key));
        const menu = items.get(order[0])?.parentElement ?? null;

        if (menu === null || order.length < 2 || order.every((key, place) => items.get(key) === menu.children[place]))
            return;

        for (const key of order)
            menu.appendChild(items.get(key)!);
    }

    /** Every entry checked while its column shows; the last data column showing cannot be unchecked, since the detail chevron alone is no table. */
    private syncEntries(grid: HTMLElement): void {
        const entries = this.ownDescendants(grid, this.entrySelector, RootSelector);
        const shown = entries.filter(entry => !this.tables.isColumnHidden(grid, this.keyOf(entry)));
        const dataShown = shown.filter(entry => this.keyOf(entry) !== DetailColumnKey);

        for (const entry of entries) {
            const checked = shown.includes(entry);
            const last = checked && (shown.length === 1 || (this.keyOf(entry) !== DetailColumnKey && dataShown.length === 1));

            entry.classList.toggle(this.names.menuItemCheckedClass, checked);
            entry.setAttribute("aria-checked", String(checked));
            this.states.setDisabled(entry, last);
        }
    }
}
