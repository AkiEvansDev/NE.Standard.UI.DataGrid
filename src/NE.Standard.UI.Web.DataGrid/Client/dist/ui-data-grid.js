//#region src/data-grid-names.ts
var e = {
	sort: "data-ui-grid-sort",
	column: "data-ui-grid-column",
	editor: "data-ui-grid-editor",
	readOnly: "data-ui-grid-readonly",
	expandOnClick: "data-ui-grid-expand-click",
	multipleDetails: "data-ui-grid-multiple-details",
	paging: "data-ui-grid-paging",
	page: "data-ui-grid-page",
	aggregate: "data-ui-grid-aggregate",
	property: "data-ui-grid-property",
	filter: "data-ui-grid-filter",
	filterKind: "data-ui-grid-filter-kind",
	filterBound: "data-ui-grid-filter-bound",
	select: "data-ui-grid-select",
	selectAll: "data-ui-grid-select-all",
	kind: "data-ui-grid-kind",
	format: "data-ui-grid-format",
	currency: "data-ui-grid-currency",
	choices: "data-ui-grid-choices",
	choice: "data-ui-grid-choice",
	raw: "data-ui-grid-raw"
}, t = {
	root: "ui-data-grid",
	footer: "ui-data-grid__footer",
	total: "ui-data-grid__total",
	pager: "ui-data-grid__pager",
	pageStatus: "ui-data-grid__page-status",
	filtersCount: "ui-data-grid__filters-count",
	filterPanel: "ui-data-grid__filter-panel",
	filterPart: "ui-data-grid__filter-part",
	filtersClear: "ui-data-grid__filters-clear",
	columnsPanel: "ui-data-grid__columns-panel",
	sortMark: "ui-data-grid__sort-mark",
	editableCell: "ui-data-grid__cell--editable",
	detailCell: "ui-data-grid__cell--detail"
}, n = {
	sorted: "data-ui-grid-sorted",
	sortPlace: "data-ui-grid-sort-place",
	expanded: "data-ui-grid-expanded",
	editorClass: "ui-data-grid__editor",
	editorOpenClass: "ui-data-grid__editor--open",
	editingCellClass: "ui-data-grid__cell--editing",
	detailClass: "ui-data-grid__detail"
}, r = {
	queryChange: "query-change",
	cellEdit: "cell-edit",
	selectionChange: "selection-change"
}, i = {
	yes: "ui.grid.yes",
	no: "ui.grid.no",
	pageOf: "ui.grid.page-of",
	pageRange: "ui.grid.page-range"
}, a = "data-grid-cell", o = /^\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?\s*$/;
function s(t) {
	return {
		kind: t.getAttribute(e.kind) ?? "text",
		format: t.getAttribute(e.format),
		currency: t.getAttribute(e.currency),
		choices: c(t.getAttribute(e.choices))
	};
}
function c(e) {
	if (e === null || e.length === 0) return null;
	try {
		return JSON.parse(e);
	} catch {
		return null;
	}
}
function l(t, n, r) {
	let i = s(t), a = ee(n, i, r.numbers.readCulture(t), r.temporal.readCulture(t), r);
	t.textContent !== a && (t.textContent = a);
	let o = i.kind === "number" || i.kind === "money" ? p(n) : null;
	o === null ? t.hasAttribute(e.raw) && t.removeAttribute(e.raw) : t.setAttribute(e.raw, String(o));
	let c = d(n, i.kind);
	c === null ? t.hasAttribute(e.choice) && t.removeAttribute(e.choice) : t.setAttribute(e.choice, c);
}
function u(t, n) {
	for (let r of t.querySelectorAll(`[${e.choice}]`)) l(r, r.getAttribute(e.choice), n);
}
function d(e, t) {
	return e == null ? null : t === "boolean" ? f(e) ? "true" : "false" : t === "enum" ? String(e) : null;
}
function f(e) {
	return e === !0 || typeof e == "string" && e.toLowerCase() === "true";
}
function ee(e, t, n, r, a) {
	if (e == null) return "";
	switch (t.kind) {
		case "number":
		case "money": {
			let r = p(e);
			if (r === null) return String(e);
			let i = t.kind === "money" && t.currency !== null ? {
				...n,
				currencySymbol: t.currency
			} : n;
			return a.numbers.format(r, t.format, i);
		}
		case "date": {
			let n = te(e, a.temporal);
			return n === null ? String(e) : a.temporal.format(n, t.format, r);
		}
		case "boolean": {
			let n = f(e), r = t.choices?.[n ? "true" : "false"];
			return r === void 0 ? a.strings.text(n ? i.yes : i.no) : a.strings.resolveText(r);
		}
		case "enum": {
			let n = String(e), r = t.choices?.[n];
			return r === void 0 ? n : a.strings.resolveText(r);
		}
		default: return String(e);
	}
}
function p(e) {
	if (typeof e == "number") return Number.isFinite(e) ? e : null;
	if (typeof e != "string" || !o.test(e)) return null;
	let t = Number(e);
	return Number.isFinite(t) ? t : null;
}
function te(e, t) {
	if (e instanceof Date) return e;
	if (typeof e != "string") return null;
	let n = t.parse(e);
	return n === null ? null : t.toDate(n);
}
//#endregion
//#region src/data-grid-dom.ts
var m = `.${t.root}`;
function h(e) {
	return `.${e.tableRowClass}`;
}
function g(e) {
	return `:scope > .${e.tableScrollClass} > [${e.itemsHost}]`;
}
function _(e, t) {
	let n = [];
	for (let r of e.querySelectorAll(t)) r.closest(m) === e && n.push(r);
	return n;
}
function v(e, t, n = e) {
	for (let r of n.querySelectorAll(t)) if (r.closest(m) === e) return r;
	return null;
}
function y(e) {
	return e instanceof Element ? e.closest(m) : null;
}
function ne(e, t) {
	let r = t.closest(`.${n.detailClass}`);
	return e.isKeyTarget(t) && (r === null || y(r) !== y(t));
}
function b(e, t, n) {
	return t.parentElement !== null && t.parentElement === e.querySelector(g(n));
}
function x(e, t) {
	let n = Number(e.getAttribute(t.componentId));
	return Number.isInteger(n) ? n : null;
}
function S(e, t, n) {
	n === null ? e.removeAttribute(t) : e.getAttribute(t) !== n && e.setAttribute(t, n);
}
function C(e, t) {
	let n = e.getAttribute(t);
	if (n === null || n.length === 0) return null;
	let r = Number(n);
	return Number.isFinite(r) ? r : null;
}
//#endregion
//#region src/data-grid-chooser-engine.ts
var re = class {
	tables;
	states;
	names;
	entrySelector;
	constructor(e) {
		this.tables = e.tables, this.states = e.states, this.names = e.names, this.entrySelector = `.${t.columnsPanel} .${e.names.menuItemClass}[${e.names.menuItemKind}="check"]`, e.root.addEventListener("click", (e) => {
			let t = e.target instanceof Element ? e.target.closest(this.entrySelector) : null, n = y(t);
			t !== null && n !== null && (e.preventDefault(), !this.states.isInert(t) && (this.tables.setColumnHidden(n, this.keyOf(t), t.classList.contains(this.names.menuItemCheckedClass)), this.syncEntries(n)));
		}), this.syncAll(e.root.querySelectorAll(m)), e.observeComponents(e.root, m, {
			childList: !0,
			attributeFilter: [e.names.tableHidden, "style"]
		}, (e) => this.syncAll(e));
	}
	keyOf(e) {
		return e.closest(`[${this.names.key}]`)?.getAttribute(this.names.key) ?? "";
	}
	syncAll(e) {
		for (let t of e) _(t, this.entrySelector).length !== 0 && (this.syncEntries(t), this.syncOrder(t));
	}
	syncOrder(e) {
		let t = _(e, this.entrySelector), n = /* @__PURE__ */ new Map();
		for (let e of t) n.set(this.keyOf(e), e.closest(`[${this.names.key}]`) ?? e);
		let r = this.tables.columnOrder(e).filter((e) => n.has(e)), i = n.get(r[0])?.parentElement ?? null;
		if (!(i === null || r.length < 2 || r.every((e, t) => n.get(e) === i.children[t]))) for (let e of r) i.appendChild(n.get(e));
	}
	syncEntries(e) {
		let t = _(e, this.entrySelector), n = t.filter((t) => !this.tables.isColumnHidden(e, this.keyOf(t)));
		for (let e of t) {
			let t = n.includes(e), r = t && n.length === 1;
			e.classList.toggle(this.names.menuItemCheckedClass, t), e.setAttribute("aria-checked", String(t)), this.states.setDisabled(e, r);
		}
	}
}, ie = `.${t.detailCell}`, w = n.detailClass, ae = "detail", T = n.expanded, E = e.expandOnClick, oe = e.multipleDetails, D = `${ie} button`, se = "open", ce = class {
	rows;
	names;
	rowSelector;
	enterDown = !1;
	beforeClick = null;
	constructor(e) {
		this.rows = e.rows, this.names = e.names, this.rowSelector = h(e.names), this.markAll(e.root.querySelectorAll(m)), e.observeComponents(e.root, m, { childList: !0 }, (e) => this.markAll(e)), e.root.addEventListener("keydown", (e) => {
			e instanceof KeyboardEvent && e.key === "Enter" && e.target instanceof Element && ne(this.rows, e.target) && (this.enterDown = !0, window.setTimeout(() => {
				this.enterDown = !1;
			}, 0));
		}, !0), e.root.addEventListener(se, (e) => {
			let t = e.target instanceof Element ? e.target.closest(this.rowSelector) : null, n = y(t);
			t !== null && n !== null && n.hasAttribute(E) && b(n, t, this.names) && (this.enterDown ? this.toggleDetail(n, t) : this.beforeClick?.row === t && this.restoreDetails(n, this.beforeClick.open), this.beforeClick = null);
		}), e.root.addEventListener("click", (e) => {
			if (!(e.target instanceof Element)) return;
			let t = y(e.target), n = e.target.closest(this.rowSelector);
			if (t === null || n === null || !b(t, n, this.names)) return;
			let r = !(e instanceof MouseEvent) || e.detail <= 1;
			r && (this.beforeClick = null), e.target.closest(`.${w}`)?.parentElement !== n && (e.target.closest(ie) !== null || t.hasAttribute(E) && !this.answersClick(e.target)) && (e.preventDefault(), r && (this.beforeClick = {
				row: n,
				open: this.openDetails(t)
			}), this.toggleDetail(t, n));
		});
	}
	markAll(e) {
		for (let t of e) for (let e of _(t, `${D}:not([aria-expanded])`)) e.setAttribute("aria-expanded", "false");
	}
	toggleDetail(e, t) {
		if (t.hasAttribute(T)) {
			O(t);
			return;
		}
		if (!e.hasAttribute(oe)) for (let t of _(e, `${this.rowSelector}[${T}]`)) O(t);
		let n = x(e, this.names), r = n === null ? null : this.rows.renderVariant(t, n, ae);
		if (r === null) return;
		let i = document.createElement("div");
		i.className = w, i.appendChild(r), t.appendChild(i), t.setAttribute(T, ""), k(t, !0);
	}
	restoreDetails(e, t) {
		for (let n of _(e, `${this.rowSelector}[${T}]`)) t.has(n) || O(n);
		for (let [e, n] of t) e.isConnected && n !== null && e.querySelector(`:scope > .${w}`) !== n && (e.querySelector(`:scope > .${w}`)?.remove(), e.appendChild(n), e.setAttribute(T, ""), k(e, !0));
	}
	answersClick(e) {
		return e.closest(`[${this.names.noRowOpen}]`) !== null;
	}
	openDetails(e) {
		let t = /* @__PURE__ */ new Map();
		for (let n of _(e, `${this.rowSelector}[${T}]`)) t.set(n, n.querySelector(`:scope > .${w}`));
		return t;
	}
};
function O(e) {
	e.removeAttribute(T), e.querySelector(`:scope > .${w}`)?.remove(), k(e, !1);
}
function k(e, t) {
	e.querySelector(`:scope > ${D}`)?.setAttribute("aria-expanded", t ? "true" : "false");
}
//#endregion
//#region src/data-grid-edit-engine.ts
var A = `.${t.editableCell}`, le = e.editor, j = e.kind, M = e.column, N = e.readOnly, P = "input, textarea, select, button, [tabindex]", ue = class {
	rows;
	values;
	tables;
	states;
	names;
	rowSelector;
	open = /* @__PURE__ */ new Map();
	unclaimed = /* @__PURE__ */ new WeakSet();
	constructor(e) {
		let t = e.root;
		this.rows = e.rows, this.values = e.values, this.tables = e.tables, this.states = e.states, this.names = e.names, this.rowSelector = h(e.names);
		for (let e of t.querySelectorAll(m)) this.syncClaims(e);
		t.addEventListener("dblclick", (e) => {
			let t = e.target instanceof Element ? e.target.closest(A) : null;
			t !== null && t.closest(m) !== null && (e.preventDefault(), this.openEditor(t));
		}, !0), t.addEventListener("change", (e) => {
			let t = y(e.target), n = t === null ? void 0 : this.open.get(t);
			n !== void 0 && e.target instanceof Node && n.editor.contains(e.target) && (n.changed = !0);
		}, !0), window.addEventListener("change", (e) => this.holdWindowChange(e), !0), t.addEventListener("keydown", (e) => this.handleKeyDown(e), !0), e.observeComponents(t, m, { childList: !0 }, (e) => {
			for (let t of e) this.followRow(t), this.syncClaims(t);
		}), e.observeComponents(t, m, {
			attributeFilter: [
				N,
				"class",
				"inert"
			],
			relevant: (e) => e.target instanceof Element && (e.target.matches(m) || this.editsUnder(e.target))
		}, (e) => {
			for (let t of e) this.followState(t);
			for (let [e, t] of [...this.open]) this.canEdit(e) || this.closeEditor(e, t, !1);
		}), t.addEventListener("mousedown", (e) => {
			let t = y(e.target), n = t === null ? void 0 : this.open.get(t);
			if (n === void 0 || !(e.target instanceof Element) || !n.editor.contains(e.target)) return;
			let r = e.target.closest(P);
			(r === null || !n.editor.contains(r)) && e.preventDefault();
		}, !0), t.addEventListener("focusout", (e) => {
			if (!(e instanceof FocusEvent) || !(e.target instanceof Element)) return;
			let t = y(e.target), n = t === null ? void 0 : this.open.get(t);
			if (t === null || n === void 0 || !n.editor.contains(e.target)) return;
			let r = e.relatedTarget;
			if (r instanceof Node && n.editor.contains(r)) return;
			let i = r === null && e.target.isConnected && !pe(e.target);
			window.setTimeout(() => this.followFocusOut(t, n, i), 0);
		}, !0);
	}
	syncClaims(e) {
		let t = !e.hasAttribute(N);
		if (!t || this.unclaimed.has(e)) {
			for (let n of _(e, A)) n.toggleAttribute(this.names.noRowOpen, t);
			t ? this.unclaimed.delete(e) : this.unclaimed.add(e);
		}
	}
	editsUnder(e) {
		for (let t of this.open.keys()) if (t !== e && e.contains(t)) return !0;
		return !1;
	}
	followState(e) {
		this.syncClaims(e);
		let t = this.open.get(e);
		t !== void 0 && !this.canEdit(e) && this.closeEditor(e, t, !1);
	}
	canEdit(e) {
		return !e.hasAttribute(N) && !this.states.isInert(e);
	}
	followFocusOut(e, t, n) {
		let r = document.activeElement;
		if (this.open.get(e) !== t || t.editor.contains(r)) return;
		let i = n && (r === null || r === document.body);
		i && this.canEdit(e) && (t.editor.querySelector(P)?.focus({ preventScroll: !0 }), t.editor.contains(document.activeElement)) || (this.closeEditor(e, t, this.canEdit(e)), i && e.focus({ preventScroll: !0 }));
	}
	holdWindowChange(e) {
		let t = e.target;
		if (!e.isTrusted || document.hasFocus() || !(t instanceof Element) || t !== document.activeElement || !fe(t)) return;
		let n = y(t), r = n === null ? void 0 : this.open.get(n);
		r !== void 0 && r.editor.contains(t) && e.stopPropagation();
	}
	openEditor(e) {
		let t = y(e), r = e.closest(this.rowSelector);
		if (t === null || r === null || t.hasAttribute(N)) return;
		let i = this.open.get(t);
		if (i !== void 0) {
			if (i.cell === e) return;
			this.closeEditor(t, i, !0);
		}
		let a = this.createEditor(t, r, e);
		if (a === null) return;
		let o = a.querySelector(`[${this.names.valueHolder}][${this.names.bindValue}]`) ?? a.querySelector(`[${this.names.bindValue}]`);
		this.open.set(t, {
			editor: a,
			cell: e,
			field: o,
			original: this.fieldValue(o),
			changed: !1
		}), o !== null && this.values.hold(o), a.style.minHeight = `${e.getBoundingClientRect().height}px`, e.classList.add(n.editingCellClass), a.classList.add(n.editorOpenClass), e.after(a);
		let s = a.querySelector(P);
		s?.focus({ preventScroll: !0 }), s instanceof HTMLInputElement && de(s) && s.select();
		let c = a.querySelector(this.names.listTriggerSelector);
		c !== null && c.getAttribute("aria-expanded") !== "true" && c.click();
	}
	createEditor(e, r, i) {
		let a = i.getAttribute(le), o = x(e, this.names);
		if (a === null || o === null) return null;
		let s = this.rows.renderVariant(r, o, a);
		if (s === null) return null;
		let c = document.createElement("div");
		for (let e of i.attributes) c.setAttribute(e.name, e.value);
		c.classList.remove(t.editableCell, n.editingCellClass), c.classList.add(n.editorClass), c.removeAttribute(le), c.appendChild(s);
		let l = i.querySelector(`[${j}]`)?.getAttribute(j);
		return l != null && c.setAttribute(j, l), c;
	}
	fieldValue(e) {
		return e === null ? null : this.values.read(e);
	}
	closeEditor(e, t, i) {
		if (this.open.get(e) !== t) return;
		this.open.delete(e), i ? (t.field !== null && !t.changed && this.fieldValue(t.field) !== t.original && t.field.dispatchEvent(new Event("change", { bubbles: !0 })), (t.changed || this.fieldValue(t.field) !== t.original) && (t.field ?? t.editor).dispatchEvent(new Event(r.cellEdit, { bubbles: !0 }))) : t.field !== null && t.changed && (this.values.write(t.field, t.original), t.field.dispatchEvent(new Event("change", { bubbles: !0 }))), t.field !== null && this.values.release(t.field);
		let a = t.editor.contains(document.activeElement);
		t.cell.classList.remove(n.editingCellClass), t.editor.remove(), a && e.focus({ preventScroll: !0 });
	}
	followRow(e) {
		let t = this.open.get(e);
		if (t === void 0 || t.cell.isConnected) return;
		let n = {
			key: t.cell.closest(this.rowSelector)?.getAttribute(this.names.key) ?? "",
			column: t.cell.getAttribute(M) ?? "",
			draft: this.fieldValue(t.field),
			changed: t.changed
		};
		this.open.delete(e), t.field !== null && this.values.release(t.field);
		let r = (n.key.length === 0 ? null : v(e, `${this.rowSelector}[${this.names.key}="${CSS.escape(n.key)}"]`))?.querySelector(`:scope > ${A}[${M}="${CSS.escape(n.column)}"]`) ?? null;
		if (r === null) return;
		this.openEditor(r);
		let i = this.open.get(e);
		i !== void 0 && i.field !== null && n.draft !== i.original && (this.values.write(i.field, n.draft), i.changed = n.changed);
	}
	handleKeyDown(e) {
		if (!(e instanceof KeyboardEvent) || e.defaultPrevented || e.isComposing || !(e.target instanceof Element)) return;
		let t = y(e.target);
		if (t === null || this.states.isInert(t)) return;
		let n = this.open.get(t);
		if (n === void 0) {
			if (e.key !== "F2" || !ne(this.rows, e.target)) return;
			let n = v(t, `${this.rowSelector}[${this.names.rowFocus}]`), r = n === null ? null : this.editableCells(t, n)[0] ?? null;
			r !== null && (e.preventDefault(), this.openEditor(r));
			return;
		}
		if (!n.editor.contains(e.target)) return;
		let r = e.target.closest(this.names.popupSelector);
		if (!(r !== null && n.editor.contains(r) || n.editor.querySelector("[aria-expanded='true']") !== null)) switch (e.key) {
			case "Enter":
				e.preventDefault(), this.commitEditor(t, n);
				break;
			case "Escape":
				e.preventDefault(), this.closeEditor(t, n, !1);
				break;
			case "Tab": {
				let r = this.siblingCell(t, n.cell, e.shiftKey ? -1 : 1);
				if (r === null) return;
				e.preventDefault(), this.commitEditor(t, n), this.openEditor(r);
				break;
			}
			default: return;
		}
	}
	editableCells(e, t) {
		let n = this.tables.columnOrder(e);
		return [...t.querySelectorAll(`:scope > ${A}`)].filter((t) => !this.tables.isColumnHidden(e, t.getAttribute(M) ?? "")).map((e) => ({
			cell: e,
			position: n.indexOf(e.getAttribute(M) ?? "")
		})).sort((e, t) => e.position - t.position).map((e) => e.cell);
	}
	siblingCell(e, t, n) {
		let r = t.closest(this.rowSelector), i = r === null ? [] : this.editableCells(e, r), a = i.indexOf(t);
		return a < 0 ? null : i[a + n] ?? null;
	}
	commitEditor(e, t) {
		let n = document.activeElement instanceof HTMLElement && t.editor.contains(document.activeElement);
		n && document.activeElement.blur(), this.closeEditor(e, t, !0), n && e.focus({ preventScroll: !0 });
	}
};
function de(e) {
	return e.type === "text" || e.type === "number" || e.type === "search" || e.type === "email" || e.type === "url" || e.type === "tel" || e.type === "password";
}
function fe(e) {
	return e instanceof HTMLTextAreaElement || e instanceof HTMLInputElement && de(e);
}
function pe(e) {
	return e.getClientRects().length > 0 && getComputedStyle(e).visibility === "visible";
}
//#endregion
//#region src/data-grid-query.ts
function F(e, t) {
	return I(e, t)?.getAttribute(t.itemsQuery) ?? null;
}
function I(e, t) {
	return e.querySelector(`:scope > [${t.valueKind}="${t.itemsQueryKind}"]`);
}
function L(e, t) {
	let n = F(e, t);
	if (n === null || n.length === 0) return {};
	try {
		return JSON.parse(n);
	} catch {
		return {};
	}
}
function R(e, t, n) {
	let i = I(e, t);
	if (i === null) return;
	let a = n.filters ?? [], o = n.sorts ?? [], s = a.length === 0 && o.length === 0 ? null : JSON.stringify({
		filters: a,
		sorts: o
	});
	s !== i.getAttribute(t.itemsQuery) && (s === null ? i.removeAttribute(t.itemsQuery) : i.setAttribute(t.itemsQuery, s), i.dispatchEvent(new Event("change", { bubbles: !0 })), i.dispatchEvent(new Event(r.queryChange, { bubbles: !0 })));
}
//#endregion
//#region src/data-grid-filter-engine.ts
var z = e.filter, B = e.filterKind, V = e.filterBound, H = `[${z}]`, U = `.${t.filterPanel}`, me = `.${t.filtersCount}`, W = `.${t.filtersClear}`, G = `.${t.filterPart}`, he = class {
	values;
	badges;
	properties;
	states;
	names;
	fieldSelector;
	written = /* @__PURE__ */ new WeakMap();
	constructor(e) {
		this.values = e.values, this.badges = e.badges, this.properties = e.properties, this.states = e.states, this.names = e.names, this.fieldSelector = `[${e.names.componentId}]`, this.fillAll(e.root.querySelectorAll(m)), e.observeComponents(e.root, m, {
			childList: !0,
			attributeFilter: [e.names.itemsQuery]
		}, (e) => this.fillAll(e)), e.root.addEventListener("click", (e) => {
			let t = e.target instanceof Element ? e.target.closest(W) : null, n = y(t);
			t !== null && n !== null && !this.states.isInert(t) && this.clearPanel(n);
		}), e.root.addEventListener("change", (e) => {
			let t = e.target instanceof Element ? e.target.closest(H) : null, n = y(t);
			t !== null && n !== null && this.writeFilters(n);
		}, !0);
	}
	clearPanel(e) {
		let t = /* @__PURE__ */ new Set();
		for (let n of _(e, H)) if (n.closest(U) !== null) {
			t.add(n);
			for (let e of n.querySelectorAll(`:scope > ${G}`)) {
				let t = e.querySelector(this.fieldSelector);
				t !== null && this.properties.set(t, "Value", null);
			}
		}
		this.writeFilters(e, t);
	}
	writeFilters(e, t = /* @__PURE__ */ new Set()) {
		let n = _(e, H), r = L(e, this.names), i = [];
		for (let e of n) t.has(e) || i.push(...this.readFilterTermsOf(e));
		R(e, this.names, {
			...r,
			filters: ve(r.filters ?? [], n.flatMap(_e), i)
		}), this.written.set(e, F(e, this.names)), this.syncFiltersCount(e);
	}
	fillAll(e) {
		for (let t of e) {
			let e = F(t, this.names);
			this.written.has(t) && this.written.get(t) === e || (this.written.set(t, e), this.fillFields(t));
		}
	}
	fillFields(e) {
		let t = L(e, this.names).filters ?? [];
		for (let n of _(e, H)) {
			let e = n.getAttribute(z) ?? "", r = n.getAttribute(B) ?? "text";
			for (let i of n.querySelectorAll(`:scope > ${G}`)) {
				let n = i.querySelector(this.fieldSelector);
				if (n === null || n.contains(document.activeElement)) continue;
				let a = K(t, e, r, i.getAttribute(V));
				(a === null ? null : String(a)) !== this.partValue(i) && this.properties.set(n, "Value", a);
			}
		}
		this.syncFiltersCount(e);
	}
	readFilterTermsOf(e) {
		let t = e.getAttribute(z) ?? "", n = e.getAttribute(B) ?? "text", r = [];
		for (let i of e.querySelectorAll(`:scope > ${G}`)) {
			let e = this.partValue(i), a = e === null ? null : xe(t, n, i.getAttribute(V), e);
			a !== null && r.push(a);
		}
		return r;
	}
	partValue(e) {
		let t = this.values.read(e), n = t == null || typeof t == "boolean" ? "" : String(t).trim();
		return n.length === 0 ? null : n;
	}
	syncFiltersCount(e) {
		let t = v(e, me);
		if (t === null) return;
		let n = L(e, this.names).filters ?? [], r = 0;
		for (let t of _(e, H)) t.closest(U) !== null && ge(t, n) && r++;
		this.badges.writeCount(t, r), t.hidden = r === 0;
		let i = v(e, W);
		i !== null && this.states.setDisabled(i, r === 0);
	}
};
function ge(e, t) {
	return _e(e).some((e) => K(t, e.property, e.kind, e.bound) !== null);
}
function _e(e) {
	let t = e.getAttribute(z) ?? "", n = e.getAttribute(B) ?? "text";
	return [...e.querySelectorAll(`:scope > ${G}`)].map((e) => ({
		property: t,
		kind: n,
		bound: e.getAttribute(V)
	}));
}
function ve(e, t, n) {
	return [...e.filter((e) => !t.some((t) => t.property === e.itemProperty && K([e], t.property, t.kind, t.bound) !== null)), ...n];
}
function K(e, t, n, r) {
	let i = r === "to";
	for (let r of e) if (r.itemProperty === t && r.value !== null && r.value !== void 0) switch (n) {
		case "number":
		case "money":
			if (r.operator === (i ? "LessOrEqual" : "GreaterOrEqual")) {
				let e = typeof r.value == "number" ? r.value : Se(String(r.value));
				if (e !== null) return e;
			}
			break;
		case "date": {
			let e = r.operator === (i ? "Less" : "GreaterOrEqual") ? ye(String(r.value)) : null, t = e !== null && i ? be(e, -1) : e;
			if (t !== null) return t;
			break;
		}
		case "boolean":
		case "enum":
			if (r.operator === "Equal") return String(r.value);
			break;
		default: if (r.operator === "LikeIgnoreCase") return String(r.value);
	}
	return null;
}
function ye(e) {
	return /^\d{4}-\d{2}-\d{2}(?:T00:00(?::00(?:\.0+)?)?)?$/.test(e) ? e.slice(0, 10) : null;
}
function be(e, t) {
	let n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e);
	if (n === null) return null;
	let r = /* @__PURE__ */ new Date(0);
	return r.setUTCFullYear(Number(n[1]), Number(n[2]) - 1, Number(n[3]) + t), r.toISOString().slice(0, 10);
}
function xe(e, t, n, r) {
	let i = n === "to" ? "LessOrEqual" : "GreaterOrEqual";
	switch (t) {
		case "number":
		case "money": {
			let t = Se(r);
			return t === null ? null : {
				itemProperty: e,
				operator: i,
				value: t
			};
		}
		case "date": {
			let t = n === "to" ? be(r, 1) : null;
			return t === null ? {
				itemProperty: e,
				operator: i,
				value: r
			} : {
				itemProperty: e,
				operator: "Less",
				value: t
			};
		}
		case "boolean":
		case "enum": return {
			itemProperty: e,
			operator: "Equal",
			value: r
		};
		default: return {
			itemProperty: e,
			operator: "LikeIgnoreCase",
			value: r
		};
	}
}
function Se(e) {
	let t = e.replace(/[,\s]/g, ""), n = Number(t);
	return t.length === 0 || !Number.isFinite(n) ? null : n;
}
//#endregion
//#region src/data-grid-pager-engine.ts
var Ce = e.paging, we = `:scope > .${t.pager}`, Te = `.${t.pageStatus}`, q = e.page, Ee = 50, De = class {
	strings;
	numbers;
	states;
	names;
	hostSelector;
	constructor(e) {
		let t = e.root;
		this.strings = e.strings, this.numbers = e.numbers, this.states = e.states, this.names = e.names, this.hostSelector = g(e.names), this.syncAll(t.querySelectorAll(m)), e.observeComponents(t, m, {
			childList: !0,
			attributeFilter: [
				Ce,
				e.names.windowOffset,
				e.names.windowTotal,
				e.names.windowMoreAfter
			]
		}, (e) => this.syncAll(e)), t.addEventListener("click", (t) => {
			let n = t.target instanceof Element ? t.target.closest(`[${q}]`) : null, r = y(n)?.querySelector(this.hostSelector) ?? null;
			if (n === null || r === null || this.states.isInert(n)) return;
			let i = ke(Oe(r, this.names), n.getAttribute(q) ?? "");
			i !== null && (t.preventDefault(), e.windows.requestOffsetAsync(r, i));
		}, !0);
	}
	syncAll(e) {
		for (let t of e) this.syncPager(t);
	}
	syncPager(e) {
		let t = e.querySelector(this.hostSelector), n = e.querySelector(we);
		if (t === null || n === null || !e.hasAttribute(Ce)) return;
		let r = Oe(t, this.names), a = n.querySelector(Te);
		if (a !== null) {
			let t = r.count === 0 ? 0 : r.offset + 1, n = r.offset + r.count, o = this.numbers.readCulture(e), s = (e) => this.numbers.format(e, "N0", o);
			r.total === null ? this.strings.write(a, null, i.pageRange, {
				from: s(t),
				to: s(n)
			}) : this.strings.write(a, null, i.pageOf, {
				from: s(t),
				to: s(n),
				total: s(r.total)
			});
		}
		for (let e of n.querySelectorAll(`[${q}]`)) this.states.setDisabled(e, ke(r, e.getAttribute(q) ?? "") === null);
	}
};
function Oe(e, t) {
	let n = e.querySelectorAll(`:scope > ${h(t)}`).length, r = C(e, t.windowSize) ?? 0;
	return {
		offset: C(e, t.windowOffset) ?? 0,
		count: n,
		size: r > 0 ? r : n > 0 ? n : Ee,
		total: C(e, t.windowTotal),
		moreAfter: e.getAttribute(t.windowMoreAfter) === "true"
	};
}
function ke(e, t) {
	switch (t) {
		case "first": return e.offset > 0 ? 0 : null;
		case "previous": return e.offset > 0 ? Math.max(0, (Math.ceil(e.offset / e.size) - 1) * e.size) : null;
		case "next": return e.moreAfter ? e.offset + e.count : null;
		case "last": {
			if (e.total === null) return e.moreAfter ? e.offset + e.count : null;
			let t = Math.max(0, Math.floor((e.total - 1) / e.size) * e.size);
			return e.offset < t ? t : null;
		}
		default: return null;
	}
}
//#endregion
//#region src/data-grid-selection-engine.ts
var J = `[${e.select}]`, Ae = `[${e.selectAll}]`, Y = "input[type='checkbox']", je = /* @__PURE__ */ new Set(["SelectedKeys", "SelectedKey"]), Me = class {
	selection;
	states;
	names;
	hostSelector;
	rowSelector;
	ownRowSelector;
	said = /* @__PURE__ */ new WeakMap();
	constructor(e) {
		this.selection = e.selection, this.states = e.states, this.names = e.names, this.hostSelector = g(e.names), this.rowSelector = h(e.names), this.ownRowSelector = `[${e.names.itemsHost}] > ${this.rowSelector}`, e.root.addEventListener("change", (e) => {
			let t = e.target instanceof Element ? e.target.closest(Y) : null, n = y(t);
			if (t === null || n === null) return;
			if (t.closest(Ae) !== null) {
				this.selection.setSelected(n, _(n, this.ownRowSelector).filter((e) => this.canChoose(e)), t.checked), this.sync(n);
				return;
			}
			let r = t.closest(J) === null ? null : t.closest(this.rowSelector);
			r !== null && (this.selection.toggle(r), this.sync(n));
		}, !0), e.propertyPatchEngine.addValueChangeHandler((t) => this.notePushed(e.root, t)), this.syncAll(e.root.querySelectorAll(m)), e.observeComponents(e.root, m, {
			childList: !0,
			attributeFilter: [
				e.names.selected,
				e.names.selectedKey,
				e.names.selectedKeys,
				e.names.unselectable,
				"class"
			]
		}, (e) => this.syncAll(e));
	}
	canChoose(e) {
		return !e.hasAttribute(this.names.unselectable) && !this.states.isInert(e);
	}
	sync(e) {
		let t = v(e, `${Ae} ${Y}`);
		(t !== null || v(e, J) !== null) && this.syncBoxes(e, t), this.sayChange(e);
	}
	syncBoxes(e, t) {
		let n = 0, r = 0;
		for (let t of _(e, this.ownRowSelector)) {
			let i = this.selection.isSelected(t), a = v(e, `${J} ${Y}`, t), o = this.canChoose(t);
			o && !t.classList.contains(this.names.hiddenClass) && (n++, i && r++), a !== null && (a.checked !== i && (a.checked = i), this.states.setDisabled(a, !o));
		}
		t !== null && (t.checked = r > 0 && r === n, t.indeterminate = r > 0 && r < n, this.states.setDisabled(t, n === 0));
	}
	sayChange(e) {
		let t = this.keysOf(e);
		if (!this.said.has(e)) {
			this.said.set(e, t);
			return;
		}
		this.said.get(e) !== t && (this.said.set(e, t), e.dispatchEvent(new Event(r.selectionChange, { bubbles: !0 })));
	}
	keysOf(e) {
		return e.querySelector(this.hostSelector)?.getAttribute(this.names.selectedKeys) ?? e.getAttribute(this.names.selectedKey);
	}
	notePushed(e, t) {
		if (t.local || !je.has(t.propertyName)) return;
		let n = t.components.length > 0 ? t.components.filter((e) => e.matches(m)) : [...e.querySelectorAll(m)];
		for (let e of n) e instanceof HTMLElement && this.said.set(e, this.keysOf(e));
	}
	syncAll(e) {
		for (let t of e) this.sync(t);
	}
};
//#endregion
//#region src/data-grid-sort.ts
function Ne(e, t, n) {
	let r = e.findIndex((e) => e.itemProperty === t), i = r < 0 ? null : e[r].direction, a = i === null ? "Ascending" : i === "Ascending" ? "Descending" : null;
	if (!n) return a === null ? [] : [{
		itemProperty: t,
		direction: a
	}];
	if (r < 0) return [...e, {
		itemProperty: t,
		direction: "Ascending"
	}];
	let o = [...e];
	return a === null ? o.splice(r, 1) : o[r] = {
		itemProperty: t,
		direction: a
	}, o;
}
function Pe(e, t) {
	let n = e.findIndex((e) => e.itemProperty === t);
	return n < 0 ? null : {
		direction: e[n].direction,
		place: n + 1
	};
}
//#endregion
//#region src/data-grid-sort-engine.ts
var X = e.sort, Fe = `.${t.sortMark}`, Ie = class {
	names;
	headerCellSelector;
	constructor(e) {
		let t = e.root;
		this.names = e.names, this.headerCellSelector = `:scope > .${e.names.tableScrollClass} > .${e.names.tableHeaderClass} > [${X}]`, this.syncAll(t.querySelectorAll(m)), e.observeComponents(t, m, {
			childList: !0,
			attributeFilter: [e.names.itemsQuery]
		}, (e) => this.syncAll(e)), t.addEventListener("click", (e) => this.handleHeaderPress(e, e instanceof MouseEvent && e.shiftKey), !0), t.addEventListener("keydown", (e) => {
			e instanceof KeyboardEvent && (e.key === "Enter" || e.key === " ") && e.target instanceof Element && e.target.hasAttribute(X) && this.handleHeaderPress(e, e.shiftKey);
		}, !0);
	}
	syncAll(e) {
		for (let t of e) this.syncSortMarks(t);
	}
	syncSortMarks(e) {
		let t = L(e, this.names).sorts ?? [];
		for (let r of e.querySelectorAll(this.headerCellSelector)) {
			let e = Pe(t, r.getAttribute(X) ?? ""), i = r.querySelector(Fe);
			S(r, "aria-sort", e === null ? "none" : e.direction === "Ascending" ? "ascending" : "descending"), S(r, n.sorted, e === null ? null : e.direction === "Ascending" ? "asc" : "desc"), i !== null && S(i, n.sortPlace, e !== null && t.length > 1 ? String(e.place) : null);
		}
	}
	handleHeaderPress(e, t) {
		if (e.defaultPrevented || !(e.target instanceof Element) || e.target.closest(`.${this.names.tableResizerClass}`) !== null) return;
		let n = e.target.closest(`[${X}]`), r = y(n), i = n?.getAttribute(X) ?? null;
		if (n === null || r === null || i === null || i.length === 0) return;
		e.preventDefault();
		let a = L(r, this.names);
		R(r, this.names, {
			...a,
			sorts: Ne(a.sorts ?? [], i, t)
		});
	}
}, Le = e.aggregate, Re = e.column, Z = e.raw, ze = class {
	formatting;
	rows;
	names;
	hostSelector;
	totalSelector;
	shownRowSelector;
	pending = /* @__PURE__ */ new Set();
	scheduled = !1;
	constructor(e, n) {
		this.formatting = n, this.rows = e.rows, this.names = e.names, this.hostSelector = g(e.names), this.totalSelector = `:scope > .${e.names.tableScrollClass} > .${t.footer} > .${t.total}[${Le}]`, this.shownRowSelector = `:scope > ${h(e.names)}:not(.${e.names.hiddenClass})`, this.syncAll(e.root.querySelectorAll(m)), e.observeComponents(e.root, m, {
			childList: !0,
			attributeFilter: [
				"class",
				Z,
				e.names.windowAggregates
			]
		}, (e) => this.queue(e));
	}
	syncAll(e) {
		for (let t of e) this.syncTotals(t);
	}
	syncTotals(t) {
		let n = t.querySelectorAll(this.totalSelector);
		if (n.length === 0) return;
		let r = t.querySelector(this.hostSelector);
		if (r === null) return;
		let i = r.getAttribute(this.names.hostMode) === "windowed", a = i ? Be(r, this.names) : null, o = i ? null : this.rows.itemsOf(r), c = this.formatting.numbers.readCulture(t), l = this.formatting.temporal.readCulture(t);
		for (let t of n) {
			let n = t.getAttribute(Re) ?? "", u = t.getAttribute(e.property) ?? n, d = t.getAttribute(Le) ?? "", f = i ? a?.[u] ?? null : o === null ? d === "count" ? r.querySelectorAll(this.shownRowSelector).length : Ue(d, He(r, n, this.shownRowSelector)) : d === "count" ? o.length : Ue(d, Ve(o, u, this.rows)), p = f === null ? "" : ee(f, s(t), c, l, this.formatting);
			t.textContent !== p && (t.textContent = p);
		}
	}
	queue(e) {
		for (let t of e) this.pending.add(t);
		this.scheduled || (this.scheduled = !0, requestAnimationFrame(() => {
			this.scheduled = !1;
			let e = [...this.pending];
			this.pending.clear(), this.syncAll(e.filter((e) => e.isConnected));
		}));
	}
};
function Be(e, t) {
	let n = e.getAttribute(t.windowAggregates);
	if (n === null || n.length === 0) return null;
	try {
		return JSON.parse(n);
	} catch {
		return null;
	}
}
function Ve(e, t, n) {
	let r = [];
	for (let i of e) {
		let e = p(n.readPath(i, t));
		e !== null && r.push(e);
	}
	return r;
}
function He(e, t, n) {
	let r = [];
	for (let i of e.querySelectorAll(n)) {
		let e = i.querySelector(`:scope > [${Re}="${CSS.escape(t)}"] [${Z}]`), n = e === null ? NaN : Number(e.getAttribute(Z));
		Number.isFinite(n) && r.push(n);
	}
	return r;
}
function Ue(e, t) {
	if (e === "count") return t.length;
	if (t.length === 0) return null;
	switch (e) {
		case "sum": return t.reduce((e, t) => e + t, 0);
		case "average": return t.reduce((e, t) => e + t, 0) / t.length;
		case "min": return We(t, -1);
		case "max": return We(t, 1);
		default: return null;
	}
}
function We(e, t) {
	let n = e[0];
	for (let r = 1; r < e.length; r++) (e[r] - n) * t > 0 && (n = e[r]);
	return n;
}
//#endregion
//#region src/data-grid-engine.ts
var Ge = class {
	formatting;
	constructor(e) {
		this.formatting = {
			numbers: e.numbers,
			temporal: e.temporal,
			strings: e.strings
		}, new Ie(e), new ue(e), new he(e), new De(e), new ze(e, this.formatting), new re(e), new ce(e), new Me(e), e.strings.onChange(() => u(e.root, this.formatting));
	}
	applyCellValue(e, t) {
		l(e, t, this.formatting);
	}
}, Ke = 2;
function qe() {
	let e = window.NEStandardUI;
	if (e === void 0 || typeof e.registerEngine != "function") throw Error("NE.Standard.UI.Web.DataGrid needs the framework's client (ui.js) on the page before it.");
	if (e.contractVersion !== Ke) throw Error(`NE.Standard.UI.Web.DataGrid was built for plugin contract ${Ke}, but the framework's client on the page implements ${String(e.contractVersion ?? "an older one")}; install the package version that matches the framework.`);
	return e;
}
//#endregion
//#region src/data-grid.ts
var Q = qe(), $;
Q.registerEvent(r.queryChange, { settlesValue: !0 }), Q.registerEvent(r.cellEdit, { settlesValue: !0 }), Q.registerEvent(r.selectionChange, { settlesValue: !0 }), Q.registerEngine((e) => {
	$ = new Ge(e);
}), Q.registerDomOperation({
	kind: a,
	handler: (e) => $?.applyCellValue(e.target, e.value)
});
//#endregion
