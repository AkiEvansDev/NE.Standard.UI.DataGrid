// A cell that edits: a double click, or Enter, F2 or a typed character on the keyboard's cursor cell (the core's cell cursor, offered
// as `names.cellKey`), opens an editor over it — Enter or a blur commits, Escape reverts, Tab commits and opens the next editable
// cell, row after row. The editor renders on demand from the cell's variant, so only one is open at a time. A value its field refuses — an error rule's, one past a
// bound — is never sent, and the editor stays open over it until it is put right or Escape takes it back. A committed editor stays
// over its cell, showing the new value and taking nothing, until the commit is answered: the cell under it still holds the old one.

import type { CellKey, ComponentStates, DomNames, FieldValidation, Focus, ItemRows, PluginEngineContext, ShortcutWords, ValueReading } from "ne-standard-ui";
import { componentIdOf, gridOf, isOwnRow, ownDescendants, ownFirst, RootSelector, rowSelector } from "./data-grid-dom.ts";
import { ClientNames, GridAttributes, GridClasses, GridEvents } from "./data-grid-names.ts";

const EditableCellSelector = `.${GridClasses.editableCell}`;
const EditorTemplateAttribute = GridAttributes.editor;
// What the display cell's own mark says it holds; the editor wears it too, so the stylesheet gives a number's field the cell's digits.
const KindAttribute = GridAttributes.kind;
const ColumnAttribute = GridAttributes.column;
const ReadOnlyAttribute = GridAttributes.readOnly;
// What takes the focus of a press itself, a field's script-focusable part included.
const PressFocusSelector = "input, textarea, select, button, [tabindex]";

/** What an open editor remembers: the field's value as it stood, to put back on Escape, and whether a change already went out. */
type OpenEditor = {
    readonly editor: HTMLElement;
    readonly cell: HTMLElement;
    readonly field: HTMLElement | null;
    original: unknown;
    changed: boolean;
};

/** Where an editor stood when its row was drawn again under it: the row's key and the cell's column, to open the same cell anew. */
type EditorPlace = {
    readonly key: string;
    readonly column: string;
    readonly draft: unknown;
    readonly changed: boolean;
};

/** The `cell-edit` events a command was taken for, each answered once its command is: what a committed editor waits for. */
export class CellEditAnswers {
    private readonly answers = new WeakMap<Event, Promise<void>>();
    private readonly settles = new WeakMap<Event, () => void>();

    /** The event's registration `started`: a command runs for it. */
    public start(domEvent: Event): void {
        this.answers.set(domEvent, new Promise(resolve => this.settles.set(domEvent, resolve)));
    }

    /** The event's registration `completed`: its command was answered, or never will be. */
    public finish(domEvent: Event): void {
        this.settles.get(domEvent)?.();
        this.settles.delete(domEvent);
    }

    /** The answer to a `cell-edit` just dispatched, or null where no command took it. */
    public answerTo(domEvent: Event): Promise<void> | null {
        return this.answers.get(domEvent) ?? null;
    }
}

export class DataGridEditEngine {
    private readonly rows: ItemRows;
    private readonly values: ValueReading;
    private readonly states: ComponentStates;
    private readonly names: DomNames;
    private readonly focus: Focus;
    private readonly validation: FieldValidation;
    private readonly shortcuts: ShortcutWords;
    private readonly rowSelector: string;
    private readonly answers: CellEditAnswers;
    // One editor per grid, in a map that can be walked, since a state change above the grids is checked against every open editor.
    private readonly open = new Map<HTMLElement, OpenEditor>();
    // Committed editors waiting for their answer, by the cell each stands over.
    private readonly settling = new Map<HTMLElement, OpenEditor>();
    // The grids whose editable cells gave their double click back to the row while editing was off.
    private readonly unclaimed = new WeakSet<HTMLElement>();
    // The editor being taken off the page, while it goes.
    private leaving: HTMLElement | null = null;
    // An Escape putting back the value the row held, which goes out whatever the rules say of it.
    private restoring = false;

    public constructor(context: PluginEngineContext, answers: CellEditAnswers) {
        const root = context.root;

        this.answers = answers;
        this.rows = context.rows;
        this.values = context.values;
        this.states = context.states;
        this.names = context.names;
        this.focus = context.focus;
        this.validation = context.validation;
        this.shortcuts = context.shortcuts;
        this.rowSelector = rowSelector(context.names);

        for (const grid of root.querySelectorAll<HTMLElement>(RootSelector))
            this.syncClaims(grid);

        // A cell whose text shows a description stands on two lines, which its field's box holds: marked as rows are drawn and as a
        // description comes and goes with its row's value.
        for (const cell of root.querySelectorAll<HTMLElement>(EditableCellSelector))
            this.markTwoLine(cell);

        context.observeComponents(root, EditableCellSelector, { childList: true, attributeFilter: [this.names.textDescription] }, cells => {
            for (const cell of cells)
                this.markTwoLine(cell);
        });

        root.addEventListener("dblclick", domEvent => {
            const cell = domEvent.target instanceof Element ? domEvent.target.closest<HTMLElement>(EditableCellSelector) : null;

            if (cell === null || cell.closest(RootSelector) === null)
                return;

            domEvent.preventDefault();
            this.openEditor(cell);
        }, true);

        // Noted, since a select or checkbox sends as it's chosen and Escape must still take it back.
        root.addEventListener("change", domEvent => {
            const grid = gridOf(domEvent.target);
            const state = grid === null ? undefined : this.open.get(grid);

            if (grid === null || state === undefined || !(domEvent.target instanceof Node) || !state.editor.contains(domEvent.target))
                return;

            state.changed = true;

            // Once the list has closed behind the choice, which its engine does after the change.
            if (domEvent.target === state.field)
                window.setTimeout(() => this.followChoice(grid, state), 0);
        }, true);

        // On the window, ahead of the value binding: it listens on the root and starts before any package, so there it has already sent.
        window.addEventListener("change", domEvent => this.holdWindowChange(domEvent), true);

        root.addEventListener("keydown", domEvent => this.handleKeyDown(domEvent), true);
        root.addEventListener(this.names.cellKey, domEvent => this.handleCellKey(domEvent));

        // An editor whose row was redrawn reopens on the new row's cell with the draft put back, rather than losing the edit; a row
        // drawn while editing is off gives its double click back too.
        context.observeComponents(root, RootSelector, { childList: true }, grids => {
            for (const grid of grids) {
                this.followRow(grid);
                this.syncClaims(grid);
            }
        });

        // Editing off, or the grid or anything holding it disabled, loading or inert: the open editor closes as Escape closes it. A
        // change above a grid counts only while an editor is open.
        context.observeComponents(root, RootSelector, {
            attributeFilter: [ReadOnlyAttribute, "class", "inert"],
            relevant: mutation => mutation.target instanceof Element && (mutation.target.matches(RootSelector) || this.editsUnder(mutation.target))
        }, grids => {
            for (const grid of grids)
                this.followState(grid);

            for (const [grid, state] of [...this.open]) {
                if (!this.canEdit(grid))
                    this.closeEditor(grid, state, false);
            }
        });

        // A press on a part with no focus of its own would focus the grid's root and commit the editor under the pointer; only its
        // default is prevented, since the press still reaches the field's engine. The focusable is searched inside the editor only,
        // since climbing past it would always find the grid's own tab stop.
        root.addEventListener("mousedown", domEvent => {
            const grid = gridOf(domEvent.target);
            const state = grid === null ? undefined : this.open.get(grid);

            if (state === undefined || !(domEvent.target instanceof Element) || !state.editor.contains(domEvent.target))
                return;

            const focusable = domEvent.target.closest(PressFocusSelector);

            if (focusable === null || !state.editor.contains(focusable))
                domEvent.preventDefault();
        }, true);

        // Focus leaving the editor commits what was typed, as a field's blur does, unless the grid stops editing by then.
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

            // A part that hid under the focus drops it to nothing rather than where the reader went: Chromium blurs an element as it
            // loses its box or turns invisible; Firefox keeps the focus on it and raises nothing, which needs no guard.
            const hid = next === null && domEvent.target.isConnected && !isShown(domEvent.target);

            // After the blur's own change has been dispatched, which the browser does before the focus moves on.
            window.setTimeout(() => this.followFocusOut(grid, state, hid), 0);
        }, true);
    }

    private markTwoLine(cell: HTMLElement): void {
        const twoLine = cell.querySelector(`[${this.names.textDescription}]`) !== null;

        if (cell.hasAttribute(ClientNames.twoLine) !== twoLine)
            cell.toggleAttribute(ClientNames.twoLine, twoLine);
    }

    /**
     * A choice made in a cell's list is the whole edit, as Enter is: the editor commits and the keyboard goes back to the row, rather
     * than a closed list standing in the cell with the focus on it. A list still open after the choice (one choosing many) stays.
     */
    private followChoice(grid: HTMLElement, state: OpenEditor): void {
        const trigger = state.editor.querySelector<HTMLElement>(this.names.listTriggerSelector);

        if (this.open.get(grid) === state && trigger !== null && trigger.getAttribute("aria-expanded") !== "true")
            this.closeEditor(grid, state, true);
    }

    /** An editable cell claims its double click for the editor only while the grid edits; otherwise it opens the row. */
    private syncClaims(grid: HTMLElement): void {
        const claims = !grid.hasAttribute(ReadOnlyAttribute);

        if (claims && !this.unclaimed.has(grid))
            return;

        for (const cell of ownDescendants(grid, EditableCellSelector))
            cell.toggleAttribute(this.names.noRowOpen, claims);

        if (claims)
            this.unclaimed.delete(grid);
        else
            this.unclaimed.add(grid);
    }

    /** Whether an element stands around a grid whose editor is open: a state it takes on reaches that grid. */
    private editsUnder(element: Element): boolean {
        for (const grid of this.open.keys()) {
            if (grid !== element && element.contains(grid))
                return true;
        }

        return false;
    }

    private followState(grid: HTMLElement): void {
        this.syncClaims(grid);

        const state = this.open.get(grid);

        if (state !== undefined && !this.canEdit(grid))
            this.closeEditor(grid, state, false);
    }

    private canEdit(grid: HTMLElement): boolean {
        return !grid.hasAttribute(ReadOnlyAttribute) && !this.states.isInert(grid);
    }

    /**
     * Where the focus went decides it: still inside, the window lost it and the editor waits; dropped to nothing by a part that
     * hid, it goes back to the field — or, the whole editor hidden (its column dropped at a narrower width), the editor closes and
     * the grid takes it rather than the page's body; anywhere else, the editor closes.
     */
    private followFocusOut(grid: HTMLElement, state: OpenEditor, hid: boolean): void {
        const active = document.activeElement;

        if (this.open.get(grid) !== state || state.editor.contains(active))
            return;

        const dropped = hid && (active === null || active === document.body);

        if (dropped && this.canEdit(grid)) {
            this.focus.first(state.editor)?.focus({ preventScroll: true });

            // A field that hid with the editor takes no focus.
            if (state.editor.contains(document.activeElement))
                return;
        }

        // Refused, the editor keeps the focus, as a form's submit takes it back to its field; one hidden whole cannot, and goes
        // without its value, as Escape takes it.
        if (!this.closeEditor(grid, state, this.canEdit(grid))) {
            if (state.editor.contains(document.activeElement))
                return;

            this.closeEditor(grid, state, false);
        }

        if (dropped)
            this.focus.giveBack(state.cell);
    }

    /**
     * A `change` the browser raises as the window loses the focus, in the open editor's caret field that keeps it, is not the
     * reader's: stopped before the binding sends it, and the value goes when the editor commits.
     */
    private holdWindowChange(domEvent: Event): void {
        const field = domEvent.target;

        // Chromium raises a `change` from a field that held the focus with an edit as its editor leaves the page: the close has
        // already said what the edit becomes, and an Escape must not send what it takes back.
        if (domEvent.isTrusted && this.leaving !== null && field instanceof Node && this.leaving.contains(field)) {
            domEvent.stopPropagation();
            return;
        }

        // A value the open editor's field refuses is not the row's: stopped before the binding sends it, the field saying why.
        if (!this.restoring && field instanceof Element && this.refusedHere(field)) {
            domEvent.stopPropagation();
            return;
        }

        // Trusted only: the editor's own change on a commit or an Escape is raised from script, whatever the window. Only a field the reader
        // types in raises one on a blur.
        if (!domEvent.isTrusted || document.hasFocus() || !(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || field !== document.activeElement)
            return;

        const grid = gridOf(field);
        const state = grid === null ? undefined : this.open.get(grid);

        // A number field's edit text, which its engine puts back after a change, comes back with the focus on the reader's return.
        if (state !== undefined && state.editor.contains(field))
            domEvent.stopPropagation();
    }

    /** Whether a field inside an open editor refuses the value it holds; judged, so the field shows the verdict. */
    private refusedHere(field: Element): boolean {
        const grid = gridOf(field);
        const state = grid === null ? undefined : this.open.get(grid);

        return state !== undefined && state.editor.contains(field) && this.validation.refuses(field);
    }

    private openEditor(cell: HTMLElement): void {
        const grid = gridOf(cell);
        const row = cell.closest<HTMLElement>(this.rowSelector);

        // A grid whose editing is off keeps its cells as they are, whatever its columns say.
        if (grid === null || row === null || grid.hasAttribute(ReadOnlyAttribute))
            return;

        // The one open commits first.
        const current = this.open.get(grid);

        if (current !== undefined) {
            if (current.cell === cell || !this.closeEditor(grid, current, true))
                return;
        }

        // A commit of this cell still unanswered gives way: the new editor stands where it stood.
        const committed = this.settling.get(cell);

        if (committed !== undefined)
            this.finishSettling(committed);

        // The keyboard's cursor stands on the cell edited, brought into view clear of the pinned cells: Enter and Escape give it back
        // there, and Tab moves it along.
        this.rows.moveCursor(row, cell);

        const editor = this.createEditor(grid, row, cell);

        if (editor === null)
            return;

        // Where a composed field keeps its value, when the first bound element in its markup holds something else (a search's typed text).
        const field = editor.querySelector<HTMLElement>(`[${this.names.valueHolder}][${this.names.bindValue}]`) ?? editor.querySelector<HTMLElement>(`[${this.names.bindValue}]`);

        const state: OpenEditor = { editor, cell, field, original: this.fieldValue(field), changed: false };

        this.open.set(grid, state);

        // Held while the editor is open, so a value the server pushes meanwhile doesn't overwrite what's being typed; commit or
        // Escape releases it.
        if (field !== null)
            this.values.hold(field);
        // The editor stands as tall as the cell it replaces, so a row of two lines does not shrink around a one-line field.
        editor.style.minHeight = `${cell.getBoundingClientRect().height}px`;
        cell.classList.add(ClientNames.editingCellClass);
        cell.after(editor);

        const focusable = this.focus.first(editor);

        focusable?.focus({ preventScroll: true });

        // Selected whole: a character typed on the closed cell lands here and replaces the value, as a spreadsheet's does.
        if (focusable instanceof HTMLInputElement || focusable instanceof HTMLTextAreaElement)
            focusable.select();

        // A choice cell opens its list with the editor, since a second press would say nothing new; through the framework's trigger,
        // so the list opens and closes its way. Pressed once the select has met the page — its engine marks the chosen option on the
        // insertion's record, a microtask queued ahead of this one — or the list opens on its first option.
        const trigger = editor.querySelector<HTMLElement>(this.names.listTriggerSelector);

        if (trigger !== null) {
            queueMicrotask(() => {
                if (this.open.get(grid) === state && trigger.getAttribute("aria-expanded") !== "true")
                    trigger.click();
            });
        }

        // An empty read is taken again once the field has met the page: a select's engine fills its value input from its markup on
        // its next turn, and a commit measured against the empty one would send a value nobody changed.
        if (state.original === null || state.original === "") {
            window.setTimeout(() => {
                if (this.open.get(grid) === state && !state.changed)
                    state.original = this.fieldValue(field);
            }, 0);
        }
    }

    /** The column's editor variant drawn against the row's item, in the display cell's own shape so it stands in the same track. */
    private createEditor(grid: HTMLElement, row: HTMLElement, cell: HTMLElement): HTMLElement | null {
        const variantKey = cell.getAttribute(EditorTemplateAttribute);
        const componentId = componentIdOf(grid, this.names);

        if (variantKey === null || componentId === null)
            return null;

        const content = this.rows.renderVariant(row, componentId, variantKey);

        if (content === null)
            return null;

        const editor = document.createElement("div");

        for (const attribute of cell.attributes)
            editor.setAttribute(attribute.name, attribute.value);

        editor.classList.remove(GridClasses.editableCell, ClientNames.editingCellClass);
        editor.classList.add(ClientNames.editorClass);
        editor.removeAttribute(EditorTemplateAttribute);
        editor.removeAttribute(ClientNames.twoLine);
        // The cell's id is the one the grid names as its cursor, and the cursor stays on the cell.
        editor.removeAttribute("id");
        editor.removeAttribute(this.names.cellFocus);
        // Its keys are its own: no row cursor or detail of the grid acts on them, and its Escape takes the edit back — no dialog, flyout
        // or drawer the grid stands in closes on it first.
        editor.setAttribute(this.names.ownsKeys, "");
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

    /** Closes the editor, committing or taking its edit back; answers false where the field refuses the edit, the editor left open. */
    private closeEditor(grid: HTMLElement, state: OpenEditor, commit: boolean): boolean {
        if (this.open.get(grid) !== state)
            return true;

        if (commit && this.refusesEdit(state)) {
            this.focus.first(state.editor)?.focus({ preventScroll: true });
            return false;
        }

        this.open.delete(grid);

        let answer: Promise<void> | null = null;

        if (commit) {
            // A caret field says `change` on blur or Enter only; here the value is committed whether or not the focus moves.
            if (state.field !== null && !state.changed && this.fieldValue(state.field) !== state.original)
                state.field.dispatchEvent(new Event("change", { bubbles: true }));

            if (state.changed || this.fieldValue(state.field) !== state.original) {
                const edit = new Event(GridEvents.cellEdit, { bubbles: true });

                (state.field ?? state.editor).dispatchEvent(edit);
                // The command's answer carries what the cell shows (a value the server derives too); with none, the value's own answer.
                answer = this.answers.answerTo(edit) ?? (state.field === null ? null : this.values.whenSettled(state.field));
            }
        }
        else if (state.field !== null && state.changed) {
            // A change that already went out is taken back the same way: the server holds it, so letting the field go would keep it.
            this.values.write(state.field, state.original);
            this.restoring = true;

            try {
                state.field.dispatchEvent(new Event("change", { bubbles: true }));
            }
            finally {
                this.restoring = false;
            }
        }

        const focused = state.editor.contains(document.activeElement);

        if (answer === null)
            this.takeOff(state);
        else
            this.settle(state, answer);

        // The keyboard stays on the row, in the cell: the grid's root holds the focus and the cursor names the row and its cell.
        if (focused)
            this.focus.giveBack(state.cell);

        return true;
    }

    /** Lets the editor's field go and takes the editor off its cell; after an Escape, the framework restores the field's value. */
    private takeOff(state: OpenEditor): void {
        if (state.field !== null)
            this.values.release(state.field);

        state.cell.classList.remove(ClientNames.editingCellClass);
        this.leaving = state.editor;

        try {
            state.editor.remove();
        }
        finally {
            this.leaving = null;
        }
    }

    /**
     * A committed editor stays over its cell, taking nothing, until the answer has written the cell: taken off at once, the cell showed
     * its old value for the round trip. The field stays held meanwhile, or its release would put that old value back into it.
     */
    private settle(state: OpenEditor, answer: Promise<void>): void {
        if (state.editor.contains(document.activeElement))
            this.blurLeaving(state.editor);

        state.editor.inert = true;
        this.settling.set(state.cell, state);

        const settled = (): void => this.finishSettling(state);

        answer.then(settled, settled);
    }

    /** Takes the focus out of a leaving editor; the `change` the browser raises for its field as it goes is not the reader's. */
    private blurLeaving(editor: HTMLElement): void {
        this.leaving = editor;

        try {
            (document.activeElement as HTMLElement).blur();
        }
        finally {
            this.leaving = null;
        }
    }

    /** Takes a committed editor off once its answer came, or as another editor opens on its cell. */
    private finishSettling(state: OpenEditor): void {
        if (this.settling.get(state.cell) !== state)
            return;

        this.settling.delete(state.cell);
        this.takeOff(state);
    }

    /** An edit the field refuses: a value changed from the one the editor opened on, failing an error rule or past a bound. */
    private refusesEdit(state: OpenEditor): boolean {
        return state.field !== null && (state.changed || this.fieldValue(state.field) !== state.original) && this.validation.refuses(state.field);
    }

    /** The editor of a grid whose cell left the page is opened again on the cell that took its place, if the row is still there. */
    private followRow(grid: HTMLElement): void {
        const state = this.open.get(grid);

        if (state === undefined || state.cell.isConnected)
            return;

        const place: EditorPlace = {
            key: state.cell.closest<HTMLElement>(this.rowSelector)?.getAttribute(this.names.key) ?? "",
            column: state.cell.getAttribute(ColumnAttribute) ?? "",
            draft: this.fieldValue(state.field),
            changed: state.changed
        };

        // Dropped, not closed: a commit or restore on gone elements reaches nobody. Released, or the held field keeps the old row.
        this.open.delete(grid);

        if (state.field !== null)
            this.values.release(state.field);

        const row = place.key.length === 0 ? null : ownFirst(grid, `${this.rowSelector}[${this.names.key}="${CSS.escape(place.key)}"]`);
        const cell = row?.querySelector<HTMLElement>(`:scope > ${EditableCellSelector}[${ColumnAttribute}="${CSS.escape(place.column)}"]`) ?? null;

        if (cell === null)
            return;

        this.openEditor(cell);

        const reopened = this.open.get(grid);

        if (reopened === undefined || reopened.field === null || place.draft === reopened.original)
            return;

        // Through the field's own binding, so a composed field (a select, a date) shows the draft its hidden input holds.
        this.values.write(reopened.field, place.draft);
        reopened.changed = place.changed;
    }

    private handleKeyDown(domEvent: Event): void {
        if (!(domEvent instanceof KeyboardEvent) || domEvent.defaultPrevented || this.shortcuts.isComposing(domEvent) || !(domEvent.target instanceof Element))
            return;

        const grid = gridOf(domEvent.target);

        // A disabled or loading grid keeps its root focusable while every row in it is inert: its keys open nothing.
        if (grid === null || this.states.isInert(grid))
            return;

        const state = this.open.get(grid);

        if (state === undefined || !state.editor.contains(domEvent.target))
            return;

        // A popup the field opened owns Enter and Escape until it closes (own-control.ts in the core), open by its opener's word,
        // not its box, which a closing list keeps as it fades. A list holds no stops of its own, so Tab stays the grid's.
        const popup = domEvent.target.closest(this.names.popupSelector);
        const opener = state.editor.querySelector("[aria-expanded='true']");

        if (((popup !== null && state.editor.contains(popup)) || opener !== null) && !(domEvent.key === "Tab" && isList(popup, opener)))
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
                const next = this.siblingCell(grid, state.cell, domEvent.shiftKey ? -1 : 1);

                if (next === null)
                    return;

                domEvent.preventDefault();

                if (this.commitEditor(grid, state))
                    this.openEditor(next);

                break;
            }
            default:
                return;
        }
    }

    /**
     * Enter, F2 or a typed character on the cursor's cell (`names.cellKey`): an editable cell of a grid that edits opens its editor, and
     * the key is the grid's; a typed character replaces the value its field opened on.
     */
    private handleCellKey(domEvent: Event): void {
        if (!(domEvent instanceof CustomEvent) || domEvent.defaultPrevented)
            return;

        const { cell, key, keyboard } = domEvent.detail as CellKey;
        const grid = gridOf(cell);

        if (grid === null || !cell.classList.contains(GridClasses.editableCell) || !this.canEdit(grid))
            return;

        domEvent.preventDefault();
        keyboard.preventDefault();
        this.openEditor(cell);

        // After the field's own engines have met the editor, which they do on the page's next microtask: a date's writes its text then.
        if (key !== "Enter" && key !== "F2")
            queueMicrotask(() => this.typeInto(grid, key));
    }

    /**
     * Writes a character typed on a closed cell into its open editor's field in place of the value, as a spreadsheet's typing does, and
     * says so as the reader's typing would. Written rather than left to the key, which would land in a selection the field's engine has
     * since rewritten. A field that types nothing (a select's list) takes no character.
     */
    private typeInto(grid: HTMLElement, character: string): void {
        const field = document.activeElement;

        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || this.open.get(grid)?.editor.contains(field) !== true || field.readOnly)
            return;

        field.value = character;
        field.dispatchEvent(new Event("input", { bubbles: true }));
    }

    /** The row's shown editable cells, in the order the core's cell cursor walks them: the viewer's. */
    private editableCells(row: HTMLElement): HTMLElement[] {
        return this.rows.cellsOf(row).filter(cell => cell.classList.contains(GridClasses.editableCell));
    }

    /** The editable cell `step` places along the row from the given one, else the first or last of the next row shown; null past the grid's ends. */
    private siblingCell(grid: HTMLElement, cell: HTMLElement, step: 1 | -1): HTMLElement | null {
        const row = cell.closest<HTMLElement>(this.rowSelector);
        const cells = row === null ? [] : this.editableCells(row);
        const index = cells.indexOf(cell);

        if (row === null || index < 0)
            return null;

        const next = cells[index + step];

        if (next !== undefined)
            return next;

        for (let other = siblingRow(row, step); other !== null; other = siblingRow(other, step)) {
            if (!other.matches(this.rowSelector) || !isOwnRow(grid, other, this.names) || other.classList.contains(this.names.hiddenClass))
                continue;

            const candidates = this.editableCells(other);

            if (candidates.length > 0)
                return step > 0 ? candidates[0] : candidates[candidates.length - 1];
        }

        return null;
    }

    /**
     * Commits by the keyboard, blurring the field first: a composed control writes what was typed only on its own input's blur.
     * Answers false where the field refused the edit and the editor stays open.
     */
    private commitEditor(grid: HTMLElement, state: OpenEditor): boolean {
        const held = document.activeElement instanceof HTMLElement && state.editor.contains(document.activeElement);

        if (held)
            (document.activeElement as HTMLElement).blur();

        if (!this.closeEditor(grid, state, true))
            return false;

        // The blur took the focus out of the editor before the close could see it, so the keyboard is put back on the row here.
        if (held)
            this.focus.giveBack(state.cell);

        return true;
    }
}

/** The element beside a row in its host, `step` along: the next or the previous. */
function siblingRow(row: Element, step: 1 | -1): HTMLElement | null {
    const sibling = step > 0 ? row.nextElementSibling : row.previousElementSibling;

    return sibling instanceof HTMLElement ? sibling : null;
}

/** Whether the popup open in an editor is a list: the one the focus stands in, else the one its opener names. */
function isList(popup: Element | null, opener: Element | null): boolean {
    return popup === null ? opener?.getAttribute("aria-haspopup") === "listbox" : popup.getAttribute("role") === "listbox";
}

/** Whether an element can still be seen: laid out, and not `visibility: hidden`, as a column hidden at a narrower width is. */
function isShown(element: Element): boolean {
    return element.getClientRects().length > 0 && getComputedStyle(element).visibility === "visible";
}
