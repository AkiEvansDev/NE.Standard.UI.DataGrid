// A row's detail: a detail column's chevron opens it, or a click anywhere on the row when the grid says so. The grid's `detail`
// template is drawn against the row's item when opened and removed when closed, so only shown details exist, not one per row.

import type { ItemRows, PluginEngineContext } from "ne-standard-ui";
import { componentIdOf, gridOf, RowSelector } from "./data-grid-dom.ts";

const ToggleSelector = ".ui-data-grid__cell--detail";
const DetailClass = "ui-data-grid__detail";
const DetailVariantKey = "detail";
const ExpandedAttribute = "data-ui-grid-expanded";
const ExpandOnClickAttribute = "data-ui-grid-expand-click";
const MultipleAttribute = "data-ui-grid-multiple-details";
/** On a cell that keeps a double click for itself — an editable one; a click there is not a click on the row. */
const NoRowOpenAttribute = "data-ui-no-row-open";

export class DataGridDetailEngine {
    private readonly rows: ItemRows;

    public constructor(context: PluginEngineContext) {
        this.rows = context.rows;

        context.root.addEventListener("click", domEvent => {
            if (!(domEvent.target instanceof Element))
                return;

            const grid = gridOf(domEvent.target);
            const row = domEvent.target.closest<HTMLElement>(RowSelector);

            if (grid === null || row === null || !grid.contains(row))
                return;

            const toggle = domEvent.target.closest(ToggleSelector) !== null;

            // Anywhere on the row only where the grid asked for it, and never in a cell that answers the click itself.
            if (!toggle && (!grid.hasAttribute(ExpandOnClickAttribute) || domEvent.target.closest(`[${NoRowOpenAttribute}]`) !== null))
                return;

            // Nothing under the chevron is a link or a command; the framework's own row opening must not run on top of this.
            domEvent.preventDefault();
            this.toggleDetail(grid, row);
        });
    }

    private toggleDetail(grid: HTMLElement, row: HTMLElement): void {
        if (row.hasAttribute(ExpandedAttribute)) {
            closeDetail(row);
            return;
        }

        if (!grid.hasAttribute(MultipleAttribute)) {
            for (const other of grid.querySelectorAll<HTMLElement>(`${RowSelector}[${ExpandedAttribute}]`))
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
    }
}

function closeDetail(row: HTMLElement): void {
    row.removeAttribute(ExpandedAttribute);
    row.querySelector(`:scope > .${DetailClass}`)?.remove();
}
