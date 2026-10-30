// The grid's events are its own (`ownTarget`): a grid in another grid's detail template that does not hear one — a sort, a selection —
// runs nothing of the outer grid's command, as the framework's pipeline judges by the component the event's target stands in.

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

import type { EventRegistration } from "ne-standard-ui";
import { GridEvents } from "../src/data-grid-names.ts";

// The stylesheet is the bundler's to load; the module's registrations are what is read here.
registerHooks({
    load: (url, context, next) => url.endsWith(".less") ? { format: "module", source: "", shortCircuit: true } : next(url, context)
});

const registered = new Map<string, EventRegistration>();

// The framework's global, as its module leaves it before a package's runs: only the registrations are kept.
Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
        NEStandardUI: {
            contractVersion: 4,
            registerEvent: (name: string, registration: EventRegistration = {}) => registered.set(name, registration),
            registerConverter: () => undefined,
            registerDomOperation: () => undefined,
            registerEffect: () => undefined,
            registerValueReader: () => undefined,
            registerCollectionSink: () => undefined,
            registerStrings: () => undefined,
            registerEngine: () => undefined
        }
    }
});

await import("../src/data-grid.ts");

test("a grid's query change and selection change are the grid's own", () => {
    for (const name of [GridEvents.queryChange, GridEvents.selectionChange])
        assert.equal(registered.get(name)?.ownTarget, true, `${name} hands itself to a component around the grid`);
});
