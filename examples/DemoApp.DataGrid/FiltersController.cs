namespace DemoApp.DataGrid;

/// <summary>
/// The rows the filters page narrows: enough of them that a term leaves something out, and nothing else — the band and the footer
/// are the grid's own, and neither asks the controller for anything.
/// </summary>
internal sealed partial class FiltersController : UIControllerBase
{
    [RecursiveMember(false)]
    public RecursiveCollection<Subscription> Subscriptions { get; } = [.. SubscriptionCatalogue.Slice(2_000, 120)];
}
