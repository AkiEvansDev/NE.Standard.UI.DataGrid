// Raises `selection-change` on a grid when the viewer changes its chosen rows (`SelectedKeys` or `SelectedKey`), ignoring a list
// the server pushed; the table's own selection column (`table-selection-boxes.ts`) keeps the row and header checkboxes in step.

import type { DomNames, PluginEngineContext, PropertyValueChange } from "ne-standard-ui";
import { hostSelector, RootSelector } from "./data-grid-dom.ts";
import { GridEvents } from "./data-grid-names.ts";

// The host's properties the chosen keys are, as a push names them: the many a grid of boxes chooses, the one a grid of rows does.
const SelectedProperties = new Set(["SelectedKeys", "SelectedKey"]);

export class DataGridSelectionEngine {
    private readonly names: DomNames;
    private readonly hostSelector: string;
    private readonly observer: MutationObserver | null;
    private readonly stopValueChanges: (() => void) | void;
    // The chosen keys as last said or pushed, per grid: a list that differs is the viewer's change, however made, and is said once.
    private readonly said = new WeakMap<HTMLElement, string | null>();

    public constructor(context: PluginEngineContext) {
        this.names = context.names;
        this.hostSelector = hostSelector(context.names);

        // A list the server pushed is the controller's own, not a change for it to hear about.
        this.stopValueChanges = context.propertyPatchEngine.addValueChangeHandler(change => this.notePushed(context.root, change));

        this.syncAll(context.root.querySelectorAll<HTMLElement>(RootSelector));
        this.observer = context.observeComponents(context.root, RootSelector, { attributeFilter: [context.names.selectedKey, context.names.selectedKeys] }, grids => this.syncAll(grids));
    }

    public dispose(): void {
        this.observer?.disconnect();

        if (typeof this.stopValueChanges === "function")
            this.stopValueChanges();
    }

    private sayChange(grid: HTMLElement): void {
        const keys = this.keysOf(grid);

        // The first sight of a grid is its list as painted; nothing changed yet.
        if (!this.said.has(grid)) {
            this.said.set(grid, keys);
            return;
        }

        if (this.said.get(grid) === keys)
            return;

        this.said.set(grid, keys);
        grid.dispatchEvent(new Event(GridEvents.selectionChange, { bubbles: true }));
    }

    /** The chosen keys as the attributes write them: the host's many, else the root's one; null for a grid choosing nothing. */
    private keysOf(grid: HTMLElement): string | null {
        return grid.querySelector(this.hostSelector)?.getAttribute(this.names.selectedKeys) ?? grid.getAttribute(this.names.selectedKey);
    }

    private notePushed(root: ParentNode, change: PropertyValueChange): void {
        if (change.local || !SelectedProperties.has(change.propertyName))
            return;

        const grids = change.components.length > 0 ? change.components.filter(component => component.matches(RootSelector)) : [...root.querySelectorAll(RootSelector)];

        for (const grid of grids) {
            if (grid instanceof HTMLElement)
                this.said.set(grid, this.keysOf(grid));
        }
    }

    private syncAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids)
            this.sayChange(grid);
    }
}
