using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Authoring.Views;
using NE.Standard.UI.Components.BuiltIns.Layouts;
using NE.Standard.UI.DataGrid;
using NE.Standard.UI.Extensions;
using NE.Standard.UI.Primitives.Styling;

namespace DemoApp.DataGrid;

/// <summary>
/// A hundred thousand orders read a window at a time, in the two ways a window reaches the screen: as the viewer scrolls, and a
/// page at a time. One grid each — the two are different things to look at, not a switch on one grid.
/// </summary>
internal sealed class SourceView : DataGridDemoView, IUIViewDefinition
{
    public static string ViewKey => "datagrid.source";

    protected override string Route => SourceRoute;

    public override string Title => "A large source";

    protected override string Description
        => "The same columns over a windowed source of a hundred thousand orders: the source sorts, narrows and adds up, and hands back the window on show.";

    protected override IVisualComponent[] CreateSections()
        =>
        [
            UIPage.Section("As the viewer scrolls",
                "The window follows the scroll: nearing its end asks the source for the next one, and the rows behind are given up again. This is the windowed table's own behaviour and the grid adds nothing to it. Given room enough to run past the page, the grid scrolls sideways as a whole, the order and the customer pinned at its edge while the rest slide under them; drag a caption to move its column, or its edge to size it — the pinned ones keep the head of the row. The query the headers and the filters write is bound to the controller, so the source sorts, narrows and adds up the whole hundred thousand and hands back only the window the viewer is looking at.",
                CreateGrid("orders-scrolling",
                    nameof(SourceController.ScrollingSource),
                    nameof(SourceController.ScrollingQuery),
                    nameof(SourceController.ScrollingQueryChanged),
                    nameof(SourceController.ScrollingStatus))
            ),
            UIPage.Section("A page at a time",
                "With Paging on, the window is a page: the scroll asks for nothing and the pager under the rows does, by offset. The line beside the buttons says which rows the page holds. Cells edit here too: a windowed source takes the write and reads the order anew.",
                CreateGrid("orders-paged",
                    nameof(SourceController.PagedSource),
                    nameof(SourceController.PagedQuery),
                    nameof(SourceController.PagedQueryChanged),
                    nameof(SourceController.PagedStatus),
                    paging: true)
            ),
            // One line for both grids: whichever cell was committed, the source took the write.
            CreateStatus(nameof(SourceController.EditStatus))
        ];

    private static StackPanelComponent CreateGrid(string id, string source, string query, string queryChanged, string status, bool paging = false)
    {
        DataGridComponent grid = OrderGrid.Create(id, wide: true, band: true, totals: true)
            .BindSource(source)
            .SetWindowSize(20)
            .BindQuery(query)
            .OnQueryChange(queryChanged)
            .OnCellEdit(nameof(SourceController.CellEdited))
            .SetResizableColumns(true)
            .SetReorderableColumns(true)
            .SetHorizontalScroll(UIScrollMode.Auto)
            .SetMaxHeight(UILayoutLength.Absolute(420));

        if (paging)
            _ = grid.SetPaging(true);

        return new StackPanelComponent()
            .SetOrientation(UIOrientation.Vertical)
            .SetSpacing(8)
            .AddChild(grid)
            .AddChild(CreateStatus(status));
    }
}
