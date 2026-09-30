import assert from "node:assert/strict";
import test from "node:test";

import type { PluginEngineContext } from "ne-standard-ui";
import { createTerm, DataGridFilterEngine, fieldValueOf, mergeFilterTerms, parseNumber } from "../src/data-grid-filter-engine.ts";
import type { FilterField } from "../src/data-grid-filter-engine.ts";
import { GridAttributes, GridClasses } from "../src/data-grid-names.ts";
import type { FilterTerm } from "../src/data-grid-query.ts";
import { FakeElement, FakeEvent, FakeInput, fakeDocument, fakeWindow, installFakeDom, real } from "./fake-dom.ts";

installFakeDom();

const customer: FilterField = { property: "Customer", kind: "text", bound: null };
const region: FilterField = { property: "Region", kind: "enum", bound: null };
const monthlyFrom: FilterField = { property: "Monthly", kind: "money", bound: "from" };
const monthlyTo: FilterField = { property: "Monthly", kind: "money", bound: "to" };

test("a number reads as the framework's field holds it, and a text that is no number makes no term", () => {
    assert.equal(parseNumber("1234.5"), 1234.5);
    assert.equal(parseNumber(" 12 "), 12);
    assert.equal(parseNumber("-0.25"), -0.25);
    assert.equal(parseNumber("abc"), null);
    assert.equal(parseNumber(""), null);
    // A text the field could not read is no number: German "1,5" is not 15, nor a grouped "1,234.5" 1234.5.
    assert.equal(parseNumber("1,5"), null);
    assert.equal(parseNumber("1,234.5"), null);
    assert.equal(createTerm("Total", "money", "from", "1,5"), null);
    assert.equal(createTerm("Total", "money", "to", "x"), null);
});

test("a term takes the operator of its kind and its end", () => {
    assert.deepEqual(createTerm("Total", "money", "from", "100"), { itemProperty: "Total", operator: "GreaterOrEqual", value: 100 });
    assert.deepEqual(createTerm("Quantity", "number", "to", "5"), { itemProperty: "Quantity", operator: "LessOrEqual", value: 5 });
    assert.deepEqual(createTerm("Ordered", "date", "to", "2025-01-31"), { itemProperty: "Ordered", operator: "Less", value: "2025-02-01" });
    assert.deepEqual(createTerm("Ordered", "date", "from", "2025-01-01"), { itemProperty: "Ordered", operator: "GreaterOrEqual", value: "2025-01-01" });
    assert.deepEqual(createTerm("Status", "enum", null, "Shipped"), { itemProperty: "Status", operator: "Equal", value: "Shipped" });
    assert.deepEqual(createTerm("Paid", "boolean", null, "true"), { itemProperty: "Paid", operator: "Equal", value: "true" });
    assert.deepEqual(createTerm("Number", "text", null, "ORD-0001"), { itemProperty: "Number", operator: "LikeIgnoreCase", value: "ORD-0001" });
});

test("the end of a date range takes the whole of its last day, a fraction or a zone after the last second included", () => {
    const term = createTerm("Ordered", "date", "to", "2024-12-31");

    assert.deepEqual(term, { itemProperty: "Ordered", operator: "Less", value: "2025-01-01" });
    assert.ok("2024-12-31T23:59:59.5" < String(term?.value));
    assert.ok("2024-12-31T23:59:59Z" < String(term?.value));
    assert.ok(!("2025-01-01T00:00:00" < String(term?.value)));
    assert.deepEqual(createTerm("Ordered", "date", "to", "2024-02-28"), { itemProperty: "Ordered", operator: "Less", value: "2024-02-29" });
});

test("a term the controller set on a property no field shows outlives the viewer's typing; a field's own property is the field's", () => {
    const pushed = [
        { itemProperty: "Region", operator: "Equal", value: "EU" },
        { itemProperty: "Customer", operator: "LikeIgnoreCase", value: "old" }
    ];
    const typed = [{ itemProperty: "Customer", operator: "LikeIgnoreCase", value: "con" }];

    assert.deepEqual(mergeFilterTerms(pushed, [customer], typed), [pushed[0], typed[0]]);
    assert.deepEqual(mergeFilterTerms(pushed, [customer, region], []), []);
});

test("a term the controller set in a shape no field writes stays through the viewer's edit, beside the field's own", () => {
    const pushed = [
        { itemProperty: "Customer", operator: "Equal", value: "Contoso" },
        { itemProperty: "Monthly", operator: "Greater", value: 100 },
        { itemProperty: "Monthly", operator: "LessOrEqual", value: 500 }
    ];
    const typed = [{ itemProperty: "Monthly", operator: "LessOrEqual", value: 400 }];

    assert.deepEqual(mergeFilterTerms(pushed, [customer, monthlyFrom, monthlyTo], typed), [pushed[0], pushed[1], typed[0]]);
});

test("a query the controller pushed reads back into the field of each kind and end, as createTerm would have made it", () => {
    const terms = [
        createTerm("Number", "text", null, "ORD-0001")!,
        createTerm("Total", "money", "from", "100")!,
        createTerm("Total", "money", "to", "250.5")!,
        createTerm("Ordered", "date", "from", "2025-01-01")!,
        createTerm("Ordered", "date", "to", "2025-01-31")!,
        createTerm("Status", "enum", null, "Shipped")!
    ];

    assert.equal(fieldValueOf(terms, "Number", "text", null), "ORD-0001");
    assert.equal(fieldValueOf(terms, "Total", "money", "from"), 100);
    assert.equal(fieldValueOf(terms, "Total", "money", "to"), 250.5);
    assert.equal(fieldValueOf(terms, "Ordered", "date", "from"), "2025-01-01");
    assert.equal(fieldValueOf(terms, "Ordered", "date", "to"), "2025-01-31");
    assert.equal(fieldValueOf(terms, "Status", "enum", null), "Shipped");
});

test("a field whose property the query does not filter, or filters in a way it cannot show, reads empty", () => {
    const terms = [{ itemProperty: "Total", operator: "Equal", value: 5 }];

    assert.equal(fieldValueOf(terms, "Total", "money", "from"), null);
    assert.equal(fieldValueOf(terms, "Number", "text", null), null);
    assert.equal(fieldValueOf([], "Status", "enum", null), null);
    assert.equal(fieldValueOf([{ itemProperty: "Ordered", operator: "LessOrEqual", value: "2025-03-01T00:00:00Z" }], "Ordered", "date", "to"), null);
});

test("a field shows only a term it would write back the same, so an edit elsewhere cannot change it under the viewer", () => {
    assert.equal(fieldValueOf([{ itemProperty: "Number", operator: "Equal", value: "SUB-1" }], "Number", "text", null), null);
    assert.equal(fieldValueOf([{ itemProperty: "Number", operator: "Like", value: "SUB" }], "Number", "text", null), null);
    assert.equal(fieldValueOf([{ itemProperty: "Monthly", operator: "Greater", value: 100 }], "Monthly", "money", "from"), null);
    assert.equal(fieldValueOf([{ itemProperty: "Monthly", operator: "Less", value: 100 }], "Monthly", "money", "to"), null);
    assert.equal(fieldValueOf([{ itemProperty: "Ordered", operator: "Greater", value: "2025-01-01" }], "Ordered", "date", "from"), null);
    assert.equal(fieldValueOf([{ itemProperty: "Ordered", operator: "GreaterOrEqual", value: "2025-01-01T08:00:00" }], "Ordered", "date", "from"), null);
});

test("a range end the controller wrote as a moment at midnight shows as its day", () => {
    assert.equal(fieldValueOf([{ itemProperty: "Ordered", operator: "GreaterOrEqual", value: "2025-01-01T00:00:00" }], "Ordered", "date", "from"), "2025-01-01");
    assert.equal(fieldValueOf([{ itemProperty: "Ordered", operator: "Less", value: "2025-03-01T00:00:00" }], "Ordered", "date", "to"), "2025-02-28");
    assert.equal(fieldValueOf([{ itemProperty: "Monthly", operator: "GreaterOrEqual", value: "100" }], "Monthly", "money", "from"), 100);
});

/** A number field showing a German text and holding the invariant value the framework's `values.read` answers for it. */
type NumberField = FakeInput & { invariant: string };

function numberField(shown: string, invariant: string): NumberField {
    return Object.assign(new FakeInput(), { value: shown, invariant });
}

/** A grid with a money filter from and to, its fields showing their values in German, and the terms a change there wrote. */
function createFilteredGrid(from: NumberField, to: NumberField, query: readonly FilterTerm[] = []): { terms: () => readonly FilterTerm[]; sets: unknown[] } {
    const root = new FakeElement();
    const grid = FakeElement.of(GridClasses.root);
    const queryElement = FakeElement.of("", { "data-ui-value-kind": "items-query" });
    const filter = FakeElement.of("", { [GridAttributes.filter]: "Total", [GridAttributes.filterKind]: "money" });
    const sets: unknown[] = [];

    from.attributes.set("data-ui-id", "3");
    to.attributes.set("data-ui-id", "4");

    if (query.length > 0)
        queryElement.attributes.set("data-ui-items-query", JSON.stringify({ filters: query, sorts: [] }));

    fakeDocument.body.replaceChildren(root);
    fakeDocument.activeElement = fakeDocument.body;
    root.append(grid.append(
        queryElement,
        filter.append(
            FakeElement.of(GridClasses.filterPart, { [GridAttributes.filterBound]: "from" }).append(from),
            FakeElement.of(GridClasses.filterPart, { [GridAttributes.filterBound]: "to" }).append(to)
        )
    ));

    const context = {
        root,
        values: { read: (element: FakeElement) => (element.querySelector("input") as NumberField | null)?.invariant ?? null },
        properties: {
            set: (_element: FakeElement, _name: string, value: unknown) => {
                sets.push(value);

                return true;
            }
        },
        badges: { writeCount: () => undefined },
        states: { isInert: () => false, setDisabled: () => undefined },
        names: { componentId: "data-ui-id", itemsQuery: "data-ui-items-query", valueKind: "data-ui-value-kind", itemsQueryKind: "items-query" },
        observeComponents: () => null
    };

    new DataGridFilterEngine(real<PluginEngineContext>(context));

    const terms = (): readonly FilterTerm[] => (JSON.parse(queryElement.getAttribute("data-ui-items-query") ?? "{}") as { filters?: FilterTerm[] }).filters ?? [];

    return { terms, sets };
}

test("a change in one end reads the other end's value as the framework holds it, not the text it shows in its culture", () => {
    // "10,50" is the from field at rest in German: ten and a half, which a reading of the shown text took for a thousand and fifty.
    const from = numberField("10,50", "10.5");
    const to = numberField("", "");
    const grid = createFilteredGrid(from, to);

    to.invariant = "1234.5";
    fakeWindow.dispatch(to, new FakeEvent("change"));

    assert.deepEqual(grid.terms(), [
        { itemProperty: "Total", operator: "GreaterOrEqual", value: 10.5 },
        { itemProperty: "Total", operator: "LessOrEqual", value: 1234.5 }
    ]);

    to.value = "1.234,5";
    from.invariant = "1000";
    fakeWindow.dispatch(from, new FakeEvent("change"));

    assert.deepEqual(grid.terms(), [
        { itemProperty: "Total", operator: "GreaterOrEqual", value: 1000 },
        { itemProperty: "Total", operator: "LessOrEqual", value: 1234.5 }
    ]);
});

test("a pushed query a field already shows in its culture is not written into it again", () => {
    const grid = createFilteredGrid(numberField("1.000,50", "1000.50"), numberField("", ""), [{ itemProperty: "Total", operator: "GreaterOrEqual", value: 1000.5 }]);

    assert.deepEqual(grid.sets, []);
});
