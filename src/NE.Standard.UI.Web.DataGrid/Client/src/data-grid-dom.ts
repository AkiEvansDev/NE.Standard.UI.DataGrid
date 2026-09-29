// What every engine of the grid reads off the page: the grid's root, rows and host as the table's renderer lays them out, plus
// small readings the engines share.

import type { DomNames, ItemRows } from "ne-standard-ui";
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

/** The grid's own matching descendants, a nested grid's left to it. */
export function ownDescendants(grid: HTMLElement, selector: string): HTMLElement[] {
    const own: HTMLElement[] = [];

    for (const element of grid.querySelectorAll<HTMLElement>(selector)) {
        if (element.closest(RootSelector) === grid)
            own.push(element);
    }

    return own;
}

/** The grid's first own match inside `within` (the grid itself unless given), a nested grid's left to it. */
export function ownFirst<T extends HTMLElement = HTMLElement>(grid: HTMLElement, selector: string, within: ParentNode = grid): T | null {
    for (const element of within.querySelectorAll<T>(selector)) {
        if (element.closest(RootSelector) === grid)
            return element;
    }

    return null;
}

/** The grid the element stands in, or null outside every grid. */
export function gridOf(target: EventTarget | null): HTMLElement | null {
    return target instanceof Element ? target.closest<HTMLElement>(RootSelector) : null;
}

/** Whether a key landed where the row keyboard answers it (`rows.isKeyTarget`), less an open detail, whose keys are its own. */
export function isRowKeyTarget(rows: ItemRows, target: Element): boolean {
    const detail = target.closest(`.${ClientNames.detailClass}`);

    return rows.isKeyTarget(target) && (detail === null || gridOf(detail) !== gridOf(target));
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

export function readNumberAttribute(element: Element, attribute: string): number | null {
    const text = element.getAttribute(attribute);

    if (text === null || text.length === 0)
        return null;

    const value = Number(text);

    return Number.isFinite(value) ? value : null;
}
