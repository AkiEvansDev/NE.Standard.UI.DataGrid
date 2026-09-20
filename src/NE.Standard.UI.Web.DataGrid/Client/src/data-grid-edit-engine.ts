// A cell that edits: double click or F2 opens an editor over the cell (Enter/blur commits, Escape reverts, Tab advances). The
// editor renders on demand from the cell's named variant, so only one exists at a time; values travel the framework's ordinary
// two-way `change` path.

import type { ItemRows, PluginEngineContext, ValueReading } from "ne-standard-ui";
import { componentIdOf, gridOf, RootSelector, RowSelector } from "./data-grid-dom.ts";

const EditableCellSelector = ".ui-data-grid__cell--editable";
const EditableCellClass = "ui-data-grid__cell--editable";
const EditorClass = "ui-data-grid__editor";
const OpenClass = "ui-data-grid__editor--open";
const HiddenCellClass = "ui-data-grid__cell--editing";
const EditorTemplateAttribute = "data-ui-grid-editor";
const ReadOnlyAttribute = "data-ui-grid-readonly";
// What the display cell's own mark says it holds; the editor wears it too, so the stylesheet gives a number's field the cell's digits.
const KindAttribute = "data-ui-grid-kind";
const RowFocusAttribute = "data-ui-row-focus";
const RowKeyAttribute = "data-ui-key";
const ColumnAttribute = "data-ui-grid-column";
const ValueBindingAttribute = "data-ui-bind-value";
const FocusableSelector = "input, textarea, select, button, [tabindex]";
// The part of a select or a search that opens its list on a press.
const SelectTriggerSelector = ".ui-select__trigger";
// The popups a field opens — a select's list, a picker — own the keys and the focus until they close (own-control.ts in the core).
const PopupRoleSelector = "[role='listbox'], [role='menu'], [role='dialog']";

export const CellEditEventName = "cell-edit";

/** What an open editor remembers: the field's value as it stood, to put back on Escape, and whether a change already went out. */
type OpenEditor = {
    readonly editor: HTMLElement;
    readonly cell: HTMLElement;
    readonly field: HTMLElement | null;
    readonly original: unknown;
    changed: boolean;
};

/** Where an editor stood when its row was drawn again under it: the row's key and the cell's column, to open the same cell anew. */
type EditorPlace = {
    readonly key: string;
    readonly column: string;
    readonly draft: unknown;
    readonly changed: boolean;
};

export class DataGridEditEngine {
    private readonly rows: ItemRows;
    private readonly values: ValueReading;
    // One editor at a time in a grid, by the grid.
    private readonly open = new WeakMap<HTMLElement, OpenEditor>();

    public constructor(context: PluginEngineContext) {
        const root = context.root;

        this.rows = context.rows;
        this.values = context.values;

        root.addEventListener("dblclick", domEvent => {
            const cell = domEvent.target instanceof Element ? domEvent.target.closest<HTMLElement>(EditableCellSelector) : null;

            if (cell === null || cell.closest(RootSelector) === null)
                return;

            domEvent.preventDefault();
            this.openEditor(cell);
        }, true);

        // A change inside the editor is noted, since a select or checkbox commits as it's chosen; Escape afterward must still take
        // it back.
        root.addEventListener("change", domEvent => {
            const grid = gridOf(domEvent.target);
            const state = grid === null ? undefined : this.open.get(grid);

            if (state !== undefined && domEvent.target instanceof Node && state.editor.contains(domEvent.target))
                state.changed = true;
        }, true);

        root.addEventListener("keydown", domEvent => this.handleKeyDown(domEvent), true);

        // A row the server redraws under an open editor removes the editor's elements with it, so it reopens on the same cell of
        // the new row with what was typed put back — the edit is neither lost nor left on unreachable elements.
        context.observeComponents(root, RootSelector, { childList: true }, grids => {
            for (const grid of grids)
                this.followRow(grid);
        });

        // A press on part of the editor with no focus of its own must not move focus to the grid's root (the nearest focusable
        // ancestor), or the editor would commit and close under the pointer; the press still reaches the field's engine. The
        // focusable is searched inside the editor only, since climbing past it would always find the grid's own tab stop.
        root.addEventListener("mousedown", domEvent => {
            const grid = gridOf(domEvent.target);
            const state = grid === null ? undefined : this.open.get(grid);

            if (state === undefined || !(domEvent.target instanceof Element) || !state.editor.contains(domEvent.target))
                return;

            const focusable = domEvent.target.closest(FocusableSelector);

            if (focusable === null || !state.editor.contains(focusable))
                domEvent.preventDefault();
        }, true);

        // The focus left the editor for somewhere outside it: what was typed is committed, as a field's blur does.
        root.addEventListener("focusout", domEvent => {
            if (!(domEvent instanceof FocusEvent) || !(domEvent.target instanceof Element))
                return;

            const grid = gridOf(domEvent.target);
            const state = grid === null ? undefined : this.open.get(grid);

            if (grid === null || state === undefined || !state.editor.contains(domEvent.target))
                return;

            const next = domEvent.relatedTarget;

            if (next instanceof Node && state.editor.contains(next))
                return;

            // After the blur's own change has been dispatched, which the browser does before the focus moves on.
            window.setTimeout(() => this.closeEditor(grid, state, true), 0);
        }, true);
    }

    private openEditor(cell: HTMLElement): void {
        const grid = gridOf(cell);
        const row = cell.closest<HTMLElement>(RowSelector);

        // A grid whose editing is off keeps its cells as they are, whatever its columns say.
        if (grid === null || row === null || grid.hasAttribute(ReadOnlyAttribute))
            return;

        // The one open commits first.
        const current = this.open.get(grid);

        if (current !== undefined) {
            if (current.cell === cell)
                return;

            this.closeEditor(grid, current, true);
        }

        const editor = this.createEditor(grid, row, cell);

        if (editor === null)
            return;

        const field = editor.querySelector<HTMLElement>(`[${ValueBindingAttribute}]`);

        this.open.set(grid, { editor, cell, field, original: this.fieldValue(field), changed: false });

        // Held while the editor is open, so a value the server pushes meanwhile doesn't overwrite what's being typed; commit or
        // Escape releases it.
        if (field !== null)
            this.values.hold(field);
        // The editor stands as tall as the cell it replaces, so a row of two lines does not shrink around a one-line field.
        editor.style.minHeight = `${cell.getBoundingClientRect().height}px`;
        cell.classList.add(HiddenCellClass);
        editor.classList.add(OpenClass);
        cell.after(editor);

        const focusable = editor.querySelector<HTMLElement>(FocusableSelector);

        focusable?.focus({ preventScroll: true });

        if (focusable instanceof HTMLInputElement && isCaretInput(focusable))
            focusable.select();

        // A choice cell opens its list with the editor, since a second press to see the choices would say nothing the first didn't;
        // the framework's own trigger is pressed so the list opens and closes the framework's way.
        const trigger = editor.querySelector<HTMLElement>(SelectTriggerSelector);

        if (trigger !== null && trigger.getAttribute("aria-expanded") !== "true")
            trigger.click();
    }

    /**
     * The editor's cell, drawn when the viewer opens it: the framework renders the column's editor variant against the row's item,
     * wrapped in the display cell's own shape (alignment, pinned modifiers, offset, column and row key) so it stands in the same track.
     */
    private createEditor(grid: HTMLElement, row: HTMLElement, cell: HTMLElement): HTMLElement | null {
        const variantKey = cell.getAttribute(EditorTemplateAttribute);
        const componentId = componentIdOf(grid);

        if (variantKey === null || componentId === null)
            return null;

        const content = this.rows.renderVariant(row, componentId, variantKey);

        if (content === null)
            return null;

        const editor = document.createElement("div");

        for (const attribute of cell.attributes)
            editor.setAttribute(attribute.name, attribute.value);

        editor.classList.remove(EditableCellClass, HiddenCellClass);
        editor.classList.add(EditorClass);
        editor.removeAttribute(EditorTemplateAttribute);
        editor.appendChild(content);

        const kind = cell.querySelector(`[${KindAttribute}]`)?.getAttribute(KindAttribute);

        if (kind !== null && kind !== undefined)
            editor.setAttribute(KindAttribute, kind);

        return editor;
    }

    /** What the editor's field holds, read as the framework reads it rather than by the shape of the input under the field. */
    private fieldValue(field: HTMLElement | null): unknown {
        return field === null ? null : this.values.read(field);
    }

    private closeEditor(grid: HTMLElement, state: OpenEditor, commit: boolean): void {
        if (this.open.get(grid) !== state)
            return;

        this.open.delete(grid);

        if (commit) {
            // A caret field says `change` on blur or Enter only; here the value is committed whether or not the focus moves.
            if (state.field !== null && !state.changed && this.fieldValue(state.field) !== state.original)
                state.field.dispatchEvent(new Event("change", { bubbles: true }));

            if (state.changed || this.fieldValue(state.field) !== state.original)
                (state.field ?? state.editor).dispatchEvent(new Event(CellEditEventName, { bubbles: true }));
        }
        else if (state.field !== null) {
            writeFieldValue(state.field, state.original);

            // A change that already went out is taken back the same way.
            if (state.changed)
                state.field.dispatchEvent(new Event("change", { bubbles: true }));

            this.values.release(state.field);
        }

        const focused = state.editor.contains(document.activeElement);

        state.cell.classList.remove(HiddenCellClass);
        state.editor.remove();

        // The keyboard stays on the row: the grid's root holds the focus and the cursor names the row.
        if (focused)
            grid.focus({ preventScroll: true });
    }

    /** The editor of a grid whose cell left the page is opened again on the cell that took its place, if the row is still there. */
    private followRow(grid: HTMLElement): void {
        const state = this.open.get(grid);

        if (state === undefined || state.cell.isConnected)
            return;

        const place: EditorPlace = {
            key: state.cell.closest<HTMLElement>(RowSelector)?.getAttribute(RowKeyAttribute) ?? "",
            column: state.cell.getAttribute(ColumnAttribute) ?? "",
            draft: this.fieldValue(state.field),
            changed: state.changed
        };

        // Dropped, not closed: the elements are gone, and a commit or a restore on them would reach nobody.
        this.open.delete(grid);

        const row = place.key.length === 0 ? null : grid.querySelector<HTMLElement>(`${RowSelector}[${RowKeyAttribute}="${CSS.escape(place.key)}"]`);
        const cell = row?.querySelector<HTMLElement>(`:scope > ${EditableCellSelector}[${ColumnAttribute}="${CSS.escape(place.column)}"]`) ?? null;

        if (cell === null)
            return;

        this.openEditor(cell);

        const reopened = this.open.get(grid);

        if (reopened === undefined || reopened.field === null || place.draft === reopened.original)
            return;

        writeFieldValue(reopened.field, place.draft);
        reopened.changed = place.changed;
    }

    private handleKeyDown(domEvent: Event): void {
        if (!(domEvent instanceof KeyboardEvent) || domEvent.defaultPrevented || domEvent.isComposing || !(domEvent.target instanceof Element))
            return;

        const grid = gridOf(domEvent.target);

        if (grid === null)
            return;

        const state = this.open.get(grid);

        // F2 on the keyboard's row opens its first cell that edits.
        if (state === undefined) {
            if (domEvent.key !== "F2")
                return;

            const row = grid.querySelector<HTMLElement>(`[${RowFocusAttribute}]`);
            const cell = row?.querySelector<HTMLElement>(`:scope > ${EditableCellSelector}`) ?? null;

            if (cell !== null) {
                domEvent.preventDefault();
                this.openEditor(cell);
            }

            return;
        }

        if (!state.editor.contains(domEvent.target))
            return;

        // A popup the field opened owns Enter and Escape until it closes, whether the key lands in the popup or in the field that
        // opened it.
        const popup = domEvent.target.closest(PopupRoleSelector);
        const openList = state.editor.querySelector("[role='listbox']");

        if ((popup !== null && state.editor.contains(popup)) || (openList !== null && openList.getClientRects().length > 0))
            return;

        switch (domEvent.key) {
            case "Enter":
                domEvent.preventDefault();
                this.commitEditor(grid, state);
                break;
            case "Escape":
                domEvent.preventDefault();
                this.closeEditor(grid, state, false);
                break;
            case "Tab": {
                const next = siblingCell(state.cell, domEvent.shiftKey ? -1 : 1);

                if (next === null)
                    return;

                domEvent.preventDefault();
                this.commitEditor(grid, state);
                this.openEditor(next);
                break;
            }
            default:
                return;
        }
    }

    /**
     * Commits by the keyboard: blurs the field first, since a composed control only writes what was typed on its own input's blur —
     * reading the value before that would still be the row's original.
     */
    private commitEditor(grid: HTMLElement, state: OpenEditor): void {
        const held = document.activeElement instanceof HTMLElement && state.editor.contains(document.activeElement);

        if (held)
            (document.activeElement as HTMLElement).blur();

        this.closeEditor(grid, state, true);

        // The blur took the focus out of the editor before the close could see it, so the keyboard is put back on the row here.
        if (held)
            grid.focus({ preventScroll: true });
    }
}

/** The editable cell `step` places along the row from the given one, or null at the row's end. */
function siblingCell(cell: HTMLElement, step: number): HTMLElement | null {
    const row = cell.closest<HTMLElement>(RowSelector);
    const cells = row === null ? [] : [...row.querySelectorAll<HTMLElement>(`:scope > ${EditableCellSelector}`)];
    const index = cells.indexOf(cell);

    return index < 0 ? null : cells[index + step] ?? null;
}

function isCaretInput(field: HTMLInputElement): boolean {
    return field.type === "text" || field.type === "number" || field.type === "search" || field.type === "email" || field.type === "url" || field.type === "tel" || field.type === "password";
}

/** Escape's other half: the framework reads a value off a field, it does not write one, so the value goes back the field's own way. */
function writeFieldValue(field: HTMLElement, value: unknown): void {
    if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
        field.checked = value === true;
        return;
    }

    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)
        field.value = value === null || value === undefined || typeof value === "boolean" ? "" : String(value);
}
