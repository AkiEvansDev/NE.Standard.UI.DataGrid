using System.Collections.Generic;
using System.Linq;
using NE.Standard.UI.Components.BuiltIns.Templates;

namespace DemoApp.DataGrid;

/// <summary>
/// The one grid every page of the demo shows, built with as much of the package turned on as the page is about: the columns and
/// their editors are always the same, so a page differs only in what surrounds them.
/// </summary>
internal static class SubscriptionGrid
{
    /// <summary>The columns an export writes: the grid's own, from the same factory, so the file and the screen cannot drift apart.</summary>
    internal static IReadOnlyList<UITableColumn> ExportColumns { get; } = Create().Columns;

    /// <summary>
    /// The grid: <paramref name="wide"/> gives the columns room enough to run past the page, so the grid scrolls sideways with the
    /// number and the customer pinned at its edge, <paramref name="band"/> draws the search box, the filters and the column chooser
    /// over the header, and <paramref name="totals"/> puts a footer of totals under the rows.
    /// </summary>
    public static DataGridComponent Create(string? id = null, bool wide = false, bool band = false, bool totals = false)
    {
        // A column's width is its floor and its share (TableComponentRenderer), so what makes a grid scroll sideways is the sum of
        // these running past the page — the wide grid asks for the room, the others fill whatever they are given.
        UIGridUnit customer = UIGridUnit.Absolute(wide ? 320 : 240);
        UIGridUnit country = UIGridUnit.Absolute(wide ? 240 : 180);
        UIGridUnit plan = UIGridUnit.Absolute(wide ? 200 : 140);
        UIGridUnit status = UIGridUnit.Absolute(wide ? 260 : 210);
        UIGridUnit usage = UIGridUnit.Absolute(wide ? 260 : 200);
        UIGridUnit started = UIGridUnit.Absolute(wide ? 240 : 200);

        DataGridComponent grid = new DataGridComponent(id)
            // The chevron that opens a row's detail, first in the row and pinned with the columns that are.
            .AddDetailColumn(pinned: wide)
            .AddTextColumn("Subscription", nameof(Subscription.Number), sortable: true, UIGridUnit.Absolute(130), filterable: band, aggregate: Count(totals), pinned: wide)
            // A template column: two lines of text bound to the row, sorted by the customer's name, edited in a search the author bound —
            // any input is an editor, and a search over the known customers is what a cell like this wants.
            .AddEditableColumn("Customer", new DefaultTextTemplate()
                .BindTitle(nameof(Subscription.Customer), UIBindingScope.Relative)
                .BindDescription(nameof(Subscription.Country), UIBindingScope.Relative),
                new SearchComponent()
                    .SetOptions(SubscriptionCatalogue.Customers.Select(static name => new OptionItem { Id = name, Title = name }).ToList())
                    // A cell shows what the row holds, not what was last typed: the editor opens on the customer the row already names.
                    .SetSelectionDisplayMode(UISearchSelectionDisplayMode.ReplaceWithSelectedItem)
                    .BindValue(nameof(Subscription.Customer), UIBindingScope.Relative),
                sortPath: nameof(Subscription.Customer), width: customer, pinned: wide
            )
            .AddTextColumn("Country", nameof(Subscription.Country), sortable: true, country, filterable: band)
            // A typed enum column: the plan by its caption, edited in a select over the same choices, and the price follows it.
            .AddEnumColumn<SubscriptionPlan>("Plan", nameof(Subscription.Plan), plan, editable: true, filterable: band)
            // A badge for the status, its words and its colour the row's own, edited in a select over the enum's choices.
            .AddEditableColumn("Status", new TextComponent()
                .BindBadgeText(nameof(Subscription.StatusCaption), UIBindingScope.Relative)
                .BindBadgeStyle(nameof(Subscription.StatusStyle), UIBindingScope.Relative),
                new SelectComponent()
                    .SetOptions(UIChoices.FromEnum<SubscriptionStatus>().Select(static choice => new OptionItem { Id = choice.Value, Title = choice.Caption }).ToList())
                    .BindValue(nameof(Subscription.Status), UIBindingScope.Relative),
                sortPath: nameof(Subscription.Status), width: status
            )
            // A template column that is not text at all: a bar, sorted by the number behind it.
            .AddColumn("Usage", new ProgressComponent()
                .BindValue(nameof(Subscription.Usage), UIBindingScope.Relative)
                .SetShowValue(true)
                .SetValueUnit("%"),
                nameof(Subscription.Usage), usage
            )
            .AddNumberColumn("Servers", nameof(Subscription.Seats), "N0", UIGridUnit.Absolute(130), editable: true, filterable: band, aggregate: Sum(totals))
            // Not editable: what a month costs is the plan's price times the servers, and changes with either.
            .AddMoneyColumn("Monthly", nameof(Subscription.Monthly), "€", width: UIGridUnit.Absolute(170), filterable: band, aggregate: Sum(totals))
            .AddDateColumn("Started", nameof(Subscription.Started), "dd MMM yyyy", started, editable: true, filterable: band)
            .AddBooleanColumn("Paid", nameof(Subscription.Paid), width: UIGridUnit.Absolute(120), editable: true, filterable: band)
            // What a row holds under itself: the same row, bound relatively, in a shape a cell has no room for.
            .SetDetailTemplate(new StackPanelComponent()
                .SetOrientation(UIOrientation.Horizontal)
                .SetSpacing(32)
                .AddChild(new DefaultTextTemplate()
                    .SetTitle("Customer")
                    .BindDescription(nameof(Subscription.Customer), UIBindingScope.Relative)
                )
                .AddChild(new DefaultTextTemplate()
                    .SetTitle("Country")
                    .BindDescription(nameof(Subscription.Country), UIBindingScope.Relative)
                )
                .AddChild(new DefaultTextTemplate()
                    .SetTitle("Status")
                    .BindDescription(nameof(Subscription.StatusCaption), UIBindingScope.Relative)
                )
                .AddChild(new ProgressComponent()
                    .BindValue(nameof(Subscription.Usage), UIBindingScope.Relative)
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
                .AddFilter(nameof(Subscription.Status), UIDataGridColumnKind.Enum, UIChoices.FromEnum<SubscriptionStatus>())
                .SetSearch(nameof(Subscription.SearchText))
                // The chooser shows and hides columns; the country and the payment give way on their own below the tiers named here.
                .SetColumnChooser(true)
                .HideColumnBelow(nameof(Subscription.Country), UIResponsiveTier.Xxl)
                .HideColumnBelow(nameof(Subscription.Paid), UIResponsiveTier.Xl);
        }

        return grid;
    }

    private static UIDataGridAggregate Count(bool totals)
        => totals ? UIDataGridAggregate.Count : UIDataGridAggregate.None;

    private static UIDataGridAggregate Sum(bool totals)
        => totals ? UIDataGridAggregate.Sum : UIDataGridAggregate.None;
}
