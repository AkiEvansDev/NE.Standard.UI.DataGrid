import assert from "node:assert/strict";
import test from "node:test";

import { aggregateOf } from "../src/data-grid-totals-engine.ts";

test("a total is one number over the values, and a count stands even over none", () => {
    assert.equal(aggregateOf("sum", [1, 2, 3.5]), 6.5);
    assert.equal(aggregateOf("average", [2, 4]), 3);
    assert.equal(aggregateOf("min", [5, -1, 3]), -1);
    assert.equal(aggregateOf("max", [5, -1, 3]), 5);
    assert.equal(aggregateOf("count", [5, -1, 3]), 3);
    assert.equal(aggregateOf("count", []), 0);
    assert.equal(aggregateOf("sum", []), null);
    assert.equal(aggregateOf("average", []), null);
});
