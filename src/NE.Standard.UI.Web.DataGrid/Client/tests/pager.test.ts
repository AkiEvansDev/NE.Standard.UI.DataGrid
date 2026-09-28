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

test("last and previous land on the page boundaries first counts from, whatever the total", () => {
    const shortLast: PageState = { offset: 0, count: 50, size: 50, total: 1005, moreAfter: true };
    const onLast: PageState = { offset: 1000, count: 5, size: 50, total: 1005, moreAfter: false };
    const astray: PageState = { offset: 956, count: 49, size: 50, total: 1005, moreAfter: true };

    assert.equal(pageOffset(shortLast, "last"), 1000);
    assert.equal(pageOffset(onLast, "last"), null);
    assert.equal(pageOffset(onLast, "previous"), 950);
    assert.equal(pageOffset(astray, "previous"), 950);
    assert.equal(pageOffset(astray, "last"), 1000);
});
