// What every engine of the grid reads off the page: the grid's root, rows and host as the table's renderer lays them out, plus
// small readings the engines share.

import type { DomNames, DomRegistry } from "ne-standard-ui";
import { ClientNames, GridClasses } from "./data-grid-names.ts";

export const RootSelector = `.${GridClasses.root}`;

/** A row of the table, the grid's own or a nested table's. */
export function rowSelector(names: DomNames): string {
    return `.${names.tableRowClass}`;
}

/** The rows' host, inside the box that carries the table's frame and its scroll. */
export function hostSelector(names: DomNames): string {
    return `:scope > .${names.tableScrollClass} > [${names.itemsHost}]`;
}

/** The grid the element stands in, or null outside every grid. */
export function gridOf(target: EventTarget | null): HTMLElement | null {
    return target instanceof Element ? target.closest<HTMLElement>(RootSelector) : null;
}

/** One of the grid's own rows — in its host, not a table's inside a row's detail. */
export function isOwnRow(grid: HTMLElement, row: Element, names: DomNames): boolean {
    return row.parentElement !== null && row.parentElement === grid.querySelector(hostSelector(names));
}

/** The grid's component id, which the framework draws its variants by; null when the root carries none. */
export function componentIdOf(grid: Element, names: DomNames): number | null {
    const id = Number(grid.getAttribute(names.componentId));

    return Number.isInteger(id) ? id : null;
}

/** Writes the attribute only when it changes, so an observer of it is not woken for nothing; null takes it off. */
export function setAttribute(element: Element, name: string, value: string | null): void {
    if (value === null)
        element.removeAttribute(name);
    else if (element.getAttribute(name) !== value)
        element.setAttribute(name, value);
}

/**
 * A row's control named by its own words and the row's header cells — "Select row SUB-001001", "Details SUB-001001" — rather than
 * the same words in every row; a row with no header cell, or a control with no words, keeps its own name alone.
 */
export function nameByRow(control: HTMLElement, row: HTMLElement, ensureId: DomRegistry["ensureId"]): void {
    const headers = [...row.children].filter(cell => cell.getAttribute("role") === "rowheader");

    if (headers.length === 0 || !control.hasAttribute("aria-label")) {
        control.removeAttribute("aria-labelledby");
        return;
    }

    const ids = [control, ...headers].map(element => ensureId(element, ClientNames.nameIdPrefix)).join(" ");

    if (control.getAttribute("aria-labelledby") !== ids)
        control.setAttribute("aria-labelledby", ids);
}
