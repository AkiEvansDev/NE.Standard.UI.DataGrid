namespace DemoApp.DataGrid;

/// <summary>
/// The columns and what a viewer does to them: the kinds a column formats, a template column bound to the row, sorting by header,
/// editing in place, the detail under a row, and the file the columns write.
/// </summary>
internal sealed class ColumnsView : DataGridDemoView, IUIViewDefinition
{
    public static string ViewKey => "datagrid.columns";

    protected override string Route => ColumnsRoute;

    public override string Title => "grid-demo.page.columns";

    protected override string Description
        => "grid-demo.page.columns.description";

    protected override IVisualComponent[] CreateSections()
        =>
        [
            Example("Typed columns and template columns",
                "The typed columns format the row's values: the servers and the monthly price are numbers, the plan an enum, the start a date, the payment a yes or a no. The customer, the status and the usage are template columns — any component bound to the row: two lines of text, a badge, a bar — sorted by a property the column names. Click a caption to sort, again to reverse, a third time to clear; hold Shift to sort by several. Drag a caption sideways to move its column, or press Ctrl with an arrow on it — the grid's own column of checkboxes stays where it is. Double-click a cell to edit it: Enter or a click elsewhere commits, Escape puts the value back, Tab moves along the row. An editable column carries the field its kind wants; a template column takes the editor the author bound, which is why the customer is edited in a search over the known customers and the status in a select over the enum. Change the plan or the servers and the monthly price follows; it is the one column that does not edit. The chevron opens what the row holds under itself. A cancelled subscription cannot be chosen: its box is turned off, and the box over them all takes only the rest — choose them all and delete them, and it turns off too, with nothing left to take.",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    .AddChild(new StackPanelComponent()
                        .SetOrientation(UIOrientation.Horizontal)
                        .SetSpacing(16)
                        .AddChild(new SwitchComponent()
                            .SetTitle("grid-demo.columns.cells-edit")
                            .BindValue(nameof(ColumnsController.Editing))
                        )
                        // The grid carries no export button of its own: the writer is the application's to call.
                        .AddChild(new ButtonComponent()
                            .SetTitle("grid-demo.columns.download")
                            .SetType(UIButtonType.Outline)
                            .SetSize(UIButtonSize.Small)
                            .OnClick(nameof(ColumnsController.ExportAsync))
                        )
                        // What a choice turns on: the button is not there until a row is ticked.
                        .AddChild(new ButtonComponent()
                            .SetTitle("grid-demo.columns.delete-chosen")
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
                        .SetTitleWrap(true)
                        .SetTitleType(UITextAppearance.Caption)
                        .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                    )
                    .AddChild(new TextComponent()
                        .BindTitle(nameof(ColumnsController.SelectionStatus))
                        .SetTitleWrap(true)
                        .SetTitleType(UITextAppearance.Caption)
                        .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                    )
            ),
            Example("Rules in a cell",
                "A typed column's editor takes the field's rules and bounds through configureEditor: a line holds at least one server (an error) and at most a hundred (a bound), a price over €300 a server warns, and an empty note is noted (info). A closed cell is judged by its editor's rules whenever it is shown — as the page opens, after a commit, after the server writes the row — and wears the verdict as a field does: the severity's edge, and a mark whose tooltip speaks it; the quote opens with one of each. Double-click a cell and type 0, 120, 320 or nothing: the field's mark speaks as you type. An error or a bound holds the value back: Enter, Tab or a click elsewhere leaves the editor open over it, the focus back in the field, until it is put right or Escape takes it back. A warning or a note commits, and the closed cell keeps wearing it.",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    .AddChild(new DataGridComponent("quote")
                        .AddTextColumn("ID", nameof(QuoteLine.Number), sortable: true, UIGridUnit.Absolute(110), content: true)
                        .AddEnumColumn("grid-demo.column.plan", nameof(QuoteLine.Plan), SubscriptionChoices.Plans, UIGridUnit.Absolute(140))
                        .AddNumberColumn("grid-demo.column.servers", nameof(QuoteLine.Servers), "N0", UIGridUnit.Absolute(120), editable: true, configureEditor: editor => editor
                            .SetAllowDecimals(false)
                            .SetMax(100)
                            .Validate(UIValidationTrigger.Change, UIComparisonOperator.Greater, 0, "grid-demo.quote.servers-rule")
                        )
                        .AddMoneyColumn("grid-demo.column.price", nameof(QuoteLine.Price), "€", width: UIGridUnit.Absolute(160), editable: true, configureEditor: editor => editor
                            .Validate(UIValidationTrigger.Change, UIComparisonOperator.LessOrEqual, QuoteLine.PriceLimit, "grid-demo.quote.price-rule", UIValidationSeverity.Warning)
                        )
                        .AddTextColumn("grid-demo.column.note", nameof(QuoteLine.Note), sortable: true, UIGridUnit.Absolute(240), editable: true, configureEditor: editor => editor
                            .Required("grid-demo.quote.note-rule", severity: UIValidationSeverity.Info)
                        )
                        // Not editable: the servers times the price, and changes with either.
                        .AddMoneyColumn("grid-demo.column.monthly", nameof(QuoteLine.Total), "€", width: UIGridUnit.Absolute(150))
                        .BindItems(nameof(ColumnsController.QuoteLines))
                        .OnCellEdit(nameof(ColumnsController.QuoteLineEdited))
                    )
                    .AddChild(CreateStatus(nameof(ColumnsController.QuoteStatus)))
            )
        ];
}
