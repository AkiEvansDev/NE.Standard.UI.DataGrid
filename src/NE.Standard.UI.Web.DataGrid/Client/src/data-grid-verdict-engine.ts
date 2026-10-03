// A closed cell judged by its editor's rules whenever it is shown — drawn, written anew after a commit or by the server, after a
// language switch — and wearing the verdict as a field does: the severity's edge, in the box the editor's field takes, and a mark
// whose tooltip speaks it. The rules are the editor's (`validation.judge`); the value is the row's, at the property the editor writes.

import type { DomNames, FieldValidation, ItemRows, PluginEngineContext } from "ne-standard-ui";
import { gridOf, isOwnRow, RootSelector, rowSelector } from "./data-grid-dom.ts";
import { ClientNames, GridAttributes, GridClasses } from "./data-grid-names.ts";

/** An editable column's editor, by its component, and the row property it writes (`DataGridComponentRenderer.RulesAttribute`). */
type CellRules = {
    readonly editor: number;
    readonly path: string;
};

const NoRules: ReadonlyMap<string, CellRules> = new Map();

export class DataGridVerdictEngine {
    private readonly rows: ItemRows;
    private readonly validation: FieldValidation;
    private readonly names: DomNames;
    // Read once per grid: the columns and their editors are the page's and do not change.
    private readonly rulesByGrid = new WeakMap<Element, ReadonlyMap<string, CellRules>>();
    // The verdict boxes standing in cells, which a verdict that passes takes off.
    private readonly boxes = new WeakMap<HTMLElement, HTMLElement>();

    public constructor(context: PluginEngineContext) {
        this.rows = context.rows;
        this.validation = context.validation;
        this.names = context.names;

        for (const grid of context.root.querySelectorAll<HTMLElement>(RootSelector))
            this.judgeGrid(grid);

        // A row drawn, a cell written anew, an editor taken off: the row is judged again, before the page paints. The verdict's own
        // box and words are no change of the row's.
        context.observeComponents(context.root, rowSelector(context.names), { childList: true, characterData: true, relevant: mutation => !this.isVerdictWrite(mutation) }, rows => {
            for (const row of rows)
                this.judgeRow(row);
        });
    }

    private judgeGrid(grid: HTMLElement): void {
        if (this.rulesOf(grid).size === 0)
            return;

        for (const row of grid.querySelectorAll<HTMLElement>(rowSelector(this.names)))
            this.judgeRow(row);
    }

    /** Whether a mutation is the verdict's own writing: its box put in or taken out, or its words written. */
    private isVerdictWrite(mutation: MutationRecord): boolean {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;

        if (target !== null && target.closest(`.${ClientNames.verdictClass}`) !== null)
            return true;

        const nodes = [...mutation.addedNodes, ...mutation.removedNodes];

        return nodes.length > 0 && nodes.every(node => node instanceof Element && node.classList.contains(ClientNames.verdictClass));
    }

    /** Each editable cell of one of a grid's own rows, judged by its editor's rules against the row's value. */
    private judgeRow(row: HTMLElement): void {
        const grid = gridOf(row);

        if (grid === null || !isOwnRow(grid, row, this.names))
            return;

        const rules = this.rulesOf(grid);

        if (rules.size === 0)
            return;

        const item = this.rows.itemOf(row);

        if (item === undefined)
            return;

        for (const cell of row.children) {
            if (!(cell instanceof HTMLElement) || !cell.classList.contains(GridClasses.editableCell))
                continue;

            const cellRules = rules.get(cell.getAttribute(GridAttributes.column) ?? "");

            if (cellRules !== undefined)
                this.judgeCell(cell, cellRules.editor, this.rows.readPath(item, cellRules.path));
        }
    }

    /** The verdict worn in the cell's box, drawn when one first speaks; a value that passes takes the box's mark off. */
    private judgeCell(cell: HTMLElement, editor: number, value: unknown): void {
        const verdict = this.validation.judge(editor, value);
        let box = this.boxes.get(cell);

        if (verdict === null && box === undefined)
            return;

        if (box === undefined || box.parentElement !== cell) {
            box = document.createElement("span");
            box.className = ClientNames.verdictClass;

            // The line the framework writes the words on and speaks them through, as a field's in a table's cell: a mark with a tooltip.
            const message = document.createElement("span");

            message.setAttribute(this.names.validationMessage, "");
            box.append(message);
            cell.append(box);
            this.boxes.set(cell, box);
        }

        this.validation.mark(box, verdict?.severity ?? null, verdict?.words ?? null);
    }

    private rulesOf(grid: HTMLElement): ReadonlyMap<string, CellRules> {
        let rules = this.rulesByGrid.get(grid);

        if (rules === undefined) {
            rules = readRules(grid.getAttribute(GridAttributes.rules));
            this.rulesByGrid.set(grid, rules);
        }

        return rules;
    }
}

/** The renderer's JSON of the columns judged, by key; nothing where it wrote none or it does not parse. */
export function readRules(text: string | null): ReadonlyMap<string, CellRules> {
    if (text === null || text.length === 0)
        return NoRules;

    try {
        const parsed = JSON.parse(text) as Record<string, Partial<CellRules>>;
        const rules = new Map<string, CellRules>();

        for (const [key, entry] of Object.entries(parsed)) {
            if (typeof entry.editor === "number" && typeof entry.path === "string")
                rules.set(key, { editor: entry.editor, path: entry.path });
        }

        return rules;
    }
    catch {
        return NoRules;
    }
}
