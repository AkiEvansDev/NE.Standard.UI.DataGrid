using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace DemoApp.DataGrid;

/// <summary>
/// The one grid every page of the demo shows, built with as much of the package turned on as the page is about: the columns and
/// their editors are always the same, so a page differs only in what surrounds them.
/// </summary>
internal static class SubscriptionGrid
{
    /// <summary>The columns an export writes: the grid's own, from the same factory the view builds it with.</summary>
    internal static IReadOnlyList<UITableColumn> ExportColumns { get; } = Create().Columns;

    /// <summary>
    /// The grid: <paramref name="wide"/> gives the columns room enough to run past the page, with the number and the customer pinned
    /// at its start edge as it scrolls sideways, <paramref name="band"/> draws the search box, the filters and the column chooser
    /// over the header, <paramref name="totals"/> puts a footer of totals under the rows, and <paramref name="prices"/> gives a
    /// row's detail a table of its own, the plans' price list. With the band, the start date starts hidden, for the chooser to show.
    /// </summary>
    public static DataGridComponent Create(string? id = null, bool wide = false, bool band = false, bool chooser = false, bool totals = false, bool prices = false)
    {
        // A column's width is its floor and its share (TableComponentRenderer): the floors add up to the width a grid needs, the wide
        // grid's past the page and the others' past a phone or a half-width column. A box narrower than that sum scrolls sideways.
        UIGridUnit customer = UIGridUnit.Absolute(wide ? 320 : 240);
        UIGridUnit country = UIGridUnit.Absolute(wide ? 240 : 180);
        UIGridUnit plan = UIGridUnit.Absolute(wide ? 200 : 140);
        UIGridUnit status = UIGridUnit.Absolute(wide ? 260 : 240);
        UIGridUnit usage = UIGridUnit.Absolute(wide ? 260 : 200);
        UIGridUnit started = UIGridUnit.Absolute(wide ? 240 : 200);

        DataGridComponent grid = new DataGridComponent(id)
            // The chevron that opens a row's detail, first in the row and pinned with the columns that are.
            .AddDetailColumn(pinned: wide)
            // A code-like caption, the same in every language: content, shown as written in the header, the chooser, the filter and a CSV.
            .AddTextColumn<Subscription>("ID", s => s.Number, sortable: true, UIGridUnit.Absolute(140), filterable: band, aggregate: Count(totals), pinned: wide, content: true)
            // A template column: two lines of text bound to the row, sorted by the customer's name, edited in a search the author bound —
            // any input is an editor, and a search over the known customers is what a cell like this wants.
            .AddEditableColumn("grid-demo.column.customer", new DefaultTextTemplate()
                .BindTitle<Subscription>(s => s.Customer, UIBindingScope.Relative)
                .BindDescription<Subscription>(s => s.Country, UIBindingScope.Relative),
                new SearchComponent()
                    .SetOptions(SubscriptionCatalogue.Customers.Select(static name => new OptionItem { Id = name, Title = name, IsContent = true }).ToList())
                    .BindValue<Subscription>(s => s.Customer, UIBindingScope.Relative),
                sortPath: nameof(Subscription.Customer), width: customer, pinned: wide, icon: UIGlyphs.Person
            )
            .AddTextColumn<Subscription>("grid-demo.column.country", s => s.Country, sortable: true, country, filterable: band)
            // A typed enum column: the plan by its caption, edited in a select over the same choices, and the price follows it.
            .AddEnumColumn<Subscription>("grid-demo.column.plan", s => s.Plan, SubscriptionChoices.Plans, plan, editable: true, filterable: band)
            // A badge for the status, its words and its colour the row's own, edited in a select over the enum's choices.
            .AddEditableColumn("grid-demo.column.status", new TextComponent()
                .BindBadgeTitle<Subscription>(s => s.StatusCaption, UIBindingScope.Relative)
                .BindBadgeVariant<Subscription>(s => s.StatusVariant, UIBindingScope.Relative),
                new SelectComponent()
                    .SetOptions(SubscriptionChoices.Statuses.Select(static choice => new OptionItem { Id = choice.Value, Title = choice.Caption }).ToList())
                    .BindValue<Subscription>(s => s.Status, UIBindingScope.Relative),
                sortPath: nameof(Subscription.Status), width: status
            )
            // A template column that is not text at all: a bar, sorted by the number behind it.
            .AddColumn("grid-demo.column.usage", new ProgressComponent()
                .BindValue<Subscription>(s => s.Usage, UIBindingScope.Relative)
                .SetShowValue(true)
                .SetValueUnit("%"),
                nameof(Subscription.Usage), usage
            )
            .AddNumberColumn<Subscription>("grid-demo.column.servers", s => s.Seats, "N0", UIGridUnit.Absolute(130), editable: true, filterable: band, aggregate: Sum(totals), icon: UIGlyphs.Storage, configureEditor: static editor => editor.SetAllowDecimals(false).SetMin(SubscriptionRecord.MinSeats).SetMax(SubscriptionRecord.MaxSeats))
            // Not editable: what a month costs is the plan's price times the servers, and changes with either.
            .AddMoneyColumn<Subscription>("grid-demo.column.monthly", s => s.Monthly, "€", width: UIGridUnit.Absolute(170), filterable: band, aggregate: Sum(totals))
            // Hidden where a chooser can show it again: the viewer's own choice, kept in the browser, wins over the author's.
            .AddDateColumn<Subscription>("grid-demo.column.started", s => s.Started, "dd MMM yyyy", started, editable: true, filterable: band, icon: UIGlyphs.Calendar, hidden: band)
            .AddBooleanColumn<Subscription>("grid-demo.column.paid", s => s.Paid, width: UIGridUnit.Absolute(120), editable: true, filterable: band)
            .SetDetailTemplate(CreateDetail(prices))
            .SetStriped(true)
            .SetRowHoverable(true);

        if (band || chooser)
            _ = grid.SetColumnChooser(true);

        if (band)
        {
            _ = grid
                // A template column filters too: the status by its choices, read through the sort path the column names.
                .AddFilter<Subscription>(s => s.Status, UIDataGridColumnKind.Enum, SubscriptionChoices.Statuses)
                .HideColumnBelow(nameof(Subscription.Country), UIResponsiveTier.Xxl)
                .HideColumnBelow(nameof(Subscription.Paid), UIResponsiveTier.Xl);
        }

        return grid;
    }

    private static UIDataGridAggregate Count(bool totals)
        => totals ? UIDataGridAggregate.Count : UIDataGridAggregate.None;

    private static UIDataGridAggregate Sum(bool totals)
        => totals ? UIDataGridAggregate.Sum : UIDataGridAggregate.None;

    /// <summary>What a row holds under itself: the same row, bound relatively, in a shape a cell has no room for.</summary>
    private static StackPanelComponent CreateDetail(bool prices)
    {
        StackPanelComponent detail = new StackPanelComponent()
            .SetOrientation(UIOrientation.Horizontal)
            .SetSpacing(32)
            .AddChild(new DefaultTextTemplate()
                .SetTitle("grid-demo.column.customer")
                .BindDescription<Subscription>(s => s.Customer, UIBindingScope.Relative)
            )
            .AddChild(new DefaultTextTemplate()
                .SetTitle("grid-demo.column.country")
                .BindDescription<Subscription>(s => s.Country, UIBindingScope.Relative)
            )
            .AddChild(new DefaultTextTemplate()
                .SetTitle("grid-demo.column.status")
                .BindDescription<Subscription>(s => s.StatusCaption, UIBindingScope.Relative)
            )
            .AddChild(new ProgressComponent()
                .BindValue<Subscription>(s => s.Usage, UIBindingScope.Relative)
                .SetShowValue(true)
                .SetValueUnit("%")
                .SetWidth(UILayoutLength.Absolute(240))
            );

        // A table inside the detail keeps its rows: a click or Enter on one is that table's, and opens nothing of the grid's.
        if (prices)
        {
            _ = detail.AddChild(new TableComponent()
                .SetItems(PlanPrice.List())
                .AddTextColumn<PlanPrice>("grid-demo.column.plan", p => p.Plan)
                .AddTextColumn<PlanPrice>("grid-demo.detail.per-server", p => p.Price, UIGridUnit.Absolute(160), UITextAlignment.End)
                .SetWidth(UILayoutLength.Absolute(320))
            );
        }

        return detail;
    }

    /// <summary>
    /// The line a committed cell leaves: the column by its caption and the value as its cell shows it — a choice or a flag by its
    /// words, a number or a date under the column's own format in the page's <paramref name="language"/>.
    /// </summary>
    public static UIPhrase EditedLine(Subscription subscription, string column, string language)
    {
        UIDataGridColumn? shown = ExportColumns.OfType<UIDataGridColumn>().FirstOrDefault(candidate => candidate.Key == column);
        CultureInfo culture = CultureOf(language);
        var value = column switch
        {
            nameof(Subscription.Plan) => CaptionOf(SubscriptionChoices.Plans, subscription.Plan.ToString()),
            nameof(Subscription.Status) => CaptionOf(SubscriptionChoices.Statuses, subscription.Status.ToString()),
            // The grid's own words for a flag, as its cell writes them.
            nameof(Subscription.Paid) => new UIPhrase(subscription.Paid ? "ui.grid.yes" : "ui.grid.no"),
            // Object, or the texts below would be taken for phrases: a plain string argument is a literal.
            nameof(Subscription.Seats) => (object)subscription.Seats.ToString(shown?.Format, culture),
            nameof(Subscription.Started) => subscription.Started.ToString(shown?.Format, culture),
            _ => Convert.ToString(subscription.ValueOf(column), culture)
        };

        return UIPhrase.Of("grid-demo.edited", ("number", subscription.Number), ("column", shown?.Caption is { } caption ? caption : UIPhrase.Text(column)), ("value", value));
    }

    internal static CultureInfo CultureOf(string language)
    {
        try
        {
            return CultureInfo.GetCultureInfo(language);
        }
        catch (CultureNotFoundException)
        {
            return CultureInfo.InvariantCulture;
        }
    }

    private static UIPhrase? CaptionOf(IReadOnlyList<UIChoice> choices, string value)
        => choices.FirstOrDefault(choice => choice.Value == value)?.Caption;
}
