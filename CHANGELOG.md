# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `datagrid/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.DataGrid/releases.

## 2.0.0

- **Breaking:** the filter's caption is `Title` (`DataGridFilterComponent.Title`, `TitleProperty`), drawn as
  `ui-data-grid__filter-title` (`DataGridFilterRenderer.TitleClassName`, was `CaptionClassName`, `ui-data-grid__filter-caption`).
- **Breaking:** `query-change` and `selection-change` are the grid's own: a grid in a detail template without `OnQueryChange` or
  `OnSelectionChange` no longer runs the outer grid's command.
- **Breaking:** rows are sent projected to the grid's declared paths — the columns' property, sort, edit, filter and total paths,
  the search path and what its templates bind — not whole; a client script reading another member of a row asks for it with
  `AddItemReads(path)`.
- **Breaking:** `Editable` is held on the server: off, static or bound, it closes every editor, so a forged edit and its
  `cell-edit` are refused. A grid's `BindEditable` binds from the root or the grid's own context, not `UIBindingScope.Parent`
  (refused at compile). An editor's own `Enabled` still holds — a static false stays closed under a bound `Editable`, and a bound
  `Editable` keeps its `Optional`; an editor binding its own `Enabled` while `Editable` is off or bound is refused at compile
  (`InvalidOperationException`).
- A windowed grid offers its viewer's query terms (`IItemsQueryTermsComponent.QueryTerms`): the filterable columns' and the search
  box's properties, the sortable columns'; any other term a page sends is refused by the core.
- A row's checkbox is named after the row's header cell (*Select row SUB-001001*, not *Select row* on every row), and its detail
  chevron alike (*Details SUB-001001*); a sortable header's name is its caption, *Sort by …* its description; a filter draws the
  surface and border it is given.
- `DataGridComponent` gains expression-based `SetSearch<TRow>`, `AddTextColumn<TRow>`, `AddNumberColumn<TRow>`,
  `AddMoneyColumn<TRow>`, `AddDateColumn<TRow>`, `AddBooleanColumn<TRow>` and `AddEnumColumn<TRow>` / `AddEnumColumn<TRow, TEnum>`
  overloads translated via `RecursivePath.FromExpression`.
- **Breaking:** `DataGridComponent.SelectionColumnKey` and `SelectAllRegionName` moved to `TableComponent` in the core (`UISelectionMode.Many` checkbox column is now the table's own); `AddDetailColumn` defaults to `36` px (`Fixed = true`) and stands before the selection column; every grid renders a built-in search bar (`UIItemsQuery.Search` across columns unless `SetSearch(propertyPath)` narrows it to one property) whose trailing end hosts the `Filters` (with active-filter count badge) and `Columns` flyout buttons as compact `Ghost` action buttons named by their tooltips.
- **Breaking:** the grid's switches and kinds are unset until set, as the core's are: `DataGridComponent.ColumnChooser`,
  `ExpandOnClick` and `MultipleDetails` are `bool?`, `DataGridCellComponent.Kind` is `UIDataGridColumnKind?`, and
  `DataGridFilterComponent.Kind` is `UIDataGridFilterKind?`; their defaults are unchanged.
