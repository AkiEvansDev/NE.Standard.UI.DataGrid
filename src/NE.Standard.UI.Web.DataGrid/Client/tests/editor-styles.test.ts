// Read back from the compiled stylesheet: an editor stands in its cell's box and an end column's number does not move as it opens.

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

test("an editor's field reaches past the cell's padding by its own inset on both sides, uncapped by the track's width", () => {
    const field = declarations(".ui-data-grid__editor > [data-ui-id]") ?? "";

    assert.match(field, /max-width: none;/);
    assert.match(field, /margin-inline: calc\(-1 \* \(0\.5rem \+ var\(--ui-border-width, 1px\)\)\);/);
});

test("an end column's field gives the caret's pixel to the padding, so its text ends where the cell's did", () => {
    const sized = /@supports \(field-sizing: content\) and \(width: calc-size\(auto, size\)\) \{\s*\.ui-data-grid__editor\.ui-table__cell--end input\.ui-field \{([^}]*)\}/g;
    const rules = [...css.matchAll(sized)].map(match => match[1]).join("");

    assert.match(rules, /width: calc-size\(auto, size \+ 1px\);/);
    assert.match(rules, /margin-inline-end: -1px;/);
});
