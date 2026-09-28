# Changelog

One section per release of this slice, headed `## X.Y.Z` and named by the tag — `datagrid/vX.Y.Z`. The release
workflow cuts the matching section out to become the body of the GitHub release, and a tag with no section
fails the release before anything is published.

## 1.2.0

- **Built on the framework's 1.2.0.** Nothing of this package's own changed; it moves with the framework.

## 1.1.0

- **The band's parts and the header's checkbox stand outside the rows.** The search box, the filters, the column chooser and
  the select-all checkbox were the grid's template variants, compiled in a row's scope, so each asked for a row's key in its
  address with no row around it and the page logged a parameter-count warning per filter and chooser; they are the grid's
  regions now. **Breaking:** `SearchTemplateKey`, `ColumnsTemplateKey` and `SelectAllTemplateKey` are `SearchRegionName`,
  `ColumnsRegionName` and `SelectAllRegionName`, and `UIDataGridColumn.FilterTemplateKey`/`FilterTemplatePrefix` are
  `FilterRegionName`/`FilterRegionPrefix`.
- **A sortable header lines its caption up with its column's values.** In a column aligned to the end the sort mark stood
  after the caption and pushed it off the values' edge; it now stands before the caption, which ends where the values end. In a
  centred column the caption stays centred on the values with the mark beside it, whatever the mark's width. The place of a
  column among several sorted ones is the arrow's superscript, tight against it, so it no longer reads as part of the caption.

## 1.0.1

- **The first stable release.** No `--prerelease` is needed any more. Until 2.0.0 the public surface may still move
  between versions; every such change is marked **Breaking:** in this file.
- **Clear filters clears with one press.** A choice filter takes its emptied value onto its field a moment after the press,
  and the query was read back from the fields at once, so the first press wrote the old choice again; the query now drops the
  panel's terms itself, and the count on the filters button is taken from the query rather than the fields, which also puts it
  right after a controller pushes a choice.
- **A query the controller pushes shows in the filter fields.** A term a field could have written is written back into it — a
  text, a range's end, a choice — and a field whose term went empties, so the fields say what narrows the rows; the field the
  viewer is typing in is left alone. The demo's large source page has two buttons that set the query from the controller, and
  its status line counts the rows the pushed query leaves rather than the ones before it.
- **A grid's checkboxes have names.** The box of each row and the box over them all stand alone in their cells, with no words
  of their own; they are named *Select row* and *Select all rows* (`ui.grid.select-row`, `ui.grid.select-all`). The footer's
  cells take the role its rows' cells take — `gridcell` in a grid whose rows are chosen.
- **A CSV export runs no formulas.** Text that opens with `=`, `+`, `-`, `@`, a tab or a carriage return is written behind a
  quote, so a spreadsheet opens it as words rather than running it — a customer's name could have been a formula.
  `UIDataGridCsvOptions.EscapeFormulas`, on by default; a number, a date or a flag is never touched.
- **A CSV moment is written to the second without a zone**, a `DateTimeOffset` as its UTC moment: the round-trip form a
  `DateTimeOffset` took carried an offset a spreadsheet does not read back as a date. **A table column the grid did not add
  itself is left out of the file**, as a detail column is — its key is a name or a position, and was read as a property.
- **A windowed grid's footer shows the source's totals or nothing.** A source that sent no `Aggregates` had the window's own
  sum shown as the column's; the footer stays blank. The totals are worked out once a frame at most, since a scroll through a
  virtualized grid swaps rows batch after batch, and a `Min` or `Max` over many rows no longer overflows the stack. The demo's
  source sends new totals after a cell edit.
- **A filter term the controller set on a property no field shows, or in a shape no field writes, is kept** when the viewer
  types in a field; the fields used to rewrite the whole query's filters and drop it, and the viewer had no way to bring it
  back. Such a term — an `Equal` on a text, a `Greater` on a number — no longer shows in the field either, which rewrote it
  in the field's own shape (`LikeIgnoreCase`, `GreaterOrEqual`) at the next edit and let back rows the controller excluded. **A date range's end takes the
  whole last day** — *before the next day* rather than `T23:59:59`, which missed a row with a fraction of a second or a zone.
- **The pager's Previous and Last land on a page boundary**, so the pages stepped through are the ones First counts from; an
  offset reached by scrolling or by a short last page stepped back by a page size from wherever it stood.
- **Tab and F2 follow the columns as the viewer sees them.** A cell editor moved along the row in the author's order and
  reached a hidden column's cell, which cannot take the focus; it now follows the viewer's order and skips a hidden column. A
  row redrawn while its editor was open lets the held field go.
- **The box over a grid's checkboxes takes and counts only the rows the filters left**: it chose rows a filter hid, and read
  *all chosen* as *some*.
- **A detail row answers its own presses.** A press on a button, a field or the text inside an open detail opened or closed the
  row under `SetExpandOnClick`. The detail column's chevron is named *Details* (`ui.grid.details`) and says whether its detail
  is out; a boolean column given only one of its two captions translates the default of the other (`ui.grid.yes`,
  `ui.grid.no`) rather than writing a bare *Yes* or *No*.
- **A grid with no chooser or no row choice skips the work**: its engines heard every change inside the grid, a scrolled host's
  spacers among them.
- **The package's stylesheet and script are served under `/_ne/css/` and `/_ne/js/`** with the framework's own paths (see the
  core's changelog).
- **A number cell the server paints writes a value no decimal holds as it is**: a `NaN`, an infinity or a real past 7.9e28 in a
  Number or Money column failed the render with an overflow, where the client's cell wrote it as it is; and a numeric text is
  formatted as a number on both sides — and now totalled as one on both, and written by a CSV as the number it is rather than
  behind a formula's quote. A numeric text is decimal digits on both sides: the client read `0x10` as sixteen and a blank as
  zero. The demo keeps a viewer's edits to its own page rather than in the catalogue every page
  reads.
- **The filters flyout has a Clear filters button** under its filters, which empties every one of them at once and is
  disabled while none holds anything; the search box keeps its text. The filter fields expose their `Value` to the
  package's client for it.
- **Clearing the only filter shows every row again** — the framework's rule watcher missed an emptied query (see the
  core's changelog).
- **A committed cell edit lets its field go.** Only Escape released the field the editor held for the value engine, so a
  commit that changed nothing left a detached editor held for the page's life; every close releases it now.
- The totals engine escapes a column's key in its selector, as the edit engine already did.
- **The filters and columns flyouts are drawn through the foundation's `FlyoutRenderer`**, not by copying the flyout
  engine's class names; the markup is the same.
- **The package checks the plugin contract it was built for.** The framework's client says which contract it implements
  (`GlobalApi.contractVersion`), and the package refuses to register against another one, with an error naming both
  numbers, instead of working in part.
- **Both packages bring their namespaces as global usings.** Installing the package is enough to write against it; a
  project that would rather write its own `using` lines sets `NEStandardUIImplicitUsings` to `false`.
- **The demo lists Orvane Cloud's subscriptions**, and every sample shows its source.
- **The mirror's demo builds against the framework's packages.** It reached this slice's own namespaces only through
  the monorepo's usings, and this slice's sources wrote `using` lines the framework's packages now bring, which is
  IDE0005; `Directory.Build.targets` travels to the mirror and a package's sources keep their own lines.
- The README's licence link names the mirror, so it resolves on nuget.org too.
- **The packages carry their symbols and sources inside their assemblies**, so a debugger steps into them.
- **A grid in another grid's detail is its own.** The outer grid's engines looked its parts up anywhere inside it and found the
  inner grid's: its row boxes and the box over them were written from the outer rows' choices, its filter count and Clear
  button from the outer query, its chooser from the outer columns, and F2 could open an inner cell's editor.
- **With `SetExpandOnClick`, Enter on the keyboard's row opens and closes its detail** as a click does; the keyboard had no way
  to a detail but the chevron. While the grid's editing is off, a click on an editable column's cell opens the row too.
- **The detail column's chevron says its detail is in from the start**, not only once it has been pressed.
- **The column chooser keeps one column showing**: the last checked entry cannot be unchecked, which left an empty frame.
- **A grid that holds all its rows draws no pager**, `Paging` or not; the pager's four buttons could do nothing there.
- **A query written as it already stands raises nothing**: `OnQueryChange` ran, and a windowed grid read its window again, for
  a filter edit that made no term.
- **A date text with an offset shows the clock it is written with** on the server as the client does; the server turned it into
  its own zone, so a moment near midnight showed another day before the client drew the row again.
- **`DataGridCellFormatter.AsCsvFormat` without a translator writes no key**: a boolean column given one caption wrote
  `ui.grid.no` for the other; it writes the plain value.
- **A cell editor whose field binds more than its value — a search binding its typed text too — holds, restores and compares
  the value**, not the typed text.

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
