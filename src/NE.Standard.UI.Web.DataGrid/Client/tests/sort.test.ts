import assert from "node:assert/strict";
import test from "node:test";

import { cycleSort, sortStateOf } from "../src/data-grid-sort.ts";
import type { SortTerm } from "../src/data-grid-sort.ts";

const total: SortTerm = { itemProperty: "Total", direction: "Ascending" };
const customer: SortTerm = { itemProperty: "Customer", direction: "Descending" };

test("a plain click cycles one column through ascending, descending and off, and drops the others", () => {
    assert.deepEqual(cycleSort([], "Total", false), [total]);
    assert.deepEqual(cycleSort([total], "Total", false), [{ itemProperty: "Total", direction: "Descending" }]);
    assert.deepEqual(cycleSort([{ itemProperty: "Total", direction: "Descending" }], "Total", false), []);
    assert.deepEqual(cycleSort([customer, total], "Total", false), [{ itemProperty: "Total", direction: "Descending" }]);
});

test("a shift click adds a column at the end, cycles it in its place, and takes it out when it comes off", () => {
    assert.deepEqual(cycleSort([customer], "Total", true), [customer, total]);
    assert.deepEqual(cycleSort([customer, total], "Total", true), [customer, { itemProperty: "Total", direction: "Descending" }]);
    assert.deepEqual(cycleSort([customer, { itemProperty: "Total", direction: "Descending" }], "Total", true), [customer]);
    assert.deepEqual(cycleSort([customer, total], "Customer", true), [total]);
});

test("a column knows its direction and its one-based place in the sort", () => {
    assert.deepEqual(sortStateOf([customer, total], "Total"), { direction: "Ascending", place: 2 });
    assert.deepEqual(sortStateOf([customer, total], "Customer"), { direction: "Descending", place: 1 });
    assert.equal(sortStateOf([customer], "Total"), null);
});
