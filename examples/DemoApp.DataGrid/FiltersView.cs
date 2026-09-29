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
                "The band over the header holds the search box, the filters button and the columns button. What is typed in the search box matches one text the row composes — the number, the customer, the country — since a query's terms are all required and cannot say \"any of\". Behind the filters button stands a captioned filter per column: a text match, a from and a to for numbers and dates, a select for enums and booleans; the count beside the word says how many hold something. The columns button shows and hides columns, and the country and the payment give way on their own on a narrower screen. The cells do not edit here — that is the first page — so a double click on any of them opens the row, as Enter on the keyboard's row does, and leaves the details as they were before it; a click chooses one row and shows its detail. A cancelled subscription is never chosen. A row's detail holds a table of its own, the plans' prices: a click on one of its rows is that table's and leaves the detail open.",
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
            )
        ];
}
