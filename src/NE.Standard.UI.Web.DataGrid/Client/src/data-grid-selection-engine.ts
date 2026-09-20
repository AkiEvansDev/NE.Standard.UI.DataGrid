// The grid's column of checkboxes: one per row, one over them all. The chosen rows are the host's own (`SelectedKeys`); this
// engine only asks the framework to take or release a row and reads the answer back to keep the boxes in step. A row click
// chooses nothing while the column is there (`data-ui-no-row-select`) — the click belongs to the detail and the editor.

import type { ItemSelection, PluginEngineContext } from "ne-standard-ui";
import { gridOf, ownDescendants, RootSelector, RowSelector } from "./data-grid-dom.ts";

const SelectCellSelector = "[data-ui-grid-select]";
const SelectAllSelector = "[data-ui-grid-select-all]";
const CheckboxSelector = "input[type='checkbox']";
const SelectedAttribute = "data-ui-selected";
const OwnRowSelector = `[data-ui-items-host] > ${RowSelector}`;

export const SelectionChangeEventName = "selection-change";

export class DataGridSelectionEngine {
    private readonly selection: ItemSelection;

    public constructor(context: PluginEngineContext) {
        this.selection = context.selection;

        context.root.addEventListener("change", domEvent => {
            const box = domEvent.target instanceof Element ? domEvent.target.closest<HTMLInputElement>(CheckboxSelector) : null;
            const grid = gridOf(box);

            if (box === null || grid === null)
                return;

            if (box.closest(SelectAllSelector) !== null) {
                this.selection.setSelected(grid, ownDescendants(grid, OwnRowSelector), box.checked);
                this.syncBoxes(grid);
                grid.dispatchEvent(new Event(SelectionChangeEventName, { bubbles: true }));
                return;
            }

            const row = box.closest<HTMLElement>(SelectCellSelector) === null ? null : box.closest<HTMLElement>(RowSelector);

            if (row === null)
                return;

            this.selection.toggle(row);
            this.syncBoxes(grid);
            grid.dispatchEvent(new Event(SelectionChangeEventName, { bubbles: true }));
        }, true);

        this.syncAll(context.root.querySelectorAll<HTMLElement>(RootSelector));
        context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: [SelectedAttribute] }, grids => this.syncAll(grids));
    }

    private syncAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids)
            this.syncBoxes(grid);
    }

    /** Every box in step with the rows: a row's box says whether the row is chosen, the one over them how many of them are. */
    private syncBoxes(grid: HTMLElement): void {
        const rows = ownDescendants(grid, OwnRowSelector);
        let chosen = 0;

        for (const row of rows) {
            const selected = this.selection.isSelected(row);
            const box = row.querySelector<HTMLInputElement>(`${SelectCellSelector} ${CheckboxSelector}`);

            if (selected)
                chosen++;

            if (box !== null && box.checked !== selected)
                box.checked = selected;
        }

        const all = grid.querySelector<HTMLInputElement>(`${SelectAllSelector} ${CheckboxSelector}`);

        if (all === null)
            return;

        all.checked = chosen > 0 && chosen === rows.length;
        // Neither none nor all: the third state a box can only be put into from script.
        all.indeterminate = chosen > 0 && chosen < rows.length;
    }
}
