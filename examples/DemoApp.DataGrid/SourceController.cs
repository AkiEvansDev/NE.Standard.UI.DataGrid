using System.Globalization;
using System.Linq;
using System.Text;

namespace DemoApp.DataGrid;

/// <summary>
/// The two sources the page reads — one per grid, since each answers its own query — the terms the viewer's headers and filters
/// write into them, and a line saying what each was asked.
/// </summary>
internal sealed partial class SourceController : UIControllerBase
{
    private const string NotAsked = "grid-demo.source.not-asked";

    /// <summary>A hundred thousand subscriptions, read a window at a time as the viewer scrolls.</summary>
    [RecursiveMember(false)]
    public SubscriptionSource ScrollingSource { get; } = new();

    /// <summary>The same hundred thousand, read a page at a time.</summary>
    [RecursiveMember(false)]
    public SubscriptionSource PagedSource { get; } = new();

    /// <summary>The terms the viewer set on each grid — bound two-way, so the server re-reads the window under them.</summary>
    [RecursiveMember]
    public partial UIItemsQuery? ScrollingQuery { get; set; }

    [RecursiveMember]
    public partial UIItemsQuery? PagedQuery { get; set; }

    [RecursiveMember]
    public partial UIPhrase? ScrollingStatus { get; set; } = new(NotAsked);

    [RecursiveMember]
    public partial UIPhrase? PagedStatus { get; set; } = new(NotAsked);

    [RecursiveMember]
    public partial UIPhrase? EditStatus { get; set; } = new("grid-demo.source.edit-hint");

    /// <summary>A grid raised its query change: the value has reached the server, and the window was re-read under it.</summary>
    [UICommand]
    public void ScrollingQueryChanged()
        => ScrollingStatus = Describe(ScrollingQuery, ScrollingSource.MatchCount);

    /// <summary>The controller narrows the scrolling grid itself; the grid's filter fields take the terms up.</summary>
    [UICommand]
    public void ShowPastDue()
    {
        UIItemFilterTerm[] filters =
        [
            new(nameof(Subscription.Status), UIComparisonOperator.Equal, nameof(SubscriptionStatus.PastDue)),
            new(nameof(Subscription.Monthly), UIComparisonOperator.GreaterOrEqual, 100m)
        ];

        UIItemsQuery query = new(filters, ScrollingQuery?.Sorts ?? []);

        ScrollingQuery = query;
        ScrollingStatus = Describe(query, ScrollingSource.CountMatching(query));
    }

    [UICommand]
    public void ClearFilters()
    {
        UIItemsQuery query = new([], ScrollingQuery?.Sorts ?? []);

        ScrollingQuery = query;
        ScrollingStatus = Describe(query, ScrollingSource.CountMatching(query));
    }

    [UICommand]
    public void PagedQueryChanged()
        => PagedStatus = Describe(PagedQuery, PagedSource.MatchCount);

    /// <summary>A cell committed on either grid: the source already took the write, so the line only reads the row back.</summary>
    [UICommand]
    public void CellEdited(string id, string column)
    {
        Subscription? subscription = ScrollingSource.Items.FirstOrDefault(candidate => candidate.Id == id)
            ?? PagedSource.Items.FirstOrDefault(candidate => candidate.Id == id);

        EditStatus = subscription is null
            ? UIPhrase.Of("grid-demo.source.row-gone", ("id", id))
            : SubscriptionGrid.EditedLine(subscription, column, Context.Handle.Session.Language);
    }

    /// <summary>What the source was asked, as a phrase: the terms in a notation no language needs words for, the rows it matched.</summary>
    private static UIPhrase Describe(UIItemsQuery? query, int matches)
    {
        var rows = matches.ToString("N0", CultureInfo.InvariantCulture);

        if (query is null || query.IsEmpty)
            return UIPhrase.Of("grid-demo.source.no-terms", ("count", matches), ("rows", rows));

        StringBuilder terms = new();

        for (var i = 0; i < query.Sorts.Length; i++)
        {
            UIItemSortTerm sort = query.Sorts[i];

            _ = terms.Append(i == 0 ? "" : ", ").Append(sort.ItemProperty).Append(sort.Direction == UIItemsSortDirection.Descending ? " ↓" : " ↑");
        }

        for (var i = 0; i < query.Filters.Length; i++)
        {
            UIItemFilterTerm filter = query.Filters[i];

            _ = terms.Append(i == 0 ? (terms.Length > 0 ? "; " : "") : ", ");
            _ = terms.Append(CultureInfo.InvariantCulture, $"{filter.ItemProperty} {Symbol(filter.Operator)} {filter.Value}");
        }

        return UIPhrase.Of("grid-demo.source.matches", ("count", matches), ("rows", rows), ("terms", terms.ToString()));
    }

    private static string Symbol(UIComparisonOperator comparison)
        => comparison switch
        {
            UIComparisonOperator.Equal => "=",
            UIComparisonOperator.NotEqual => "≠",
            UIComparisonOperator.Greater => ">",
            UIComparisonOperator.GreaterOrEqual => "≥",
            UIComparisonOperator.Less => "<",
            UIComparisonOperator.LessOrEqual => "≤",
            UIComparisonOperator.Like or UIComparisonOperator.LikeIgnoreCase => "~",
            _ => comparison.ToString()
        };
}
