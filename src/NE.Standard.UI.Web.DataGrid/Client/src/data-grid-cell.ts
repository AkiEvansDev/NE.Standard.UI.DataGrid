// A typed cell's value as text, by the attributes the renderer left on the cell: the client half of DataGridCellFormatter, over
// the same formatters the framework hands a package, so a row built here reads like one painted on the server.

import type { ClientStrings, NumberCulturePack, NumberFormatting, TemporalCulturePack, TemporalFormatting } from "ne-standard-ui";

export const CellOperationKind = "data-grid-cell";

const KindAttribute = "data-ui-grid-kind";
const FormatAttribute = "data-ui-grid-format";
const CurrencyAttribute = "data-ui-grid-currency";
const ChoicesAttribute = "data-ui-grid-choices";
/** On a number or money cell: the value as a number — a numeric text's too — for a footer to add up. */
export const RawValueAttribute = "data-ui-grid-raw";

// What double.TryParse reads under NumberStyles.Float, the invariant culture, on the server's side.
const DecimalText = /^\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?\s*$/;

const YesKey = "ui.grid.yes";
const NoKey = "ui.grid.no";

export type CellFormatting = {
    readonly numbers: NumberFormatting;
    readonly temporal: TemporalFormatting;
    readonly strings: ClientStrings;
};

/** What a cell says about itself: the renderer's attributes, read once per write. */
export type CellShape = {
    readonly kind: string;
    readonly format: string | null;
    readonly currency: string | null;
    readonly choices: Readonly<Record<string, string>> | null;
};

export function readCellShape(cell: Element): CellShape {
    return {
        kind: cell.getAttribute(KindAttribute) ?? "text",
        format: cell.getAttribute(FormatAttribute),
        currency: cell.getAttribute(CurrencyAttribute),
        choices: parseChoices(cell.getAttribute(ChoicesAttribute))
    };
}

function parseChoices(text: string | null): Readonly<Record<string, string>> | null {
    if (text === null || text.length === 0)
        return null;

    try {
        return JSON.parse(text) as Record<string, string>;
    }
    catch {
        return null;
    }
}

/** Writes the value into the cell, formatted; guarded by what the cell already shows, since an attach replays the whole change set. */
export function applyCellValue(cell: Element, value: unknown, formatting: CellFormatting): void {
    const shape = readCellShape(cell);
    const text = formatCellValue(value, shape, formatting.numbers.readCulture(cell), formatting.temporal.readCulture(cell), formatting);

    if (cell.textContent !== text)
        cell.textContent = text;

    const number = shape.kind === "number" || shape.kind === "money" ? toNumber(value) : null;

    if (number !== null)
        cell.setAttribute(RawValueAttribute, String(number));
    else if (cell.hasAttribute(RawValueAttribute))
        cell.removeAttribute(RawValueAttribute);
}

/** The value as the cell's kind writes it: a number under its format, a date under its pattern, a flag or a choice by its caption. */
export function formatCellValue(value: unknown, shape: CellShape, numbers: NumberCulturePack, dates: TemporalCulturePack, formatting: CellFormatting): string {
    if (value === null || value === undefined)
        return "";

    switch (shape.kind) {
        case "number":
        case "money": {
            const number = toNumber(value);

            if (number === null)
                return String(value);

            const culture = shape.kind === "money" && shape.currency !== null ? { ...numbers, currencySymbol: shape.currency } : numbers;

            return formatting.numbers.format(number, shape.format, culture);
        }
        case "date": {
            const moment = toDate(value, formatting.temporal);

            return moment === null ? String(value) : formatting.temporal.format(moment, shape.format, dates);
        }
        case "boolean": {
            const flag = value === true || value === "true" || value === "True";
            const key = flag ? "true" : "false";

            return shape.choices?.[key] ?? formatting.strings.text(flag ? YesKey : NoKey);
        }
        case "enum": {
            const text = String(value);

            return shape.choices?.[text] ?? text;
        }
        default:
            return String(value);
    }
}

/**
 * A number, or a text that reads as one the way the server's cell reads it — decimal digits with a point and an exponent, no
 * grouping and no `0x`; null for anything else, and for a number no finite value holds.
 */
export function toNumber(value: unknown): number | null {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : null;

    if (typeof value !== "string" || !DecimalText.test(value))
        return null;

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
}

/** A moment off the wire, read as the framework reads one: by the clock it is written with, never by `new Date(text)` and the reader's zone. */
export function toDate(value: unknown, temporal: TemporalFormatting): Date | null {
    if (value instanceof Date)
        return value;

    if (typeof value !== "string")
        return null;

    const moment = temporal.parse(value);

    return moment === null ? null : temporal.toDate(moment);
}
