# NE.Standard.UI.DataGrid

A data grid component for the [NE.Standard](https://github.com/AkiEvansDev/NE.Standard) UI framework: the
framework's table with everything the table leaves to an add-on. Two packages, on the framework's own pattern —
the **component**, which is platform-independent, and its **web rendering**, which carries the grid's engines and
its stylesheet embedded in its assembly.

The grid *is* the table: `DataGridComponent` derives from `TableComponent`, so its rows, its rules, its window over
a source, its selection, its resizable columns and its chrome are the table's own, and a grid renders through the
table's renderer. What the grid adds:

- **Sorting by header**, **typed, formatted columns**, **editing in place**, **filters and a search box**, **paging**,
  **a footer of totals**, **wide grids with pinned columns**, **a column chooser, columns that start hidden and responsive
  columns**, **an icon on a caption**, **a detail row**, **CSV export**; and from the table, **rows the viewer drags into
  another order**.

What it deliberately does not do: no spreadsheet — no cell selection rectangles, no fill-down, no formulas; no batching of edits, since every commit is
one event and a form over a grid is the application's own.

## Install

```
dotnet add package NE.Standard.UI.DataGrid
dotnet add package NE.Standard.UI.Web.DataGrid
```

Both packages bring their namespaces as global usings, so the code below needs no `using` line for them; a project that
sets `NEStandardUIImplicitUsings` to `false` writes its own.

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
the two read the same. A language switch draws every such cell, a footer's total and the pager's figures again in the new
language's culture at once. The row keeps its typed property; nobody formats by hand.

The grid's own words — the band, the chooser, yes and no — ship in Russian and Simplified Chinese as well as English
(`DataGridStrings.Translations`), turned on with `application.AddFrameworkWords("ru", "zh-Hans")` and outranked by any word of the
application's own. The keys of the words the grid's own controls carry are `UIDataGridWords`, in the component's package, for
an application that translates them itself.

Every helper takes `icon:` — a glyph or a picture drawn before the caption, beside the sort mark and on the column's entry in
the chooser; `SetColumnIcon(key, icon, color)` gives it a colour. The caption stays the column's name for a screen reader, so a
short one (`AP`, `SPD`) still says what the icon shows:

```csharp
.AddNumberColumn("AP", nameof(Card.Ap), "N0", icon: GameIcons.Ap)
.SetColumnIcon(nameof(Card.Ap), GameIcons.Ap, UIThemeColor.FromStyle(UIColorStyle.Danger))
```

A caption is a word, looked up like any other and judged by the Development unkeyed report once, at its column — the chooser's
entry and the filter's caption repeat it and are not reported again. A caption that is a name in every language (`AP`, `SPD`) is
content: `content: true` on its helper (`UITableColumn.IsContent`), or `AsContent(DataGridComponent.ColumnsProperty)` on the grid
for all of them. It is then shown as written in the header, the sort name, the chooser and its filter, and never reported; the
cells' templates are still inspected, as `AsContentTree()` would not leave them. A CSV's header row keeps a column's own
`IsContent` caption as written; the writer is handed the columns, not the grid, so the grid-wide mark does not reach it.

### Template columns

A column is any component bound to the row, exactly as in the table: two lines of text, a badge, a bar, a button.
Name the property it sorts by and the caption sorts:

```csharp
.AddColumn("Customer", new DefaultTextTemplate()
    .BindTitle(nameof(Order.Customer), UIBindingScope.Relative)
    .BindDescription(nameof(Order.Country), UIBindingScope.Relative),
    sortPath: nameof(Order.Customer)
)
.AddColumn("Fulfilment", new ProgressComponent().BindValue(nameof(Order.Fulfilment), UIBindingScope.Relative), sortPath: nameof(Order.Fulfilment))
```

A cell may hold a list of its own — an items view bound relative to a collection on the row, its chips drawn per row — as a row
of an items view does; a change to one row's collection reaches that row's cell.

### Sorting by header

A click on a caption sorts by that column, a second click reverses, a third clears; Shift+click adds a column to
a multi-column sort, and the marks say the direction and the place. A sortable caption is a stop of the header's keyboard
(below, not of the Tab order) named *Sort by …* (`ui.grid.sort-by`, its caption looked up as the caption beside it is; a column with
no caption is named by what it sorts, in words), and Enter or Space presses it as a click does, Shift with them included. A property column sorts unless
it says `sortable: false`; a template column sorts when it names a `sortPath`; `AddTextColumn(caption, path, sortable)` says
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
header — a flyout with a captioned filter per column, a **Clear filters** button under them that empties them all, and
a count of the ones in use on the button.
`SetSearch(propertyPath)` adds a search box to the band that matches one property as text, its placeholder the page's
"Search" (`ui.grid.search`) unless `SetSearchPlaceholder(text)` names another — a key or a text, before or after
`SetSearch`. The band is a row of
controls: the box is a field of the page's own shape and the two buttons take the same ground, height and corner, and the
field's states — the edge under the pointer, and the active edge while the keyboard is on one or its flyout is open. A key
pressed in the band, a flyout or the header is that control's own: the grid's cell cursor, and the Enter, F2 or character that
opens an editor, answer only on the grid itself or in a row.

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
A date term compares the picker's ISO text against the row's, so a date property reaches the wire in that shape; the end of a
date range is written as *before the next day*, so a row with a time, a fraction or a zone on its last day is still in.
A term a field could have written is that field's: it shows in the field, and gives way to what the field says when the viewer
edits a filter. Any other term the controller set in `Query` — on a property no field shows, or in a shape no field writes (an
`Equal` on a text, a `Greater` on a number) — neither shows nor counts, and stays when the viewer edits, since the viewer has no
way to take it back. A query the controller pushes shows in the fields: each term a field could have written goes into its
field, and a field whose term went empties — except the one the viewer is typing in.

### Paging

A grid over a windowed source reads the next window as the viewer nears the end — the table's own behaviour. With
`Paging` on (`SetPaging(true)`, or bound — the property every items host has), the window is a page instead, and the grid draws
the framework's `PagerComponent` under the rows, aimed at itself: the pages by number with first, previous, next and last, or —
on a phone, or with `UIPagerMode.Compact` — the rows the page holds out of the source's count between previous and next.
`ConfigurePager` sets it up — its mode, the page sizes it offers:

```csharp
SubscriptionGrid.Create("subscriptions")
    .BindSource(nameof(Controller.Subscriptions))
    .SetWindowSize(20)
    .SetPaging(true)
    .ConfigurePager(pager => pager.SetPageSizes([20, 50, 100]))
```

`WindowSize` is the page size until the viewer chooses another, which is kept in the browser beside the columns' widths. A query change — a header sorted, a filter typed — re-reads from
the first page, at the size the viewer chose. Page Up and Page Down in the grid turn its page, the keyboard's row keeping its
place. Previous and Last land on a page boundary, so the pages the viewer steps through are the ones First counts from. A grid
that holds all its rows draws no pager: it has nothing to page, and `Paging` there does nothing; a bound `Paging` turned off
hides the pager. The pager's words are the framework's (`UIStrings.Pager*`).

### CSV export

The grid carries no export button: what leaves the screen as a file is the application's own command. `UIDataGridCsv` writes
the rows over the grid's columns — the captions as the header line, a column that reads no property (a detail column, and a
table column the grid did not add itself, whose key is a name rather than a property) left out.
The columns are the grid's `Columns`; build the grid in one factory method and take them from it, so the file has the grid's
own columns — in the order they were authored, whatever the viewer hid or moved:

```csharp
// in the view
internal static IReadOnlyList<UITableColumn> ExportColumns { get; } = CreateGrid().Columns;

// in the controller
[UICommand]
public async Task ExportAsync(CancellationToken cancellationToken)
{
    var content = UIDataGridCsv.WriteBytes(OrdersView.ExportColumns, Orders);

    _ = await Context.Downloads.DownloadAsync(Context.Handle, "orders.csv", "text/csv", content, cancellationToken);
}
```

By default the file carries **values**, not the cells' text: a number plain, a moment to the second without a zone (a
`DateTimeOffset` as its UTC moment — a spreadsheet keeps neither a zone nor an offset), a flag as `true` or `false`, so a
spreadsheet reads them back as numbers and dates. Text that opens with `=`, `+`, `-`, `@`, a tab or a carriage return is
written behind a quote, so a spreadsheet opens it as the words it is rather than running it as a formula; a number, a date, a
flag and a number column's numeric text are never touched, and `EscapeFormulas = false` turns it off. `new UIDataGridCsvOptions
{ Format = DataGridCellFormatter.AsCsvFormat(culture, translate), Translate = … }` writes what the cells show instead, through
the same formatter they use — the writer is the component package's, so a controller can call it, and the formatter is the web
package's. `Translate` turns the captions into the page's words (a content column's stays as written) and the formatter's own translator the choices; without one, a
boolean that would write one of the grid's keys writes `true` or `false`. `Separator` is a comma unless set — a semicolon suits
a culture that writes its decimals with a comma. `WriteBytes` puts a byte-order mark
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

One row stands open at a time unless `MultipleDetails`. From the keyboard, Enter or Space on the chevron's cell opens and closes it,
as a click on the chevron does; an open detail is a cell spanning its row, which Down from the row reaches and Up from the row under
it, Enter or F2 going into it; with `ExpandOnClick`, Enter on the keyboard's row opens and closes it as a click does too; a double click, which opens the row, leaves the details as they stood before its first click; a row of a table
inside a detail is that table's, and opens nothing of the grid's. A cell that answers the click itself — the checkbox, an
editable one while the grid edits — never opens the row. The detail is a child of the row, so it stripes, hides and scrolls with it; it is drawn when the row opens, against the
row's own item, whether the server painted the row or the browser built it. A press on a button, a field or the text inside an
open detail is the detail's, not the row's. It fades in as it opens. The detail column's chevron is named *Details* (`ui.grid.details`) for a reader,
and says whether its detail is out.

### A column chooser and responsive columns

`SetColumnChooser()` puts a button in the band that opens a menu of the columns, each a check entry — the last column still
showing cannot be unchecked; the viewer's choices are kept in the browser under the grid's id, beside the widths a resizable grid keeps, and painted before the first frame
with them. A column may start hidden at every width — `hidden: true` on its helper, or `HideColumn(key)` — and the chooser lists
it unchecked for the viewer to bring back; or it may give way on its own below a viewport tier:

```csharp
new DataGridComponent("orders")
    .SetColumnChooser()
    .AddNumberColumn("Discount", nameof(Order.Discount), "P0", hidden: true)
    .HideColumnBelow(nameof(Order.Country), UIResponsiveTier.Xl)
    .HideColumnBelow(nameof(Order.Paid), UIResponsiveTier.Md)
```

A hidden column keeps its place: its track goes to zero and comes back with its width, so resizing and pinning read as
before, and the width it gave up goes to the columns that are left rather than off the grid's edge. The viewer's word wins
over the author's — a column hidden from the start or below a tier; a word that only repeats the author's is not kept.
`selection` is the key of the grid's own column of checkboxes and is refused for an author's column.

### Rows the viewer moves

The grid's rows move as a table's do. With `SetDraggable(true)` a row whose item does not refuse it (`CanDrag = false`) is dragged
between two others — a line marks where it would land — or moved one place by Alt+Up and Alt+Down, and the command named by
`OnRowMoveWithItemKey` gets the row's key and the index it now takes, which is where `RecursiveCollection.Move` puts it. The row
stands in its new place as soon as it is dropped; the command's answer says where it stays, and a controller that refuses, fails
or loses the connection puts it back.

```csharp
new DataGridComponent("steps")
    .BindItems(nameof(StepsController.Steps))
    .SetDraggable(true)
    .OnRowMoveWithItemKey(nameof(StepsController.MoveStep))

[UICommand]
public void MoveStep(string id, int index)
    => Steps.Move(Steps.IndexOf(Steps.First(step => step.Id == id)), index);
```

A windowed grid hands over the row's place in the source's whole query — the window's offset added — for the source to move.
While a sort orders the rows no row moves, since the sort would put it back. An open detail is not the row to lift.

### Columns the viewer moves

`SetReorderableColumns(true)` lets a caption be dragged along the header to another place — a line shows where the column would
land — or moved with Alt and an arrow when the keyboard is on it in the header. The order is kept in the browser under the grid's id
beside the widths and the hidden columns, and painted before the first frame with them; the chooser's menu lists the columns
in the order they stand. A pinned column and the grid's own column of checkboxes keep the places they were written in, and
nothing is dropped among them. A click that sorts and a drag that moves are the same press: a drag that moved a column does
not sort. What the server writes — a CSV export — is in the order the columns were authored in, as the widths are.

### Wide grids and pinned columns

A grid wider than its box scrolls sideways as a whole, as the framework's table does by default — the header moves with the
rows, the band and the pager keep their place at the start edge, the footer of totals stays over the pager, and the keyboard's cell
past either edge — and the editor opened on it — is scrolled into the box, clear of the pinned columns — and a column that
says `pinned: true` stays in place while the rest slide under it. Pinned columns lead the grid; one after an unpinned
column is refused.

How wide the grid is, its columns say. A column's width is a floor and a share, not an exact size: it never goes under the
width it was given, and whatever the grid has beyond the sum of them the columns share in proportion. So a grid always
fills its box, and one whose widths add up past the box is the one that scrolls sideways.

```csharp
new DataGridComponent("orders")
    .AddTextColumn("Order", nameof(Order.Number), sortable: true, UIGridUnit.Absolute(120), pinned: true)
    .AddEditableColumn("Customer", template, editor, sortPath: nameof(Order.Customer), width: UIGridUnit.Absolute(240), pinned: true)
    .AddTextColumn("Country", nameof(Order.Country), width: UIGridUnit.Absolute(180))
```

The pinned cells stand on the grid's own ground with the row's stripe, hover and selection painted over it, and the last
of them draws the edge the rest scroll under. Resizing a pinned column moves the ones after it.

### A footer of totals

A column that says `aggregate: UIDataGridAggregate.Sum` (or `Average`, `Count`, `Min`, `Max`) gets a footer under the
rows with the number under it, formatted as the column's cells are — a count as a plain number; a numeric text in a number
column counts as the number it reads as, as its cell shows it. Over rows the page
holds it is computed in the browser, over the rows the filters leave. Over a windowed source the source answers it
beside its window, over every row the query leaves and not only the window:

```csharp
.AddMoneyColumn("Total", nameof(Order.Total), "€", aggregate: UIDataGridAggregate.Sum)

// in the source
return new UIItemWindow<Order>(rows) { Offset = start, TotalCount = total, Aggregates = new Dictionary<string, object> { [nameof(Order.Total)] = sum } };
```

The dictionary is keyed by the row property. The request does not name the totals it wants, so the source computes the ones
the grid's columns ask for. A windowed grid never sums its window as the column's total: a source that sends no `Aggregates`
leaves the footer blank. A source whose totals a cell edit changes sets its own `Aggregates` in `TryWriteAsync`, as the demo does, so the new totals
reach the page at once rather than with the next window.

### Editing in place

A typed column that says `editable: true` opens its own field in the cell — a text field, a number field, a date or a
date-and-time picker (by whether the pattern has a time), a checkbox, a select over the enum's choices. A template
column takes the editor the author bound:

```csharp
.AddNumberColumn("Quantity", nameof(Order.Quantity), "N0", editable: true)
.AddEditableColumn("Status", new TextComponent().BindBadgeText(nameof(Order.StatusCaption), UIBindingScope.Relative), new SelectComponent().SetOptions(statuses).BindValue(nameof(Order.Status), UIBindingScope.Relative), sortPath: nameof(Order.Status))
.OnCellEdit(nameof(OrdersController.CellEdited))   // CellEdited(string id, string column)
```

A double click on the cell, or Enter, F2 or a typed character with the keyboard's cursor on it, opens the editor in the cell's own
track; a typed character replaces the value, as a spreadsheet's typing does. The editor is drawn at that moment and taken away
again when it closes, so a grid of a hundred rows carries one editor rather than one per editable cell. Enter or a click elsewhere
commits, Escape puts the value back, Tab and Shift+Tab commit and open the next or the previous editable cell — in the order the
viewer sees the columns, skipping a hidden one — and past a row's last go on to the next row's first (Shift+Tab to the previous
row's last); Tab moves on from a select's or a search's open list too, committing what the field holds. A choice from the
editor's list — a select's or a search's, by Enter or a click — commits as Enter does. Enter or Escape gives the keyboard back to
the edited cell, the cursor standing on it. The keys inside the editor are its own: Left and Right move the caret. A committed
editor stays over its cell, showing the new value and the cursor's frame, until the
commit's answer has written the cell, so the old value never shows in between; leaving the window
for another (Alt+Tab, the address bar) leaves the editor open and sends nothing, the change a browser raises on the way out
included. An editor whose column hides under it (a narrower window) commits and leaves the keyboard on the grid. The value
travels the framework's ordinary two-way path — the field's `Value` is bound to the row's property — so a row of a bound
collection takes it directly, and a row of a windowed source takes it through the source's `TryWriteAsync`, which may refuse it
and have the old value pushed back. `OnCellEdit` runs after the value has landed, with the row's key as `id` and the column's as
`column`; a property column is keyed by its property and a template column by its sort path, unless you name a key.

The grid's own `Editable` switch, on by default, says whether editable cells open their editors at all. It is bindable, so a
mode can stop the cells editing without touching its columns — the keyboard still chooses and opens rows, and a double click on
an editable cell opens its row as on any other cell. An editor open when editing turns off, or when the grid turns disabled or
loading — itself or through a component around it — closes as Escape closes it, sending nothing:

```csharp
new DataGridComponent("orders")
    .BindEditable(nameof(OrdersController.IsEditing))
```

The editor is any input: a search over the known values reads as naturally as a select. It opens on the value the row
holds, with its list and the keyboard in its search field; a pick commits, as Enter does.

An editor carries the field's rules (`Validate`, `Required`, `Regex`) and bounds. A typed column takes them through
`configureEditor`, typed by its editor; a template column's editor is the author's own:

```csharp
.AddNumberColumn("Quantity", nameof(Order.Quantity), "N0", editable: true, configureEditor: editor => editor.SetMax(100).Validate(UIValidationTrigger.Change, UIComparisonOperator.Greater, 0, "At least one."))
.AddTextColumn("Note", nameof(Order.Note), sortable: true, editable: true, configureEditor: editor => editor.Required("No note.", severity: UIValidationSeverity.Info))
```

While the editor is open, its field's mark speaks as the value is typed. An error or a bound holds the value back: Enter, Tab, a
double click on another cell or a click elsewhere leaves the editor open over it, the focus back in its field, until it is put
right or Escape takes it back; a warning or a note commits. A closed cell is judged by its editor's rules whenever its row is
shown — drawn, after a commit, after the server writes it — and a value that fails wears the strongest severity's edge in the box
the editor's field takes, its words in the mark's tooltip.

An editable cell answers the pointer with the field's faint ground in that same box, so a reader sees what opens before it does;
nothing while `Editable` is off, nor while the keyboard's frame shows, the frame alone being the cursor.

### Choosing rows

`SelectionMode = Many` puts a column of checkboxes before every other column, with a three-state one over them that takes or
clears the rows the grid has drawn — what the filters left of a grid holding all its rows, the rows on the page of a
virtualized or windowed one, never rows the source has not handed over; a row a filter hid is neither taken nor counted. The boxes are named *Select row* and *Select all rows* for a screen reader (`ui.grid.select-row`,
`ui.grid.select-all`). The column is the grid's own: it
carries no resize handle, the chooser never offers it and an export never writes it. While it is there a click on a row chooses
nothing, that click belonging to the row's detail. The keyboard still chooses, and adds to the ticks rather than replacing them:
Space on the keyboard's row ticks or unticks it, Shift with an arrow takes the range from the row last clicked or ticked to the
one it reaches, and Enter opens the row rather than choosing it, but on the checkbox's own cell turns its box as Space does. A row whose item refuses the choice (`CanSelect = false`) has
its box turned off, and the box over them neither takes nor counts it; with no row to take, that box is turned off too — the
framework's way, so a box keeps a focus it holds. The table's row template reads `CanSelect` off the item by name, so a
bindable property of that name turns the box off and on as it changes (the demo's cancelled subscriptions).

The chosen keys are the host's `SelectedKeys`, bound two-way like any value, and `OnSelectionChange` runs whenever they change —
at a box or from the keyboard — once they have reached the server, which is where a button that acts on the choice learns it
has something to act on. A grid choosing one row (`SelectionMode = One`, `SelectedKey`) has no boxes: a click on a row chooses
it, and `OnSelectionChange` runs for that too. A list the controller pushes is its own and runs nothing.

```csharp
new DataGridComponent("orders")
    .SetSelectionMode(UISelectionMode.Many)
    .BindSelectedKeys(nameof(OrdersController.SelectedOrders))
    .OnSelectionChange(nameof(OrdersController.SelectionChanged))
```

### The keyboard

The grid is one stop of the Tab order: Tab comes to it, then to the band's search box and its Filters and Columns buttons, then to the
pager where it pages — one stop too, its buttons walked by the arrows — and on out of it. No caption, row, chevron or checkbox is a stop of its own; the framework's cell cursor walks the cells
and the header is a group reached from them — the ARIA grid pattern, cell by cell.

- **Cells.** Left and Right move along the row through every cell, read-only ones and the checkbox's and chevron's included, Home
  and End to the row's first and last; Up and Down move between rows in the same column — an open detail is a line of its own —
  Ctrl+Home and Ctrl+End to the first and the last row, Page Up and Page Down a viewport's height (a page, in a grid that pages) at
  a time. The grid keeps the focus and names the cell (`aria-activedescendant`); the row is lit with the framework's keyboard wash
  and the cell wears its frame — only while the keyboard holds the grid, never after a press of the pointer.
- **Enter, F2 or a character** on an editable cell opens its editor, as above. **Enter or Space** on the chevron's cell opens or
  closes the detail, and Enter on the checkbox's cell ticks or unticks its row; elsewhere Enter runs the row's click (`OnRowClick…`), as a press of the pointer does, and its `OnRowOpen…`
  after it. Where the grid chooses, the framework's rule stands: one row at a time follows the arrows, Enter chooses before it
  presses, and Space ticks a row of a grid choosing many — Shift with Up or Down takes the range — rather than pressing it.
- **Delete** raises the rows' remove where the grid has `OnRowRemove…`.
- **The header.** Up from the first row goes to the header — to the caption of the cursor's column — where Left and Right walk the
  captions in the order the columns stand and Home and End go to the ends; Enter or Space sorts by the caption, Shift with them adds
  it to the sort, Alt with an arrow moves its column, Shift with an arrow sizes it, and Space on the box over the checkboxes takes
  or clears them. Down goes back to the rows, in the caption's column.

To a screen reader the grid is a `grid` of `row`s and `gridcell`s whatever it chooses, its captions `columnheader`s carrying
`aria-sort`; a windowed or virtualized grid says where each drawn row stands among them all (`aria-rowindex`, `aria-rowcount`).

## Inside the package

The grid draws no mark of its own: the sort arrow, the detail column's chevron and the marks on
the band's buttons are the framework's `ne-` glyphs (`UIGlyphs`), so they are the same drawing family as every field's chevron
and cross. Its stylesheet imports the framework's Less contract (`Client/plugin/ne-standard-ui.less` — the tokens and the
mixins, copied like the TypeScript contract beside it) rather than restating the motion, the focus ring or the field's ground.
The engines are classes started once per page from the framework's engine context, in the shape the framework's own engines
take, and they need the framework's plugin contract 4: the names the framework writes on the page come from its `names`, and
whether a part answers the reader from its `states`, through which the grid also turns its own controls off
(`states.setDisabled`). The grid's own names are spelled once, in `data-grid-names.ts`, which a test holds to the renderers'
constants; a cell's text is held to the same corpus on the server and in the browser. Under forced colours the states the grid draws with a wash or
a shadow — an open band button, a caption under the pointer or pressed, Clear filters under the pointer — take outlines in the
system's colours, from the grid's own block.

## Licence

The framework's: **the Prosperity Public License 3.0.0** — free for noncommercial use, with a thirty-day trial
for commercial use. See [LICENSE.md](https://github.com/AkiEvansDev/NE.Standard.UI.DataGrid/blob/main/LICENSE.md).

## Contributing

This repository is a **read-only mirror**. Development happens in a private repository alongside the
framework — that is how the grid stays in step with the table it derives from — and everything here is
generated from it, so pull requests are switched off.

Issues are open and welcome.
