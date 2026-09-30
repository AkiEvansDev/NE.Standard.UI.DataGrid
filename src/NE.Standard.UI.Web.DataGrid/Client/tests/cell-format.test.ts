// The client half of the cell parity check, against the corpus DataGridCellFormatterTests reads, over the framework's own
// formatters loaded from its source, so the corpus pins the grid's reading of a value, not a stand-in's.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import type { NumberCulturePack, NumberFormatting, TemporalCulturePack, TemporalFormatting } from "ne-standard-ui";
import { applyCellValue, formatCellValue, rewriteKeptCells } from "../src/data-grid-cell.ts";
import type { CellFormatting } from "../src/data-grid-cell.ts";
import { FakeElement, real } from "./fake-dom.ts";

type CellCase = {
    readonly name: string;
    readonly kind: string;
    readonly value: unknown;
    readonly format?: string;
    readonly currency?: string;
    readonly choices?: Readonly<Record<string, string>>;
    readonly expected: string;
};

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const corpus = JSON.parse(readFileSync(resolve(repository, "eng/Tests/Shared/datagrid-cell-corpus.json"), "utf8")) as {
    readonly numberCulture: NumberCulturePack;
    readonly temporalCulture: TemporalCulturePack;
    readonly cases: readonly CellCase[];
};

const frameworkRendering = resolve(repository, "src/Platforms/Web/NE.Standard.UI.Web/Client/src/rendering");
const { numberFormatting } = await import(pathToFileURL(resolve(frameworkRendering, "number-format.ts")).href) as { readonly numberFormatting: NumberFormatting };
const { temporalFormatting } = await import(pathToFileURL(resolve(frameworkRendering, "temporal-format.ts")).href) as { readonly temporalFormatting: TemporalFormatting };

// Words translated as their keys, as the server's half translates them.
const formatting: CellFormatting = {
    numbers: numberFormatting,
    temporal: temporalFormatting,
    strings: { text: key => key, format: key => key, resolveText: text => text, write: () => undefined, onChange: () => () => undefined }
};

assert.ok(corpus.cases.length > 0, "The data grid cell corpus is empty.");

for (const cellCase of corpus.cases) {
    test(cellCase.name, () => {
        const shape = { kind: cellCase.kind, format: cellCase.format ?? null, currency: cellCase.currency ?? null, choices: cellCase.choices ?? null };

        assert.equal(formatCellValue(cellCase.value, shape, corpus.numberCulture, corpus.temporalCulture, formatting), cellCase.expected);
    });
}

test("a flag's or a choice's caption comes as the author wrote it and shows in the page's words", () => {
    const words: Readonly<Record<string, string>> = { Paid: "已付", "ui.grid.no": "否" };
    const translated: CellFormatting = {
        ...formatting,
        strings: { ...formatting.strings, text: key => words[key] ?? key, resolveText: text => words[text] ?? text }
    };
    const flag = { kind: "boolean", format: null, currency: null, choices: { true: "Paid" } };
    const choice = { kind: "enum", format: null, currency: null, choices: { Paid: "Paid", Open: "Open" } };

    assert.equal(formatCellValue(true, flag, corpus.numberCulture, corpus.temporalCulture, translated), "已付");
    assert.equal(formatCellValue("false", flag, corpus.numberCulture, corpus.temporalCulture, translated), "否");
    assert.equal(formatCellValue("Paid", choice, corpus.numberCulture, corpus.temporalCulture, translated), "已付");
    assert.equal(formatCellValue("Open", choice, corpus.numberCulture, corpus.temporalCulture, translated), "Open");
    assert.equal(formatCellValue("Closed", choice, corpus.numberCulture, corpus.temporalCulture, translated), "Closed");
});

test("a language switch draws a number and a date cell again in the packs written on the grid, from the value each keeps", () => {
    const english = { ...corpus.numberCulture, decimalSeparator: ".", groupSeparator: "," };
    const german = { ...corpus.numberCulture, decimalSeparator: ",", groupSeparator: "." };
    const russian = { ...corpus.temporalCulture, monthNames: corpus.temporalCulture.monthNames.map((_, index) => index === 8 ? "сентябрь" : "") };
    const amount = FakeElement.of("", { "data-ui-grid-kind": "number", "data-ui-grid-format": "N1" });
    const due = FakeElement.of("", { "data-ui-grid-kind": "date", "data-ui-grid-format": "MMMM yyyy" });
    const grid = FakeElement.of("ui-data-grid", { "data-ui-number-culture": JSON.stringify(english), "data-ui-temporal-culture": JSON.stringify(corpus.temporalCulture) }).append(amount, due);

    applyCellValue(real(amount), 1234.5, formatting);
    applyCellValue(real(due), "2026-09-30T00:00:00", formatting);

    assert.equal(amount.textContent, "1,234.5");
    assert.equal(due.textContent, "September 2026");
    assert.equal(due.getAttribute("data-ui-grid-moment"), "2026-09-30T00:00:00");

    // What the framework does at a switch: the grid's packs in the new language, then the grid's own redraw.
    grid.setAttribute("data-ui-number-culture", JSON.stringify(german));
    grid.setAttribute("data-ui-temporal-culture", JSON.stringify(russian));
    rewriteKeptCells(real(grid), formatting);

    assert.equal(amount.textContent, "1.234,5");
    assert.equal(due.textContent, "сентябрь 2026");
});
