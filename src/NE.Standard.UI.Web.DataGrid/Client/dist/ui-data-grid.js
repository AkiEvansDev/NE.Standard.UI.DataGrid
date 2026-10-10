//#region src/data-grid-names.ts
var e = {
	sort: "data-ui-grid-sort",
	column: "data-ui-grid-column",
	editor: "data-ui-grid-editor",
	readOnly: "data-ui-grid-readonly",
	expandOnClick: "data-ui-grid-expand-click",
	multipleDetails: "data-ui-grid-multiple-details",
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
	raw: "data-ui-grid-raw",
	moment: "data-ui-grid-moment",
	rules: "data-ui-grid-rules"
}, t = {
	root: "ui-data-grid",
	footer: "ui-data-grid__footer",
	total: "ui-data-grid__total",
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
	twoLine: "data-ui-grid-two-line",
	boxOff: "data-ui-grid-box-off",
	sortPlace: "data-ui-grid-sort-place",
	expanded: "data-ui-grid-expanded",
	editorClass: "ui-data-grid__editor",
	editingCellClass: "ui-data-grid__cell--editing",
	detailClass: "ui-data-grid__detail",
	verdictClass: "ui-data-grid__verdict"
}, r = {
	queryChange: "query-change",
	cellEdit: "cell-edit",
	selectionChange: "selection-change"
}, i = {
	yes: "ui.grid.yes",
	no: "ui.grid.no"
}, a = "data-grid-cell", o = `.${t.root}`;
function s(e) {
	return `.${e.tableRowClass}`;
}
function c(e) {
	return `:scope > .${e.tableScrollClass} > [${e.itemsHost}]`;
}
function l(e, t) {
	let n = [];
	for (let r of e.querySelectorAll(t)) r.closest(o) === e && n.push(r);
	return n;
}
function u(e, t, n = e) {
	for (let r of n.querySelectorAll(t)) if (r.closest(o) === e) return r;
	return null;
}
function d(e) {
	return e instanceof Element ? e.closest(o) : null;
}
function f(e, t, n) {
	return t.parentElement !== null && t.parentElement === e.querySelector(c(n));
}
function p(e, t) {
	let n = Number(e.getAttribute(t.componentId));
	return Number.isInteger(n) ? n : null;
}
function m(e, t, n) {
	n === null ? e.removeAttribute(t) : e.getAttribute(t) !== n && e.setAttribute(t, n);
}
//#endregion
//#region src/data-grid-edit-engine.ts
var h = `.${t.editableCell}`, ee = e.editor, g = e.kind, _ = e.column, v = e.readOnly, te = "input, textarea, select, button, [tabindex]", ne = class {
	answers = /* @__PURE__ */ new WeakMap();
	settles = /* @__PURE__ */ new WeakMap();
	start(e) {
		this.answers.set(e, new Promise((t) => this.settles.set(e, t)));
	}
	finish(e) {
		this.settles.get(e)?.(), this.settles.delete(e);
	}
	answerTo(e) {
		return this.answers.get(e) ?? null;
	}
}, re = class {
	rows;
	values;
	states;
	names;
	focus;
	validation;
	shortcuts;
	rowSelector;
	answers;
	open = /* @__PURE__ */ new Map();
	settling = /* @__PURE__ */ new Map();
	unclaimed = /* @__PURE__ */ new WeakSet();
	leaving = null;
	restoring = !1;
	constructor(e, t) {
		let n = e.root;
		this.answers = t, this.rows = e.rows, this.values = e.values, this.states = e.states, this.names = e.names, this.focus = e.focus, this.validation = e.validation, this.shortcuts = e.shortcuts, this.rowSelector = s(e.names);
		for (let e of n.querySelectorAll(o)) this.syncClaims(e);
		for (let e of n.querySelectorAll(h)) this.markTwoLine(e);
		e.observeComponents(n, h, {
			childList: !0,
			attributeFilter: [this.names.textDescription]
		}, (e) => {
			for (let t of e) this.markTwoLine(t);
		}), n.addEventListener("dblclick", (e) => {
			let t = e.target instanceof Element ? e.target.closest(h) : null;
			t !== null && t.closest(o) !== null && (e.preventDefault(), this.openEditor(t));
		}, !0), n.addEventListener("change", (e) => {
			let t = d(e.target), n = t === null ? void 0 : this.open.get(t);
			t !== null && n !== void 0 && e.target instanceof Node && n.editor.contains(e.target) && (n.changed = !0, e.target === n.field && window.setTimeout(() => this.followChoice(t, n), 0));
		}, !0), window.addEventListener("change", (e) => this.holdWindowChange(e), !0), n.addEventListener("keydown", (e) => this.handleKeyDown(e), !0), n.addEventListener(this.names.cellKey, (e) => this.handleCellKey(e)), e.observeComponents(n, o, { childList: !0 }, (e) => {
			for (let t of e) this.followRow(t), this.syncClaims(t);
		}), e.observeComponents(n, o, {
			attributeFilter: [
				v,
				"class",
				"inert"
			],
			relevant: (e) => e.target instanceof Element && (e.target.matches(o) || this.editsUnder(e.target))
		}, (e) => {
			for (let t of e) this.followState(t);
			for (let [e, t] of [...this.open]) this.canEdit(e) || this.closeEditor(e, t, !1);
		}), n.addEventListener("mousedown", (e) => {
			let t = d(e.target), n = t === null ? void 0 : this.open.get(t);
			if (n === void 0 || !(e.target instanceof Element) || !n.editor.contains(e.target)) return;
			let r = e.target.closest(te);
			(r === null || !n.editor.contains(r)) && e.preventDefault();
		}, !0), n.addEventListener("focusout", (e) => {
			if (!(e instanceof FocusEvent) || !(e.target instanceof Element)) return;
			let t = d(e.target), n = t === null ? void 0 : this.open.get(t);
			if (t === null || n === void 0 || !n.editor.contains(e.target)) return;
			let r = e.relatedTarget;
			if (r instanceof Node && n.editor.contains(r)) return;
			let i = r === null && e.target.isConnected && !ae(e.target);
			window.setTimeout(() => this.followFocusOut(t, n, i), 0);
		}, !0);
	}
	markTwoLine(e) {
		let t = e.querySelector(`[${this.names.textDescription}]`) !== null;
		e.hasAttribute(n.twoLine) !== t && e.toggleAttribute(n.twoLine, t);
	}
	followChoice(e, t) {
		let n = t.editor.querySelector(this.names.listTriggerSelector);
		this.open.get(e) === t && n !== null && n.getAttribute("aria-expanded") !== "true" && this.closeEditor(e, t, !0);
	}
	syncClaims(e) {
		let t = !e.hasAttribute(v);
		if (!t || this.unclaimed.has(e)) {
			for (let n of l(e, h)) n.toggleAttribute(this.names.noRowOpen, t);
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
		return !e.hasAttribute(v) && !this.states.isInert(e);
	}
	followFocusOut(e, t, n) {
		let r = document.activeElement;
		if (this.open.get(e) !== t || t.editor.contains(r)) return;
		let i = n && (r === null || r === document.body);
		if (!(i && this.canEdit(e) && (this.focus.first(t.editor)?.focus({ preventScroll: !0 }), t.editor.contains(document.activeElement)))) {
			if (!this.closeEditor(e, t, this.canEdit(e))) {
				if (t.editor.contains(document.activeElement)) return;
				this.closeEditor(e, t, !1);
			}
			i && this.focus.giveBack(t.cell);
		}
	}
	holdWindowChange(e) {
		let t = e.target;
		if (e.isTrusted && this.leaving !== null && t instanceof Node && this.leaving.contains(t)) {
			e.stopPropagation();
			return;
		}
		if (!this.restoring && t instanceof Element && this.refusedHere(t)) {
			e.stopPropagation();
			return;
		}
		if (!e.isTrusted || document.hasFocus() || !(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) || t !== document.activeElement) return;
		let n = d(t), r = n === null ? void 0 : this.open.get(n);
		r !== void 0 && r.editor.contains(t) && e.stopPropagation();
	}
	refusedHere(e) {
		let t = d(e), n = t === null ? void 0 : this.open.get(t);
		return n !== void 0 && n.editor.contains(e) && this.validation.refuses(e);
	}
	openEditor(e) {
		let t = d(e), r = e.closest(this.rowSelector);
		if (t === null || r === null || t.hasAttribute(v)) return;
		let i = this.open.get(t);
		if (i !== void 0 && (i.cell === e || !this.closeEditor(t, i, !0))) return;
		let a = this.settling.get(e);
		a !== void 0 && this.finishSettling(a), this.rows.moveCursor(r, e);
		let o = this.createEditor(t, r, e);
		if (o === null) return;
		let s = o.querySelector(`[${this.names.valueHolder}][${this.names.bindValue}]`) ?? o.querySelector(`[${this.names.bindValue}]`), c = {
			editor: o,
			cell: e,
			field: s,
			original: this.fieldValue(s),
			changed: !1
		};
		this.open.set(t, c), s !== null && this.values.hold(s), o.style.minHeight = `${e.getBoundingClientRect().height}px`, e.classList.add(n.editingCellClass), e.after(o);
		let l = this.focus.first(o);
		l?.focus({ preventScroll: !0 }), (l instanceof HTMLInputElement || l instanceof HTMLTextAreaElement) && l.select();
		let u = o.querySelector(this.names.listTriggerSelector);
		u !== null && queueMicrotask(() => {
			this.open.get(t) === c && u.getAttribute("aria-expanded") !== "true" && u.click();
		}), (c.original === null || c.original === "") && window.setTimeout(() => {
			this.open.get(t) === c && !c.changed && (c.original = this.fieldValue(s));
		}, 0);
	}
	createEditor(e, r, i) {
		let a = i.getAttribute(ee), o = p(e, this.names);
		if (a === null || o === null) return null;
		let s = this.rows.renderVariant(r, o, a);
		if (s === null) return null;
		let c = document.createElement("div");
		for (let e of i.attributes) c.setAttribute(e.name, e.value);
		c.classList.remove(t.editableCell, n.editingCellClass), c.classList.add(n.editorClass), c.removeAttribute(ee), c.removeAttribute(n.twoLine), c.removeAttribute("id"), c.removeAttribute(this.names.cellFocus), c.setAttribute(this.names.ownsKeys, ""), c.appendChild(s);
		let l = i.querySelector(`[${g}]`)?.getAttribute(g);
		return l != null && c.setAttribute(g, l), c;
	}
	fieldValue(e) {
		return e === null ? null : this.values.read(e);
	}
	closeEditor(e, t, n) {
		if (this.open.get(e) !== t) return !0;
		if (n && this.refusesEdit(t)) return this.focus.first(t.editor)?.focus({ preventScroll: !0 }), !1;
		this.open.delete(e);
		let i = null;
		if (n) {
			if (t.field !== null && !t.changed && this.fieldValue(t.field) !== t.original && t.field.dispatchEvent(new Event("change", { bubbles: !0 })), t.changed || this.fieldValue(t.field) !== t.original) {
				let e = new Event(r.cellEdit, { bubbles: !0 });
				(t.field ?? t.editor).dispatchEvent(e), i = this.answers.answerTo(e) ?? (t.field === null ? null : this.values.whenSettled(t.field));
			}
		} else if (t.field !== null && t.changed) {
			this.values.write(t.field, t.original), this.restoring = !0;
			try {
				t.field.dispatchEvent(new Event("change", { bubbles: !0 }));
			} finally {
				this.restoring = !1;
			}
		}
		let a = t.editor.contains(document.activeElement);
		return i === null ? this.takeOff(t) : this.settle(t, i), a && this.focus.giveBack(t.cell), !0;
	}
	takeOff(e) {
		e.field !== null && this.values.release(e.field), e.cell.classList.remove(n.editingCellClass), this.leaving = e.editor;
		try {
			e.editor.remove();
		} finally {
			this.leaving = null;
		}
	}
	settle(e, t) {
		e.editor.contains(document.activeElement) && this.blurLeaving(e.editor), e.editor.inert = !0, this.settling.set(e.cell, e);
		let n = () => this.finishSettling(e);
		t.then(n, n);
	}
	blurLeaving(e) {
		this.leaving = e;
		try {
			document.activeElement.blur();
		} finally {
			this.leaving = null;
		}
	}
	finishSettling(e) {
		this.settling.get(e.cell) === e && (this.settling.delete(e.cell), this.takeOff(e));
	}
	refusesEdit(e) {
		return e.field !== null && (e.changed || this.fieldValue(e.field) !== e.original) && this.validation.refuses(e.field);
	}
	followRow(e) {
		let t = this.open.get(e);
		if (t === void 0 || t.cell.isConnected) return;
		let n = {
			key: t.cell.closest(this.rowSelector)?.getAttribute(this.names.key) ?? "",
			column: t.cell.getAttribute(_) ?? "",
			draft: this.fieldValue(t.field),
			changed: t.changed
		};
		this.open.delete(e), t.field !== null && this.values.release(t.field);
		let r = (n.key.length === 0 ? null : u(e, `${this.rowSelector}[${this.names.key}="${CSS.escape(n.key)}"]`))?.querySelector(`:scope > ${h}[${_}="${CSS.escape(n.column)}"]`) ?? null;
		if (r === null) return;
		this.openEditor(r);
		let i = this.open.get(e);
		i !== void 0 && i.field !== null && n.draft !== i.original && (this.values.write(i.field, n.draft), i.changed = n.changed);
	}
	handleKeyDown(e) {
		if (!(e instanceof KeyboardEvent) || e.defaultPrevented || this.shortcuts.isComposing(e) || !(e.target instanceof Element)) return;
		let t = d(e.target);
		if (t === null || this.states.isInert(t)) return;
		let n = this.open.get(t);
		if (n === void 0 || !n.editor.contains(e.target)) return;
		let r = e.target.closest(this.names.popupSelector), i = n.editor.querySelector("[aria-expanded='true']");
		if ((r === null || !n.editor.contains(r)) && i === null || e.key === "Tab" && ie(r, i)) switch (e.key) {
			case "Enter":
				e.preventDefault(), this.commitEditor(t, n);
				break;
			case "Escape":
				e.preventDefault(), this.closeEditor(t, n, !1);
				break;
			case "Tab": {
				let r = this.siblingCell(t, n.cell, e.shiftKey ? -1 : 1);
				if (r === null) return;
				e.preventDefault(), this.commitEditor(t, n) && this.openEditor(r);
				break;
			}
			default: return;
		}
	}
	handleCellKey(e) {
		if (!(e instanceof CustomEvent) || e.defaultPrevented) return;
		let { cell: n, key: r, keyboard: i } = e.detail, a = d(n);
		a !== null && n.classList.contains(t.editableCell) && this.canEdit(a) && (e.preventDefault(), i.preventDefault(), this.openEditor(n), r !== "Enter" && r !== "F2" && queueMicrotask(() => this.typeInto(a, r)));
	}
	typeInto(e, t) {
		let n = document.activeElement;
		(n instanceof HTMLInputElement || n instanceof HTMLTextAreaElement) && this.open.get(e)?.editor.contains(n) === !0 && !n.readOnly && (n.value = t, n.dispatchEvent(new Event("input", { bubbles: !0 })));
	}
	editableCells(e) {
		return this.rows.cellsOf(e).filter((e) => e.classList.contains(t.editableCell));
	}
	siblingCell(e, t, n) {
		let r = t.closest(this.rowSelector), i = r === null ? [] : this.editableCells(r), a = i.indexOf(t);
		if (r === null || a < 0) return null;
		let o = i[a + n];
		if (o !== void 0) return o;
		for (let t = y(r, n); t !== null; t = y(t, n)) {
			if (!t.matches(this.rowSelector) || !f(e, t, this.names) || t.classList.contains(this.names.hiddenClass)) continue;
			let r = this.editableCells(t);
			if (r.length > 0) return n > 0 ? r[0] : r[r.length - 1];
		}
		return null;
	}
	commitEditor(e, t) {
		let n = document.activeElement instanceof HTMLElement && t.editor.contains(document.activeElement);
		return n && document.activeElement.blur(), this.closeEditor(e, t, !0) ? (n && this.focus.giveBack(t.cell), !0) : !1;
	}
};
function y(e, t) {
	let n = t > 0 ? e.nextElementSibling : e.previousElementSibling;
	return n instanceof HTMLElement ? n : null;
}
function ie(e, t) {
	return e === null ? t?.getAttribute("aria-haspopup") === "listbox" : e.getAttribute("role") === "listbox";
}
function ae(e) {
	return e.getClientRects().length > 0 && getComputedStyle(e).visibility === "visible";
}
//#endregion
//#region src/data-grid-cell.ts
function b(t) {
	return {
		kind: t.getAttribute(e.kind) ?? "text",
		format: t.getAttribute(e.format),
		currency: t.getAttribute(e.currency),
		choices: oe(t.getAttribute(e.choices))
	};
}
function oe(e) {
	if (e === null || e.length === 0) return null;
	try {
		return JSON.parse(e);
	} catch {
		return null;
	}
}
function x(t, n, r) {
	let i = b(t), a = C(n, i, r.numbers.readCulture(t), r.temporal.readCulture(t), r);
	t.textContent !== a && (t.textContent = a);
	let o = i.kind === "number" || i.kind === "money" ? w(n, r.numbers) : null;
	o === null ? t.hasAttribute(e.raw) && t.removeAttribute(e.raw) : t.setAttribute(e.raw, String(o));
	let s = i.kind === "date" ? ue(n, r.temporal) : null;
	s === null ? t.hasAttribute(e.moment) && t.removeAttribute(e.moment) : t.setAttribute(e.moment, s);
	let c = le(n, i.kind);
	c === null ? t.hasAttribute(e.choice) && t.removeAttribute(e.choice) : t.setAttribute(e.choice, c);
}
var se = `[${e.choice}], [${e.raw}], [${e.moment}]`;
function ce(t, n) {
	for (let r of t.querySelectorAll(se)) x(r, r.getAttribute(e.choice) ?? r.getAttribute(e.raw) ?? r.getAttribute(e.moment), n);
}
function le(e, t) {
	return e == null ? null : t === "boolean" ? S(e) ? "true" : "false" : t === "enum" ? String(e) : null;
}
function S(e) {
	return e === !0 || typeof e == "string" && e.toLowerCase() === "true";
}
function C(e, t, n, r, a) {
	if (e == null) return "";
	switch (t.kind) {
		case "number":
		case "money": {
			let r = w(e, a.numbers);
			if (r === null) return String(e);
			let i = t.kind === "money" && t.currency !== null ? {
				...n,
				currencySymbol: t.currency
			} : n;
			return a.numbers.format(r, t.format, i);
		}
		case "date": {
			let n = de(e, a.temporal);
			return n === null ? String(e) : a.temporal.format(n, t.format, r);
		}
		case "boolean": {
			let n = S(e), r = t.choices?.[n ? "true" : "false"];
			return r === void 0 ? a.strings.text(n ? i.yes : i.no) : a.strings.resolveText(r);
		}
		case "enum": {
			let n = String(e), r = t.choices?.[n];
			return r === void 0 ? n : a.strings.resolveText(r);
		}
		default: return String(e);
	}
}
function ue(e, t) {
	return typeof e == "string" && t.parse(e) !== null ? e : null;
}
function w(e, t) {
	return typeof e == "number" ? Number.isFinite(e) ? e : null : typeof e == "string" ? t.parseInvariant(e) : null;
}
function de(e, t) {
	if (e instanceof Date) return e;
	if (typeof e != "string") return null;
	let n = t.parse(e);
	return n === null ? null : t.toDate(n);
}
//#endregion
//#region src/data-grid-chooser-engine.ts
var fe = class {
	tables;
	states;
	names;
	entrySelector;
	constructor(e) {
		this.tables = e.tables, this.states = e.states, this.names = e.names, this.entrySelector = `.${t.columnsPanel} .${e.names.menuItemClass}[${e.names.menuItemKind}="check"]`, e.root.addEventListener("click", (e) => {
			let t = e.target instanceof Element ? e.target.closest(this.entrySelector) : null, n = d(t);
			t !== null && n !== null && (e.preventDefault(), !this.states.isInert(t) && (this.tables.setColumnHidden(n, this.keyOf(t), t.classList.contains(this.names.menuItemCheckedClass)), this.syncEntries(n)));
		}), this.syncAll(e.root.querySelectorAll(o)), e.observeComponents(e.root, o, {
			childList: !0,
			attributeFilter: [e.names.tableHidden, "style"]
		}, (e) => this.syncAll(e));
	}
	keyOf(e) {
		return e.closest(`[${this.names.key}]`)?.getAttribute(this.names.key) ?? "";
	}
	syncAll(e) {
		for (let t of e) l(t, this.entrySelector).length !== 0 && (this.syncEntries(t), this.syncOrder(t));
	}
	syncOrder(e) {
		let t = l(e, this.entrySelector), n = /* @__PURE__ */ new Map();
		for (let e of t) n.set(this.keyOf(e), e.closest(`[${this.names.key}]`) ?? e);
		let r = this.tables.columnOrder(e).filter((e) => n.has(e)), i = n.get(r[0])?.parentElement ?? null;
		if (!(i === null || r.length < 2 || r.every((e, t) => n.get(e) === i.children[t]))) for (let e of r) i.appendChild(n.get(e));
	}
	syncEntries(e) {
		let t = l(e, this.entrySelector), n = t.filter((t) => !this.tables.isColumnHidden(e, this.keyOf(t)));
		for (let e of t) {
			let t = n.includes(e), r = t && n.length === 1;
			e.classList.toggle(this.names.menuItemCheckedClass, t), e.setAttribute("aria-checked", String(t)), this.states.setDisabled(e, r);
		}
	}
}, T = `.${t.detailCell}`, E = n.detailClass, pe = "detail", D = n.expanded, O = e.expandOnClick, me = e.multipleDetails, k = `${T} button`, he = "open", ge = class {
	rows;
	names;
	rowSelector;
	enterDown = !1;
	beforeClick = null;
	constructor(e) {
		this.rows = e.rows, this.names = e.names, this.rowSelector = s(e.names), this.markAll(e.root.querySelectorAll(o)), e.observeComponents(e.root, o, { childList: !0 }, (e) => this.markAll(e)), e.root.addEventListener(e.names.cellKey, (e) => {
			!e.defaultPrevented && e instanceof CustomEvent && e.detail.key === "Enter" && (this.enterDown = !0, window.setTimeout(() => {
				this.enterDown = !1;
			}, 0));
		}, !0), e.root.addEventListener(he, (e) => {
			let t = e.target instanceof Element ? e.target.closest(this.rowSelector) : null, n = d(t);
			t !== null && n !== null && n.hasAttribute(O) && f(n, t, this.names) && (this.enterDown ? this.toggleDetail(n, t) : this.beforeClick?.row === t && this.restoreDetails(n, this.beforeClick.open), this.beforeClick = null);
		}), e.root.addEventListener("click", (e) => {
			if (!(e.target instanceof Element)) return;
			let t = d(e.target), n = e.target.closest(this.rowSelector);
			if (t === null || n === null || !f(t, n, this.names)) return;
			let r = !(e instanceof MouseEvent) || e.detail <= 1;
			r && (this.beforeClick = null), e.target.closest(`.${E}`)?.parentElement !== n && (e.target.closest(T) !== null || t.hasAttribute(O) && !this.answersClick(e.target)) && (e.preventDefault(), r && (this.beforeClick = {
				row: n,
				open: this.openDetails(t)
			}), this.toggleDetail(t, n));
		});
	}
	markAll(e) {
		for (let t of e) for (let e of l(t, `${k}:not([aria-expanded])`)) e.setAttribute("aria-expanded", "false");
	}
	toggleDetail(e, t) {
		if (t.hasAttribute(D)) {
			this.closeDetail(t);
			return;
		}
		if (!e.hasAttribute(me)) for (let t of l(e, `${this.rowSelector}[${D}]`)) this.closeDetail(t);
		let n = p(e, this.names), r = n === null ? null : this.rows.renderVariant(t, n, pe);
		if (r === null) return;
		let i = document.createElement("div");
		i.className = E, i.setAttribute("role", "gridcell"), i.setAttribute("aria-colindex", "1"), i.setAttribute("aria-colspan", String(this.rows.cellsOf(t).length)), i.setAttribute(this.names.noRowDrag, ""), i.appendChild(r), t.appendChild(i), t.setAttribute(D, ""), A(t, !0);
	}
	closeDetail(e) {
		let t = e.querySelector(`:scope > .${E}`), n = t?.hasAttribute(this.names.cellFocus) === !0;
		e.removeAttribute(D), t?.remove(), A(e, !1), n && this.rows.moveCursor(e);
	}
	restoreDetails(e, t) {
		for (let n of l(e, `${this.rowSelector}[${D}]`)) t.has(n) || this.closeDetail(n);
		for (let [e, n] of t) e.isConnected && n !== null && e.querySelector(`:scope > .${E}`) !== n && (e.querySelector(`:scope > .${E}`)?.remove(), e.appendChild(n), e.setAttribute(D, ""), A(e, !0));
	}
	answersClick(e) {
		return e.closest(`[${this.names.noRowOpen}]`) !== null;
	}
	openDetails(e) {
		let t = /* @__PURE__ */ new Map();
		for (let n of l(e, `${this.rowSelector}[${D}]`)) t.set(n, n.querySelector(`:scope > .${E}`));
		return t;
	}
};
function A(e, t) {
	e.querySelector(`:scope > ${k}`)?.setAttribute("aria-expanded", t ? "true" : "false");
}
//#endregion
//#region src/data-grid-query.ts
function j(e, t) {
	return M(e, t)?.getAttribute(t.itemsQuery) ?? null;
}
function M(e, t) {
	return e.querySelector(`:scope > [${t.valueKind}="${t.itemsQueryKind}"]`);
}
function N(e, t) {
	let n = j(e, t);
	if (n === null || n.length === 0) return {};
	try {
		return JSON.parse(n);
	} catch {
		return {};
	}
}
function _e(e, t, n) {
	let i = M(e, t);
	if (i === null) return;
	let a = n.filters ?? [], o = n.sorts ?? [], s = a.length === 0 && o.length === 0 ? null : JSON.stringify({
		filters: a,
		sorts: o
	});
	s !== i.getAttribute(t.itemsQuery) && (s === null ? i.removeAttribute(t.itemsQuery) : i.setAttribute(t.itemsQuery, s), i.dispatchEvent(new Event("change", { bubbles: !0 })), i.dispatchEvent(new Event(r.queryChange, { bubbles: !0 })));
}
//#endregion
//#region src/data-grid-filter-engine.ts
var P = e.filter, F = e.filterKind, I = e.filterBound, L = `[${P}]`, R = `.${t.filterPanel}`, ve = `.${t.filtersCount}`, z = `.${t.filtersClear}`, B = `.${t.filterPart}`, ye = class {
	values;
	badges;
	properties;
	states;
	names;
	fieldSelector;
	written = /* @__PURE__ */ new WeakMap();
	constructor(e) {
		this.values = e.values, this.badges = e.badges, this.properties = e.properties, this.states = e.states, this.names = e.names, this.fieldSelector = `[${e.names.componentId}]`, this.fillAll(e.root.querySelectorAll(o)), e.observeComponents(e.root, o, {
			childList: !0,
			attributeFilter: [e.names.itemsQuery]
		}, (e) => this.fillAll(e)), e.root.addEventListener("click", (e) => {
			let t = e.target instanceof Element ? e.target.closest(z) : null, n = d(t);
			t !== null && n !== null && !this.states.isInert(t) && this.clearPanel(n);
		}), e.root.addEventListener("change", (e) => {
			let t = e.target instanceof Element ? e.target.closest(L) : null, n = d(t);
			t !== null && n !== null && this.writeFilters(n);
		}, !0);
	}
	clearPanel(e) {
		let t = /* @__PURE__ */ new Set();
		for (let n of l(e, L)) if (n.closest(R) !== null) {
			t.add(n);
			for (let e of n.querySelectorAll(`:scope > ${B}`)) {
				let t = e.querySelector(this.fieldSelector);
				t !== null && this.properties.set(t, "Value", null);
			}
		}
		this.writeFilters(e, t);
	}
	writeFilters(e, t = /* @__PURE__ */ new Set()) {
		let n = l(e, L), r = N(e, this.names), i = [];
		for (let e of n) t.has(e) || i.push(...this.readFilterTermsOf(e));
		_e(e, this.names, {
			...r,
			filters: xe(r.filters ?? [], n.flatMap(V), i)
		}), this.written.set(e, j(e, this.names)), this.syncFiltersCount(e);
	}
	fillAll(e) {
		for (let t of e) {
			let e = j(t, this.names);
			this.written.has(t) && this.written.get(t) === e || (this.written.set(t, e), this.fillFields(t));
		}
	}
	fillFields(e) {
		let t = N(e, this.names).filters ?? [];
		for (let n of l(e, L)) {
			let e = n.getAttribute(P) ?? "", r = n.getAttribute(F) ?? "text";
			for (let i of n.querySelectorAll(`:scope > ${B}`)) {
				let n = i.querySelector(this.fieldSelector);
				if (n === null || n.contains(document.activeElement)) continue;
				let a = H(t, e, r, i.getAttribute(I));
				(a === null ? null : String(a)) !== this.partValue(i, r) && this.properties.set(n, "Value", a);
			}
		}
		this.syncFiltersCount(e);
	}
	readFilterTermsOf(e) {
		let t = e.getAttribute(P) ?? "", n = e.getAttribute(F) ?? "text", r = [];
		for (let i of e.querySelectorAll(`:scope > ${B}`)) {
			let e = this.partValue(i, n), a = e === null ? null : Ce(t, n, i.getAttribute(I), e);
			a !== null && r.push(a);
		}
		return r;
	}
	partValue(e, t) {
		let n = this.values.read(e), r = n == null || typeof n == "boolean" ? "" : String(n).trim();
		if (r.length === 0) return null;
		if (t !== "number" && t !== "money") return r;
		let i = W(r);
		return i === null ? null : String(i);
	}
	syncFiltersCount(e) {
		let t = u(e, ve);
		if (t === null) return;
		let n = N(e, this.names).filters ?? [], r = 0;
		for (let t of l(e, L)) t.closest(R) !== null && be(t, n) && r++;
		this.badges.writeCount(t, r), t.hidden = r === 0;
		let i = u(e, z);
		i !== null && this.states.setDisabled(i, r === 0);
	}
};
function be(e, t) {
	return V(e).some((e) => H(t, e.property, e.kind, e.bound) !== null);
}
function V(e) {
	let t = e.getAttribute(P) ?? "", n = e.getAttribute(F) ?? "text";
	return [...e.querySelectorAll(`:scope > ${B}`)].map((e) => ({
		property: t,
		kind: n,
		bound: e.getAttribute(I)
	}));
}
function xe(e, t, n) {
	return [...e.filter((e) => !t.some((t) => t.property === e.itemProperty && H([e], t.property, t.kind, t.bound) !== null)), ...n];
}
function H(e, t, n, r) {
	let i = r === "to";
	for (let r of e) if (r.itemProperty === t && r.value !== null && r.value !== void 0) switch (n) {
		case "number":
		case "money":
			if (r.operator === (i ? "LessOrEqual" : "GreaterOrEqual")) {
				let e = typeof r.value == "number" ? r.value : W(String(r.value));
				if (e !== null) return e;
			}
			break;
		case "date": {
			let e = r.operator === (i ? "Less" : "GreaterOrEqual") ? Se(String(r.value)) : null, t = e !== null && i ? U(e, -1) : e;
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
function Se(e) {
	return /^\d{4}-\d{2}-\d{2}(?:T00:00(?::00(?:\.0+)?)?)?$/.test(e) ? e.slice(0, 10) : null;
}
function U(e, t) {
	let n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e);
	if (n === null) return null;
	let r = /* @__PURE__ */ new Date(0);
	return r.setUTCFullYear(Number(n[1]), Number(n[2]) - 1, Number(n[3]) + t), r.toISOString().slice(0, 10);
}
function Ce(e, t, n, r) {
	let i = n === "to" ? "LessOrEqual" : "GreaterOrEqual";
	switch (t) {
		case "number":
		case "money": {
			let t = W(r);
			return t === null ? null : {
				itemProperty: e,
				operator: i,
				value: t
			};
		}
		case "date": {
			let t = n === "to" ? U(r, 1) : null;
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
function W(e) {
	let t = Number(e);
	return e.trim().length === 0 || !Number.isFinite(t) ? null : t;
}
//#endregion
//#region src/data-grid-selection-engine.ts
var G = `[${e.select}]`, K = `[${e.selectAll}]`, q = "input[type='checkbox']", we = /* @__PURE__ */ new Set(["SelectedKeys", "SelectedKey"]), Te = class {
	selection;
	states;
	names;
	hostSelector;
	rowSelector;
	ownRowSelector;
	said = /* @__PURE__ */ new WeakMap();
	constructor(e) {
		this.selection = e.selection, this.states = e.states, this.names = e.names, this.hostSelector = c(e.names), this.rowSelector = s(e.names), this.ownRowSelector = `[${e.names.itemsHost}] > ${this.rowSelector}`, e.root.addEventListener("change", (e) => {
			let t = e.target instanceof Element ? e.target.closest(q) : null, n = d(t);
			if (t === null || n === null) return;
			if (t.closest(K) !== null) {
				this.selection.setSelected(n, l(n, this.ownRowSelector).filter((e) => this.canChoose(e)), t.checked), this.sync(n);
				return;
			}
			let r = t.closest(G) === null ? null : t.closest(this.rowSelector);
			r !== null && (this.selection.toggle(r), this.sync(n));
		}, !0), e.root.addEventListener(e.names.cellKey, (e) => this.handleCellKey(e)), e.propertyPatchEngine.addValueChangeHandler((t) => this.notePushed(e.root, t)), this.syncAll(e.root.querySelectorAll(o)), e.observeComponents(e.root, o, {
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
	handleCellKey(e) {
		if (e.defaultPrevented || !(e instanceof CustomEvent)) return;
		let { cell: t, key: n, keyboard: r } = e.detail, i = n === "Enter" && t.matches(G) ? t.closest(this.rowSelector) : null, a = d(i);
		i !== null && a !== null && this.canChoose(i) && (e.preventDefault(), r.preventDefault(), this.selection.toggle(i), this.sync(a));
	}
	canChoose(e) {
		return !e.hasAttribute(this.names.unselectable) && !this.states.isInert(e);
	}
	sync(e) {
		let t = u(e, `${K} ${q}`);
		(t !== null || u(e, G) !== null) && this.syncBoxes(e, t), this.sayChange(e);
	}
	syncBoxes(e, t) {
		let n = 0, r = 0;
		for (let t of l(e, this.ownRowSelector)) {
			let i = this.selection.isSelected(t), a = u(e, `${G} ${q}`, t), o = this.canChoose(t);
			o && !t.classList.contains(this.names.hiddenClass) && (n++, i && r++), a !== null && (a.checked !== i && (a.checked = i), this.turnOff(a, !o));
		}
		t !== null && (t.checked = r > 0 && r === n, t.indeterminate = r > 0 && r < n, this.turnOff(t, n === 0));
	}
	turnOff(e, t) {
		this.states.setDisabled(e, t);
		let r = e.parentElement;
		r !== null && r.hasAttribute(n.boxOff) !== t && r.toggleAttribute(n.boxOff, t);
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
		if (t.local || !we.has(t.propertyName)) return;
		let n = t.components.length > 0 ? t.components.filter((e) => e.matches(o)) : [...e.querySelectorAll(o)];
		for (let e of n) e instanceof HTMLElement && this.said.set(e, this.keysOf(e));
	}
	syncAll(e) {
		for (let t of e) this.sync(t);
	}
};
//#endregion
//#region src/data-grid-sort.ts
function Ee(e, t, n) {
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
function De(e, t) {
	let n = e.findIndex((e) => e.itemProperty === t);
	return n < 0 ? null : {
		direction: e[n].direction,
		place: n + 1
	};
}
//#endregion
//#region src/data-grid-sort-engine.ts
var J = e.sort, Oe = `.${t.sortMark}`, ke = class {
	names;
	headerCellSelector;
	constructor(e) {
		let t = e.root;
		this.names = e.names, this.headerCellSelector = `:scope > .${e.names.tableScrollClass} > .${e.names.tableHeaderClass} > [${J}]`, this.syncAll(t.querySelectorAll(o)), e.observeComponents(t, o, {
			childList: !0,
			attributeFilter: [e.names.itemsQuery]
		}, (e) => this.syncAll(e)), t.addEventListener("click", (e) => this.handleHeaderPress(e, e instanceof MouseEvent && e.shiftKey), !0), t.addEventListener("keydown", (t) => {
			t instanceof KeyboardEvent && (t.key === "Enter" || t.key === " ") && e.shortcuts.isPlainKey(t, { shift: !0 }) && t.target instanceof Element && t.target.hasAttribute(J) && this.handleHeaderPress(t, t.shiftKey);
		}, !0);
	}
	syncAll(e) {
		for (let t of e) this.syncSortMarks(t);
	}
	syncSortMarks(e) {
		let t = N(e, this.names).sorts ?? [];
		for (let r of e.querySelectorAll(this.headerCellSelector)) {
			let e = De(t, r.getAttribute(J) ?? ""), i = r.querySelector(Oe);
			m(r, "aria-sort", e === null ? "none" : e.direction === "Ascending" ? "ascending" : "descending"), m(r, n.sorted, e === null ? null : e.direction === "Ascending" ? "asc" : "desc"), i !== null && m(i, n.sortPlace, e !== null && t.length > 1 ? String(e.place) : null);
		}
	}
	handleHeaderPress(e, t) {
		if (e.defaultPrevented || !(e.target instanceof Element) || e.target.closest(`.${this.names.tableResizerClass}`) !== null) return;
		let n = e.target.closest(`[${J}]`), r = d(n), i = n?.getAttribute(J) ?? null;
		if (n === null || r === null || i === null || i.length === 0) return;
		e.preventDefault();
		let a = N(r, this.names);
		_e(r, this.names, {
			...a,
			sorts: Ee(a.sorts ?? [], i, t)
		});
	}
}, Y = e.aggregate, Ae = e.column, X = e.raw, je = class {
	formatting;
	rows;
	names;
	hostSelector;
	totalSelector;
	shownRowSelector;
	pending = /* @__PURE__ */ new Set();
	scheduled = !1;
	constructor(e, n) {
		this.formatting = n, this.rows = e.rows, this.names = e.names, this.hostSelector = c(e.names), this.totalSelector = `:scope > .${e.names.tableScrollClass} > .${t.footer} > .${t.total}[${Y}]`, this.shownRowSelector = `:scope > ${s(e.names)}:not(.${e.names.hiddenClass})`, this.syncAll(e.root.querySelectorAll(o)), e.observeComponents(e.root, o, {
			childList: !0,
			attributeFilter: [
				"class",
				X,
				e.names.windowAggregates
			]
		}, (e) => this.queue(e)), e.strings.onChange(() => this.syncAll(e.root.querySelectorAll(o)));
	}
	syncAll(e) {
		for (let t of e) this.syncTotals(t);
	}
	syncTotals(t) {
		let n = t.querySelectorAll(this.totalSelector);
		if (n.length === 0) return;
		let r = t.querySelector(this.hostSelector);
		if (r === null) return;
		let i = r.getAttribute(this.names.hostMode) === "windowed", a = i ? Me(r, this.names) : null, o = i ? null : this.rows.itemsOf(r), s = this.formatting.numbers.readCulture(t), c = this.formatting.temporal.readCulture(t);
		for (let t of n) {
			let n = t.getAttribute(Ae) ?? "", l = t.getAttribute(e.property) ?? n, u = t.getAttribute(Y) ?? "", d = i ? a?.[l] ?? null : o === null ? u === "count" ? r.querySelectorAll(this.shownRowSelector).length : Fe(u, Pe(r, n, this.shownRowSelector)) : u === "count" ? o.length : Fe(u, Ne(o, l, this.rows, this.formatting.numbers)), f = d === null ? "" : C(d, b(t), s, c, this.formatting);
			t.textContent !== f && (t.textContent = f);
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
function Me(e, t) {
	let n = e.getAttribute(t.windowAggregates);
	if (n === null || n.length === 0) return null;
	try {
		return JSON.parse(n);
	} catch {
		return null;
	}
}
function Ne(e, t, n, r) {
	let i = [];
	for (let a of e) {
		let e = w(n.readPath(a, t), r);
		e !== null && i.push(e);
	}
	return i;
}
function Pe(e, t, n) {
	let r = [];
	for (let i of e.querySelectorAll(n)) {
		let e = i.querySelector(`:scope > [${Ae}="${CSS.escape(t)}"] [${X}]`), n = e === null ? NaN : Number(e.getAttribute(X));
		Number.isFinite(n) && r.push(n);
	}
	return r;
}
function Fe(e, t) {
	if (e === "count") return t.length;
	if (t.length === 0) return null;
	switch (e) {
		case "sum": return t.reduce((e, t) => e + t, 0);
		case "average": return t.reduce((e, t) => e + t, 0) / t.length;
		case "min": return Ie(t, -1);
		case "max": return Ie(t, 1);
		default: return null;
	}
}
function Ie(e, t) {
	let n = e[0];
	for (let r = 1; r < e.length; r++) (e[r] - n) * t > 0 && (n = e[r]);
	return n;
}
//#endregion
//#region src/data-grid-verdict-engine.ts
var Le = /* @__PURE__ */ new Map(), Re = class {
	rows;
	validation;
	names;
	rulesByGrid = /* @__PURE__ */ new WeakMap();
	boxes = /* @__PURE__ */ new WeakMap();
	constructor(e) {
		this.rows = e.rows, this.validation = e.validation, this.names = e.names;
		for (let t of e.root.querySelectorAll(o)) this.judgeGrid(t);
		e.observeComponents(e.root, s(e.names), {
			childList: !0,
			characterData: !0,
			relevant: (e) => !this.isVerdictWrite(e)
		}, (e) => {
			for (let t of e) this.judgeRow(t);
		});
	}
	judgeGrid(e) {
		if (this.rulesOf(e).size !== 0) for (let t of e.querySelectorAll(s(this.names))) this.judgeRow(t);
	}
	isVerdictWrite(e) {
		let t = e.target instanceof Element ? e.target : e.target.parentElement;
		if (t !== null && t.closest(`.${n.verdictClass}`) !== null) return !0;
		let r = [...e.addedNodes, ...e.removedNodes];
		return r.length > 0 && r.every((e) => e instanceof Element && e.classList.contains(n.verdictClass));
	}
	judgeRow(n) {
		let r = d(n);
		if (r === null || !f(r, n, this.names)) return;
		let i = this.rulesOf(r);
		if (i.size === 0) return;
		let a = this.rows.itemOf(n);
		if (a !== void 0) for (let r of n.children) {
			if (!(r instanceof HTMLElement) || !r.classList.contains(t.editableCell)) continue;
			let n = i.get(r.getAttribute(e.column) ?? "");
			n !== void 0 && this.judgeCell(r, n.editor, this.rows.readPath(a, n.path));
		}
	}
	judgeCell(e, t, r) {
		let i = this.validation.judge(t, r), a = this.boxes.get(e);
		if (i !== null || a !== void 0) {
			if (a === void 0 || a.parentElement !== e) {
				a = document.createElement("span"), a.className = n.verdictClass;
				let t = document.createElement("span");
				t.setAttribute(this.names.validationMessage, ""), a.append(t), e.append(a), this.boxes.set(e, a);
			}
			this.validation.mark(a, i?.severity ?? null, i?.words ?? null);
		}
	}
	rulesOf(t) {
		let n = this.rulesByGrid.get(t);
		return n === void 0 && (n = ze(t.getAttribute(e.rules)), this.rulesByGrid.set(t, n)), n;
	}
};
function ze(e) {
	if (e === null || e.length === 0) return Le;
	try {
		let t = JSON.parse(e), n = /* @__PURE__ */ new Map();
		for (let [e, r] of Object.entries(t)) typeof r.editor == "number" && typeof r.path == "string" && n.set(e, {
			editor: r.editor,
			path: r.path
		});
		return n;
	} catch {
		return Le;
	}
}
//#endregion
//#region src/data-grid-engine.ts
var Be = class {
	formatting;
	constructor(e, t) {
		this.formatting = {
			numbers: e.numbers,
			temporal: e.temporal,
			strings: e.strings
		}, new ke(e), new re(e, t), new ye(e), new je(e, this.formatting), new fe(e), new ge(e), new Te(e), new Re(e), e.strings.onChange(() => ce(e.root, this.formatting));
	}
	applyCellValue(e, t) {
		x(e, t, this.formatting);
	}
}, Ve = 4;
function He() {
	let e = window.NEStandardUI;
	if (e === void 0 || typeof e.registerEngine != "function") throw Error("NE.Standard.UI.Web.DataGrid needs the framework's client (ui.js) on the page before it.");
	if (e.contractVersion !== Ve) throw Error(`NE.Standard.UI.Web.DataGrid was built for plugin contract ${Ve}, but the framework's client on the page implements ${String(e.contractVersion ?? "an older one")}; install the package version that matches the framework.`);
	return e;
}
//#endregion
//#region src/data-grid.ts
var Z = He(), Q = new ne(), $;
Z.registerEvent(r.queryChange, { settlesValue: !0 }), Z.registerEvent(r.cellEdit, {
	settlesValue: !0,
	started: (e) => Q.start(e.domEvent),
	completed: (e) => Q.finish(e.domEvent)
}), Z.registerEvent(r.selectionChange, { settlesValue: !0 }), Z.registerEngine((e) => {
	$ = new Be(e, Q);
}), Z.registerDomOperation({
	kind: a,
	handler: (e) => $?.applyCellValue(e.target, e.value)
});
//#endregion
