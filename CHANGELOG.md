# Changelog

One section per release of this slice, headed `## X.Y.Z` and named by the tag — `datagrid/vX.Y.Z`. The release
workflow cuts the matching section out to become the body of the GitHub release, and a tag with no section
fails the release before anything is published.

## 1.0.0-rc.3

The first version: `NE.Standard.UI.DataGrid` (the component) and `NE.Standard.UI.Web.DataGrid` (the web
rendering). The number lines up with the framework's, which goes out as a release candidate with everything that
plugs into it.

- `DataGridComponent`: the framework's table, derived rather than copied, with sorting by header — a click, a
  second to reverse, a third to clear, Shift for several columns — written into the items component's own
  `Query`, so a grid over rows the page holds sorts in the browser and one over a windowed source is sorted by
  the source. A column shows which way it goes, and one that goes neither shows the two ways it could.
- Typed columns — `AddNumberColumn`, `AddMoneyColumn`, `AddDateColumn`, `AddBooleanColumn`, `AddEnumColumn` — each
  formatted in the page's culture on both sides, and a template column that sorts by a property it names.
- Editing in place: a column that says `editable: true` opens the kind's own field in the cell on a double click or
  F2 — a text, a number, a date, a checkbox, a select — and a template column takes the author's editor
  (`AddEditableColumn`). Enter or a blur commits through the row property's two-way binding, Escape puts the value
  back, Tab moves along the row; `OnCellEdit` runs after the value landed, with the row's key and the column's.
- A band over the header, outside the table's frame: a search box across the grid (`SetSearch`) and the filters of every
  column that says `filterable: true` — a text match, a range for numbers and dates, a select for enums and booleans —
  behind a Filters button whose flyout holds a captioned filter per column and counts the ones in use. Every one is a
  term of the same query the headers sort by, so a grid the page holds narrows in the browser and a windowed one asks
  its source.
- Paging (`Paging`, bindable): a windowed grid shows its window as a page, with a pager under the rows — the rows the page
  holds out of the source's count, and first, previous, next and last — instead of reading the next window as the viewer
  scrolls.
- A footer of totals: a column that says `aggregate: Sum` (or Average, Count, Min, Max) shows the number under its rows,
  formatted as its cells are — computed in the browser over the rows the filters leave, or answered by a windowed source
  beside its window (`UIItemWindow.Aggregates`).
- Wide grids and pinned columns: a grid whose `HorizontalScroll` is on scrolls sideways as a whole, its header moving with
  the rows, and a column that says `pinned: true` stays in place while the rest slide under it. The band and the pager
  stand inside the frame then, sticky at its start edge, and the footer of totals over the pager.
- The band reads as a row of controls: the search box is a field rather than a ghost, and the Filters and Columns buttons
  wear a field's ground, height and corner instead of an outline.
- CSV export: `UIDataGridCsv.Write`/`WriteBytes` over the grid's columns and any rows — the captions as the header line,
  values a spreadsheet parses, or the cells' own text through `DataGridCellFormatter.AsCsvFormat`. No button on the grid: an
  application's command writes the file and hands it to `IUIDownloadService`.
- A detail row: `SetDetailTemplate(template)` draws a template under a row across every column, opened at the chevron of
  `AddDetailColumn()` or anywhere on the row with `SetExpandOnClick(true)`; one row stands open at a time unless
  `SetMultipleDetails(true)`. A windowed grid's client-built rows get the same, through the framework's row decorators.
- A column chooser (`SetColumnChooser()`): a button in the band opening the framework's menu with a check entry per column,
  the viewer's choices kept in the browser under the grid's id; and columns that give way on a narrower screen (`HideColumnBelow`).
- Columns the viewer moves (`SetReorderableColumns()`): a caption dragged along the header, or moved with Ctrl and an arrow,
  takes its column with it, and the order is kept in the browser beside the widths. A pinned column and the grid's own column
  of checkboxes stay where they were written.
