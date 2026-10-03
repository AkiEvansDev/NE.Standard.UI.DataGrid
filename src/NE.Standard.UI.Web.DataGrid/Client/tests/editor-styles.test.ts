// Read back from the compiled stylesheet: an editor stands in its cell's box, a two-line cell's on its first line, and an end column's
// number does not move as it opens; the ground a closed cell answers the pointer with, and its verdict's edge, are the editor field's
// box; the filters' panel fits a phone.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import less from "less";

const source = resolve(dirname(fileURLToPath(import.meta.url)), "../src/styles/ui-data-grid.less");
const css = (await less.render(readFileSync(source, "utf8"), { filename: source })).css;

/** The declarations of the first rule whose selector is exactly `selector`, or null. */
function declarations(selector: string): string | null {
    const start = css.indexOf(`\n${selector} {`);

    return start < 0 ? null : css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
}

test("an editor's field reaches past the cell's padding by the field's own inset on both sides, uncapped by the track's width", () => {
    const field = declarations(".ui-data-grid__editor > [data-ui-id]") ?? "";

    assert.match(field, /max-width: none;/);
    assert.match(field, /margin-inline: calc\(-1 \* var\(--ui-field-inset, calc\(0\.5rem \+ var\(--ui-border-width, 1px\)\)\)\);/);
});

test("a two-line cell's ghost field stands on the cell's first line, lifted by its half-leading", () => {
    const field = declarations(".ui-data-grid__cell--editing:has([data-ui-text-description]) + .ui-data-grid__editor > .ui-input--ghost") ?? "";

    assert.match(field, /align-self: flex-start;/);
    assert.match(field, /margin-block-start: calc\(0\.5rem \+ \(1lh - 1\.75rem\) \/ 2\);/);
});

test("an open editor centres its field in the cell's height, padded only at the sides, so a one-line row keeps its height", () => {
    assert.match(declarations(".ui-data-grid__editor--open") ?? "", /align-items: center;/);
    assert.match(declarations(".ui-data-grid > .ui-table__scroll > [data-ui-items-host] > .ui-table__row > .ui-data-grid__editor--open") ?? "", /padding-block: 0;/);
});

test("a closed cell's ground and its verdict's edge take the box the editor's ghost field will: its inset, height and radius", () => {
    for (const selector of [".ui-data-grid__cell--editable::before", ".ui-data-grid .ui-data-grid__cell--editable > .ui-data-grid__verdict"]) {
        const box = declarations(selector) ?? "";

        assert.match(box, /inset-inline: calc\(0\.75rem - 0\.5rem - var\(--ui-border-width, 1px\)\);/, selector);
        assert.match(box, /top: var\(--ui-data-grid-field-top, calc\(50% - 1\.75rem \/ 2\)\);/, selector);
        assert.match(box, /bottom: var\(--ui-data-grid-field-top, auto\);/, selector);
        assert.match(box, /height: var\(--ui-data-grid-field-height, 1\.75rem\);/, selector);
        assert.match(box, /border-radius: var\(--ui-radius-input\);/, selector);
    }
});

test("a two-line cell's box holds both lines, set in as a one-line cell's, and its description keeps its place", () => {
    const twoLine = declarations(".ui-data-grid__cell--editable:has([data-ui-text-description])") ?? "";

    assert.match(twoLine, /--ui-data-grid-field-top: calc\(0\.5rem \+ \(1lh - 1\.75rem\) \/ 2\);/);
    assert.match(twoLine, /--ui-data-grid-field-height: auto;/);
    assert.doesNotMatch(css, /\.ui-text__description \{[^}]*margin-top/);
});

test("the ground shows under the pointer and on the keyboard's row only while the grid edits", () => {
    assert.match(css, /\.ui-data-grid:not\(\[data-ui-grid-readonly\], \.ui-disabled, \.ui-loading\) \.ui-data-grid__cell--editable:hover::before \{\s*opacity: 1;/);
    assert.match(css, /\.ui-table__row\[data-ui-row-focus\] > \.ui-data-grid__cell--editable::before \{\s*opacity: 1;/);
    assert.doesNotMatch(declarations(".ui-data-grid__cell--editable") ?? "", /cursor/);
});

test("a verdict's edge outranks the box's own transparent edge, in the severity's ink", () => {
    const edge = declarations(".ui-data-grid .ui-data-grid__cell--editable > .ui-data-grid__verdict:is(.ui-invalid, .ui-validation--warning, .ui-validation--info)") ?? "";

    assert.match(edge, /border-color: var\(--ui-validation-color, var\(--ui-color-danger-ink\)\);/);
});

test("an end column's field gives the caret's pixel to the padding, so its text ends where the cell's did", () => {
    const sized = /@supports \(field-sizing: content\) and \(width: calc-size\(auto, size\)\) \{\s*\.ui-data-grid__editor\.ui-table__cell--end input\.ui-field \{([^}]*)\}/g;
    const rules = [...css.matchAll(sized)].map(match => match[1]).join("");

    assert.match(rules, /width: calc-size\(auto, size \+ 1px\);/);
    assert.match(rules, /margin-inline-end: -1px;/);
});

test("the filters' panel keeps no cap of its own: the core holds the flyout inside the window, and a filter's fields wrap in it", () => {
    const panel = declarations(".ui-data-grid__filter-panel") ?? "";

    assert.doesNotMatch(panel, /max-width/);
    assert.match(declarations(".ui-data-grid__filter-panel > .ui-data-grid__filter") ?? "", /flex-wrap: wrap;/);
});
