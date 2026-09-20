//#region src/data-grid-cell.ts
var e = "data-grid-cell", t = "data-ui-grid-raw";
function n(e) {
	return {
		kind: e.getAttribute("data-ui-grid-kind") ?? "text",
		format: e.getAttribute("data-ui-grid-format"),
		currency: e.getAttribute("data-ui-grid-currency"),
		choices: r(e.getAttribute("data-ui-grid-choices"))
	};
}
function r(e) {
	if (e === null || e.length === 0) return null;
	try {
		return JSON.parse(e);
	} catch {
		return null;
	}
}
function i(e, r, i) {
	let o = n(e), s = a(r, o, i.numbers.readCulture(e), i.temporal.readCulture(e), i);
	e.textContent !== s && (e.textContent = s), (o.kind === "number" || o.kind === "money") && typeof r == "number" ? e.setAttribute(t, String(r)) : e.hasAttribute("data-ui-grid-raw") && e.removeAttribute(t);
}
function a(e, t, n, r, i) {
	if (e == null) return "";
	switch (t.kind) {
		case "number":
		case "money": {
			let r = o(e);
			if (r === null) return String(e);
			let a = t.kind === "money" && t.currency !== null ? {
				...n,
				currencySymbol: t.currency
			} : n;
			return i.numbers.format(r, t.format, a);
		}
		case "date": {
			let n = s(e, i.temporal);
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
function o(e) {
	if (typeof e == "number") return Number.isFinite(e) ? e : null;
	if (typeof e == "string" && e.trim().length > 0) {
		let t = Number(e);
		return Number.isFinite(t) ? t : null;
	}
	return null;
}
function s(e, t) {
	if (e instanceof Date) return e;
	if (typeof e != "string") return null;
	let n = t.parse(e);
	return n === null ? null : t.toDate(n);
}
//#endregion
//#region src/data-grid-dom.ts
var c = ".ui-data-grid", l = ".ui-table__row", u = ":scope > .ui-table__scroll > [data-ui-items-host]";
function d(e, t) {
	let n = [];
	for (let r of e.querySelectorAll(t)) r.closest(".ui-data-grid") === e && n.push(r);
	return n;
}
function f(e) {
	return e instanceof Element ? e.closest(c) : null;
}
function p(e) {
	let t = Number(e.getAttribute("data-ui-id"));
	return Number.isInteger(t) ? t : null;
}
function m(e, t, n) {
	n === null ? e.removeAttribute(t) : e.getAttribute(t) !== n && e.setAttribute(t, n);
}
function h(e, t) {
	let n = e.getAttribute(t);
	if (n === null || n.length === 0) return null;
	let r = Number(n);
	return Number.isFinite(r) ? r : null;
}
//#endregion
//#region src/data-grid-chooser-engine.ts
var g = ".ui-data-grid__columns-panel .ui-menu-item[data-ui-menu-item-kind=\"check\"]", _ = "data-ui-key", v = "ui-menu-item--checked", ee = class {
	tables;
	constructor(e) {
		this.tables = e.tables, e.root.addEventListener("click", (e) => {
			let t = e.target instanceof Element ? e.target.closest(g) : null, n = f(t);
			t !== null && n !== null && (e.preventDefault(), this.tables.setColumnHidden(n, y(t), t.classList.contains(v)), this.syncEntries(n));
		}), this.syncAll(e.root.querySelectorAll(c)), e.observeComponents(e.root, c, {
			childList: !0,
			attributeFilter: ["data-ui-table-hidden", "style"]
		}, (e) => this.syncAll(e));
	}
	syncAll(e) {
		for (let t of e) this.syncEntries(t), this.syncOrder(t);
	}
	syncOrder(e) {
		let t = [...e.querySelectorAll(g)], n = /* @__PURE__ */ new Map();
		for (let e of t) n.set(y(e), e.closest(`[${_}]`) ?? e);
		let r = this.tables.columnOrder(e).filter((e) => n.has(e)), i = n.get(r[0])?.parentElement ?? null;
		if (!(i === null || r.length < 2 || r.every((e, t) => n.get(e) === i.children[t]))) for (let e of r) i.appendChild(n.get(e));
	}
	syncEntries(e) {
		for (let t of e.querySelectorAll(g)) {
			let n = !this.tables.isColumnHidden(e, y(t));
			t.classList.toggle(v, n), t.setAttribute("aria-checked", String(n));
		}
	}
};
function y(e) {
	return e.closest(`[${_}]`)?.getAttribute(_) ?? "";
}
//#endregion
//#region src/data-grid-detail-engine.ts
var te = ".ui-data-grid__cell--detail", b = "ui-data-grid__detail", ne = "detail", x = "data-ui-grid-expanded", re = "data-ui-grid-expand-click", ie = "data-ui-grid-multiple-details", ae = "data-ui-no-row-open", oe = class {
	rows;
	constructor(e) {
		this.rows = e.rows, e.root.addEventListener("click", (e) => {
			if (!(e.target instanceof Element)) return;
			let t = f(e.target), n = e.target.closest(l);
			t !== null && n !== null && t.contains(n) && (e.target.closest(te) !== null || t.hasAttribute(re) && e.target.closest(`[${ae}]`) === null) && (e.preventDefault(), this.toggleDetail(t, n));
		});
	}
	toggleDetail(e, t) {
		if (t.hasAttribute(x)) {
			S(t);
			return;
		}
		if (!e.hasAttribute(ie)) for (let t of e.querySelectorAll(`${l}[${x}]`)) S(t);
		let n = p(e), r = n === null ? null : this.rows.renderVariant(t, n, ne);
		if (r === null) return;
		let i = document.createElement("div");
		i.className = b, i.appendChild(r), t.appendChild(i), t.setAttribute(x, "");
	}
};
function S(e) {
	e.removeAttribute(x), e.querySelector(`:scope > .${b}`)?.remove();
}
//#endregion
//#region src/data-grid-edit-engine.ts
var C = ".ui-data-grid__cell--editable", se = "ui-data-grid__cell--editable", ce = "ui-data-grid__editor", le = "ui-data-grid__editor--open", w = "ui-data-grid__cell--editing", T = "data-ui-grid-editor", ue = "data-ui-grid-readonly", E = "data-ui-grid-kind", de = "data-ui-row-focus", D = "data-ui-key", O = "data-ui-grid-column", fe = "data-ui-bind-value", k = "input, textarea, select, button, [tabindex]", pe = ".ui-select__trigger", me = "[role='listbox'], [role='menu'], [role='dialog']", A = "cell-edit", he = class {
	rows;
	values;
	open = /* @__PURE__ */ new WeakMap();
	constructor(e) {
		let t = e.root;
		this.rows = e.rows, this.values = e.values, t.addEventListener("dblclick", (e) => {
			let t = e.target instanceof Element ? e.target.closest(C) : null;
			t !== null && t.closest(".ui-data-grid") !== null && (e.preventDefault(), this.openEditor(t));
		}, !0), t.addEventListener("change", (e) => {
			let t = f(e.target), n = t === null ? void 0 : this.open.get(t);
			n !== void 0 && e.target instanceof Node && n.editor.contains(e.target) && (n.changed = !0);
		}, !0), t.addEventListener("keydown", (e) => this.handleKeyDown(e), !0), e.observeComponents(t, c, { childList: !0 }, (e) => {
			for (let t of e) this.followRow(t);
		}), t.addEventListener("mousedown", (e) => {
			let t = f(e.target), n = t === null ? void 0 : this.open.get(t);
			if (n === void 0 || !(e.target instanceof Element) || !n.editor.contains(e.target)) return;
			let r = e.target.closest(k);
			(r === null || !n.editor.contains(r)) && e.preventDefault();
		}, !0), t.addEventListener("focusout", (e) => {
			if (!(e instanceof FocusEvent) || !(e.target instanceof Element)) return;
			let t = f(e.target), n = t === null ? void 0 : this.open.get(t);
			if (t === null || n === void 0 || !n.editor.contains(e.target)) return;
			let r = e.relatedTarget;
			r instanceof Node && n.editor.contains(r) || window.setTimeout(() => this.closeEditor(t, n, !0), 0);
		}, !0);
	}
	openEditor(e) {
		let t = f(e), n = e.closest(l);
		if (t === null || n === null || t.hasAttribute(ue)) return;
		let r = this.open.get(t);
		if (r !== void 0) {
			if (r.cell === e) return;
			this.closeEditor(t, r, !0);
		}
		let i = this.createEditor(t, n, e);
		if (i === null) return;
		let a = i.querySelector(`[${fe}]`);
		this.open.set(t, {
			editor: i,
			cell: e,
			field: a,
			original: this.fieldValue(a),
			changed: !1
		}), a !== null && this.values.hold(a), i.style.minHeight = `${e.getBoundingClientRect().height}px`, e.classList.add(w), i.classList.add(le), e.after(i);
		let o = i.querySelector(k);
		o?.focus({ preventScroll: !0 }), o instanceof HTMLInputElement && _e(o) && o.select();
		let s = i.querySelector(pe);
		s !== null && s.getAttribute("aria-expanded") !== "true" && s.click();
	}
	createEditor(e, t, n) {
		let r = n.getAttribute(T), i = p(e);
		if (r === null || i === null) return null;
		let a = this.rows.renderVariant(t, i, r);
		if (a === null) return null;
		let o = document.createElement("div");
		for (let e of n.attributes) o.setAttribute(e.name, e.value);
		o.classList.remove(se, w), o.classList.add(ce), o.removeAttribute(T), o.appendChild(a);
		let s = n.querySelector(`[${E}]`)?.getAttribute(E);
		return s != null && o.setAttribute(E, s), o;
	}
	fieldValue(e) {
		return e === null ? null : this.values.read(e);
	}
	closeEditor(e, t, n) {
		if (this.open.get(e) !== t) return;
		this.open.delete(e), n ? (t.field !== null && !t.changed && this.fieldValue(t.field) !== t.original && t.field.dispatchEvent(new Event("change", { bubbles: !0 })), (t.changed || this.fieldValue(t.field) !== t.original) && (t.field ?? t.editor).dispatchEvent(new Event(A, { bubbles: !0 }))) : t.field !== null && (ve(t.field, t.original), t.changed && t.field.dispatchEvent(new Event("change", { bubbles: !0 })), this.values.release(t.field));
		let r = t.editor.contains(document.activeElement);
		t.cell.classList.remove(w), t.editor.remove(), r && e.focus({ preventScroll: !0 });
	}
	followRow(e) {
		let t = this.open.get(e);
		if (t === void 0 || t.cell.isConnected) return;
		let n = {
			key: t.cell.closest(".ui-table__row")?.getAttribute(D) ?? "",
			column: t.cell.getAttribute(O) ?? "",
			draft: this.fieldValue(t.field),
			changed: t.changed
		};
		this.open.delete(e);
		let r = (n.key.length === 0 ? null : e.querySelector(`.ui-table__row[${D}="${CSS.escape(n.key)}"]`))?.querySelector(`:scope > ${C}[${O}="${CSS.escape(n.column)}"]`) ?? null;
		if (r === null) return;
		this.openEditor(r);
		let i = this.open.get(e);
		i !== void 0 && i.field !== null && n.draft !== i.original && (ve(i.field, n.draft), i.changed = n.changed);
	}
	handleKeyDown(e) {
		if (!(e instanceof KeyboardEvent) || e.defaultPrevented || e.isComposing || !(e.target instanceof Element)) return;
		let t = f(e.target);
		if (t === null) return;
		let n = this.open.get(t);
		if (n === void 0) {
			if (e.key !== "F2") return;
			let n = t.querySelector(`[${de}]`)?.querySelector(`:scope > ${C}`) ?? null;
			n !== null && (e.preventDefault(), this.openEditor(n));
			return;
		}
		if (!n.editor.contains(e.target)) return;
		let r = e.target.closest(me), i = n.editor.querySelector("[role='listbox']");
		if (!(r !== null && n.editor.contains(r) || i !== null && i.getClientRects().length > 0)) switch (e.key) {
			case "Enter":
				e.preventDefault(), this.commitEditor(t, n);
				break;
			case "Escape":
				e.preventDefault(), this.closeEditor(t, n, !1);
				break;
			case "Tab": {
				let r = ge(n.cell, e.shiftKey ? -1 : 1);
				if (r === null) return;
				e.preventDefault(), this.commitEditor(t, n), this.openEditor(r);
				break;
			}
			default: return;
		}
	}
	commitEditor(e, t) {
		let n = document.activeElement instanceof HTMLElement && t.editor.contains(document.activeElement);
		n && document.activeElement.blur(), this.closeEditor(e, t, !0), n && e.focus({ preventScroll: !0 });
	}
};
function ge(e, t) {
	let n = e.closest(l), r = n === null ? [] : [...n.querySelectorAll(`:scope > ${C}`)], i = r.indexOf(e);
	return i < 0 ? null : r[i + t] ?? null;
}
function _e(e) {
	return e.type === "text" || e.type === "number" || e.type === "search" || e.type === "email" || e.type === "url" || e.type === "tel" || e.type === "password";
}
function ve(e, t) {
	if (e instanceof HTMLInputElement && (e.type === "checkbox" || e.type === "radio")) {
		e.checked = t === !0;
		return;
	}
	(e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement) && (e.value = t == null || typeof t == "boolean" ? "" : String(t));
}
//#endregion
//#region src/data-grid-query.ts
var j = "data-ui-items-query", ye = ":scope > [data-ui-value-kind=\"items-query\"]", M = "query-change";
function N(e) {
	return e.querySelector(ye);
}
function P(e) {
	let t = N(e)?.getAttribute(j) ?? null;
	if (t === null || t.length === 0) return {};
	try {
		return JSON.parse(t);
	} catch {
		return {};
	}
}
function F(e, t) {
	let n = N(e);
	if (n === null) return;
	let r = t.filters ?? [], i = t.sorts ?? [];
	r.length === 0 && i.length === 0 ? n.removeAttribute(j) : n.setAttribute(j, JSON.stringify({
		filters: r,
		sorts: i
	})), n.dispatchEvent(new Event("change", { bubbles: !0 })), n.dispatchEvent(new Event(M, { bubbles: !0 }));
}
//#endregion
//#region src/data-grid-filter-engine.ts
var I = "[data-ui-grid-filter]", be = ".ui-data-grid__filter-panel", xe = ".ui-data-grid__filters-count", Se = ".ui-data-grid__filter-part", Ce = "data-ui-grid-filter", we = "data-ui-grid-filter-kind", Te = "data-ui-grid-filter-bound", Ee = class {
	values;
	badges;
	constructor(e) {
		this.values = e.values, this.badges = e.badges, e.root.addEventListener("change", (e) => {
			let t = e.target instanceof Element ? e.target.closest(I) : null, n = f(t);
			t !== null && n !== null && (F(n, {
				...P(n),
				filters: this.readFilterTerms(n)
			}), this.syncFiltersCount(n));
		}, !0);
	}
	readFilterTerms(e) {
		let t = [];
		for (let n of d(e, I)) t.push(...this.readFilterTermsOf(n));
		return t;
	}
	readFilterTermsOf(e) {
		let t = e.getAttribute(Ce) ?? "", n = e.getAttribute(we) ?? "text", r = [];
		for (let i of e.querySelectorAll(`:scope > ${Se}`)) {
			let e = this.partValue(i), a = e === null ? null : De(t, n, i.getAttribute(Te), e);
			a !== null && r.push(a);
		}
		return r;
	}
	partValue(e) {
		let t = this.values.read(e), n = t == null || typeof t == "boolean" ? "" : String(t).trim();
		return n.length === 0 ? null : n;
	}
	syncFiltersCount(e) {
		let t = e.querySelector(xe);
		if (t === null) return;
		let n = 0;
		for (let t of d(e, I)) t.closest(be) !== null && this.readFilterTermsOf(t).length > 0 && n++;
		this.badges.writeCount(t, n), t.hidden = n === 0;
	}
};
function De(e, t, n, r) {
	let i = n === "to" ? "LessOrEqual" : "GreaterOrEqual";
	switch (t) {
		case "number":
		case "money": {
			let t = Oe(r);
			return t === null ? null : {
				itemProperty: e,
				operator: i,
				value: t
			};
		}
		case "date": return {
			itemProperty: e,
			operator: i,
			value: n === "to" ? `${r}T23:59:59` : r
		};
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
function Oe(e) {
	let t = e.replace(/[,\s]/g, ""), n = Number(t);
	return t.length === 0 || !Number.isFinite(n) ? null : n;
}
//#endregion
//#region src/data-grid-pager-engine.ts
var L = "data-ui-grid-paging", ke = ":scope > .ui-data-grid__pager", Ae = ".ui-data-grid__page-status", R = "data-ui-grid-page", z = "data-ui-window-offset", B = "data-ui-window-total", je = "data-ui-window-size", V = "data-ui-window-more-after", Me = "ui.grid.page-of", Ne = "ui.grid.page-range", Pe = 50, Fe = class {
	strings;
	numbers;
	constructor(e) {
		let t = e.root;
		this.strings = e.strings, this.numbers = e.numbers, this.syncAll(t.querySelectorAll(c)), e.observeComponents(t, c, {
			childList: !0,
			attributeFilter: [
				L,
				z,
				B,
				V
			]
		}, (e) => this.syncAll(e)), t.addEventListener("click", (t) => {
			let n = t.target instanceof Element ? t.target.closest(`[${R}]`) : null, r = f(n)?.querySelector(":scope > .ui-table__scroll > [data-ui-items-host]") ?? null;
			if (n === null || r === null || n.disabled) return;
			let i = U(H(r), n.getAttribute(R) ?? "");
			i !== null && (t.preventDefault(), e.windows.requestOffsetAsync(r, i));
		}, !0);
	}
	syncAll(e) {
		for (let t of e) this.syncPager(t);
	}
	syncPager(e) {
		let t = e.querySelector(u), n = e.querySelector(ke);
		if (t === null || n === null || !e.hasAttribute(L)) return;
		let r = H(t), i = n.querySelector(Ae);
		if (i !== null) {
			let t = r.count === 0 ? 0 : r.offset + 1, n = r.offset + r.count, a = this.numbers.readCulture(e), o = (e) => this.numbers.format(e, "N0", a), s = r.total === null ? this.strings.format(Ne, {
				from: o(t),
				to: o(n)
			}) : this.strings.format(Me, {
				from: o(t),
				to: o(n),
				total: o(r.total)
			});
			i.textContent !== s && (i.textContent = s);
		}
		for (let e of n.querySelectorAll(`[${R}]`)) e.disabled = U(r, e.getAttribute(R) ?? "") === null;
	}
};
function H(e) {
	let t = e.querySelectorAll(`:scope > ${l}`).length, n = h(e, je) ?? 0;
	return {
		offset: h(e, z) ?? 0,
		count: t,
		size: n > 0 ? n : t > 0 ? t : Pe,
		total: h(e, B),
		moreAfter: e.getAttribute(V) === "true"
	};
}
function U(e, t) {
	switch (t) {
		case "first": return e.offset > 0 ? 0 : null;
		case "previous": return e.offset > 0 ? Math.max(0, e.offset - e.size) : null;
		case "next": return e.moreAfter ? e.offset + e.count : null;
		case "last": return e.total === null ? e.moreAfter ? e.offset + e.count : null : e.offset + e.count < e.total ? Math.max(0, e.total - e.size) : null;
		default: return null;
	}
}
//#endregion
//#region src/data-grid-selection-engine.ts
var W = "[data-ui-grid-select]", G = "[data-ui-grid-select-all]", K = "input[type='checkbox']", Ie = "data-ui-selected", q = `[data-ui-items-host] > ${l}`, J = "selection-change", Le = class {
	selection;
	constructor(e) {
		this.selection = e.selection, e.root.addEventListener("change", (e) => {
			let t = e.target instanceof Element ? e.target.closest(K) : null, n = f(t);
			if (t === null || n === null) return;
			if (t.closest(G) !== null) {
				this.selection.setSelected(n, d(n, q), t.checked), this.syncBoxes(n), n.dispatchEvent(new Event(J, { bubbles: !0 }));
				return;
			}
			let r = t.closest(W) === null ? null : t.closest(l);
			r !== null && (this.selection.toggle(r), this.syncBoxes(n), n.dispatchEvent(new Event(J, { bubbles: !0 })));
		}, !0), this.syncAll(e.root.querySelectorAll(c)), e.observeComponents(e.root, c, {
			childList: !0,
			attributeFilter: [Ie]
		}, (e) => this.syncAll(e));
	}
	syncAll(e) {
		for (let t of e) this.syncBoxes(t);
	}
	syncBoxes(e) {
		let t = d(e, q), n = 0;
		for (let e of t) {
			let t = this.selection.isSelected(e), r = e.querySelector(`${W} ${K}`);
			t && n++, r !== null && r.checked !== t && (r.checked = t);
		}
		let r = e.querySelector(`${G} ${K}`);
		r !== null && (r.checked = n > 0 && n === t.length, r.indeterminate = n > 0 && n < t.length);
	}
};
//#endregion
//#region src/data-grid-sort.ts
function Re(e, t, n) {
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
function ze(e, t) {
	let n = e.findIndex((e) => e.itemProperty === t);
	return n < 0 ? null : {
		direction: e[n].direction,
		place: n + 1
	};
}
//#endregion
//#region src/data-grid-sort-engine.ts
var Y = "data-ui-grid-sort", Be = "data-ui-grid-sorted", Ve = "data-ui-grid-sort-place", He = ".ui-data-grid__sort-mark", Ue = ":scope > .ui-table__scroll > .ui-table__header > [data-ui-grid-sort]", We = ".ui-table__resizer", Ge = "data-ui-items-query", Ke = class {
	constructor(e) {
		let t = e.root;
		this.syncAll(t.querySelectorAll(c)), e.observeComponents(t, c, {
			childList: !0,
			attributeFilter: [Ge]
		}, (e) => this.syncAll(e)), t.addEventListener("click", (e) => this.handleHeaderPress(e, e instanceof MouseEvent && e.shiftKey), !0), t.addEventListener("keydown", (e) => {
			e instanceof KeyboardEvent && (e.key === "Enter" || e.key === " ") && e.target instanceof Element && e.target.hasAttribute(Y) && this.handleHeaderPress(e, e.shiftKey);
		}, !0);
	}
	syncAll(e) {
		for (let t of e) this.syncSortMarks(t);
	}
	syncSortMarks(e) {
		let t = P(e).sorts ?? [];
		for (let n of e.querySelectorAll(Ue)) {
			let e = ze(t, n.getAttribute(Y) ?? ""), r = n.querySelector(He);
			m(n, "aria-sort", e === null ? "none" : e.direction === "Ascending" ? "ascending" : "descending"), m(n, Be, e === null ? null : e.direction === "Ascending" ? "asc" : "desc"), r !== null && m(r, Ve, e !== null && t.length > 1 ? String(e.place) : null);
		}
	}
	handleHeaderPress(e, t) {
		if (e.defaultPrevented || !(e.target instanceof Element) || e.target.closest(We) !== null) return;
		let n = e.target.closest(`[${Y}]`), r = f(n), i = n?.getAttribute(Y) ?? null;
		if (n === null || r === null || i === null || i.length === 0) return;
		e.preventDefault();
		let a = P(r);
		F(r, {
			...a,
			sorts: Re(a.sorts ?? [], i, t)
		});
	}
}, qe = ":scope > .ui-table__scroll > .ui-data-grid__footer > .ui-data-grid__total[data-ui-grid-aggregate]", X = ":scope > .ui-table__row:not(.ui-hidden)", Z = "data-ui-grid-column", Je = "data-ui-grid-property", Ye = "data-ui-grid-aggregate", Xe = "data-ui-host-mode", Q = "data-ui-window-aggregates", Ze = class {
	formatting;
	rows;
	constructor(e, n) {
		this.formatting = n, this.rows = e.rows, this.syncAll(e.root.querySelectorAll(c)), e.observeComponents(e.root, c, {
			childList: !0,
			attributeFilter: [
				"class",
				t,
				Q
			]
		}, (e) => this.syncAll(e));
	}
	syncAll(e) {
		for (let t of e) this.syncTotals(t);
	}
	syncTotals(e) {
		let t = e.querySelectorAll(qe);
		if (t.length === 0) return;
		let r = e.querySelector(u);
		if (r === null) return;
		let i = r.getAttribute(Xe) === "windowed" ? Qe(r) : null, o = i === null ? this.rows.itemsOf(r) : null, s = this.formatting.numbers.readCulture(e), c = this.formatting.temporal.readCulture(e);
		for (let e of t) {
			let t = e.getAttribute(Z) ?? "", l = e.getAttribute(Je) ?? t, u = e.getAttribute(Ye) ?? "", d = i === null ? o === null ? u === "count" ? r.querySelectorAll(X).length : tt(u, et(r, t)) : u === "count" ? o.length : tt(u, $e(o, l, this.rows)) : i[l] ?? null, f = d === null ? "" : a(d, n(e), s, c, this.formatting);
			e.textContent !== f && (e.textContent = f);
		}
	}
};
function Qe(e) {
	let t = e.getAttribute(Q);
	if (t === null || t.length === 0) return null;
	try {
		return JSON.parse(t);
	} catch {
		return null;
	}
}
function $e(e, t, n) {
	let r = [];
	for (let i of e) {
		let e = n.readPath(i, t), a = typeof e == "number" ? e : e instanceof Date ? e.getTime() : Number(e);
		e != null && e !== "" && Number.isFinite(a) && r.push(a);
	}
	return r;
}
function et(e, n) {
	let r = [];
	for (let i of e.querySelectorAll(X)) {
		let e = i.querySelector(`:scope > [${Z}="${n}"] [${t}]`), a = e === null ? NaN : Number(e.getAttribute(t));
		Number.isFinite(a) && r.push(a);
	}
	return r;
}
function tt(e, t) {
	if (e === "count") return t.length;
	if (t.length === 0) return null;
	switch (e) {
		case "sum": return t.reduce((e, t) => e + t, 0);
		case "average": return t.reduce((e, t) => e + t, 0) / t.length;
		case "min": return Math.min(...t);
		case "max": return Math.max(...t);
		default: return null;
	}
}
//#endregion
//#region src/data-grid-engine.ts
var nt = class {
	formatting;
	constructor(e) {
		this.formatting = {
			numbers: e.numbers,
			temporal: e.temporal,
			strings: e.strings
		}, new Ke(e), new he(e), new Ee(e), new Fe(e), new Ze(e, this.formatting), new ee(e), new oe(e), new Le(e);
	}
	applyCellValue(e, t) {
		i(e, t, this.formatting);
	}
};
//#endregion
//#region src/framework-api.ts
function rt() {
	let e = window.NEStandardUI;
	if (e === void 0 || typeof e.registerEngine != "function") throw Error("NE.Standard.UI.Web.DataGrid needs the framework's client (ui.js) on the page before it.");
	return e;
}
//#endregion
//#region src/data-grid.ts
var $ = rt(), it;
$.registerEvent(M, { settlesValue: !0 }), $.registerEvent(A, { settlesValue: !0 }), $.registerEvent(J, { settlesValue: !0 }), $.registerEngine((e) => {
	it = new nt(e);
}), $.registerDomOperation({
	kind: e,
	handler: (e) => it?.applyCellValue(e.target, e.value)
});
//#endregion
