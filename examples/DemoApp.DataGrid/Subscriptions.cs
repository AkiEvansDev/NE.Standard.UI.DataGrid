using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Items;

namespace DemoApp.DataGrid;

/// <summary>The four plans of <c>docs/DEMO-THEME.md</c>; a subscription holds one.</summary>
internal enum SubscriptionPlan
{
    Starter,
    Standard,
    Pro,
    Dedicated
}

internal enum SubscriptionStatus
{
    Trial,
    Active,
    [Description("Past due")]
    PastDue,
    Suspended,
    [Description("Cancelled by the customer")]
    Cancelled
}

/// <summary>The plans and statuses as a column, a filter and an editor offer them: each value by its key in the demo's words.</summary>
internal static class SubscriptionChoices
{
    public static IReadOnlyList<UIChoice> Plans { get; } =
    [
        new(nameof(SubscriptionPlan.Starter), "grid-demo.plan.starter"),
        new(nameof(SubscriptionPlan.Standard), "grid-demo.plan.standard"),
        new(nameof(SubscriptionPlan.Pro), "grid-demo.plan.pro"),
        new(nameof(SubscriptionPlan.Dedicated), "grid-demo.plan.dedicated")
    ];

    public static IReadOnlyList<UIChoice> Statuses { get; } =
    [
        new(nameof(SubscriptionStatus.Trial), "grid-demo.status.trial"),
        new(nameof(SubscriptionStatus.Active), "grid-demo.status.active"),
        new(nameof(SubscriptionStatus.PastDue), "grid-demo.status.past-due"),
        new(nameof(SubscriptionStatus.Suspended), "grid-demo.status.suspended"),
        new(nameof(SubscriptionStatus.Cancelled), "grid-demo.status.cancelled")
    ];
}

/// <summary>One plan's line in the price list a row's detail shows: the plan by its key in the demo's words, and what a server costs a month.</summary>
internal sealed partial class PlanPrice : RecursiveObservable, IBindableItem
{
    [RecursiveMember(false)]
    public string Id { get; init; } = string.Empty;

    [RecursiveMember]
    public partial string Plan { get; set; } = string.Empty;

    /// <summary>The price as the list writes it, the euro sign before the number: the same in every language.</summary>
    [RecursiveMember]
    public partial string Price { get; set; } = string.Empty;

    /// <summary>The four plans' lines, built afresh: a line belongs to the one list that shows it.</summary>
    public static List<PlanPrice> List()
        => [.. SubscriptionChoices.Plans.Select(static choice => new PlanPrice
        {
            Id = choice.Value,
            Plan = choice.Caption,
            Price = string.Create(CultureInfo.InvariantCulture, $"€{SubscriptionRecord.PricePerSeat(Enum.Parse<SubscriptionPlan>(choice.Value))}")
        })];
}

/// <summary>
/// One subscription as the catalogue keeps it: plain data, shared by every window that shows it.
/// </summary>
internal sealed record SubscriptionRecord(string Id, string Number, string Customer, string Country, SubscriptionPlan Plan, SubscriptionStatus Status, int Seats, DateTime Started, bool Paid, int Usage)
{
    /// <summary>The fewest seats a subscription holds, as the canon and the checkout have it.</summary>
    public const int MinSeats = 1;

    /// <summary>The most seats a subscription holds, as the canon and the checkout have it.</summary>
    public const int MaxSeats = 40;

    /// <summary>Whether a subscription may hold that many seats: the canon's range, which the source refuses a count outside.</summary>
    public static bool AllowsSeats(int seats)
        => seats is >= MinSeats and <= MaxSeats;

    /// <summary>What the subscription costs a month: the plan's price per seat, times the seats.</summary>
    public decimal Monthly => Seats * PricePerSeat(Plan);

    /// <summary>The plan's monthly price per seat, in euros, as the canon lists it.</summary>
    public static decimal PricePerSeat(SubscriptionPlan plan)
        => plan switch
        {
            SubscriptionPlan.Starter => 6m,
            SubscriptionPlan.Standard => 18m,
            SubscriptionPlan.Pro => 64m,
            _ => 290m
        };

    /// <summary>The value a sort or a filter reads, by the property the term names; the shape the client reads it in — an enum by its name.</summary>
    public object? ValueOf(string property)
        => property switch
        {
            nameof(Number) => Number,
            nameof(Customer) => Customer,
            nameof(Country) => Country,
            nameof(Plan) => Plan.ToString(),
            nameof(Status) => Status.ToString(),
            nameof(Seats) => Seats,
            nameof(Monthly) => Monthly,
            // The ISO text the wire carries: a filter term compares it as text, and it orders as the moments do.
            nameof(Started) => Started.ToString("s", CultureInfo.InvariantCulture),
            nameof(Paid) => Paid,
            nameof(Usage) => Usage,
            nameof(SearchText) => SearchText,
            _ => null
        };

    /// <summary>The number, the customer and the country in one text, for the search box.</summary>
    public string SearchText => $"{Number} {Customer} {Country}";
}

/// <summary>
/// One row of every grid on the page: a subscription, with a value of each kind a typed column formats. A row belongs to the one
/// collection that shows it, so a window builds its rows afresh from the catalogue's records.
/// </summary>
internal sealed partial class Subscription(SubscriptionRecord record) : RecursiveObservable, IBindableItem
{
    // The seats the row last took, put back by Refresh when a bound collection took a count outside the canon's range.
    private int _seats = record.Seats;

    [RecursiveMember(false)]
    public string Id { get; } = record.Id;

    [RecursiveMember]
    public partial string Number { get; set; } = record.Number;

    [RecursiveMember]
    public partial string Customer { get; set; } = record.Customer;

    [RecursiveMember]
    public partial string Country { get; set; } = record.Country;

    [RecursiveMember]
    public partial SubscriptionPlan Plan { get; set; } = record.Plan;

    [RecursiveMember]
    public partial SubscriptionStatus Status { get; set; } = record.Status;

    [RecursiveMember]
    public partial int Seats { get; set; } = record.Seats;

    /// <summary>What the seats cost a month under the plan, kept in step with both by <see cref="Refresh"/>.</summary>
    [RecursiveMember]
    public partial decimal Monthly { get; set; } = record.Monthly;

    [RecursiveMember]
    public partial DateTime Started { get; set; } = record.Started;

    [RecursiveMember]
    public partial bool Paid { get; set; } = record.Paid;

    /// <summary>How much of the seats' capacity the month used, in percent: what a template column draws as a bar.</summary>
    [RecursiveMember]
    public partial int Usage { get; set; } = record.Usage;

    /// <summary>The words a viewer would search a subscription by, in one text; the grid's search box matches it. Kept in step by <see cref="Refresh"/>.</summary>
    [RecursiveMember]
    public partial string SearchText { get; set; } = record.SearchText;

    /// <summary>The status as a badge reads it: its caption's key and its colour, kept in step with <see cref="Status"/> by <see cref="Refresh"/>.</summary>
    [RecursiveMember]
    public partial string StatusCaption { get; set; } = CaptionOf(record.Status);

    [RecursiveMember]
    public partial UIBadgeType StatusStyle { get; set; } = StyleOf(record.Status);

    /// <summary>
    /// Whether the row may be chosen: a cancelled subscription refuses it, which the table's row template reads by this name
    /// (<c>IItemAbilitiesModel.CanSelect</c>). Kept in step with <see cref="Status"/> by <see cref="Refresh"/>.
    /// </summary>
    [RecursiveMember]
    public partial bool? CanSelect { get; set; } = CanSelectOf(record.Status);

    /// <summary>
    /// What the row derives — the price, the badge's words and colour, the choice — read again after a value was written from the
    /// page; a seat count outside the canon's range is put back first, as the source refuses it.
    /// </summary>
    public void Refresh()
    {
        // A bound collection has taken the write before the page hears of it, so the refusal is the old value written back.
        if (!SubscriptionRecord.AllowsSeats(Seats))
            Seats = _seats;

        _seats = Seats;
        Monthly = ToRecord().Monthly;
        StatusCaption = CaptionOf(Status);
        StatusStyle = StyleOf(Status);
        CanSelect = CanSelectOf(Status);
        SearchText = ToRecord().SearchText;
    }

    private static string CaptionOf(SubscriptionStatus status)
        => SubscriptionChoices.Statuses.FirstOrDefault(choice => choice.Value == status.ToString())?.Caption ?? status.ToString();

    private static UIBadgeType StyleOf(SubscriptionStatus status)
        => status switch
        {
            SubscriptionStatus.Trial => UIBadgeType.Info,
            SubscriptionStatus.Active => UIBadgeType.Success,
            SubscriptionStatus.PastDue => UIBadgeType.Warning,
            SubscriptionStatus.Suspended => UIBadgeType.Surface,
            _ => UIBadgeType.Danger
        };

    private static bool? CanSelectOf(SubscriptionStatus status)
        => status == SubscriptionStatus.Cancelled ? false : null;

    /// <summary>The row as the catalogue keeps it, after an edit.</summary>
    public SubscriptionRecord ToRecord()
        => new(Id, Number, Customer, Country, Plan, Status, Seats, Started, Paid, Usage);

    /// <summary>The value a status line reads, by the property an edit named.</summary>
    public object? ValueOf(string property)
        => ToRecord().ValueOf(property);

    /// <summary>
    /// Takes a value the client sent for one property, in the shape the wire delivers it, and says whether the property took it.
    /// </summary>
    /// <remarks>The monthly price is not among them: it follows the plan and the seats.</remarks>
    public bool TryWrite(string property, object? value)
    {
        switch (property)
        {
            case nameof(Customer) when RecursiveValueCoercion.TryCoerce(value, out string customer):
                Customer = customer;
                return true;
            case nameof(Country) when RecursiveValueCoercion.TryCoerce(value, out string country):
                Country = country;
                return true;
            case nameof(Plan) when RecursiveValueCoercion.TryCoerce(value, out SubscriptionPlan plan):
                Plan = plan;
                return true;
            case nameof(Status) when RecursiveValueCoercion.TryCoerce(value, out SubscriptionStatus status):
                Status = status;
                return true;
            case nameof(Seats) when RecursiveValueCoercion.TryCoerce(value, out int seats) && SubscriptionRecord.AllowsSeats(seats):
                Seats = seats;
                return true;
            case nameof(Started) when RecursiveValueCoercion.TryCoerce(value, out DateTime started):
                Started = started;
                return true;
            case nameof(Paid) when RecursiveValueCoercion.TryCoerce(value, out bool paid):
                Paid = paid;
                return true;
            default:
                return false;
        }
    }
}

/// <summary>
/// The subscriptions, generated once from their index so every run and every window agree.
/// </summary>
internal static class SubscriptionCatalogue
{
    public const int TotalSubscriptions = 100_000;

    /// <summary>The customers a subscription may name, for a search over them — the canon's fourteen accounts.</summary>
    public static readonly string[] Customers =
    [
        "Bramble Studio", "Quillfeather Books", "Ferro Logistics", "Mosswood Games", "Pinecrest Clinic", "Saltmarsh Media", "Tidewell Energy",
        "Juniper Analytics", "Copperline Retail", "Larkspur Travel", "Oakhollow Farms", "Redfern Legal", "Silverbirch School", "Windrift Labs"
    ];

    private static readonly string[] Countries = ["Germany", "France", "Spain", "Italy", "Poland", "Netherlands", "Sweden", "Portugal"];

    // Two years back from the canon's present, so every start date is within them.
    private static readonly DateTime Epoch = new(2024, 9, 1, 0, 0, 0, DateTimeKind.Unspecified);

    private static readonly Lazy<SubscriptionRecord[]> All = new(static () => [.. Enumerable.Range(0, TotalSubscriptions).Select(Create)]);

    // Read only, shared by every page: an edit is kept by the source that took it, so one viewer's edit never lands on another's.
    public static IReadOnlyList<SubscriptionRecord> Everything => All.Value;

    /// <summary>A run of subscriptions as rows of their own, for a grid that holds them whole; from the middle, so the windowed grid starts elsewhere.</summary>
    public static List<Subscription> Slice(int start, int count)
        => [.. Enumerable.Range(start, count).Select(static index => new Subscription(Create(index)))];

    /// <summary>One subscription from its index: a small mixer scatters the fields so a sort has something to do.</summary>
    public static SubscriptionRecord Create(int index)
    {
        var mixed = unchecked((uint)index * 2654435761u);
        SubscriptionStatus status = (SubscriptionStatus)((mixed >> 5) % 5);
        // The cheaper plans are the common ones, as on any host.
        SubscriptionPlan plan = ((mixed >> 17) % 10) switch
        {
            < 4 => SubscriptionPlan.Starter,
            < 7 => SubscriptionPlan.Standard,
            < 9 => SubscriptionPlan.Pro,
            _ => SubscriptionPlan.Dedicated
        };
        var seats = plan == SubscriptionPlan.Dedicated ? 1 + (int)(mixed % 4) : 1 + (int)(mixed % SubscriptionRecord.MaxSeats);
        var usage = status switch
        {
            SubscriptionStatus.Trial => 5 + (int)((mixed >> 13) % 55),
            SubscriptionStatus.Active => 30 + (int)((mixed >> 13) % 66),
            SubscriptionStatus.PastDue => 20 + (int)((mixed >> 13) % 70),
            SubscriptionStatus.Suspended => 0,
            _ => (int)((mixed >> 13) % 20)
        };

        return new SubscriptionRecord(
            string.Create(CultureInfo.InvariantCulture, $"subscription-{index}"),
            string.Create(CultureInfo.InvariantCulture, $"SUB-{index + 1:D6}"),
            Customers[(mixed >> 3) % Customers.Length],
            Countries[(mixed >> 11) % Countries.Length],
            plan,
            status,
            seats,
            Epoch.AddHours((mixed >> 2) % (24 * 720)),
            status != SubscriptionStatus.PastDue && (mixed >> 7) % 5 != 0,
            usage);
    }
}

/// <summary>
/// A hundred thousand subscriptions read a window at a time: the query the grid's headers and rules resolve to is answered here, by
/// a sort and a scan over rows kept in memory — a source over a database would translate the terms instead.
/// </summary>
internal sealed class SubscriptionSource : UIItemSourceBase<Subscription>
{
    private static readonly JsonSerializerOptions QueryJsonOptions = new(JsonSerializerDefaults.Web);

    // The last query's answer, kept: a window the viewer scrolls to is the same order sliced elsewhere.
    private string? _lastQuery;
    private UIItemsQuery? _query;

    // The rows this page's viewer edited, over the catalogue every page reads.
    private readonly Dictionary<string, SubscriptionRecord> _edits = new(StringComparer.Ordinal);
    private SubscriptionRecord[] _ordered = [];

    // What the footer asks over the whole query — the count, the seats, the monthly total — computed once per query beside the order.
    private Dictionary<string, object> _aggregates = [];

    /// <summary>The rows the last query left, in the order it asked for.</summary>
    public int MatchCount => _ordered.Length;

    /// <summary>
    /// How many rows a query leaves, for a controller that set the query itself: the window is read again under it only once the
    /// command is over, so <see cref="MatchCount"/> still answers the query before it.
    /// </summary>
    public int CountMatching(UIItemsQuery query)
        => Resolve(query).Length;

    /// <summary>
    /// A cell's editor wrote a value into a row of the window: the row takes it, this page keeps it, and the order is read anew —
    /// with the footer's totals, which reach the page now rather than with the next window.
    /// </summary>
    protected override Task<bool> TryWriteAsync(Subscription item, string itemProperty, object? value, CancellationToken cancellationToken)
    {
        if (!item.TryWrite(itemProperty, value))
            return Task.FromResult(false);

        item.Refresh();

        SubscriptionRecord record = item.ToRecord();

        _edits[record.Id] = record;
        _lastQuery = null;

        if (_query is not null)
        {
            _ = Resolve(_query);
            Aggregates = _aggregates;
        }

        return Task.FromResult(true);
    }

    protected override Task<UIItemWindow<Subscription>> GetWindowAsync(UIItemWindowRequest request, CancellationToken cancellationToken)
    {
        SubscriptionRecord[] ordered = Resolve(request.Query);
        var total = ordered.Length;

        var start = request.Anchor.Kind switch
        {
            UIItemAnchorKind.Start => 0,
            UIItemAnchorKind.End => total - request.Count,
            UIItemAnchorKind.Offset => request.Anchor.Offset,
            UIItemAnchorKind.Before => PositionOf(ordered, request.Anchor.Key!) - request.Count,
            UIItemAnchorKind.After => PositionOf(ordered, request.Anchor.Key!) + 1,
            _ => 0
        };

        start = Math.Clamp(start, 0, Math.Max(0, total - 1));

        var count = Math.Max(0, Math.Min(request.Count, total - start));

        Subscription[] rows = new Subscription[count];

        for (var i = 0; i < count; i++)
            rows[i] = new Subscription(ordered[start + i]);

        return Task.FromResult(new UIItemWindow<Subscription>(rows)
        {
            Offset = start,
            TotalCount = total,
            HasMoreBefore = start > 0,
            HasMoreAfter = start + count < total,
            Aggregates = _aggregates
        });
    }

    private SubscriptionRecord[] Resolve(UIItemsQuery query)
    {
        var key = JsonSerializer.Serialize(query, QueryJsonOptions);

        if (string.Equals(key, _lastQuery, StringComparison.Ordinal))
            return _ordered;

        _query = query;

        IEnumerable<SubscriptionRecord> rows = _edits.Count == 0
            ? SubscriptionCatalogue.Everything
            : SubscriptionCatalogue.Everything.Select(row => _edits.GetValueOrDefault(row.Id, row));

        // Every filter term must hold, through the same comparison the client makes on a list it holds whole.
        for (var i = 0; i < query.Filters.Length; i++)
        {
            UIItemFilterTerm term = query.Filters[i];

            rows = rows.Where(subscription => UIComparisonEvaluator.Evaluate(subscription.ValueOf(term.ItemProperty), term.Operator, term.Value));
        }

        // OrderBy rather than Array.Sort: stable, so equal rows keep the source order the client's own sort would keep.
        IOrderedEnumerable<SubscriptionRecord>? sorted = null;

        for (var i = 0; i < query.Sorts.Length; i++)
        {
            UIItemSortTerm term = query.Sorts[i];
            var descending = term.Direction == UIItemsSortDirection.Descending;

            sorted = sorted is null
                ? (descending ? rows.OrderByDescending(subscription => subscription.ValueOf(term.ItemProperty), ValueComparer.Instance) : rows.OrderBy(subscription => subscription.ValueOf(term.ItemProperty), ValueComparer.Instance))
                : (descending ? sorted.ThenByDescending(subscription => subscription.ValueOf(term.ItemProperty), ValueComparer.Instance) : sorted.ThenBy(subscription => subscription.ValueOf(term.ItemProperty), ValueComparer.Instance));
        }

        _ordered = [.. sorted ?? rows];
        _lastQuery = key;

        var seats = 0L;
        var monthly = 0m;

        for (var i = 0; i < _ordered.Length; i++)
        {
            seats += _ordered[i].Seats;
            monthly += _ordered[i].Monthly;
        }

        _aggregates = new Dictionary<string, object>(StringComparer.Ordinal)
        {
            [nameof(SubscriptionRecord.Number)] = _ordered.Length,
            [nameof(SubscriptionRecord.Seats)] = seats,
            [nameof(SubscriptionRecord.Monthly)] = monthly
        };

        return _ordered;
    }

    private static int PositionOf(SubscriptionRecord[] ordered, string key)
        => Array.FindIndex(ordered, subscription => string.Equals(subscription.Id, key, StringComparison.Ordinal));

    /// <summary>Values of one property against each other: text without regard to case, as the client compares, everything else by its own order.</summary>
    private sealed class ValueComparer : IComparer<object?>
    {
        public static ValueComparer Instance { get; } = new();

        public int Compare(object? x, object? y)
            => x is string left && y is string right
                ? string.Compare(left, right, StringComparison.OrdinalIgnoreCase)
                : Comparer<object?>.Default.Compare(x, y);
    }
}
