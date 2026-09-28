using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace DemoApp.DataGrid;

/// <summary>
/// The subscriptions the columns page holds, the switch that lets its cells edit, and the file its columns write.
/// </summary>
internal sealed partial class ColumnsController : UIControllerBase
{
    /// <summary>Thirty subscriptions the page holds whole; an edit in a cell lands on the row here.</summary>
    [RecursiveMember(false)]
    public RecursiveCollection<Subscription> Subscriptions { get; } = [.. SubscriptionCatalogue.Slice(1_000, 30)];

    [RecursiveMember]
    public partial string EditStatus { get; set; } = "Double-click a cell, or press F2 on the keyboard's row, to edit it.";

    /// <summary>The grid's editing switch: off, the same grid only shows.</summary>
    [RecursiveMember]
    public partial bool Editing { get; set; } = true;

    /// <summary>The rows the viewer has ticked, bound two-way: the grid writes the keys here as the boxes are ticked.</summary>
    [RecursiveMember]
    public partial IReadOnlyList<string>? SelectedSubscriptions { get; set; }

    /// <summary>Whether the delete button is there at all: it appears with the first tick and goes with the last.</summary>
    [RecursiveMember]
    public partial UIVisibility DeleteVisibility { get; set; } = UIVisibility.Collapsed;

    [RecursiveMember]
    public partial string SelectionStatus { get; set; } = "Tick a row to choose it; the button appears once something is chosen.";

    /// <summary>The choice changed and the keys have reached the server: what the choice turns on is the controller's to decide.</summary>
    [UICommand]
    public void SelectionChanged()
    {
        var count = SelectedSubscriptions?.Count ?? 0;

        DeleteVisibility = count > 0 ? UIVisibility.Visible : UIVisibility.Collapsed;
        SelectionStatus = count == 0
            ? "Nothing chosen."
            : string.Create(CultureInfo.InvariantCulture, $"{count} of {Subscriptions.Count} chosen.");
    }

    /// <summary>Takes the ticked rows out of the collection, which is the ordinary scenario a choice turns on.</summary>
    [UICommand]
    public void DeleteSelected()
    {
        foreach (var id in SelectedSubscriptions ?? [])
        {
            Subscription? subscription = Subscriptions.FirstOrDefault(candidate => candidate.Id == id);

            if (subscription is not null)
                _ = Subscriptions.Remove(subscription);
        }

        SelectedSubscriptions = [];
        SelectionChanged();
    }

    /// <summary>
    /// Writes the thirty subscriptions the page holds as CSV and hands the file to the download service — the grid has no button of its
    /// own, and the columns are the ones the view built, so the file says what the screen says.
    /// </summary>
    [UICommand]
    public async Task ExportAsync(CancellationToken cancellationToken)
    {
        var content = UIDataGridCsv.WriteBytes(SubscriptionGrid.ExportColumns, Subscriptions);

        _ = await Context.Downloads
            .DownloadAsync(Context.Handle, "subscriptions.csv", "text/csv", content, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>A cell committed: the row's property already holds the value, so the line only reads it back.</summary>
    [UICommand]
    public void CellEdited(string id, string column)
    {
        Subscription? subscription = Subscriptions.FirstOrDefault(candidate => candidate.Id == id);

        // The value is on the row already; what the status derives — the badge — is read again here, after the write.
        subscription?.Refresh();

        // The same status line SourceController.CellEdited builds over its own sources; the two controllers share no base.
        EditStatus = subscription is null
            ? string.Create(CultureInfo.InvariantCulture, $"Row {id} is not on the page.")
            : string.Create(CultureInfo.InvariantCulture, $"{subscription.Number}: {column} is now {subscription.ValueOf(column)}.");
    }
}
