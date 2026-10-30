namespace DemoApp.DataGrid;

/// <summary>
/// What stands around the rows rather than in them: the band over the header with its search box, filters and column chooser, and
/// the footer of totals under them.
/// </summary>
internal sealed class FiltersView : DataGridDemoView, IUIViewDefinition
{
    public static string ViewKey => "datagrid.filters";

    protected override string Route => FiltersRoute;

    protected override string Header => "grid-demo.page.filters";

    protected override string Description
        => "grid-demo.page.filters.description";

    protected override IVisualComponent[] CreateSections()
        =>
        [
            Example("Search, column filters and totals",
                "The built-in search bar matches across all columns and embeds the Filters and Columns flyouts at its trailing end, while the footer aggregates visible rows. Clicking a row selects it and expands its detail table (cancelled subscriptions set CanSelect = false).",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    .AddChild(SubscriptionGrid.Create("subscriptions-flyout", band: true, totals: true, prices: true)
                        .BindItems<FiltersController>(c => c.Subscriptions)
                        .SetEditable(false)
                        // One at a time, by a click on the row: no column of checkboxes, and the choice is said as it changes.
                        .SetSelectionMode(UISelectionMode.One)
                        .BindSelectedKey<FiltersController>(c => c.ChosenSubscription)
                        .OnSelectionChange(nameof(FiltersController.SelectionChanged))
                        .SetExpandOnClick(true)
                        .OnItemOpenWithItemKey(nameof(FiltersController.RowOpened))
                        .SetMaxHeight(UILayoutLength.Absolute(420))
                    )
                    .AddChild(CreateStatus<FiltersController>(c => c.RowStatus))
            ),
            Example("Keyboard navigation",
                "The grid is a single Tab stop: arrow keys walk cells and column headers, Enter or Space triggers row actions or header sorts, Alt+Arrow reorders columns and Shift+Arrow resizes them.",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    .AddChild(SubscriptionGrid.Create("subscriptions-keys", band: true)
                        .BindItems<FiltersController>(c => c.Subscriptions)
                        .SetEditable(false)
                        .SetResizableColumns(true)
                        .SetReorderableColumns(true)
                        // The row's click, which Enter and Space run from the keyboard; the grid chooses nothing.
                        .OnItemClickWithItemKey(nameof(FiltersController.RowPressed))
                        .SetMaxHeight(UILayoutLength.Absolute(360))
                    )
                    .AddChild(CreateStatus<FiltersController>(c => c.PressStatus))
            )
        ];
}
