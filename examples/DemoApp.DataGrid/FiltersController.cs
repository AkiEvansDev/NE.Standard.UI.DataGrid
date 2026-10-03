using System.Linq;

namespace DemoApp.DataGrid;

/// <summary>
/// The rows the filters page narrows — enough of them that a term leaves something out — and the one row chosen or opened among
/// them; the band and the footer are the grid's own, and neither asks the controller for anything.
/// </summary>
internal sealed partial class FiltersController : UIControllerBase
{
    [RecursiveMember(false)]
    public RecursiveCollection<Subscription> Subscriptions { get; } = [.. SubscriptionCatalogue.Slice(2_000, 120)];

    /// <summary>The one row chosen, bound two-way: a click on a row writes its key here.</summary>
    [RecursiveMember]
    public partial string? ChosenSubscription { get; set; }

    [RecursiveMember]
    public partial UIPhrase? RowStatus { get; set; } = new("grid-demo.filters.hint");

    /// <summary>What the keyboard's grid last opened: a click on a row, or Enter or Space on the keyboard's row.</summary>
    [RecursiveMember]
    public partial UIPhrase? PressStatus { get; set; } = new("grid-demo.filters.keys-hint");

    /// <summary>The choice changed and the key has reached the server.</summary>
    [UICommand]
    public void SelectionChanged()
        => RowStatus = ChosenSubscription is null ? new UIPhrase("grid-demo.columns.none-chosen") : UIPhrase.Of("grid-demo.filters.chosen", ("number", NumberOf(ChosenSubscription)));

    /// <summary>A row was opened — Enter on the keyboard's row, or a double click, a cell that edits on the first page included.</summary>
    [UICommand]
    public void RowOpened(string id)
        => RowStatus = UIPhrase.Of("grid-demo.filters.opened", ("number", NumberOf(id)));

    /// <summary>A row of the keyboard's grid was pressed — clicked, or Enter or Space on the keyboard's row.</summary>
    [UICommand]
    public void RowPressed(string id)
        => PressStatus = UIPhrase.Of("grid-demo.filters.pressed", ("number", NumberOf(id)));

    private string NumberOf(string id)
        => Subscriptions.FirstOrDefault(candidate => candidate.Id == id)?.Number ?? id;
}
