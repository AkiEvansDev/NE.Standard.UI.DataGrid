import assert from "node:assert/strict";
import test from "node:test";

import type { NumberCulturePack, TemporalCulturePack } from "ne-standard-ui";
import { formatCellValue, toDate } from "../src/data-grid-cell.ts";
import type { CellFormatting, CellShape } from "../src/data-grid-cell.ts";

// The formatters are the framework's; here they are stand-ins that say what they were given, since the framework's own tests pin
// the real ones against .NET's output.
const numbers: NumberCulturePack = {
    decimalSeparator: ".", groupSeparator: ",", groupSizes: [3], negativeSign: "-", negativePattern: 1, decimalDigits: 2,
    currencySymbol: "$", currencyDecimalSeparator: ".", currencyGroupSeparator: ",", currencyGroupSizes: [3], currencyDecimalDigits: 2,
    currencyPositivePattern: 0, currencyNegativePattern: 0, percentSymbol: "%", percentDecimalSeparator: ".", percentGroupSeparator: ",",
    percentGroupSizes: [3], percentDecimalDigits: 2, percentPositivePattern: 0, percentNegativePattern: 0
};

const dates: TemporalCulturePack = {
    monthNames: [], monthGenitiveNames: [], abbreviatedMonthNames: [], dayNames: [], abbreviatedDayNames: [], amDesignator: "AM", pmDesignator: "PM"
};

const formatting: CellFormatting = {
    numbers: { readCulture: () => numbers, format: (value, format, culture) => `${culture.currencySymbol}${value}|${format ?? ""}` },
    temporal: {
        readCulture: () => dates,
        format: (value, format) => `${value.getFullYear()}-${value.getMonth() + 1}-${value.getDate()}|${format ?? ""}`,
        parse: text => {
            const written = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?$/.exec(text);

            return written === null
                ? null
                : { year: Number(written[1]), month: Number(written[2]), day: Number(written[3]), hour: Number(written[4] ?? "0"), minute: Number(written[5] ?? "0"), second: Number(written[6] ?? "0"), millisecond: 0 };
        },
        toDate: moment => new Date(moment.year, moment.month - 1, moment.day, moment.hour, moment.minute, moment.second)
    },
    strings: { text: key => `<${key}>`, format: key => `<${key}>` }
};

function shape(kind: string, extra: Partial<CellShape> = {}): CellShape {
    return { kind, format: null, currency: null, choices: null, ...extra };
}

test("a number and an amount go through the number formatter, the amount with the column's own symbol", () => {
    assert.equal(formatCellValue(1234.5, shape("number", { format: "N1" }), numbers, dates, formatting), "$1234.5|N1");
    assert.equal(formatCellValue("42", shape("number"), numbers, dates, formatting), "$42|");
    assert.equal(formatCellValue(9, shape("money", { format: "C", currency: "€" }), numbers, dates, formatting), "€9|C");
    assert.equal(formatCellValue("n/a", shape("number"), numbers, dates, formatting), "n/a");
});

test("a date is read off the wire as a local moment and goes through the temporal formatter", () => {
    assert.equal(formatCellValue("2026-09-11", shape("date", { format: "dd MMM yyyy" }), numbers, dates, formatting), "2026-9-11|dd MMM yyyy");
    assert.equal(formatCellValue("2026-09-11T23:30:00", shape("date"), numbers, dates, formatting), "2026-9-11|");
    assert.equal(toDate("not a date", formatting.temporal), null);
    assert.equal(toDate(new Date(2026, 0, 2), formatting.temporal)?.getDate(), 2);
});

test("a flag and a choice show their captions, the flag falling back to the page's yes and no", () => {
    assert.equal(formatCellValue(true, shape("boolean"), numbers, dates, formatting), "<ui.grid.yes>");
    assert.equal(formatCellValue(false, shape("boolean", { choices: { true: "Paid", false: "Open" } }), numbers, dates, formatting), "Open");
    assert.equal(formatCellValue("Shipped", shape("enum", { choices: { Shipped: "On its way" } }), numbers, dates, formatting), "On its way");
    assert.equal(formatCellValue("Lost", shape("enum", { choices: { Shipped: "On its way" } }), numbers, dates, formatting), "Lost");
    assert.equal(formatCellValue(null, shape("text"), numbers, dates, formatting), "");
});
