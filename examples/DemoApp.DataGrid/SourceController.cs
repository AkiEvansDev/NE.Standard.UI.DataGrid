using System.Globalization;
using System.Linq;
using System.Text;
using NE.Standard.UI.Abstractions.Data;
using NE.Standard.UI.Controllers;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Primitives.Items;

namespace DemoApp.DataGrid;

/// <summary>
/// The two sources the page reads — one per grid, since each answers its own query — the terms the viewer's headers and filters
/// write into them, and a line saying what each was asked.
/// </summary>
internal sealed partial class SourceController : UIControllerBase
{
    private const string NotAsked = "The source has not been asked for anything but its first window.";

    /// <summary>A hundred thousand orders, read a window at a time as the viewer scrolls.</summary>
    [RecursiveMember(false)]
    public OrderSource ScrollingSource { get; } = new();

    /// <summary>The same hundred thousand, read a page at a time.</summary>
    [RecursiveMember(false)]
    public OrderSource PagedSource { get; } = new();

    /// <summary>The terms the viewer set on each grid — bound two-way, so the server re-reads the window under them.</summary>
    [RecursiveMember]
    public partial UIItemsQuery? ScrollingQuery { get; set; }

    [RecursiveMember]
    public partial UIItemsQuery? PagedQuery { get; set; }

    [RecursiveMember]
    public partial string ScrollingStatus { get; set; } = NotAsked;

    [RecursiveMember]
    public partial string PagedStatus { get; set; } = NotAsked;

    [RecursiveMember]
    public partial string EditStatus { get; set; } = "Double-click a cell to edit it: the write goes through the source, which keeps it and reads the order anew.";

    /// <summary>A grid raised its query change: the value has reached the server, and the window was re-read under it.</summary>
    [UICommand]
    public void ScrollingQueryChanged()
        => ScrollingStatus = Describe(ScrollingQuery, ScrollingSource.MatchCount);

    [UICommand]
    public void PagedQueryChanged()
        => PagedStatus = Describe(PagedQuery, PagedSource.MatchCount);

    /// <summary>A cell committed on either grid: the source already took the write, so the line only reads the row back.</summary>
    [UICommand]
    public void CellEdited(string id, string column)
    {
        Order? order = ScrollingSource.Items.FirstOrDefault(candidate => candidate.Id == id)
            ?? PagedSource.Items.FirstOrDefault(candidate => candidate.Id == id);

        // The same status line ColumnsController.CellEdited builds over its orders; the two controllers share no base.
        EditStatus = order is null
            ? string.Create(CultureInfo.InvariantCulture, $"Row {id} is not in either window.")
            : string.Create(CultureInfo.InvariantCulture, $"{order.Number}: {column} is now {order.ValueOf(column)}.");
    }

    private static string Describe(UIItemsQuery? query, int matches)
    {
        if (query is null || query.IsEmpty)
            return string.Create(CultureInfo.InvariantCulture, $"No terms: the source answers in its own order, {matches:N0} rows.");

        StringBuilder words = new();

        for (var i = 0; i < query.Sorts.Length; i++)
        {
            UIItemSortTerm sort = query.Sorts[i];

            _ = words.Append(i == 0 ? "Sorted by " : ", then ");
            _ = words.Append(sort.ItemProperty).Append(sort.Direction == UIItemsSortDirection.Descending ? " descending" : " ascending");
        }

        for (var i = 0; i < query.Filters.Length; i++)
        {
            UIItemFilterTerm filter = query.Filters[i];

            _ = words.Append(i == 0 ? (words.Length > 0 ? "; filtered where " : "Filtered where ") : " and ");
            _ = words.Append(CultureInfo.InvariantCulture, $"{filter.ItemProperty} {filter.Operator} {filter.Value}");
        }

        return string.Create(CultureInfo.InvariantCulture, $"{words} — {matches:N0} rows match, read on the server.");
    }
}
