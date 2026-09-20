import assert from "node:assert/strict";
import test from "node:test";

import { pageOffset } from "../src/data-grid-pager-engine.ts";
import type { PageState } from "../src/data-grid-pager-engine.ts";

const middle: PageState = { offset: 40, count: 20, size: 20, total: 100, moreAfter: true };
const first: PageState = { offset: 0, count: 20, size: 20, total: 100, moreAfter: true };
const last: PageState = { offset: 80, count: 20, size: 20, total: 100, moreAfter: false };
const uncounted: PageState = { offset: 40, count: 20, size: 20, total: null, moreAfter: true };

test("the four buttons name the window they turn to, and lead nowhere at the ends", () => {
    assert.equal(pageOffset(middle, "first"), 0);
    assert.equal(pageOffset(middle, "previous"), 20);
    assert.equal(pageOffset(middle, "next"), 60);
    assert.equal(pageOffset(middle, "last"), 80);
    assert.equal(pageOffset(first, "first"), null);
    assert.equal(pageOffset(first, "previous"), null);
    assert.equal(pageOffset(last, "next"), null);
    assert.equal(pageOffset(last, "last"), null);
});

test("a source that cannot count has no last page, only a next one", () => {
    assert.equal(pageOffset(uncounted, "last"), 60);
    assert.equal(pageOffset({ ...uncounted, moreAfter: false }, "last"), null);
    assert.equal(pageOffset(middle, "elsewhere"), null);
});
