using System.Collections.Generic;

namespace DemoApp.DataGrid;

/// <summary>
/// One line of a quote the validation example edits: a plan's servers at a price each, and a note for the team that sets them up.
/// </summary>
internal sealed partial class QuoteLine : RecursiveObservable, IBindableItem
{
    /// <summary>Above this a server, the quote needs a manager's word: the price column's rule warns past it.</summary>
    public const decimal PriceLimit = 300m;

    [RecursiveMember(false)]
    public string Id { get; init; } = string.Empty;

    /// <summary>The line's number, the same in every language.</summary>
    [RecursiveMember]
    public partial string Number { get; set; } = string.Empty;

    [RecursiveMember]
    public partial SubscriptionPlan Plan { get; set; }

    [RecursiveMember]
    public partial int Servers { get; set; }

    /// <summary>What one server costs a month on this line, in euros.</summary>
    [RecursiveMember]
    public partial decimal Price { get; set; }

    [RecursiveMember]
    public partial string? Note { get; set; }

    /// <summary>The servers times the price, kept in step by <see cref="Refresh"/>.</summary>
    [RecursiveMember]
    public partial decimal Total { get; set; }

    /// <summary>Reads the total again after a cell wrote the servers or the price.</summary>
    public void Refresh()
        => Total = Servers * Price;

    /// <summary>
    /// The lines the example starts with, built afresh — a line belongs to the one grid that shows it — and one of them stored with
    /// a problem of each severity's: no note, a price over the limit, no servers.
    /// </summary>
    public static List<QuoteLine> Create()
        =>
        [
            Line("q-1", "Q-101", SubscriptionPlan.Standard, 4, 18m, "Staging, then production"),
            Line("q-2", "Q-102", SubscriptionPlan.Pro, 2, 64m, null),
            Line("q-3", "Q-103", SubscriptionPlan.Dedicated, 1, 320m, "Rack in Frankfurt"),
            Line("q-4", "Q-104", SubscriptionPlan.Starter, 0, 6m, "Paused until spring")
        ];

    private static QuoteLine Line(string id, string number, SubscriptionPlan plan, int servers, decimal price, string? note)
    {
        QuoteLine line = new() { Id = id, Number = number, Plan = plan, Servers = servers, Price = price, Note = note };

        line.Refresh();
        return line;
    }
}
