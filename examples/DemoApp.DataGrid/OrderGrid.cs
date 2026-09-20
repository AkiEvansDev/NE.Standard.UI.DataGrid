using System.Collections.Generic;
using System.Linq;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Components.BuiltIns.Contents;
using NE.Standard.UI.Components.BuiltIns.Indicators;
using NE.Standard.UI.Components.BuiltIns.Inputs;
using NE.Standard.UI.Components.BuiltIns.Layouts;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Components.BuiltIns.Templates;
using NE.Standard.UI.DataGrid;
using NE.Standard.UI.Primitives.Binding;
using NE.Standard.UI.Primitives.Styling;

namespace DemoApp.DataGrid;

/// <summary>
/// The one grid every page of the demo shows, built with as much of the package turned on as the page is about: the columns and
/// their editors are always the same, so a page differs only in what surrounds them.
/// </summary>
internal static class OrderGrid
{
    /// <summary>The columns an export writes: the grid's own, from the same factory, so the file and the screen cannot drift apart.</summary>
    internal static IReadOnlyList<UITableColumn> ExportColumns { get; } = Create().Columns;

    /// <summary>
    /// The grid: <paramref name="wide"/> gives the columns room enough to run past the page, so the grid scrolls sideways with the
    /// order and the customer pinned at its edge, <paramref name="band"/> draws the search box, the filters and the column chooser
    /// over the header, and <paramref name="totals"/> puts a footer of totals under the rows.
    /// </summary>
    public static DataGridComponent Create(string? id = null, bool wide = false, bool band = false, bool totals = false)
    {
        // A column's width is its floor and its share (TableComponentRenderer), so what makes a grid scroll sideways is the sum of
        // these running past the page — the wide grid asks for the room, the others fill whatever they are given.
        UIGridUnit customer = UIGridUnit.Absolute(wide ? 320 : 240);
        UIGridUnit country = UIGridUnit.Absolute(wide ? 240 : 180);
        UIGridUnit status = UIGridUnit.Absolute(wide ? 260 : 220);
        UIGridUnit fulfilment = UIGridUnit.Absolute(wide ? 260 : 220);
        UIGridUnit ordered = UIGridUnit.Absolute(wide ? 320 : 280);

        DataGridComponent grid = new DataGridComponent(id)
            // The chevron that opens a row's detail, first in the row and pinned with the columns that are.
            .AddDetailColumn(pinned: wide)
            .AddTextColumn("Order", nameof(Order.Number), sortable: true, UIGridUnit.Absolute(120), filterable: band, aggregate: Count(totals), pinned: wide)
            // A template column: two lines of text bound to the row, sorted by the customer's name, edited in a search the author bound —
            // any input is an editor, and a search over the known customers is what a cell like this wants.
            .AddEditableColumn("Customer", new DefaultTextTemplate()
                .BindTitle(nameof(Order.Customer), UIBindingScope.Relative)
                .BindDescription(nameof(Order.Country), UIBindingScope.Relative),
                new SearchComponent()
                    .SetOptions(OrderCatalogue.Customers.Select(static name => new OptionItem { Id = name, Title = name }).ToList())
                    // A cell shows what the row holds, not what was last typed: the editor opens on the customer the row already names.
                    .SetSelectionDisplayMode(UISearchSelectionDisplayMode.ReplaceWithSelectedItem)
                    .BindValue(nameof(Order.Customer), UIBindingScope.Relative),
                sortPath: nameof(Order.Customer), width: customer, pinned: wide)
            .AddTextColumn("Country", nameof(Order.Country), sortable: true, country, filterable: band)
            // A badge for the status, its words and its colour the row's own, edited in a select over the enum's choices.
            .AddEditableColumn("Status", new TextComponent()
                .BindBadgeText(nameof(Order.StatusCaption), UIBindingScope.Relative)
                .BindBadgeStyle(nameof(Order.StatusStyle), UIBindingScope.Relative),
                new SelectComponent()
                    .SetOptions(UIChoices.FromEnum<OrderStatus>().Select(static choice => new OptionItem { Id = choice.Value, Title = choice.Caption }).ToList())
                    .BindValue(nameof(Order.Status), UIBindingScope.Relative),
                sortPath: nameof(Order.Status), width: status)
            // A template column that is not text at all: a bar, sorted by the number behind it.
            .AddColumn("Fulfilment", new ProgressComponent()
                .BindValue(nameof(Order.Fulfilment), UIBindingScope.Relative)
                .SetShowValue(true)
                .SetValueUnit("%"), nameof(Order.Fulfilment), fulfilment)
            .AddNumberColumn("Quantity", nameof(Order.Quantity), "N0", UIGridUnit.Absolute(160), editable: true, filterable: band, aggregate: Sum(totals))
            .AddMoneyColumn("Total", nameof(Order.Total), "€", width: UIGridUnit.Absolute(200), editable: true, filterable: band, aggregate: Sum(totals))
            .AddDateColumn("Ordered", nameof(Order.Ordered), "dd MMM yyyy HH:mm", ordered, editable: true, filterable: band)
            .AddBooleanColumn("Paid", nameof(Order.Paid), width: UIGridUnit.Absolute(120), editable: true, filterable: band)
            // What a row holds under itself: the same row, bound relatively, in a shape a cell has no room for.
            .SetDetailTemplate(new StackPanelComponent()
                .SetOrientation(UIOrientation.Horizontal)
                .SetSpacing(32)
                .AddChild(new DefaultTextTemplate()
                    .SetTitle("Customer")
                    .BindDescription(nameof(Order.Customer), UIBindingScope.Relative)
                )
                .AddChild(new DefaultTextTemplate()
                    .SetTitle("Country")
                    .BindDescription(nameof(Order.Country), UIBindingScope.Relative)
                )
                .AddChild(new DefaultTextTemplate()
                    .SetTitle("Status")
                    .BindDescription(nameof(Order.StatusCaption), UIBindingScope.Relative)
                )
                .AddChild(new ProgressComponent()
                    .BindValue(nameof(Order.Fulfilment), UIBindingScope.Relative)
                    .SetShowValue(true)
                    .SetValueUnit("%")
                    .SetWidth(UILayoutLength.Absolute(240))
                )
            )
            .SetStriped(true)
            .SetRowHoverable(true);

        if (band)
        {
            // The search box matches one text the row composes — the number, the customer, the country — since a query's terms are all required.
            _ = grid
                // A template column filters too: the status by its choices, read through the sort path the column names.
                .AddFilter(nameof(Order.Status), UIDataGridColumnKind.Enum, UIChoices.FromEnum<OrderStatus>())
                .SetSearch(nameof(Order.SearchText))
                // The chooser shows and hides columns; the country and the payment give way on their own below the tiers named here.
                .SetColumnChooser(true)
                .HideColumnBelow(nameof(Order.Country), UIResponsiveTier.Xxl)
                .HideColumnBelow(nameof(Order.Paid), UIResponsiveTier.Xl);
        }

        return grid;
    }

    private static UIDataGridAggregate Count(bool totals)
        => totals ? UIDataGridAggregate.Count : UIDataGridAggregate.None;

    private static UIDataGridAggregate Sum(bool totals)
        => totals ? UIDataGridAggregate.Sum : UIDataGridAggregate.None;
}
