// A row's detail, opened at the detail column's chevron, by Right and Left on the keyboard's row, or, when the grid says so, by a click
// or Enter on the row. The template is drawn when opened and removed when closed, so only shown details exist.

import type { ComponentStates, DomNames, ItemRows, PluginEngineContext } from "ne-standard-ui";
import { componentIdOf, gridOf, isOwnRow, isRowKeyTarget, ownDescendants, ownFirst, RootSelector, rowSelector } from "./data-grid-dom.ts";
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
    private readonly states: ComponentStates;
    private readonly rowSelector: string;
    // Set while an Enter is being handled: the core raises the row's `open` for Enter and for a double click alike; Enter toggles
    // the detail, and a double click, whose own two clicks toggled it already, puts it back.
    private enterDown = false;
    // Taken at a row's first click, so the `open` a double click raises puts the details back as they were before it.
    private beforeClick: DetailsBefore | null = null;

    public constructor(context: PluginEngineContext) {
        this.rows = context.rows;
        this.names = context.names;
        this.states = context.states;
        this.rowSelector = rowSelector(context.names);

        this.markAll(context.root.querySelectorAll<HTMLElement>(RootSelector));
        context.observeComponents(context.root, RootSelector, { childList: true }, grids => this.markAll(grids));

        // Enter, Right and Left on the grid itself or in a row, where the row keyboard answers them; one in the band, a flyout or the
        // header is that part's own.
        context.root.addEventListener("keydown", domEvent => {
            if (!(domEvent instanceof KeyboardEvent) || !(domEvent.target instanceof Element) || !isRowKeyTarget(this.rows, domEvent.target))
                return;

            if (domEvent.key === "ArrowRight" || domEvent.key === "ArrowLeft") {
                this.handleArrow(domEvent, domEvent.target, domEvent.key === "ArrowRight");
                return;
            }

            if (domEvent.key !== "Enter")
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

    /**
     * Right opens the keyboard's row's detail and Left closes it, as a tree grid's row unfolds: the chevron is a part of the row that
     * answers its own press, out of the Tab order (the core's `ownPressControlsOf`). A key with a modifier is another's, and a row with
     * no chevron has no detail to open.
     */
    private handleArrow(domEvent: KeyboardEvent, target: Element, open: boolean): void {
        const grid = gridOf(target);

        if (domEvent.defaultPrevented || domEvent.ctrlKey || domEvent.metaKey || domEvent.altKey || domEvent.shiftKey || grid === null || this.states.isInert(grid))
            return;

        const row = ownFirst(grid, `${this.rowSelector}[${this.names.rowFocus}]`);

        if (row === null || !isOwnRow(grid, row, this.names) || row.querySelector(`:scope > ${ChevronSelector}`) === null)
            return;

        domEvent.preventDefault();

        if (row.hasAttribute(ExpandedAttribute) !== open)
            this.toggleDetail(grid, row);
    }

    private toggleDetail(grid: HTMLElement, row: HTMLElement): void {
        if (row.hasAttribute(ExpandedAttribute)) {
            closeDetail(row);
            return;
        }

        if (!grid.hasAttribute(MultipleAttribute)) {
            for (const other of ownDescendants(grid, `${this.rowSelector}[${ExpandedAttribute}]`))
                closeDetail(other);
        }

        const componentId = componentIdOf(grid, this.names);
        const content = componentId === null ? null : this.rows.renderVariant(row, componentId, DetailVariantKey);

        if (content === null)
            return;

        const detail = document.createElement("div");

        detail.className = DetailClass;
        // Inside the row, yet not the row to lift: a press there never drags it where the grid's rows are Draggable.
        detail.setAttribute(this.names.noRowDrag, "");
        detail.appendChild(content);
        row.appendChild(detail);
        row.setAttribute(ExpandedAttribute, "");
        markExpanded(row, true);
    }

    /** Puts the details back as they stood: the same elements, so what a reader did inside one (a scroll, a field) is still there. */
    private restoreDetails(grid: HTMLElement, open: ReadonlyMap<HTMLElement, Element | null>): void {
        for (const row of ownDescendants(grid, `${this.rowSelector}[${ExpandedAttribute}]`)) {
            if (!open.has(row))
                closeDetail(row);
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

function closeDetail(row: HTMLElement): void {
    row.removeAttribute(ExpandedAttribute);
    row.querySelector(`:scope > .${DetailClass}`)?.remove();
    markExpanded(row, false);
}

/** The chevron says whether the detail it opens is out, for a reader who cannot see it turn. */
function markExpanded(row: HTMLElement, expanded: boolean): void {
    row.querySelector(`:scope > ${ChevronSelector}`)?.setAttribute("aria-expanded", expanded ? "true" : "false");
}
