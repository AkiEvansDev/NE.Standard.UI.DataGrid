namespace DemoApp.DataGrid;

/// <summary>
/// A hundred thousand subscriptions read a window at a time, in the two ways a window reaches the screen: as the viewer scrolls, and a
/// page at a time. One grid each — the two are different things to look at, not a switch on one grid.
/// </summary>
internal sealed class SourceView : DataGridDemoView, IUIViewDefinition
{
    public static string ViewKey => "datagrid.source";

    protected override string Route => SourceRoute;

    public override string Title => "grid-demo.page.source";

    protected override string Description
        => "grid-demo.page.source.description";

    protected override IVisualComponent[] CreateSections()
        =>
        [
            Example("As the viewer scrolls",
                "The window follows the scroll: nearing its end asks the source for the next one, and the rows behind are given up again. This is the windowed table's own behaviour and the grid adds nothing to it. Given room enough to run past the page, the grid scrolls sideways as a whole, the number and the customer pinned at its edge while the rest slide under them; drag a caption to move its column, or its edge to size it — the pinned ones keep the head of the row. The query the headers and the filters write is bound to the controller, so the source sorts, narrows and adds up the whole hundred thousand and hands back only the window the viewer is looking at.",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    // The controller writes the query too: its terms show in the filter fields, as if the viewer had typed them.
                    .AddChild(new StackPanelComponent()
                        .SetOrientation(UIOrientation.Horizontal)
                        .SetSpacing(8)
                        .AddChild(new ButtonComponent()
                            .SetTitle("grid-demo.source.past-due")
                            .SetType(UIButtonType.Outline)
                            .SetSize(UIButtonSize.Small)
                            .OnClick(nameof(SourceController.ShowPastDue))
                        )
                        .AddChild(new ButtonComponent()
                            .SetTitle("grid-demo.source.no-filters")
                            .SetType(UIButtonType.Outline)
                            .SetSize(UIButtonSize.Small)
                            .OnClick(nameof(SourceController.ClearFilters))
                        )
                    )
                    .AddChild(SubscriptionGrid.Create("subscriptions-scrolling", wide: true, band: true, totals: true)
                        .BindSource(nameof(SourceController.ScrollingSource))
                        .SetWindowSize(20)
                        .BindQuery(nameof(SourceController.ScrollingQuery))
                        .OnQueryChange(nameof(SourceController.ScrollingQueryChanged))
                        .OnCellEdit(nameof(SourceController.CellEdited))
                        .SetResizableColumns(true)
                        .SetReorderableColumns(true)
                        .SetHorizontalScroll(UIScrollMode.Auto)
                        .SetMaxHeight(UILayoutLength.Absolute(420))
                    )
                    .AddChild(new TextComponent()
                        .BindTitle(nameof(SourceController.ScrollingStatus))
                        .SetTitleWrap(true)
                        .SetTitleType(UITextAppearance.Caption)
                        .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                    )
            ),
            Example("A page at a time",
                "With Paging on, the window is a page: the scroll asks for nothing and the pager under the rows does, by offset. The line beside the buttons says which rows the page holds. Cells edit here too: a windowed source takes the write and reads the subscription anew.",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    .AddChild(SubscriptionGrid.Create("subscriptions-paged", wide: true, band: true, totals: true)
                        .BindSource(nameof(SourceController.PagedSource))
                        .SetWindowSize(20)
                        .BindQuery(nameof(SourceController.PagedQuery))
                        .OnQueryChange(nameof(SourceController.PagedQueryChanged))
                        .OnCellEdit(nameof(SourceController.CellEdited))
                        .SetResizableColumns(true)
                        .SetReorderableColumns(true)
                        .SetHorizontalScroll(UIScrollMode.Auto)
                        .SetMaxHeight(UILayoutLength.Absolute(420))
                        .SetPaging(true)
                    )
                    .AddChild(new TextComponent()
                        .BindTitle(nameof(SourceController.PagedStatus))
                        .SetTitleWrap(true)
                        .SetTitleType(UITextAppearance.Caption)
                        .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                    )
            ),
            // One line for both grids: whichever cell was committed, the source took the write.
            CreateStatus(nameof(SourceController.EditStatus))
        ];
}
