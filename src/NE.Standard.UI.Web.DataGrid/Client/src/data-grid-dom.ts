// What every engine of the grid reads off the page: the grid's root, rows and host as the table's renderer lays them out, plus
// small readings the engines share.

export const RootSelector = ".ui-data-grid";
export const RowSelector = ".ui-table__row";
/** The rows' host, inside the box that carries the table's frame and its scroll. */
export const HostSelector = ":scope > .ui-table__scroll > [data-ui-items-host]";
const ComponentIdAttribute = "data-ui-id";

/** The grid's own matching descendants, a nested grid's left to it. */
export function ownDescendants(grid: HTMLElement, selector: string): HTMLElement[] {
    const own: HTMLElement[] = [];

    for (const element of grid.querySelectorAll<HTMLElement>(selector)) {
        if (element.closest(RootSelector) === grid)
            own.push(element);
    }

    return own;
}

/** The grid the element stands in, or null outside every grid. */
export function gridOf(target: EventTarget | null): HTMLElement | null {
    return target instanceof Element ? target.closest<HTMLElement>(RootSelector) : null;
}

/** The grid's component id, which the framework draws its variants by; null when the root carries none. */
export function componentIdOf(grid: Element): number | null {
    const id = Number(grid.getAttribute(ComponentIdAttribute));

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
