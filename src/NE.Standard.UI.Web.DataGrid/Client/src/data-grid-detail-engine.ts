// A row's detail: a detail column's chevron opens it, or a click anywhere on the row — and Enter on the keyboard's row — when the
// grid says so. The grid's `detail` template is drawn against the row's item when opened and removed when closed, so only shown
// details exist, not one per row.

import type { ItemRows, PluginEngineContext } from "ne-standard-ui";
import { componentIdOf, gridOf, ownDescendants, RootSelector, RowSelector } from "./data-grid-dom.ts";

const ToggleSelector = ".ui-data-grid__cell--detail";
const DetailClass = "ui-data-grid__detail";
const DetailVariantKey = "detail";
const ExpandedAttribute = "data-ui-grid-expanded";
const ExpandOnClickAttribute = "data-ui-grid-expand-click";
const MultipleAttribute = "data-ui-grid-multiple-details";
/** On a cell that keeps a click for itself — the checkbox's, an editable one; a click there is not a click on the row. */
const NoRowOpenAttribute = "data-ui-no-row-open";
/** On the root while editing is off: an editable cell opens no editor, so its click is the row's again. */
const ReadOnlyAttribute = "data-ui-grid-readonly";
const EditableCellSelector = ".ui-data-grid__cell--editable";
const ChevronSelector = `${ToggleSelector} button`;
/** The core's row event for Enter and a double click. */
const OpenEventName = "open";

export class DataGridDetailEngine {
    private readonly rows: ItemRows;
    // Set while an Enter is being handled: the core raises the row's `open` for Enter and for a double click alike, and a double
    // click has already toggled the row twice by its own two clicks.
    private enterDown = false;

    public constructor(context: PluginEngineContext) {
        this.rows = context.rows;

        this.markAll(context.root.querySelectorAll<HTMLElement>(RootSelector));
        context.observeComponents(context.root, RootSelector, { childList: true }, grids => this.markAll(grids));

        context.root.addEventListener("keydown", domEvent => {
            if (!(domEvent instanceof KeyboardEvent) || domEvent.key !== "Enter")
                return;

            this.enterDown = true;
            window.setTimeout(() => {
                this.enterDown = false;
            }, 0);
        }, true);

        context.root.addEventListener(OpenEventName, domEvent => {
            const row = this.enterDown && domEvent.target instanceof Element ? domEvent.target.closest<HTMLElement>(RowSelector) : null;
            const grid = gridOf(row);

            if (row !== null && grid !== null && grid.hasAttribute(ExpandOnClickAttribute))
                this.toggleDetail(grid, row);
        });

        context.root.addEventListener("click", domEvent => {
            if (!(domEvent.target instanceof Element))
                return;

            const grid = gridOf(domEvent.target);
            const row = domEvent.target.closest<HTMLElement>(RowSelector);

            if (grid === null || row === null || !grid.contains(row))
                return;

            // The detail stands inside its row: a press on a button, a field or the text in it is the detail's, not the row's.
            if (domEvent.target.closest(`.${DetailClass}`)?.parentElement === row)
                return;

            const toggle = domEvent.target.closest(ToggleSelector) !== null;

            // Anywhere on the row only where the grid asked for it, and never in a cell that answers the click itself.
            if (!toggle && (!grid.hasAttribute(ExpandOnClickAttribute) || answersClick(grid, domEvent.target)))
                return;

            // Nothing under the chevron is a link or a command; the framework's own row opening must not run on top of this.
            domEvent.preventDefault();
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
            closeDetail(row);
            return;
        }

        if (!grid.hasAttribute(MultipleAttribute)) {
            for (const other of ownDescendants(grid, `${RowSelector}[${ExpandedAttribute}]`))
                closeDetail(other);
        }

        const componentId = componentIdOf(grid);
        const content = componentId === null ? null : this.rows.renderVariant(row, componentId, DetailVariantKey);

        if (content === null)
            return;

        const detail = document.createElement("div");

        detail.className = DetailClass;
        detail.appendChild(content);
        row.appendChild(detail);
        row.setAttribute(ExpandedAttribute, "");
        markExpanded(row, true);
    }
}

/** Whether the click lands in a cell that answers it itself; an editable cell does not while the grid's editing is off. */
function answersClick(grid: HTMLElement, target: Element): boolean {
    const cell = target.closest(`[${NoRowOpenAttribute}]`);

    return cell !== null && !(grid.hasAttribute(ReadOnlyAttribute) && cell.matches(EditableCellSelector));
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
