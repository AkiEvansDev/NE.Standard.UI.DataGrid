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
    public partial UIPhrase? EditStatus { get; set; } = new("grid-demo.columns.edit-hint");

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
    public partial UIPhrase? SelectionStatus { get; set; } = new("grid-demo.columns.selection-hint");

    /// <summary>The choice changed and the keys have reached the server: what the choice turns on is the controller's to decide.</summary>
    [UICommand]
    public void SelectionChanged()
    {
        var count = SelectedSubscriptions?.Count ?? 0;

        DeleteVisibility = count > 0 ? UIVisibility.Visible : UIVisibility.Collapsed;
        // A phrase, not a sentence spliced here: the page words it in its own language, the count choosing the plural form.
        SelectionStatus = count == 0
            ? new UIPhrase("grid-demo.columns.none-chosen")
            : UIPhrase.Of("grid-demo.columns.chosen", ("count", count), ("total", Subscriptions.Count));
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
    /// own. The file has the grid's columns, in the order they were added, whatever the viewer hid, moved or sorted; its captions in
    /// the page's language, since they are the demo's keys.
    /// </summary>
    [UICommand]
    public async Task ExportAsync(CancellationToken cancellationToken)
    {
        var content = UIDataGridCsv.WriteBytes(SubscriptionGrid.ExportColumns, Subscriptions, new UIDataGridCsvOptions { Translate = caption => Context.Translate(caption) ?? caption });

        _ = await Context.Downloads
            .DownloadAsync(Context.Handle, "subscriptions.csv", "text/csv", content, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>A cell committed: the row's property already holds the value, so the line only reads it back.</summary>
    [UICommand]
    public void CellEdited(string id, string column)
    {
        Subscription? subscription = Subscriptions.FirstOrDefault(candidate => candidate.Id == id);

        // The value is on the row already; what the status derives — the badge — is read again here, after the write, and a
        // seat count outside the canon's range is put back.
        subscription?.Refresh();

        EditStatus = subscription is null
            ? UIPhrase.Of("grid-demo.columns.row-gone", ("id", id))
            : SubscriptionGrid.EditedLine(subscription, column, Context.Handle.Session.Language);
    }

    /// <summary>The quote the rules example edits: its editors carry client rules, and only a value no error refuses lands here.</summary>
    [RecursiveMember(false)]
    public RecursiveCollection<QuoteLine> QuoteLines { get; } = [.. QuoteLine.Create()];

    [RecursiveMember]
    public partial UIPhrase? QuoteStatus { get; set; } = new("grid-demo.quote.hint");

    /// <summary>A quote's cell committed: the line holds the value already, and its total follows.</summary>
    [UICommand]
    public void QuoteLineEdited(string id, string column)
    {
        QuoteLine? line = QuoteLines.FirstOrDefault(candidate => candidate.Id == id);

        line?.Refresh();

        QuoteStatus = line is null
            ? UIPhrase.Of("grid-demo.columns.row-gone", ("id", id))
            : QuoteEditedLine(line, column, Context.Handle.Session.Language);
    }

    /// <summary>The line a committed quote cell leaves: the column by its caption and the value as its cell shows it.</summary>
    private static UIPhrase QuoteEditedLine(QuoteLine line, string column, string language)
    {
        CultureInfo culture = SubscriptionGrid.CultureOf(language);
        var caption = column switch
        {
            nameof(QuoteLine.Servers) => "grid-demo.column.servers",
            nameof(QuoteLine.Price) => "grid-demo.column.price",
            _ => "grid-demo.column.note"
        };
        // Object, or the texts below would be taken for phrases: a plain string argument is a literal.
        var value = column switch
        {
            nameof(QuoteLine.Servers) => (object)line.Servers.ToString("N0", culture),
            nameof(QuoteLine.Price) => line.Price.ToString("N2", culture),
            _ when string.IsNullOrWhiteSpace(line.Note) => new UIPhrase("grid-demo.quote.empty"),
            _ => line.Note
        };

        return UIPhrase.Of("grid-demo.edited", ("number", line.Number), ("column", new UIPhrase(caption)), ("value", value));
    }
}
