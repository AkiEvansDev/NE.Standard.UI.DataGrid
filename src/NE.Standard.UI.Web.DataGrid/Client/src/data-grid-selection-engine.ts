// The grid's column of checkboxes: one per row, one over them all. The chosen rows are the host's own (`SelectedKeys`); this
// engine only asks the framework to take or release a row and reads the answer back to keep the boxes in step. A row click
// chooses nothing while the column is there (`data-ui-no-row-select`) — the click belongs to the detail and the editor.

import type { ItemSelection, PluginEngineContext } from "ne-standard-ui";
import { gridOf, ownDescendants, ownFirst, RootSelector, RowSelector } from "./data-grid-dom.ts";

const SelectCellSelector = "[data-ui-grid-select]";
const SelectAllSelector = "[data-ui-grid-select-all]";
const CheckboxSelector = "input[type='checkbox']";
const SelectedAttribute = "data-ui-selected";
const OwnRowSelector = `[data-ui-items-host] > ${RowSelector}`;
// A row a filter hid stays in the page under this class; the box over them all takes and counts only what the filters left.
const HiddenClass = "ui-hidden";

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
                this.selection.setSelected(grid, ownDescendants(grid, OwnRowSelector).filter(row => !row.classList.contains(HiddenClass)), box.checked);
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
        // A class is how a filter hides a row, which changes what the box over them all counts.
        context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: [SelectedAttribute, "class"] }, grids => this.syncAll(grids));
    }

    private syncAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids)
            this.syncBoxes(grid);
    }

    /** Every box in step with the rows: a row's box says whether the row is chosen, the one over them how many of them are. */
    private syncBoxes(grid: HTMLElement): void {
        const all = ownFirst<HTMLInputElement>(grid, `${SelectAllSelector} ${CheckboxSelector}`);

        // A grid whose rows cannot be chosen has no boxes to keep in step, and every mutation inside it reaches here.
        if (all === null && ownFirst(grid, SelectCellSelector) === null)
            return;

        let shown = 0;
        let chosen = 0;

        // A hidden row's box is kept in step too, so it is right the moment a filter lets the row back.
        for (const row of ownDescendants(grid, OwnRowSelector)) {
            const selected = this.selection.isSelected(row);
            const box = ownFirst<HTMLInputElement>(grid, `${SelectCellSelector} ${CheckboxSelector}`, row);

            if (!row.classList.contains(HiddenClass)) {
                shown++;

                if (selected)
                    chosen++;
            }

            if (box !== null && box.checked !== selected)
                box.checked = selected;
        }

        if (all === null)
            return;

        all.checked = chosen > 0 && chosen === shown;
        // Neither none nor all: the third state a box can only be put into from script.
        all.indeterminate = chosen > 0 && chosen < shown;
    }
}
