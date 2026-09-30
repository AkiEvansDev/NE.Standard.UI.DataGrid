// A typed cell's value as text: the client half of DataGridCellFormatter, over the framework's formatters, so a row built here
// reads like one painted on the server.

import type { ClientStrings, NumberCulturePack, NumberFormatting, TemporalCulturePack, TemporalFormatting } from "ne-standard-ui";
import { GridAttributes, GridWords } from "./data-grid-names.ts";

// What double.TryParse reads under NumberStyles.Float, the invariant culture, on the server's side.
const DecimalText = /^\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?\s*$/;

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
        kind: cell.getAttribute(GridAttributes.kind) ?? "text",
        format: cell.getAttribute(GridAttributes.format),
        currency: cell.getAttribute(GridAttributes.currency),
        choices: parseChoices(cell.getAttribute(GridAttributes.choices))
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

    // On a number or money cell: the value as a number, a numeric text's too, for a footer to add up and a language switch to redraw.
    if (number !== null)
        cell.setAttribute(GridAttributes.raw, String(number));
    else if (cell.hasAttribute(GridAttributes.raw))
        cell.removeAttribute(GridAttributes.raw);

    const moment = shape.kind === "date" ? writtenMoment(value, formatting.temporal) : null;

    // On a date cell: the moment as the wire wrote it, so a language switch writes the date again in the new names.
    if (moment !== null)
        cell.setAttribute(GridAttributes.moment, moment);
    else if (cell.hasAttribute(GridAttributes.moment))
        cell.removeAttribute(GridAttributes.moment);

    const choice = choiceValue(value, shape.kind);

    // On a flag or a choice cell: the value its caption is keyed by, so a language switch writes the caption again.
    if (choice !== null)
        cell.setAttribute(GridAttributes.choice, choice);
    else if (cell.hasAttribute(GridAttributes.choice))
        cell.removeAttribute(GridAttributes.choice);
}

// A cell that keeps its value: a flag's or a choice's by its key, a number's invariant, a date's moment.
const KeptValueSelector = `[${GridAttributes.choice}], [${GridAttributes.raw}], [${GridAttributes.moment}]`;

/**
 * Writes every cell under `root` that keeps its value again, from that value: a flag's or a choice's caption in the page's words,
 * a number and a date in the packs a language switch wrote on the grid.
 */
export function rewriteKeptCells(root: ParentNode, formatting: CellFormatting): void {
    for (const cell of root.querySelectorAll(KeptValueSelector))
        applyCellValue(cell, cell.getAttribute(GridAttributes.choice) ?? cell.getAttribute(GridAttributes.raw) ?? cell.getAttribute(GridAttributes.moment), formatting);
}

/** A flag's or a choice's value as its choices are keyed — `true`/`false`, or the value's text; null for any other kind. */
function choiceValue(value: unknown, kind: string): string | null {
    if (value === null || value === undefined)
        return null;

    if (kind === "boolean")
        return isTrue(value) ? "true" : "false";

    return kind === "enum" ? String(value) : null;
}

/** A text says true in any case, as the server reads it; anything else is false. */
function isTrue(value: unknown): boolean {
    return value === true || (typeof value === "string" && value.toLowerCase() === "true");
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
            // The captions are keyed by the two words; they come as the author wrote them, and are the page's words once looked up.
            const flag = isTrue(value);
            const caption = shape.choices?.[flag ? "true" : "false"];

            return caption === undefined ? formatting.strings.text(flag ? GridWords.yes : GridWords.no) : formatting.strings.resolveText(caption);
        }
        case "enum": {
            const text = String(value);
            const caption = shape.choices?.[text];

            return caption === undefined ? text : formatting.strings.resolveText(caption);
        }
        default:
            return String(value);
    }
}

/** A date's value as the wire writes it, kept to be drawn again; null for a value that is no written moment. */
function writtenMoment(value: unknown, temporal: TemporalFormatting): string | null {
    return typeof value === "string" && temporal.parse(value) !== null ? value : null;
}

/** A number, or a text the server's cell reads as one; null for anything else or a value no finite number holds. */
export function toNumber(value: unknown): number | null {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : null;

    if (typeof value !== "string" || !DecimalText.test(value))
        return null;

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
}

/** A moment off the wire, read as the framework reads one: by the clock it is written with, never by `new Date(text)` and the reader's zone. */
function toDate(value: unknown, temporal: TemporalFormatting): Date | null {
    if (value instanceof Date)
        return value;

    if (typeof value !== "string")
        return null;

    const moment = temporal.parse(value);

    return moment === null ? null : temporal.toDate(moment);
}
