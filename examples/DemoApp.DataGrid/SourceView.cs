namespace DemoApp.DataGrid;

/// <summary>
/// A hundred thousand subscriptions read a window at a time, in the two ways a window reaches the screen: as the viewer scrolls, and a
/// page at a time. One grid each — the two are different things to look at, not a switch on one grid.
/// </summary>
internal sealed class SourceView : DataGridDemoView, IUIViewDefinition
{
    public static string ViewKey => "datagrid.source";

    protected override string Route => SourceRoute;

    protected override string Header => "grid-demo.page.source";

    protected override string Description
        => "grid-demo.page.source.description";

    protected override IVisualComponent[] CreateSections()
        =>
        [
            Example("Virtual scrolling over 100,000 rows",
                "A windowed source loads slices on demand as you scroll while keeping ID and Customer pinned during horizontal scroll. Search, column filters and multi-column sorts bind through UIItemsQuery so filtering, ordering and footer totals execute on the server.",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    // The controller writes the query too: its terms show in the filter fields, as if the viewer had typed them.
                    .AddChild(new StackPanelComponent()
                        .SetOrientation(UIOrientation.Horizontal)
                        .SetSpacing(8)
                        .AddChild(new ButtonComponent()
                            .SetTitle("grid-demo.source.past-due")
                            .SetVariant(UIButtonVariant.Ghost)
                            .SetSize(UISize.Small)
                            .OnClick(nameof(SourceController.ShowPastDue))
                        )
                        .AddChild(new ButtonComponent()
                            .SetTitle("grid-demo.source.no-filters")
                            .SetVariant(UIButtonVariant.Ghost)
                            .SetSize(UISize.Small)
                            .OnClick(nameof(SourceController.ClearFilters))
                        )
                    )
                    .AddChild(SubscriptionGrid.Create("subscriptions-scrolling", wide: true, band: true, totals: true)
                        .BindSource<SourceController>(c => c.ScrollingSource)
                        .SetWindowSize(20)
                        .BindQuery<SourceController>(c => c.ScrollingQuery)
                        .OnQueryChange(nameof(SourceController.ScrollingQueryChanged))
                        .OnCellEdit(nameof(SourceController.CellEdited))
                        .SetResizableColumns(true)
                        .SetReorderableColumns(true)
                        .SetHorizontalScroll(UIScrollMode.Auto)
                        .SetMaxHeight(UILayoutLength.Absolute(420))
                    )
                    .AddChild(CreateStatus<SourceController>(c => c.ScrollingStatus))
            ),
            Example("Server-side paging",
                "Enabling Paging switches the windowed source from continuous scroll to discrete pages driven by the built-in PagerComponent (or Page Up / Page Down), with page-size options configured via ConfigurePager.",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    .AddChild(SubscriptionGrid.Create("subscriptions-paged", wide: true, band: true, totals: true)
                        .BindSource<SourceController>(c => c.PagedSource)
                        .SetWindowSize(20)
                        .BindQuery<SourceController>(c => c.PagedQuery)
                        .OnQueryChange(nameof(SourceController.PagedQueryChanged))
                        .OnCellEdit(nameof(SourceController.CellEdited))
                        .SetResizableColumns(true)
                        .SetReorderableColumns(true)
                        .SetHorizontalScroll(UIScrollMode.Auto)
                        .SetMaxHeight(UILayoutLength.Absolute(420))
                        .SetPaging(true)
                        .ConfigurePager(pager => pager.SetPageSizes([20, 50, 100]))
                    )
                    .AddChild(CreateStatus<SourceController>(c => c.PagedStatus))
            ),
            // One line for both grids: whichever cell was committed, the source took the write.
            CreateStatus<SourceController>(c => c.EditStatus)
        ];
}
