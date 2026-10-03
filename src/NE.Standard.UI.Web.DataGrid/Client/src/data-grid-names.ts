// Every name the grid's client spells: what its renderers write and what the client writes for itself and its stylesheet.
// DataGridAttributesSyncTests holds each table to its C# spelling; a name is read from here, never written again beside its use.

/** The attributes the grid's renderers write and its engines read. */
export const GridAttributes = {
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
} as const;

/** The classes the grid's renderers write and its engines read. */
export const GridClasses = {
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
} as const;

/** What the client alone writes, for its own engines and the stylesheet. */
export const ClientNames = {
    sorted: "data-ui-grid-sorted",
    sortPlace: "data-ui-grid-sort-place",
    expanded: "data-ui-grid-expanded",
    editorClass: "ui-data-grid__editor",
    editorOpenClass: "ui-data-grid__editor--open",
    editingCellClass: "ui-data-grid__cell--editing",
    detailClass: "ui-data-grid__detail",
    verdictClass: "ui-data-grid__verdict"
} as const;

/** The events the grid raises, by the names `DataGridEvents` hangs a command on. */
export const GridEvents = {
    queryChange: "query-change",
    cellEdit: "cell-edit",
    selectionChange: "selection-change"
} as const;

/** The words the client writes itself, by their `DataGridStrings` keys. */
export const GridWords = {
    yes: "ui.grid.yes",
    no: "ui.grid.no"
} as const;

/** The DOM operation a typed cell's value travels through (`DataGridCellRenderer.ValueOperationKind`). */
export const CellOperationKind = "data-grid-cell";
