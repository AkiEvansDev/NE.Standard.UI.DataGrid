namespace DemoApp.DataGrid;

/// <summary>
/// The columns and what a viewer does to them: the kinds a column formats, a template column bound to the row, sorting by header,
/// editing in place, the detail under a row, and the file the columns write.
/// </summary>
internal sealed class ColumnsView : DataGridDemoView, IUIViewDefinition
{
    public static string ViewKey => "datagrid.columns";

    protected override string Route => ColumnsRoute;

    public override string Title => "Columns and editing";

    protected override string Description
        => "A grid from NE.Standard.UI.DataGrid over thirty subscriptions the page holds whole: sort by header, move a column, edit a cell, open a row's detail.";

    protected override IVisualComponent[] CreateSections()
        =>
        [
            Example("Typed columns and template columns",
                "The typed columns format the row's values: the servers and the monthly price are numbers, the plan an enum, the start a date, the payment a yes or a no. The customer, the status and the usage are template columns — any component bound to the row: two lines of text, a badge, a bar — sorted by a property the column names. Click a caption to sort, again to reverse, a third time to clear; hold Shift to sort by several. Drag a caption sideways to move its column, or press Ctrl with an arrow on it — the grid's own column of checkboxes stays where it is. Double-click a cell to edit it: Enter or a click elsewhere commits, Escape puts the value back, Tab moves along the row. An editable column carries the field its kind wants; a template column takes the editor the author bound, which is why the customer is edited in a search over the known customers and the status in a select over the enum. Change the plan or the servers and the monthly price follows; it is the one column that does not edit. The chevron opens what the row holds under itself.",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    .AddChild(new StackPanelComponent()
                        .SetOrientation(UIOrientation.Horizontal)
                        .SetSpacing(16)
                        .AddChild(new SwitchComponent()
                            .SetTitle("Cells edit")
                            .BindValue(nameof(ColumnsController.Editing))
                        )
                        // The grid carries no export button of its own: the writer is the application's to call.
                        .AddChild(new ButtonComponent()
                            .SetTitle("Download CSV")
                            .SetType(UIButtonType.Outline)
                            .SetSize(UIButtonSize.Small)
                            .OnClick(nameof(ColumnsController.ExportAsync))
                        )
                        // What a choice turns on: the button is not there until a row is ticked.
                        .AddChild(new ButtonComponent()
                            .SetTitle("Delete chosen")
                            .SetType(UIButtonType.Outline)
                            .SetSize(UIButtonSize.Small)
                            .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Danger))
                            .BindVisibility(nameof(ColumnsController.DeleteVisibility))
                            .OnClick(nameof(ColumnsController.DeleteSelected))
                        )
                    )
                    .AddChild(SubscriptionGrid.Create("subscriptions")
                        .BindItems(nameof(ColumnsController.Subscriptions))
                        .BindEditable(nameof(ColumnsController.Editing))
                        .OnCellEdit(nameof(ColumnsController.CellEdited))
                        .SetReorderableColumns(true)
                        // Many at a time, so the grid puts its own column of checkboxes before every other; the keys land here.
                        .SetSelectionMode(UISelectionMode.Many)
                        .BindSelectedKeys(nameof(ColumnsController.SelectedSubscriptions))
                        .OnSelectionChange(nameof(ColumnsController.SelectionChanged))
                        .SetMaxHeight(UILayoutLength.Absolute(420))
                    )
                    .AddChild(new TextComponent()
                        .BindTitle(nameof(ColumnsController.EditStatus))
                        .SetTitleType(UITextAppearance.Caption)
                        .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                    )
                    .AddChild(new TextComponent()
                        .BindTitle(nameof(ColumnsController.SelectionStatus))
                        .SetTitleType(UITextAppearance.Caption)
                        .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                    )
            )
        ];
}
