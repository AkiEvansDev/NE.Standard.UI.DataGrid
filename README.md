# NE.Standard.UI.DataGrid

A data grid component for the [NE.Standard](https://github.com/AkiEvansDev/NE.Standard) UI framework: the
framework's table with everything the table leaves to an add-on. Two packages, on the framework's own pattern —
the **component**, which is platform-independent, and its **web rendering**, which carries the grid's engines and
its stylesheet embedded in its assembly.

The grid *is* the table: `DataGridComponent` derives from `TableComponent`, so its rows, its rules, its window over
a source, its selection, its resizable columns and its chrome are the table's own, and a grid renders through the
table's renderer rather than a copy of it. A fresh component would have copied the subgrid layout, the column engine
and the selection and scroll machinery; deriving is the point, and what the table had to open for it went into the
framework rather than into this package. What the grid adds:

- **Sorting by header**, **typed, formatted columns**, **editing in place**, **filters and a search box**, **paging**,
  **a footer of totals**, **wide grids with pinned columns**, **a column chooser and responsive columns**, **a detail row**,
  **CSV export**.

What it deliberately does not do: no spreadsheet — no cell selection rectangles, no fill-down, no formulas; no batching of edits, since every commit is
one event and a form over a grid is the application's own.

## Install

```
dotnet add package NE.Standard.UI.DataGrid --prerelease
dotnet add package NE.Standard.UI.Web.DataGrid --prerelease
```

Register the web rendering beside the framework's renderers:

```csharp
services.AddStandardRenderers();
services.AddDataGrid();
```

## Using it

```csharp
new DataGridComponent()
    .SetItems(orders)
    .AddTextColumn("Order", nameof(Order.Number), UIGridUnit.Absolute(120))
    .AddEnumColumn<OrderStatus>("Status", nameof(Order.Status))
    .AddNumberColumn("Quantity", nameof(Order.Quantity), "N0")
    .AddMoneyColumn("Total", nameof(Order.Total), "€")
    .AddDateColumn("Ordered", nameof(Order.Ordered), "dd MMM yyyy")
    .AddBooleanColumn("Paid", nameof(Order.Paid))
```

Everything a `TableComponent` takes, a grid takes: `SetItems` or `BindItems` for rows the page holds, `BindSource`
for a window over a `UIItemSourceBase<T>`, `Virtualized()`, `FilterBy`/`SortBy` rules, `SelectionMode`, `Striped`,
`RowHoverable`, `ResizableColumns`, `ReorderableColumns`, the borders and the surface.

### Typed columns

| Column | Shows | Format | Aligned |
|---|---|---|---|
| `AddTextColumn` | the row's text | as it is | start |
| `AddNumberColumn` | a number | a standard .NET format — `N2` unless given (`N`, `F`, `P`, `D`, with a precision) | end |
| `AddMoneyColumn` | an amount | the currency format `C`, the page's symbol or the one given | end |
| `AddDateColumn` | a date or a moment | a pattern of the shared token subset — `yyyy-MM-dd` unless given (`dd MMM yyyy HH:mm`, `d MMMM yyyy`, …) | start |
| `AddBooleanColumn` | a flag | the two words given, or the page's yes and no (`ui.grid.yes`, `ui.grid.no`) | centre |
| `AddEnumColumn` | one of a set | the caption of the `UIChoice` it matches — `AddEnumColumn<TEnum>` reads them off the type (`UIChoices.FromEnum`), a member's `[Description]` or its name as words | start |

A typed cell is formatted **in the page's culture** — the session's language — on the server when the row is
painted there, and on the client when a row is built or a value patched there, through the same formatters, so
the two read the same. The row keeps its typed property; nobody formats by hand.

### Template columns

A column is any component bound to the row, exactly as in the table: two lines of text, a badge, a bar, a button.
Name the property it sorts by and the caption sorts:

```csharp
.AddColumn("Customer", new DefaultTextTemplate()
    .BindTitle(nameof(Order.Customer), UIBindingScope.Relative)
    .BindDescription(nameof(Order.Country), UIBindingScope.Relative), sortPath: nameof(Order.Customer))
.AddColumn("Fulfilment", new ProgressComponent()
    .BindValue(nameof(Order.Fulfilment), UIBindingScope.Relative), sortPath: nameof(Order.Fulfilment))
```

### Sorting by header

A click on a caption sorts by that column, a second click reverses, a third clears; Shift+click adds a column to
a multi-column sort, and the marks say the direction and the place. A property column sorts unless it says
`sortable: false`; a template column sorts when it names a `sortPath`; `AddTextColumn(caption, path, sortable)` says
either.

The sort is the items component's own **`Query`** — the viewer's terms beside the authored `SortBy` rules, the
viewer's first. Over rows the page holds it runs in the browser; over a windowed source, bind the query two-way
and the source is asked to sort:

```csharp
new DataGridComponent("orders")
    .BindSource(nameof(OrdersController.Source))
    .BindQuery(nameof(OrdersController.Query))
    .OnQueryChange(nameof(OrdersController.QueryChanged))
```

The source answers `UIItemWindowRequest.Query` — its `Sorts` are what the headers wrote — and a controller can set
`Query` itself to sort a grid from code. A sort by an enum compares the members' names, as the client does.
`OnQueryChange(command)` runs a command once the query has reached the server.

### Filters and search

A column that says `filterable: true` gets a filter: a text match for a text column, a from and a to for a number, money
or date column, a select for a boolean or an enum column. A template column filters through `AddFilter(key, kind,
choices)`, by the property its `sortPath` names. The filters stand behind a **Filters** button in the band over the
header — a flyout with a captioned filter per column, and a count of the ones in use on the button.
`SetSearch(propertyPath)` adds a search box to the band that matches one property as text. The band is a row of
controls: the box is a field of the page's own shape and the two buttons take the same ground, height and corner.

```csharp
.AddTextColumn("Order", nameof(Order.Number), sortable: true, filterable: true)
.AddMoneyColumn("Total", nameof(Order.Total), "€", filterable: true)
.AddFilter(nameof(Order.Status), UIDataGridColumnKind.Enum, UIChoices.FromEnum<OrderStatus>())
.SetSearch(nameof(Order.SearchText))
```

Every field is a term of the same `Query` the headers sort by — a text match without regard to case, a
`GreaterOrEqual`/`LessOrEqual` pair for a range, an `Equal` for a choice — so a grid the page holds narrows in the
browser, and a windowed one asks its source, which sees the terms in `UIItemWindowRequest.Query.Filters`. A query's
terms are all required, which is why the search box matches one property: compose it on the row from the words a
viewer would look for (`$"{Number} {Customer} {Country}"`) rather than expect the grid to guess which columns are text.
A date term compares the picker's ISO text against the row's, so a date property reaches the wire in that shape.

### Paging

A grid over a windowed source reads the next window as the viewer nears the end — the table's own behaviour. With
`Paging` on (`SetPaging(true)`, or bound), the window is a page instead: a pager under the rows says which rows the page
holds out of the source's count, and its four buttons ask the source for the first, the previous, the next or the last
page. `WindowSize` is the page size. A query change — a header sorted, a filter typed — re-reads from the first page.

### CSV export

The grid carries no export button: what leaves the screen as a file is the application's own command. `UIDataGridCsv` writes
the rows over the grid's columns — the captions as the header line, a column that reads no property (a detail column) left out:

```csharp
[UICommand]
public async Task ExportAsync(CancellationToken cancellationToken)
{
    var content = UIDataGridCsv.WriteBytes(OrdersView.ExportColumns, Orders);

    _ = await Context.Downloads.DownloadAsync(Context.Handle, "orders.csv", "text/csv", content, cancellationToken);
}
```

By default the file carries **values**, not the cells' text: a number plain, a moment in the round-trip form, a flag as `true`
or `false`, so a spreadsheet reads them back as numbers and dates. `new UIDataGridCsvOptions { Format =
DataGridCellFormatter.AsCsvFormat(culture, translate), Translate = … }` writes what the cells show instead, through the same
formatter they use — the writer is the component package's, so a controller can call it, and the formatter is the web
package's; `Separator` takes a semicolon where a culture writes its decimals with a comma. `WriteBytes` puts a byte-order mark
in front, which is what a spreadsheet needs to read the file as UTF-8.

### A detail row

A row may hold more under itself than its cells have room for: `SetDetailTemplate(template)` draws the template across every
column under the row, bound to the row as a cell's template is. The viewer opens it at the chevron of a detail column, or
anywhere on the row when the grid says so:

```csharp
new DataGridComponent("orders")
    .AddDetailColumn()
    .AddTextColumn("Order", nameof(Order.Number))
    .SetDetailTemplate(new StackPanelComponent()
        .SetOrientation(UIOrientation.Horizontal)
        .SetSpacing(32)
        .AddChild(new DefaultTextTemplate().SetTitle("Customer").BindDescription(nameof(Order.Customer), UIBindingScope.Relative))
    )
    .SetExpandOnClick(true)
    .SetMultipleDetails(true)
```

One row stands open at a time unless `MultipleDetails`. A cell that answers the click itself — an editable one — never opens
the row. The detail is a child of the row, so it stripes, hides and scrolls with it; a windowed grid's rows, which the browser
builds, get theirs through the framework's row decorators.

### A column chooser and responsive columns

`SetColumnChooser()` puts a button in the band that opens a menu of the columns, each a check entry; the viewer's choices
are kept in the browser under the grid's id, beside the widths a resizable grid keeps, and painted before the first frame
with them. A column may also give way on its own below a viewport tier:

```csharp
new DataGridComponent("orders")
    .SetColumnChooser()
    .HideColumnBelow(nameof(Order.Country), UIResponsiveTier.Xl)
    .HideColumnBelow(nameof(Order.Paid), UIResponsiveTier.Md)
```

A hidden column keeps its place: its track goes to zero and comes back with its width, so resizing and pinning read as
before, and the width it gave up goes to the columns that are left rather than off the grid's edge. The viewer's word wins
over the tier; a word that only repeats the tier is not kept. `selection` is the key of the grid's own column of checkboxes and
is refused for an author's column.

### Columns the viewer moves

`SetReorderableColumns()` lets a caption be dragged along the header to another place — a line shows where the column would
land — or moved with Ctrl and an arrow when the keyboard is on it. The order is kept in the browser under the grid's id
beside the widths and the hidden columns, and painted before the first frame with them; the chooser's menu lists the columns
in the order they stand. A pinned column and the grid's own column of checkboxes keep the places they were written in, and
nothing is dropped among them. A click that sorts and a drag that moves are the same press: a drag that moved a column does
not sort. What the server writes — a CSV export — is in the order the columns were authored in, as the widths are.

### Wide grids and pinned columns

A grid wider than its box scrolls sideways as a whole once its horizontal scroll is on — the header moves with the rows,
the band and the pager keep their place at the start edge, the footer of totals stays over the pager — and a column that
says `pinned: true` stays in place while the rest slide under it. Pinned columns lead the grid; one after an unpinned
column is refused.

How wide the grid is, its columns say. A column's width is a floor and a share, not an exact size: it never goes under the
width it was given, and whatever the grid has beyond the sum of them the columns share in proportion. So a grid always
fills its box, and one whose widths add up past the box is the one that scrolls sideways.

```csharp
new DataGridComponent("orders")
    .SetHorizontalScroll(UIScrollMode.Auto)
    .AddTextColumn("Order", nameof(Order.Number), sortable: true, UIGridUnit.Absolute(120), pinned: true)
    .AddEditableColumn("Customer", template, editor, sortPath: nameof(Order.Customer), width: UIGridUnit.Absolute(240), pinned: true)
    .AddTextColumn("Country", nameof(Order.Country), width: UIGridUnit.Absolute(180))
```

The pinned cells stand on the grid's own ground with the row's stripe, hover and selection painted over it, and the last
of them draws the edge the rest scroll under. Resizing a pinned column moves the ones after it.

### A footer of totals

A column that says `aggregate: UIDataGridAggregate.Sum` (or `Average`, `Count`, `Min`, `Max`) gets a footer under the
rows with the number under it, formatted as the column's cells are — a count as a plain number. Over rows the page
holds it is computed in the browser, over the rows the filters leave. Over a windowed source the source answers it
beside its window, over every row the query leaves and not only the window:

```csharp
.AddMoneyColumn("Total", nameof(Order.Total), "€", aggregate: UIDataGridAggregate.Sum)

// in the source
return new UIItemWindow<Order>(rows) { Offset = start, TotalCount = total, Aggregates = new Dictionary<string, object> { [nameof(Order.Total)] = sum } };
```

The dictionary is keyed by the row property; the source computes what the footer asks for, which is the screen's own
agreement — the request does not name the totals it wants.

### Editing in place

A typed column that says `editable: true` opens its own field in the cell — a text field, a number field, a date or a
date-and-time picker (by whether the pattern has a time), a checkbox, a select over the enum's choices. A template
column takes the editor the author bound:

```csharp
.AddNumberColumn("Quantity", nameof(Order.Quantity), "N0", editable: true)
.AddEditableColumn("Status",
    new TextComponent().BindBadgeText(nameof(Order.StatusCaption), UIBindingScope.Relative),
    new SelectComponent().SetOptions(statuses).BindValue(nameof(Order.Status), UIBindingScope.Relative),
    sortPath: nameof(Order.Status))
.OnCellEdit(nameof(OrdersController.CellEdited))   // CellEdited(string id, string column)
```

A double click on the cell, or F2 on the keyboard's row, opens the editor in the cell's own track. The editor is drawn at that
moment and taken away again when it closes, so a grid of a hundred rows carries one editor rather than one per editable cell.
Enter or a click elsewhere commits, Escape puts the value back, Tab and Shift+Tab move along the row's editable cells. The value
travels the framework's ordinary two-way path — the field's `Value` is bound to the row's property — so a row of a bound
collection takes it directly, and a row of a windowed source takes it through the source's `TryWriteAsync`, which may refuse it
and have the old value pushed back. `OnCellEdit` runs after the value has landed, with the row's key as `id` and the column's as
`column`; a property column is keyed by its property and a template column by its sort path, unless you name a key.

The editor is any input: a search over the known values reads as naturally as a select. Give such a search
`SetSelectionDisplayMode(UISearchSelectionDisplayMode.ReplaceWithSelectedItem)` — a search box keeps what was typed by
default, and a cell's editor should open on the value the row already holds.

### Choosing rows

`SelectionMode = Many` puts a column of checkboxes before every other column, with a three-state one over them that takes or
clears the rows the grid is holding — what the filters left, or the window the source answered. The column is the grid's own: it
carries no resize handle, the chooser never offers it and an export never writes it. While it is there a click on a row chooses
nothing, that click belonging to the row's detail; Space on the keyboard's row still does.

The chosen keys are the host's `SelectedKeys`, bound two-way like any value, and `OnSelectionChange` runs once they have reached
the server — which is where a button that acts on the choice learns it has something to act on.

```csharp
new DataGridComponent("orders")
    .SetSelectionMode(UISelectionMode.Many)
    .BindSelectedKeys(nameof(OrdersController.SelectedOrders))
    .OnSelectionChange(nameof(OrdersController.SelectionChanged))
```

## Inside the package

The grid draws no mark of its own: the sort arrow, the pager's ends and chevrons, the detail column's chevron and the marks on
the band's buttons are the framework's `ne-` glyphs (`UIGlyphs`), so they are the same drawing family as every field's chevron
and cross. Its stylesheet imports the framework's Less contract (`Client/plugin/ne-standard-ui.less` — the tokens and the
mixins, copied like the TypeScript contract beside it) rather than restating the motion, the focus ring or the field's ground.
The engines are classes started once per page from the framework's engine context, in the shape the framework's own engines
take.

## Licence

The framework's: **the Prosperity Public License 3.0.0** — free for noncommercial use, with a thirty-day trial
for commercial use. See [LICENSE.md](LICENSE.md).
