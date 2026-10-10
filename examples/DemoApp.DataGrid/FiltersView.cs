namespace DemoApp.DataGrid;

/// <summary>
/// What stands around the rows rather than in them: the band over the header with its search box, filters and column chooser, and
/// the footer of totals under them.
/// </summary>
internal sealed class FiltersView : DataGridDemoView, IUIViewDefinition
{
    public static string ViewKey => "datagrid.filters";

    protected override string Route => FiltersRoute;

    public override string Title => "grid-demo.page.filters";

    protected override string Description
        => "grid-demo.page.filters.description";

    protected override IVisualComponent[] CreateSections()
        =>
        [
            Example("The filters behind a button",
                "The band over the header holds the search box, the filters button and the columns button. What is typed in the search box matches one text the row composes — the number, the customer, the country — since a query's terms are all required and cannot say \"any of\". Behind the filters button stands a captioned filter per column: a text match, a from and a to for numbers and dates, a select for enums and booleans; the count beside the word says how many hold something. The columns button shows and hides columns: the start date begins hidden (`hidden: true`) and is listed there unchecked, and the country and the payment give way on their own on a narrower screen. The customer, the servers and the start date wear an icon before their caption (`icon:`), in the header and in the chooser alike. The cells do not edit here — that is the first page — so a double click on any of them opens the row, as Enter on the keyboard's row does, and leaves the details as they were before it; a click chooses one row and shows its detail. A cancelled subscription is never chosen. A row's detail holds a table of its own, the plans' prices: a click on one of its rows is that table's and leaves the detail open.",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    .AddChild(SubscriptionGrid.Create("subscriptions-flyout", band: true, totals: true, prices: true)
                        .BindItems(nameof(FiltersController.Subscriptions))
                        .SetEditable(false)
                        // One at a time, by a click on the row: no column of checkboxes, and the choice is said as it changes.
                        .SetSelectionMode(UISelectionMode.One)
                        .BindSelectedKey(nameof(FiltersController.ChosenSubscription))
                        .OnSelectionChange(nameof(FiltersController.SelectionChanged))
                        .SetExpandOnClick(true)
                        .OnRowOpenWithItemKey(nameof(FiltersController.RowOpened))
                        .SetMaxHeight(UILayoutLength.Absolute(420))
                    )
                    .AddChild(CreateStatus(nameof(FiltersController.RowStatus)))
            ),
            Example("From the keyboard",
                "The grid is one stop of the Tab order: Tab comes to it, then to the search box and the two buttons of its band, and on out of it — no caption and no row is a stop of its own. On the grid the arrows walk the cells, Home and End go to the row's first and last, Ctrl+Home and Ctrl+End to the first and the last row, Page Up and Page Down a screenful at a time, and the cell the keyboard stands on is framed, its row lit, only while the keyboard holds the grid. Enter on a cell runs the row's click — here it opens the subscription, as a click on the row does — and Enter or Space on the chevron's cell opens and closes its detail, as the chevron does; Down from an open row stands on its detail. Up from the first row goes to the caption of the cell's column: Left and Right walk the captions, Enter or Space sorts by one, Alt with an arrow moves its column and Shift with an arrow sizes it; Down goes back to the rows, in that caption's column. No row is chosen here: a click and the keyboard open, and that is all.",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    .AddChild(SubscriptionGrid.Create("subscriptions-keys", band: true)
                        .BindItems(nameof(FiltersController.Subscriptions))
                        .SetEditable(false)
                        .SetResizableColumns(true)
                        .SetReorderableColumns(true)
                        // The row's click, which Enter and Space run from the keyboard; the grid chooses nothing.
                        .OnRowClickWithItemKey(nameof(FiltersController.RowPressed))
                        .SetMaxHeight(UILayoutLength.Absolute(360))
                    )
                    .AddChild(CreateStatus(nameof(FiltersController.PressStatus)))
            )
        ];
}
