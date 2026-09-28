//#region src/data-grid-cell.ts
var e = "data-grid-cell", t = "data-ui-grid-raw", n = /^\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?\s*$/;
function r(e) {
	return {
		kind: e.getAttribute("data-ui-grid-kind") ?? "text",
		format: e.getAttribute("data-ui-grid-format"),
		currency: e.getAttribute("data-ui-grid-currency"),
		choices: i(e.getAttribute("data-ui-grid-choices"))
	};
}
function i(e) {
	if (e === null || e.length === 0) return null;
	try {
		return JSON.parse(e);
	} catch {
		return null;
	}
}
function a(e, n, i) {
	let a = r(e), c = o(n, a, i.numbers.readCulture(e), i.temporal.readCulture(e), i);
	e.textContent !== c && (e.textContent = c);
	let l = a.kind === "number" || a.kind === "money" ? s(n) : null;
	l === null ? e.hasAttribute("data-ui-grid-raw") && e.removeAttribute(t) : e.setAttribute(t, String(l));
}
function o(e, t, n, r, i) {
	if (e == null) return "";
	switch (t.kind) {
		case "number":
		case "money": {
			let r = s(e);
			if (r === null) return String(e);
			let a = t.kind === "money" && t.currency !== null ? {
				...n,
				currencySymbol: t.currency
			} : n;
			return i.numbers.format(r, t.format, a);
		}
		case "date": {
			let n = c(e, i.temporal);
			return n === null ? String(e) : i.temporal.format(n, t.format, r);
		}
		case "boolean": {
			let n = e === !0 || e === "true" || e === "True", r = n ? "true" : "false";
			return t.choices?.[r] ?? i.strings.text(n ? "ui.grid.yes" : "ui.grid.no");
		}
		case "enum": {
			let n = String(e);
			return t.choices?.[n] ?? n;
		}
		default: return String(e);
	}
}
function s(e) {
	if (typeof e == "number") return Number.isFinite(e) ? e : null;
	if (typeof e != "string" || !n.test(e)) return null;
	let t = Number(e);
	return Number.isFinite(t) ? t : null;
}
function c(e, t) {
	if (e instanceof Date) return e;
	if (typeof e != "string") return null;
	let n = t.parse(e);
	return n === null ? null : t.toDate(n);
}
//#endregion
//#region src/data-grid-dom.ts
var l = ".ui-data-grid", u = ".ui-table__row", d = ":scope > .ui-table__scroll > [data-ui-items-host]";
function f(e, t) {
	let n = [];
	for (let r of e.querySelectorAll(t)) r.closest(".ui-data-grid") === e && n.push(r);
	return n;
}
function p(e, t, n = e) {
	for (let r of n.querySelectorAll(t)) if (r.closest(".ui-data-grid") === e) return r;
	return null;
}
function m(e) {
	return e instanceof Element ? e.closest(l) : null;
}
function ee(e) {
	let t = Number(e.getAttribute("data-ui-id"));
	return Number.isInteger(t) ? t : null;
}
function h(e, t, n) {
	n === null ? e.removeAttribute(t) : e.getAttribute(t) !== n && e.setAttribute(t, n);
}
function g(e, t) {
	let n = e.getAttribute(t);
	if (n === null || n.length === 0) return null;
	let r = Number(n);
	return Number.isFinite(r) ? r : null;
}
//#endregion
//#region src/data-grid-chooser-engine.ts
var _ = ".ui-data-grid__columns-panel .ui-menu-item[data-ui-menu-item-kind=\"check\"]", v = "data-ui-key", y = "ui-menu-item--checked", b = "ui-disabled", te = class {
	tables;
	constructor(e) {
		this.tables = e.tables, e.root.addEventListener("click", (e) => {
			let t = e.target instanceof Element ? e.target.closest(_) : null, n = m(t);
			t !== null && n !== null && (e.preventDefault(), !t.classList.contains(b) && (this.tables.setColumnHidden(n, x(t), t.classList.contains(y)), this.syncEntries(n)));
		}), this.syncAll(e.root.querySelectorAll(l)), e.observeComponents(e.root, l, {
			childList: !0,
			attributeFilter: ["data-ui-table-hidden", "style"]
		}, (e) => this.syncAll(e));
	}
	syncAll(e) {
		for (let t of e) f(t, _).length !== 0 && (this.syncEntries(t), this.syncOrder(t));
	}
	syncOrder(e) {
		let t = f(e, _), n = /* @__PURE__ */ new Map();
		for (let e of t) n.set(x(e), e.closest(`[${v}]`) ?? e);
		let r = this.tables.columnOrder(e).filter((e) => n.has(e)), i = n.get(r[0])?.parentElement ?? null;
		if (!(i === null || r.length < 2 || r.every((e, t) => n.get(e) === i.children[t]))) for (let e of r) i.appendChild(n.get(e));
	}
	syncEntries(e) {
		let t = f(e, _), n = t.filter((t) => !this.tables.isColumnHidden(e, x(t)));
		for (let e of t) {
			let t = n.includes(e), r = t && n.length === 1;
			e.classList.toggle(y, t), e.setAttribute("aria-checked", String(t)), e.classList.toggle(b, r), r ? e.setAttribute("aria-disabled", "true") : e.removeAttribute("aria-disabled");
		}
	}
};
function x(e) {
	return e.closest(`[${v}]`)?.getAttribute(v) ?? "";
}
//#endregion
//#region src/data-grid-detail-engine.ts
var ne = ".ui-data-grid__cell--detail", S = "ui-data-grid__detail", re = "detail", C = "data-ui-grid-expanded", ie = "data-ui-grid-expand-click", ae = "data-ui-grid-multiple-details", oe = "data-ui-no-row-open", se = "data-ui-grid-readonly", ce = ".ui-data-grid__cell--editable", w = `${ne} button`, le = "open", ue = class {
	rows;
	enterDown = !1;
	constructor(e) {
		this.rows = e.rows, this.markAll(e.root.querySelectorAll(l)), e.observeComponents(e.root, l, { childList: !0 }, (e) => this.markAll(e)), e.root.addEventListener("keydown", (e) => {
			e instanceof KeyboardEvent && e.key === "Enter" && (this.enterDown = !0, window.setTimeout(() => {
				this.enterDown = !1;
			}, 0));
		}, !0), e.root.addEventListener(le, (e) => {
			let t = this.enterDown && e.target instanceof Element ? e.target.closest(u) : null, n = m(t);
			t !== null && n !== null && n.hasAttribute(ie) && this.toggleDetail(n, t);
		}), e.root.addEventListener("click", (e) => {
			if (!(e.target instanceof Element)) return;
			let t = m(e.target), n = e.target.closest(u);
			t !== null && n !== null && t.contains(n) && e.target.closest(`.${S}`)?.parentElement !== n && (e.target.closest(ne) !== null || t.hasAttribute(ie) && !de(t, e.target)) && (e.preventDefault(), this.toggleDetail(t, n));
		});
	}
	markAll(e) {
		for (let t of e) for (let e of f(t, `${w}:not([aria-expanded])`)) e.setAttribute("aria-expanded", "false");
	}
	toggleDetail(e, t) {
		if (t.hasAttribute(C)) {
			T(t);
			return;
		}
		if (!e.hasAttribute(ae)) for (let t of f(e, `${u}[${C}]`)) T(t);
		let n = ee(e), r = n === null ? null : this.rows.renderVariant(t, n, re);
		if (r === null) return;
		let i = document.createElement("div");
		i.className = S, i.appendChild(r), t.appendChild(i), t.setAttribute(C, ""), E(t, !0);
	}
};
function de(e, t) {
	let n = t.closest(`[${oe}]`);
	return n !== null && !(e.hasAttribute(se) && n.matches(ce));
}
function T(e) {
	e.removeAttribute(C), e.querySelector(`:scope > .${S}`)?.remove(), E(e, !1);
}
function E(e, t) {
	e.querySelector(`:scope > ${w}`)?.setAttribute("aria-expanded", t ? "true" : "false");
}
//#endregion
//#region src/data-grid-edit-engine.ts
var D = ".ui-data-grid__cell--editable", fe = "ui-data-grid__cell--editable", pe = "ui-data-grid__editor", me = "ui-data-grid__editor--open", O = "ui-data-grid__cell--editing", k = "data-ui-grid-editor", he = "data-ui-grid-readonly", A = "data-ui-grid-kind", ge = "data-ui-row-focus", j = "data-ui-key", M = "data-ui-grid-column", _e = "data-ui-bind-value", ve = "data-ui-value-holder", ye = "input, textarea, select, button, [tabindex]", be = ".ui-select__trigger", xe = "[role='listbox'], [role='menu'], [role='dialog']", Se = "cell-edit", Ce = class {
	rows;
	values;
	tables;
	open = /* @__PURE__ */ new WeakMap();
	constructor(e) {
		let t = e.root;
		this.rows = e.rows, this.values = e.values, this.tables = e.tables, t.addEventListener("dblclick", (e) => {
			let t = e.target instanceof Element ? e.target.closest(D) : null;
			t !== null && t.closest(".ui-data-grid") !== null && (e.preventDefault(), this.openEditor(t));
		}, !0), t.addEventListener("change", (e) => {
			let t = m(e.target), n = t === null ? void 0 : this.open.get(t);
			n !== void 0 && e.target instanceof Node && n.editor.contains(e.target) && (n.changed = !0);
		}, !0), t.addEventListener("keydown", (e) => this.handleKeyDown(e), !0), e.observeComponents(t, l, { childList: !0 }, (e) => {
			for (let t of e) this.followRow(t);
		}), t.addEventListener("mousedown", (e) => {
			let t = m(e.target), n = t === null ? void 0 : this.open.get(t);
			if (n === void 0 || !(e.target instanceof Element) || !n.editor.contains(e.target)) return;
			let r = e.target.closest(ye);
			(r === null || !n.editor.contains(r)) && e.preventDefault();
		}, !0), t.addEventListener("focusout", (e) => {
			if (!(e instanceof FocusEvent) || !(e.target instanceof Element)) return;
			let t = m(e.target), n = t === null ? void 0 : this.open.get(t);
			if (t === null || n === void 0 || !n.editor.contains(e.target)) return;
			let r = e.relatedTarget;
			r instanceof Node && n.editor.contains(r) || window.setTimeout(() => this.closeEditor(t, n, !0), 0);
		}, !0);
	}
	openEditor(e) {
		let t = m(e), n = e.closest(u);
		if (t === null || n === null || t.hasAttribute(he)) return;
		let r = this.open.get(t);
		if (r !== void 0) {
			if (r.cell === e) return;
			this.closeEditor(t, r, !0);
		}
		let i = this.createEditor(t, n, e);
		if (i === null) return;
		let a = i.querySelector(`[${ve}][${_e}]`) ?? i.querySelector(`[${_e}]`);
		this.open.set(t, {
			editor: i,
			cell: e,
			field: a,
			original: this.fieldValue(a),
			changed: !1
		}), a !== null && this.values.hold(a), i.style.minHeight = `${e.getBoundingClientRect().height}px`, e.classList.add(O), i.classList.add(me), e.after(i);
		let o = i.querySelector(ye);
		o?.focus({ preventScroll: !0 }), o instanceof HTMLInputElement && we(o) && o.select();
		let s = i.querySelector(be);
		s !== null && s.getAttribute("aria-expanded") !== "true" && s.click();
	}
	createEditor(e, t, n) {
		let r = n.getAttribute(k), i = ee(e);
		if (r === null || i === null) return null;
		let a = this.rows.renderVariant(t, i, r);
		if (a === null) return null;
		let o = document.createElement("div");
		for (let e of n.attributes) o.setAttribute(e.name, e.value);
		o.classList.remove(fe, O), o.classList.add(pe), o.removeAttribute(k), o.appendChild(a);
		let s = n.querySelector(`[${A}]`)?.getAttribute(A);
		return s != null && o.setAttribute(A, s), o;
	}
	fieldValue(e) {
		return e === null ? null : this.values.read(e);
	}
	closeEditor(e, t, n) {
		if (this.open.get(e) !== t) return;
		this.open.delete(e), n ? (t.field !== null && !t.changed && this.fieldValue(t.field) !== t.original && t.field.dispatchEvent(new Event("change", { bubbles: !0 })), (t.changed || this.fieldValue(t.field) !== t.original) && (t.field ?? t.editor).dispatchEvent(new Event(Se, { bubbles: !0 }))) : t.field !== null && (Te(t.field, t.original), t.changed && t.field.dispatchEvent(new Event("change", { bubbles: !0 }))), t.field !== null && this.values.release(t.field);
		let r = t.editor.contains(document.activeElement);
		t.cell.classList.remove(O), t.editor.remove(), r && e.focus({ preventScroll: !0 });
	}
	followRow(e) {
		let t = this.open.get(e);
		if (t === void 0 || t.cell.isConnected) return;
		let n = {
			key: t.cell.closest(".ui-table__row")?.getAttribute(j) ?? "",
			column: t.cell.getAttribute(M) ?? "",
			draft: this.fieldValue(t.field),
			changed: t.changed
		};
		this.open.delete(e), t.field !== null && this.values.release(t.field);
		let r = (n.key.length === 0 ? null : p(e, `.ui-table__row[${j}="${CSS.escape(n.key)}"]`))?.querySelector(`:scope > ${D}[${M}="${CSS.escape(n.column)}"]`) ?? null;
		if (r === null) return;
		this.openEditor(r);
		let i = this.open.get(e);
		i !== void 0 && i.field !== null && n.draft !== i.original && (Te(i.field, n.draft), i.changed = n.changed);
	}
	handleKeyDown(e) {
		if (!(e instanceof KeyboardEvent) || e.defaultPrevented || e.isComposing || !(e.target instanceof Element)) return;
		let t = m(e.target);
		if (t === null) return;
		let n = this.open.get(t);
		if (n === void 0) {
			if (e.key !== "F2") return;
			let n = p(t, `${u}[${ge}]`), r = n === null ? null : this.editableCells(t, n)[0] ?? null;
			r !== null && (e.preventDefault(), this.openEditor(r));
			return;
		}
		if (!n.editor.contains(e.target)) return;
		let r = e.target.closest(xe), i = n.editor.querySelector("[role='listbox']");
		if (!(r !== null && n.editor.contains(r) || i !== null && i.getClientRects().length > 0)) switch (e.key) {
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
		return [...t.querySelectorAll(`:scope > ${D}`)].filter((t) => !this.tables.isColumnHidden(e, t.getAttribute(M) ?? "")).map((e) => ({
			cell: e,
			position: n.indexOf(e.getAttribute(M) ?? "")
		})).sort((e, t) => e.position - t.position).map((e) => e.cell);
	}
	siblingCell(e, t, n) {
		let r = t.closest(u), i = r === null ? [] : this.editableCells(e, r), a = i.indexOf(t);
		return a < 0 ? null : i[a + n] ?? null;
	}
	commitEditor(e, t) {
		let n = document.activeElement instanceof HTMLElement && t.editor.contains(document.activeElement);
		n && document.activeElement.blur(), this.closeEditor(e, t, !0), n && e.focus({ preventScroll: !0 });
	}
};
function we(e) {
	return e.type === "text" || e.type === "number" || e.type === "search" || e.type === "email" || e.type === "url" || e.type === "tel" || e.type === "password";
}
function Te(e, t) {
	if (e instanceof HTMLInputElement && (e.type === "checkbox" || e.type === "radio")) {
		e.checked = t === !0;
		return;
	}
	(e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement) && (e.value = t == null || typeof t == "boolean" ? "" : String(t));
}
//#endregion
//#region src/data-grid-query.ts
var N = "data-ui-items-query", Ee = ":scope > [data-ui-value-kind=\"items-query\"]", De = "query-change";
function P(e) {
	return F(e)?.getAttribute("data-ui-items-query") ?? null;
}
function F(e) {
	return e.querySelector(Ee);
}
function I(e) {
	let t = P(e);
	if (t === null || t.length === 0) return {};
	try {
		return JSON.parse(t);
	} catch {
		return {};
	}
}
function L(e, t) {
	let n = F(e);
	if (n === null) return;
	let r = t.filters ?? [], i = t.sorts ?? [], a = r.length === 0 && i.length === 0 ? null : JSON.stringify({
		filters: r,
		sorts: i
	});
	a !== n.getAttribute("data-ui-items-query") && (a === null ? n.removeAttribute(N) : n.setAttribute(N, a), n.dispatchEvent(new Event("change", { bubbles: !0 })), n.dispatchEvent(new Event(De, { bubbles: !0 })));
}
//#endregion
//#region src/data-grid-filter-engine.ts
var R = "[data-ui-grid-filter]", z = ".ui-data-grid__filter-panel", Oe = ".ui-data-grid__filters-count", B = ".ui-data-grid__filters-clear", V = ".ui-data-grid__filter-part", H = "data-ui-grid-filter", U = "data-ui-grid-filter-kind", W = "data-ui-grid-filter-bound", ke = class {
	values;
	badges;
	properties;
	written = /* @__PURE__ */ new WeakMap();
	constructor(e) {
		this.values = e.values, this.badges = e.badges, this.properties = e.properties, this.fillAll(e.root.querySelectorAll(l)), e.observeComponents(e.root, l, {
			childList: !0,
			attributeFilter: [N]
		}, (e) => this.fillAll(e)), e.root.addEventListener("click", (e) => {
			let t = e.target instanceof Element ? e.target.closest(B) : null, n = m(t);
			t !== null && n !== null && this.clearPanel(n);
		}), e.root.addEventListener("change", (e) => {
			let t = e.target instanceof Element ? e.target.closest(R) : null, n = m(t);
			t !== null && n !== null && this.writeFilters(n);
		}, !0);
	}
	clearPanel(e) {
		let t = /* @__PURE__ */ new Set();
		for (let n of f(e, R)) if (n.closest(z) !== null) {
			t.add(n);
			for (let e of n.querySelectorAll(`:scope > ${V}`)) {
				let t = e.querySelector("[data-ui-id]");
				t !== null && this.properties.set(t, "Value", null);
			}
		}
		this.writeFilters(e, t);
	}
	writeFilters(e, t = /* @__PURE__ */ new Set()) {
		let n = f(e, R), r = I(e), i = [];
		for (let e of n) t.has(e) || i.push(...this.readFilterTermsOf(e));
		L(e, {
			...r,
			filters: je(r.filters ?? [], n.flatMap(G), i)
		}), this.written.set(e, P(e)), this.syncFiltersCount(e);
	}
	fillAll(e) {
		for (let t of e) {
			let e = P(t);
			this.written.has(t) && this.written.get(t) === e || (this.written.set(t, e), this.fillFields(t));
		}
	}
	fillFields(e) {
		let t = I(e).filters ?? [];
		for (let n of f(e, R)) {
			let e = n.getAttribute(H) ?? "", r = n.getAttribute(U) ?? "text";
			for (let i of n.querySelectorAll(`:scope > ${V}`)) {
				let n = i.querySelector("[data-ui-id]");
				if (n === null || n.contains(document.activeElement)) continue;
				let a = K(t, e, r, i.getAttribute(W));
				(a === null ? null : String(a)) !== this.partValue(i) && this.properties.set(n, "Value", a);
			}
		}
		this.syncFiltersCount(e);
	}
	readFilterTermsOf(e) {
		let t = e.getAttribute(H) ?? "", n = e.getAttribute(U) ?? "text", r = [];
		for (let i of e.querySelectorAll(`:scope > ${V}`)) {
			let e = this.partValue(i), a = e === null ? null : Pe(t, n, i.getAttribute(W), e);
			a !== null && r.push(a);
		}
		return r;
	}
	partValue(e) {
		let t = this.values.read(e), n = t == null || typeof t == "boolean" ? "" : String(t).trim();
		return n.length === 0 ? null : n;
	}
	syncFiltersCount(e) {
		let t = p(e, Oe);
		if (t === null) return;
		let n = I(e).filters ?? [], r = 0;
		for (let t of f(e, R)) t.closest(z) !== null && Ae(t, n) && r++;
		this.badges.writeCount(t, r), t.hidden = r === 0;
		let i = p(e, B);
		i !== null && (i.disabled = r === 0);
	}
};
function Ae(e, t) {
	return G(e).some((e) => K(t, e.property, e.kind, e.bound) !== null);
}
function G(e) {
	let t = e.getAttribute(H) ?? "", n = e.getAttribute(U) ?? "text";
	return [...e.querySelectorAll(`:scope > ${V}`)].map((e) => ({
		property: t,
		kind: n,
		bound: e.getAttribute(W)
	}));
}
function je(e, t, n) {
	return [...e.filter((e) => !t.some((t) => t.property === e.itemProperty && K([e], t.property, t.kind, t.bound) !== null)), ...n];
}
function K(e, t, n, r) {
	let i = r === "to";
	for (let r of e) if (r.itemProperty === t && r.value !== null && r.value !== void 0) switch (n) {
		case "number":
		case "money":
			if (r.operator === (i ? "LessOrEqual" : "GreaterOrEqual")) {
				let e = typeof r.value == "number" ? r.value : Fe(String(r.value));
				if (e !== null) return e;
			}
			break;
		case "date": {
			let e = r.operator === (i ? "Less" : "GreaterOrEqual") ? Me(String(r.value)) : null, t = e !== null && i ? Ne(e, -1) : e;
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
function Me(e) {
	return /^\d{4}-\d{2}-\d{2}(?:T00:00(?::00(?:\.0+)?)?)?$/.test(e) ? e.slice(0, 10) : null;
}
function Ne(e, t) {
	let n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e);
	if (n === null) return null;
	let r = /* @__PURE__ */ new Date(0);
	return r.setUTCFullYear(Number(n[1]), Number(n[2]) - 1, Number(n[3]) + t), r.toISOString().slice(0, 10);
}
function Pe(e, t, n, r) {
	let i = n === "to" ? "LessOrEqual" : "GreaterOrEqual";
	switch (t) {
		case "number":
		case "money": {
			let t = Fe(r);
			return t === null ? null : {
				itemProperty: e,
				operator: i,
				value: t
			};
		}
		case "date": {
			let t = n === "to" ? Ne(r, 1) : null;
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
function Fe(e) {
	let t = e.replace(/[,\s]/g, ""), n = Number(t);
	return t.length === 0 || !Number.isFinite(n) ? null : n;
}
//#endregion
//#region src/data-grid-pager-engine.ts
var Ie = "data-ui-grid-paging", Le = ":scope > .ui-data-grid__pager", Re = ".ui-data-grid__page-status", q = "data-ui-grid-page", ze = "data-ui-window-offset", Be = "data-ui-window-total", Ve = "data-ui-window-size", He = "data-ui-window-more-after", Ue = "ui.grid.page-of", We = "ui.grid.page-range", Ge = 50, Ke = class {
	strings;
	numbers;
	constructor(e) {
		let t = e.root;
		this.strings = e.strings, this.numbers = e.numbers, this.syncAll(t.querySelectorAll(l)), e.observeComponents(t, l, {
			childList: !0,
			attributeFilter: [
				Ie,
				ze,
				Be,
				He
			]
		}, (e) => this.syncAll(e)), t.addEventListener("click", (t) => {
			let n = t.target instanceof Element ? t.target.closest(`[${q}]`) : null, r = m(n)?.querySelector(":scope > .ui-table__scroll > [data-ui-items-host]") ?? null;
			if (n === null || r === null || n.disabled) return;
			let i = Je(qe(r), n.getAttribute(q) ?? "");
			i !== null && (t.preventDefault(), e.windows.requestOffsetAsync(r, i));
		}, !0);
	}
	syncAll(e) {
		for (let t of e) this.syncPager(t);
	}
	syncPager(e) {
		let t = e.querySelector(d), n = e.querySelector(Le);
		if (t === null || n === null || !e.hasAttribute(Ie)) return;
		let r = qe(t), i = n.querySelector(Re);
		if (i !== null) {
			let t = r.count === 0 ? 0 : r.offset + 1, n = r.offset + r.count, a = this.numbers.readCulture(e), o = (e) => this.numbers.format(e, "N0", a), s = r.total === null ? this.strings.format(We, {
				from: o(t),
				to: o(n)
			}) : this.strings.format(Ue, {
				from: o(t),
				to: o(n),
				total: o(r.total)
			});
			i.textContent !== s && (i.textContent = s);
		}
		for (let e of n.querySelectorAll(`[${q}]`)) e.disabled = Je(r, e.getAttribute(q) ?? "") === null;
	}
};
function qe(e) {
	let t = e.querySelectorAll(`:scope > ${u}`).length, n = g(e, Ve) ?? 0;
	return {
		offset: g(e, ze) ?? 0,
		count: t,
		size: n > 0 ? n : t > 0 ? t : Ge,
		total: g(e, Be),
		moreAfter: e.getAttribute(He) === "true"
	};
}
function Je(e, t) {
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
var J = "[data-ui-grid-select]", Ye = "[data-ui-grid-select-all]", Y = "input[type='checkbox']", Xe = "data-ui-selected", Ze = `[data-ui-items-host] > ${u}`, X = "ui-hidden", Z = "selection-change", Qe = class {
	selection;
	constructor(e) {
		this.selection = e.selection, e.root.addEventListener("change", (e) => {
			let t = e.target instanceof Element ? e.target.closest(Y) : null, n = m(t);
			if (t === null || n === null) return;
			if (t.closest(Ye) !== null) {
				this.selection.setSelected(n, f(n, Ze).filter((e) => !e.classList.contains(X)), t.checked), this.syncBoxes(n), n.dispatchEvent(new Event(Z, { bubbles: !0 }));
				return;
			}
			let r = t.closest(J) === null ? null : t.closest(u);
			r !== null && (this.selection.toggle(r), this.syncBoxes(n), n.dispatchEvent(new Event(Z, { bubbles: !0 })));
		}, !0), this.syncAll(e.root.querySelectorAll(l)), e.observeComponents(e.root, l, {
			childList: !0,
			attributeFilter: [Xe, "class"]
		}, (e) => this.syncAll(e));
	}
	syncAll(e) {
		for (let t of e) this.syncBoxes(t);
	}
	syncBoxes(e) {
		let t = p(e, `${Ye} ${Y}`);
		if (t === null && p(e, J) === null) return;
		let n = 0, r = 0;
		for (let t of f(e, Ze)) {
			let i = this.selection.isSelected(t), a = p(e, `${J} ${Y}`, t);
			t.classList.contains(X) || (n++, i && r++), a !== null && a.checked !== i && (a.checked = i);
		}
		t !== null && (t.checked = r > 0 && r === n, t.indeterminate = r > 0 && r < n);
	}
};
//#endregion
//#region src/data-grid-sort.ts
function $e(e, t, n) {
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
function et(e, t) {
	let n = e.findIndex((e) => e.itemProperty === t);
	return n < 0 ? null : {
		direction: e[n].direction,
		place: n + 1
	};
}
//#endregion
//#region src/data-grid-sort-engine.ts
var Q = "data-ui-grid-sort", tt = "data-ui-grid-sorted", nt = "data-ui-grid-sort-place", rt = ".ui-data-grid__sort-mark", it = ":scope > .ui-table__scroll > .ui-table__header > [data-ui-grid-sort]", at = ".ui-table__resizer", ot = class {
	constructor(e) {
		let t = e.root;
		this.syncAll(t.querySelectorAll(l)), e.observeComponents(t, l, {
			childList: !0,
			attributeFilter: [N]
		}, (e) => this.syncAll(e)), t.addEventListener("click", (e) => this.handleHeaderPress(e, e instanceof MouseEvent && e.shiftKey), !0), t.addEventListener("keydown", (e) => {
			e instanceof KeyboardEvent && (e.key === "Enter" || e.key === " ") && e.target instanceof Element && e.target.hasAttribute(Q) && this.handleHeaderPress(e, e.shiftKey);
		}, !0);
	}
	syncAll(e) {
		for (let t of e) this.syncSortMarks(t);
	}
	syncSortMarks(e) {
		let t = I(e).sorts ?? [];
		for (let n of e.querySelectorAll(it)) {
			let e = et(t, n.getAttribute(Q) ?? ""), r = n.querySelector(rt);
			h(n, "aria-sort", e === null ? "none" : e.direction === "Ascending" ? "ascending" : "descending"), h(n, tt, e === null ? null : e.direction === "Ascending" ? "asc" : "desc"), r !== null && h(r, nt, e !== null && t.length > 1 ? String(e.place) : null);
		}
	}
	handleHeaderPress(e, t) {
		if (e.defaultPrevented || !(e.target instanceof Element) || e.target.closest(at) !== null) return;
		let n = e.target.closest(`[${Q}]`), r = m(n), i = n?.getAttribute(Q) ?? null;
		if (n === null || r === null || i === null || i.length === 0) return;
		e.preventDefault();
		let a = I(r);
		L(r, {
			...a,
			sorts: $e(a.sorts ?? [], i, t)
		});
	}
}, st = ":scope > .ui-table__scroll > .ui-data-grid__footer > .ui-data-grid__total[data-ui-grid-aggregate]", ct = ":scope > .ui-table__row:not(.ui-hidden)", lt = "data-ui-grid-column", ut = "data-ui-grid-property", dt = "data-ui-grid-aggregate", ft = "data-ui-host-mode", pt = "data-ui-window-aggregates", mt = class {
	formatting;
	rows;
	pending = /* @__PURE__ */ new Set();
	scheduled = !1;
	constructor(e, n) {
		this.formatting = n, this.rows = e.rows, this.syncAll(e.root.querySelectorAll(l)), e.observeComponents(e.root, l, {
			childList: !0,
			attributeFilter: [
				"class",
				t,
				pt
			]
		}, (e) => this.queue(e));
	}
	syncAll(e) {
		for (let t of e) this.syncTotals(t);
	}
	syncTotals(e) {
		let t = e.querySelectorAll(st);
		if (t.length === 0) return;
		let n = e.querySelector(d);
		if (n === null) return;
		let i = n.getAttribute(ft) === "windowed", a = i ? ht(n) : null, s = i ? null : this.rows.itemsOf(n), c = this.formatting.numbers.readCulture(e), l = this.formatting.temporal.readCulture(e);
		for (let e of t) {
			let t = e.getAttribute(lt) ?? "", u = e.getAttribute(ut) ?? t, d = e.getAttribute(dt) ?? "", f = i ? a?.[u] ?? null : s === null ? d === "count" ? n.querySelectorAll(ct).length : vt(d, _t(n, t)) : d === "count" ? s.length : vt(d, gt(s, u, this.rows)), p = f === null ? "" : o(f, r(e), c, l, this.formatting);
			e.textContent !== p && (e.textContent = p);
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
function ht(e) {
	let t = e.getAttribute(pt);
	if (t === null || t.length === 0) return null;
	try {
		return JSON.parse(t);
	} catch {
		return null;
	}
}
function gt(e, t, n) {
	let r = [];
	for (let i of e) {
		let e = s(n.readPath(i, t));
		e !== null && r.push(e);
	}
	return r;
}
function _t(e, n) {
	let r = [];
	for (let i of e.querySelectorAll(ct)) {
		let e = i.querySelector(`:scope > [${lt}="${CSS.escape(n)}"] [${t}]`), a = e === null ? NaN : Number(e.getAttribute(t));
		Number.isFinite(a) && r.push(a);
	}
	return r;
}
function vt(e, t) {
	if (e === "count") return t.length;
	if (t.length === 0) return null;
	switch (e) {
		case "sum": return t.reduce((e, t) => e + t, 0);
		case "average": return t.reduce((e, t) => e + t, 0) / t.length;
		case "min": return yt(t, -1);
		case "max": return yt(t, 1);
		default: return null;
	}
}
function yt(e, t) {
	let n = e[0];
	for (let r = 1; r < e.length; r++) (e[r] - n) * t > 0 && (n = e[r]);
	return n;
}
//#endregion
//#region src/data-grid-engine.ts
var bt = class {
	formatting;
	constructor(e) {
		this.formatting = {
			numbers: e.numbers,
			temporal: e.temporal,
			strings: e.strings
		}, new ot(e), new Ce(e), new ke(e), new Ke(e), new mt(e, this.formatting), new te(e), new ue(e), new Qe(e);
	}
	applyCellValue(e, t) {
		a(e, t, this.formatting);
	}
}, xt = 1;
function St() {
	let e = window.NEStandardUI;
	if (e === void 0 || typeof e.registerEngine != "function") throw Error("NE.Standard.UI.Web.DataGrid needs the framework's client (ui.js) on the page before it.");
	if (e.contractVersion !== xt) throw Error(`NE.Standard.UI.Web.DataGrid was built for plugin contract ${xt}, but the framework's client on the page implements ${String(e.contractVersion ?? "an older one")}; install the package version that matches the framework.`);
	return e;
}
//#endregion
//#region src/data-grid.ts
var $ = St(), Ct;
$.registerEvent(De, { settlesValue: !0 }), $.registerEvent(Se, { settlesValue: !0 }), $.registerEvent(Z, { settlesValue: !0 }), $.registerEngine((e) => {
	Ct = new bt(e);
}), $.registerDomOperation({
	kind: e,
	handler: (e) => Ct?.applyCellValue(e.target, e.value)
});
//#endregion
