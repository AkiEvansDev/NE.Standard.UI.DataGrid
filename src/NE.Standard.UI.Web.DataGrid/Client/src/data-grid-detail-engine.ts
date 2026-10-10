// A row's detail, opened at the detail column's chevron — by a click, or Enter or Space with the keyboard's cursor on its cell — or,
// when the grid says so, by a click or Enter on the row. The template is drawn when opened and removed when closed, so only shown details
// exist. An open detail is a cell spanning its row, a line of its own in the core's cell cursor.

import type { DomNames, ItemRows, PluginEngineContext } from "ne-standard-ui";
import { componentIdOf, gridOf, isOwnRow, ownDescendants, RootSelector, rowSelector } from "./data-grid-dom.ts";
import { ClientNames, GridAttributes, GridClasses } from "./data-grid-names.ts";

const ToggleSelector = `.${GridClasses.detailCell}`;
const DetailClass = ClientNames.detailClass;
const DetailVariantKey = "detail";
const ExpandedAttribute = ClientNames.expanded;
const ExpandOnClickAttribute = GridAttributes.expandOnClick;
const MultipleAttribute = GridAttributes.multipleDetails;
const ChevronSelector = `${ToggleSelector} button`;
/** The core's row event for Enter and a double click. */
const OpenEventName = "open";

/** The grid's open details as they stood before a row's first click: each row with the detail it held, kept to put back. */
type DetailsBefore = {
    readonly row: HTMLElement;
    readonly open: ReadonlyMap<HTMLElement, Element | null>;
};

export class DataGridDetailEngine {
    private readonly rows: ItemRows;
    private readonly names: DomNames;
    private readonly rowSelector: string;
    // Set while an Enter is being handled: the core raises the row's `open` for Enter and for a double click alike; Enter toggles
    // the detail, and a double click, whose own two clicks toggled it already, puts it back.
    private enterDown = false;
    // Taken at a row's first click, so the `open` a double click raises puts the details back as they were before it.
    private beforeClick: DetailsBefore | null = null;

    public constructor(context: PluginEngineContext) {
        this.rows = context.rows;
        this.names = context.names;
        this.rowSelector = rowSelector(context.names);

        this.markAll(context.root.querySelectorAll<HTMLElement>(RootSelector));
        context.observeComponents(context.root, RootSelector, { childList: true }, grids => this.markAll(grids));

        // Enter on the cursor's cell, which the core offers before it acts (`names.cellKey`): left to the row, it raises the row's open.
        // Enter on the chevron's cell presses the chevron instead, and one an editor took raises nothing.
        context.root.addEventListener(context.names.cellKey, domEvent => {
            if (domEvent.defaultPrevented || !(domEvent instanceof CustomEvent) || (domEvent.detail as { readonly key: string }).key !== "Enter")
                return;

            this.enterDown = true;
            window.setTimeout(() => {
                this.enterDown = false;
            }, 0);
        }, true);

        context.root.addEventListener(OpenEventName, domEvent => {
            const row = domEvent.target instanceof Element ? domEvent.target.closest<HTMLElement>(this.rowSelector) : null;
            const grid = gridOf(row);

            if (row === null || grid === null || !grid.hasAttribute(ExpandOnClickAttribute) || !isOwnRow(grid, row, this.names))
                return;

            if (this.enterDown)
                this.toggleDetail(grid, row);
            else if (this.beforeClick?.row === row)
                this.restoreDetails(grid, this.beforeClick.open);

            this.beforeClick = null;
        });

        context.root.addEventListener("click", domEvent => {
            if (!(domEvent.target instanceof Element))
                return;

            const grid = gridOf(domEvent.target);
            const row = domEvent.target.closest<HTMLElement>(this.rowSelector);

            // A row of a table inside a detail is that table's, not one this grid opens.
            if (grid === null || row === null || !isOwnRow(grid, row, this.names))
                return;

            // A second click is a double click's: its own toggle stands until the `open` puts the first click's state back. A first
            // click that toggles nothing leaves nothing to put back.
            const first = !(domEvent instanceof MouseEvent) || domEvent.detail <= 1;

            if (first)
                this.beforeClick = null;

            // The detail stands inside its row: a press on a button, a field or the text in it is the detail's, not the row's.
            if (domEvent.target.closest(`.${DetailClass}`)?.parentElement === row)
                return;

            const toggle = domEvent.target.closest(ToggleSelector) !== null;

            // Anywhere on the row only where the grid asked for it, and never in a cell that answers the click itself.
            if (!toggle && (!grid.hasAttribute(ExpandOnClickAttribute) || this.answersClick(domEvent.target)))
                return;

            // Nothing under the chevron is a link or a command; the framework's own row opening must not run on top of this.
            domEvent.preventDefault();

            if (first)
                this.beforeClick = { row, open: this.openDetails(grid) };

            this.toggleDetail(grid, row);
        });
    }

    /** Every chevron says its detail is in until it is opened, so a reader hears it as a disclosure from the start. */
    private markAll(grids: Iterable<HTMLElement>): void {
        for (const grid of grids) {
            for (const chevron of ownDescendants(grid, `${ChevronSelector}:not([aria-expanded])`))
                chevron.setAttribute("aria-expanded", "false");
        }
    }

    private toggleDetail(grid: HTMLElement, row: HTMLElement): void {
        if (row.hasAttribute(ExpandedAttribute)) {
            this.closeDetail(row);
            return;
        }

        if (!grid.hasAttribute(MultipleAttribute)) {
            for (const other of ownDescendants(grid, `${this.rowSelector}[${ExpandedAttribute}]`))
                this.closeDetail(other);
        }

        const componentId = componentIdOf(grid, this.names);
        const content = componentId === null ? null : this.rows.renderVariant(row, componentId, DetailVariantKey);

        if (content === null)
            return;

        const detail = document.createElement("div");

        detail.className = DetailClass;
        // A cell spanning the row, under its cells: the keyboard's cursor reaches it by Down, and Enter or F2 goes into it.
        detail.setAttribute("role", "gridcell");
        // Over the columns shown, first among them; the core's column layout writes both again as the columns change.
        detail.setAttribute("aria-colindex", "1");
        detail.setAttribute("aria-colspan", String(this.rows.cellsOf(row).length));
        // Inside the row, yet not the row to lift: a press there never drags it where the grid's rows are Draggable.
        detail.setAttribute(this.names.noRowDrag, "");
        detail.appendChild(content);
        row.appendChild(detail);
        row.setAttribute(ExpandedAttribute, "");
        markExpanded(row, true);
    }

    /** Takes a row's detail in; the keyboard's cursor standing on it goes back to the row's cells, in the column it stood in. */
    private closeDetail(row: HTMLElement): void {
        const detail = row.querySelector(`:scope > .${DetailClass}`);
        const held = detail?.hasAttribute(this.names.cellFocus) === true;

        row.removeAttribute(ExpandedAttribute);
        detail?.remove();
        markExpanded(row, false);

        if (held)
            this.rows.moveCursor(row);
    }

    /** Puts the details back as they stood: the same elements, so what a reader did inside one (a scroll, a field) is still there. */
    private restoreDetails(grid: HTMLElement, open: ReadonlyMap<HTMLElement, Element | null>): void {
        for (const row of ownDescendants(grid, `${this.rowSelector}[${ExpandedAttribute}]`)) {
            if (!open.has(row))
                this.closeDetail(row);
        }

        for (const [row, detail] of open) {
            if (!row.isConnected || detail === null || row.querySelector(`:scope > .${DetailClass}`) === detail)
                continue;

            row.querySelector(`:scope > .${DetailClass}`)?.remove();
            row.appendChild(detail);
            row.setAttribute(ExpandedAttribute, "");
            markExpanded(row, true);
        }
    }

    /** Whether the click lands in a cell that keeps it: the checkbox's, or an editable one while the grid edits. */
    private answersClick(target: Element): boolean {
        return target.closest(`[${this.names.noRowOpen}]`) !== null;
    }

    /** The grid's own rows whose detail is out, each with the detail element it holds. */
    private openDetails(grid: HTMLElement): Map<HTMLElement, Element | null> {
        const open = new Map<HTMLElement, Element | null>();

        for (const row of ownDescendants(grid, `${this.rowSelector}[${ExpandedAttribute}]`))
            open.set(row, row.querySelector(`:scope > .${DetailClass}`));

        return open;
    }
}

/** The chevron says whether the detail it opens is out, for a reader who cannot see it turn. */
function markExpanded(row: HTMLElement, expanded: boolean): void {
    row.querySelector(`:scope > ${ChevronSelector}`)?.setAttribute("aria-expanded", expanded ? "true" : "false");
}
