namespace DemoApp.DataGrid;

/// <summary>
/// The columns and what a viewer does to them: the kinds a column formats, a template column bound to the row, sorting by header,
/// editing in place, the detail under a row, and the file the columns write.
/// </summary>
internal sealed class ColumnsView : DataGridDemoView, IUIViewDefinition
{
    public static string ViewKey => "datagrid.columns";

    protected override string Route => ColumnsRoute;

    protected override string Header => "grid-demo.page.columns";

    protected override string Description
        => "grid-demo.page.columns.description";

    protected override IVisualComponent[] CreateSections()
        =>
        [
            Example("Typed columns and template columns",
                "Typed columns format numbers, money, enums, dates and booleans; template columns bind arbitrary row components (two-line text, status badge, usage bar) while sorting by a named property. Search across all columns from the built-in bar, click or Shift-click headers to sort, drag headers to reorder, double-click cells to edit in place, or expand a row's detail chevron.",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    .AddChild(new StackPanelComponent()
                        .SetOrientation(UIOrientation.Horizontal)
                        .SetSpacing(16)
                        .AddChild(new SwitchComponent()
                            .SetTitle("grid-demo.columns.cells-edit")
                            .BindValue<ColumnsController>(c => c.Editing)
                        )
                        // The grid carries no export button of its own: the writer is the application's to call.
                        .AddChild(new ButtonComponent()
                            .SetTitle("grid-demo.columns.download")
                            .SetVariant(UIButtonVariant.Ghost)
                            .SetSize(UISize.Small)
                            .OnClick(nameof(ColumnsController.ExportAsync))
                        )
                        // What a choice turns on: the button is not there until a row is ticked.
                        .AddChild(new ButtonComponent()
                            .SetTitle("grid-demo.columns.delete-chosen")
                            .SetVariant(UIButtonVariant.Ghost)
                            .SetSize(UISize.Small)
                            .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Danger))
                            .BindVisibility<ColumnsController>(c => c.DeleteVisibility)
                            .OnClick(nameof(ColumnsController.DeleteSelected))
                        )
                    )
                    .AddChild(SubscriptionGrid.Create("subscriptions", chooser: true)
                        .BindItems<ColumnsController>(c => c.Subscriptions)
                        .BindEditable<ColumnsController>(c => c.Editing)
                        .OnCellEdit(nameof(ColumnsController.CellEdited))
                        .SetReorderableColumns(true)
                        // Many at a time, so the grid puts its own column of checkboxes right after the detail chevron; the keys land here.
                        .SetSelectionMode(UISelectionMode.Many)
                        .BindSelectedKeys<ColumnsController>(c => c.SelectedSubscriptions)
                        .OnSelectionChange(nameof(ColumnsController.SelectionChanged))
                        .SetMaxHeight(UILayoutLength.Absolute(420))
                    )
                    .AddChild(new TextComponent()
                        .BindTitle<ColumnsController>(c => c.EditStatus)
                        .SetTitleWrap(true)
                        .SetTitleType(UITextAppearance.Caption)
                        .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                    )
                    .AddChild(new TextComponent()
                        .BindTitle<ColumnsController>(c => c.SelectionStatus)
                        .SetTitleWrap(true)
                        .SetTitleType(UITextAppearance.Caption)
                        .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                    )
            ),
            Example("Cell validation",
                "Configure validation rules and bounds on column editors via configureEditor: closed cells continuously display error, warning and info verdicts, while invalid edits stay open until corrected or cancelled with Escape.",
                new StackPanelComponent()
                    .SetOrientation(UIOrientation.Vertical)
                    .SetSpacing(8)
                    .AddChild(new DataGridComponent("quote")
                        .AddTextColumn<QuoteLine>("ID", q => q.Number, sortable: true, UIGridUnit.Absolute(110), content: true)
                        .AddEnumColumn<QuoteLine>("grid-demo.column.plan", q => q.Plan, SubscriptionChoices.Plans, UIGridUnit.Absolute(140))
                        .AddNumberColumn<QuoteLine>("grid-demo.column.servers", q => q.Servers, "N0", UIGridUnit.Absolute(120), editable: true, configureEditor: editor => editor
                            .SetAllowDecimals(false)
                            .SetMax(100)
                            // Required too: every other rule passes an empty value, so a cleared cell would commit.
                            .Required("grid-demo.quote.servers-rule")
                            .Validate(UIValidationTrigger.Change, UIComparisonOperator.Greater, 0, "grid-demo.quote.servers-rule")
                        )
                        .AddMoneyColumn<QuoteLine>("grid-demo.column.price", q => q.Price, "€", width: UIGridUnit.Absolute(160), editable: true, configureEditor: editor => editor
                            .Validate(UIValidationTrigger.Change, UIComparisonOperator.LessOrEqual, QuoteLine.PriceLimit, "grid-demo.quote.price-rule", UIValidationSeverity.Warning)
                        )
                        .AddTextColumn<QuoteLine>("grid-demo.column.note", q => q.Note, sortable: true, UIGridUnit.Absolute(240), editable: true, configureEditor: editor => editor
                            .Required("grid-demo.quote.note-rule", severity: UIValidationSeverity.Info)
                        )
                        // Not editable: the servers times the price, and changes with either.
                        .AddMoneyColumn<QuoteLine>("grid-demo.column.monthly", q => q.Total, "€", width: UIGridUnit.Absolute(150))
                        .BindItems<ColumnsController>(c => c.QuoteLines)
                        .OnCellEdit(nameof(ColumnsController.QuoteLineEdited))
                    )
                    .AddChild(CreateStatus<ColumnsController>(c => c.QuoteStatus))
            )
        ];
}
