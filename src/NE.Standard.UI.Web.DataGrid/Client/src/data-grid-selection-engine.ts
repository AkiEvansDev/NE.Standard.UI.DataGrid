// The grid's column of checkboxes. The chosen rows are the host's own (`SelectedKeys`): the engine asks the framework to take or
// release a row and keeps the boxes in step. A row click chooses nothing while the column is there: it is the detail's and the editor's.

import type { ComponentStates, DomNames, ItemSelection, PluginEngineContext, PropertyValueChange } from "ne-standard-ui";
import { gridOf, hostSelector, ownDescendants, ownFirst, RootSelector, rowSelector } from "./data-grid-dom.ts";
import { GridAttributes, GridEvents } from "./data-grid-names.ts";

const SelectCellSelector = `[${GridAttributes.select}]`;
const SelectAllSelector = `[${GridAttributes.selectAll}]`;
const CheckboxSelector = "input[type='checkbox']";
// The host's properties the chosen keys are, as a push names them: the many a grid of boxes chooses, the one a grid of rows does.
const SelectedProperties = new Set(["SelectedKeys", "SelectedKey"]);

export class DataGridSelectionEngine {
    private readonly selection: ItemSelection;
    private readonly states: ComponentStates;
    private readonly names: DomNames;
    private readonly hostSelector: string;
    private readonly rowSelector: string;
    private readonly ownRowSelector: string;
    // The chosen keys as last said or pushed, per grid: a list that differs is the viewer's change, however made, and is said once.
    private readonly said = new WeakMap<HTMLElement, string | null>();

    public constructor(context: PluginEngineContext) {
        this.selection = context.selection;
        this.states = context.states;
        this.names = context.names;
        this.hostSelector = hostSelector(context.names);
        this.rowSelector = rowSelector(context.names);
        this.ownRowSelector = `[${context.names.itemsHost}] > ${this.rowSelector}`;

        context.root.addEventListener("change", domEvent => {
            const box = domEvent.target instanceof Element ? domEvent.target.closest<HTMLInputElement>(CheckboxSelector) : null;
            const grid = gridOf(box);

            if (box === null || grid === null)
                return;

            // The rows that can be chosen: a filter's hidden ones the framework leaves out itself.
            if (box.closest(SelectAllSelector) !== null) {
                this.selection.setSelected(grid, ownDescendants(grid, this.ownRowSelector).filter(row => this.canChoose(row)), box.checked);
                this.sync(grid);
                return;
            }

            const row = box.closest<HTMLElement>(SelectCellSelector) === null ? null : box.closest<HTMLElement>(this.rowSelector);

            if (row === null)
                return;

            this.selection.toggle(row);
            this.sync(grid);
        }, true);

        // A list the server pushed is the controller's own, not a change for it to hear about.
        context.propertyPatchEngine.addValueChangeHandler(change => this.notePushed(context.root, change));

        this.syncAll(context.root.querySelectorAll<HTMLElement>(RootSelector));
        // A class is how a filter hides a row, which changes what the box over them all counts; a row's refusal flips as its item's
        // `CanSelect` does.
        context.observeComponents(context.root, RootSelector, { childList: true, attributeFilter: [context.names.selected, context.names.selectedKey, context.names.selectedKeys, context.names.unselectable, "class"] }, grids => this.syncAll(grids));
    }

    /** Whether the viewer can choose the row: it does not refuse it (`CanSelect`), and neither it nor the grid is disabled. */
    private canChoose(row: HTMLElement): boolean {
        return !row.hasAttribute(this.names.unselectable) && !this.states.isInert(row);
    }

    /** The boxes in step with the rows, and the change said when the chosen keys moved. */
    private sync(grid: HTMLElement): void {
        const all = ownFirst<HTMLInputElement>(grid, `${SelectAllSelector} ${CheckboxSelector}`);

        // A grid without boxes has none to keep in step, and every mutation inside it reaches here.
        if (all !== null || ownFirst(grid, SelectCellSelector) !== null)
            this.syncBoxes(grid, all);

        this.sayChange(grid);
    }

    /** A row's box says whether the row is chosen, the one over them how many of those that can be are. */
    private syncBoxes(grid: HTMLElement, all: HTMLInputElement | null): void {
        let shown = 0;
        let chosen = 0;

        // A hidden row's box is kept in step too, so it is right the moment a filter lets the row back.
        for (const row of ownDescendants(grid, this.ownRowSelector)) {
            const selected = this.selection.isSelected(row);
            const box = ownFirst<HTMLInputElement>(grid, `${SelectCellSelector} ${CheckboxSelector}`, row);
            const choosable = this.canChoose(row);

            if (choosable && !row.classList.contains(this.names.hiddenClass)) {
                shown++;

                if (selected)
                    chosen++;
            }

            if (box === null)
                continue;

            if (box.checked !== selected)
                box.checked = selected;

            // A row that refuses the choice says so on its box, rather than ticking under the press and unticking again.
            this.states.setDisabled(box, !choosable);
        }

        if (all !== null) {
            all.checked = chosen > 0 && chosen === shown;
            // Neither none nor all: the third state a box can only be put into from script.
            all.indeterminate = chosen > 0 && chosen < shown;
            this.states.setDisabled(all, shown === 0);
        }
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
            this.sync(grid);
    }
}
