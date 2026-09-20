import assert from "node:assert/strict";
import test from "node:test";

import { createTerm, parseNumber } from "../src/data-grid-filter-engine.ts";

test("a number reads as the framework's field holds it, and a text that is no number makes no term", () => {
    assert.equal(parseNumber("1,234.5"), 1234.5);
    assert.equal(parseNumber("1234.5"), 1234.5);
    assert.equal(parseNumber("12"), 12);
    assert.equal(parseNumber("abc"), null);
    assert.equal(createTerm("Total", "money", "to", "x"), null);
});

test("a term takes the operator of its kind and its end", () => {
    assert.deepEqual(createTerm("Total", "money", "from", "100"), { itemProperty: "Total", operator: "GreaterOrEqual", value: 100 });
    assert.deepEqual(createTerm("Quantity", "number", "to", "5"), { itemProperty: "Quantity", operator: "LessOrEqual", value: 5 });
    assert.deepEqual(createTerm("Ordered", "date", "to", "2025-01-31"), { itemProperty: "Ordered", operator: "LessOrEqual", value: "2025-01-31T23:59:59" });
    assert.deepEqual(createTerm("Ordered", "date", "from", "2025-01-01"), { itemProperty: "Ordered", operator: "GreaterOrEqual", value: "2025-01-01" });
    assert.deepEqual(createTerm("Status", "enum", null, "Shipped"), { itemProperty: "Status", operator: "Equal", value: "Shipped" });
    assert.deepEqual(createTerm("Paid", "boolean", null, "true"), { itemProperty: "Paid", operator: "Equal", value: "true" });
    assert.deepEqual(createTerm("Number", "text", null, "ORD-0001"), { itemProperty: "Number", operator: "LikeIgnoreCase", value: "ORD-0001" });
});
