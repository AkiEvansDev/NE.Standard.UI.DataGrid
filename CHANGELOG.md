# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `datagrid/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.DataGrid/releases.

## 1.5.0

- **The grid's pager is the framework's** (GitHub issue #86): a paging grid draws `PagerComponent` under its rows, aimed at itself
  — pages by number, the rows on show on a phone, Page Up and Page Down turning the page, the sizes `ConfigurePager` offers
  (**New:** `DataGridComponent.ConfigurePager`, `PagerRegionName`). A query change reads the first page again at the size the
  viewer chose, which is kept in the browser beside the columns' widths.
  - **Breaking:** `Paging` is the items host's (`IItemsHostComponent.PagingProperty`); `SetPaging` and `BindPaging` are as they
    were, `DataGridComponent.PagingProperty` is gone.
  - **Breaking:** the grid's own pager is gone — `DataGridComponentRenderer.PagingAttribute` and `PageAttribute`
    (`data-ui-grid-paging`, `data-ui-grid-page`), the `ui-data-grid__pager`, `__page-button` and `__page-status` classes, and
    `DataGridStrings.PageOf`, `PageRange`, `FirstPage`, `PreviousPage`, `NextPage`, `LastPage` (`ui.grid.page-of` and the rest);
    reach `.ui-pager` and `UIStrings.Pager*` instead.
- **The grid works from the keyboard, by rows** (GitHub issue #92): one Tab stop, the keyboard cursor walking its rows (Up, Down,
  Home, End, Page Up, Page Down); Enter or Space runs the row's click, Right and Left open and close its detail. Up from the first
  row reaches the header: Left and Right walk the captions, Enter sorts, Ctrl with an arrow moves a column and Shift with an arrow
  sizes it. The grid is a `grid` to a screen reader whatever it chooses.
  - **Breaking:** a sorting caption renders `tabindex="-1"`, and the detail column's cells claim their own press
    (`data-ui-no-row-open`), so a double click on a chevron toggles the detail and opens nothing.
- **The grid's rows travel whole**: the framework now sends a row only what its templates read, and the grid's client reads any
  column raw (a total, the export, a filter), so it marks itself `ReadsWholeItems()`.
- **The band's search field is Tonal**, the fill alone, beside the Filters and Columns buttons.
- **A cell's words stay put as its editor opens**, in any appearance and size; a two-line cell edits on its first line. The editor
  centres its field in the cell's height, so a one-line row no longer grows as it opens.
- **A closed cell wears what its editor's rules say of its value** whenever its row is shown — drawn, after a commit, after the
  server writes it, after a language switch: the strongest severity's edge in the box the editor's field takes, its words in the
  mark's tooltip. **New:** `DataGridComponentRenderer.RulesAttribute` (`data-ui-grid-rules`), `UIDataGridColumn.EditPath`.
- **Breaking: an error keeps the editor open.** A value an error rule or a bound (`Min`, `Max`) refuses is not sent: Enter, Tab, a
  double click on another cell or a click elsewhere leaves the editor open, the focus in its field, until it is put right or
  Escape takes it back. An error rule's value used to commit. A warning or a note commits as before; an editor hidden whole under
  its column goes without the refused value.
- **A typed column's editor takes rules**: `AddTextColumn`, `AddNumberColumn`, `AddMoneyColumn`, `AddDateColumn`,
  `AddBooleanColumn` and `AddEnumColumn` take `configureEditor` (**New:**) for `Validate`, `Required`, `Regex` or bounds; on a
  column that does not edit it throws.
- **An editable cell answers the pointer with the field's ground** in the box its editor's field will take, as does every editable
  cell on the keyboard's row; nothing while the grid does not edit. A two-line cell's ground holds both lines.
- **Demo:** the filters page has a grid that chooses nothing and opens a row on a press; the columns page has *Rules in a cell*.
