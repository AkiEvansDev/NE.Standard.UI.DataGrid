// The sticky totals row of a grid that scrolls sideways, read back from the compiled stylesheets beside the framework's table: it
// stands over the edge shades the table draws across its rows, so the totals keep their own ground, and under a pinned cell that
// holds the focus, whose field's popup must reach over it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import less from "less";

const here = dirname(fileURLToPath(import.meta.url));
const repository = resolve(here, "../../../../../..");

async function compile(path: string): Promise<string> {
    return (await less.render(readFileSync(path, "utf8"), { filename: path })).css;
}

const grid = await compile(resolve(here, "../src/styles/ui-data-grid.less"));
const core = await compile(resolve(repository, "src/Platforms/Web/NE.Standard.UI.Web/Client/src/ui.less"));

/** The z-index of the first rule in `css` whose selector list ends with `selector` and whose body matches `body`. */
function zIndex(css: string, selector: string, body = /z-index/): number {
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (match[1].trim().endsWith(selector) && body.test(match[2])) {
            const value = /z-index: (-?\d+);/.exec(match[2]);

            assert.ok(value !== null, `${selector} has no z-index.`);

            return Number(value[1]);
        }
    }

    assert.fail(`No rule for ${selector}.`);
}

test("the totals row sticks over the table's edge shades and the sticky header, under a focused pinned cell", () => {
    const footer = zIndex(grid, ".ui-data-grid:is(.ui-scroll-x--auto, .ui-scroll-x--always) > .ui-table__scroll > .ui-data-grid__footer", /position: sticky;/);
    const shades = zIndex(core, ".ui-table:is(.ui-scroll-x--auto, .ui-scroll-x--always) > .ui-table__scroll::after", /grid-row: 1 \/ span 3;/);
    const header = zIndex(core, ".ui-table:is(.ui-scroll-x--auto, .ui-scroll-x--always) > .ui-table__scroll > .ui-table__header", /position: sticky;/);
    const focused = zIndex(core, ".ui-table__cell--pinned:focus-within");

    assert.ok(footer > shades, `the footer (${footer}) under the shades (${shades})`);
    assert.ok(footer > header, `the footer (${footer}) under the header (${header})`);
    assert.ok(focused > footer, `a focused pinned cell (${focused}) under the footer (${footer})`);
});
