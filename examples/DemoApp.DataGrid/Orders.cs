using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Abstractions.Binding;
using NE.Standard.UI.Abstractions.Data;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Abstractions.Recursive;
using NE.Standard.UI.Data;
using NE.Standard.UI.Items;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Primitives.Items;
using NE.Standard.UI.Primitives.Styling;

namespace DemoApp.DataGrid;

internal enum OrderStatus
{
    Draft,
    Confirmed,
    Shipped,
    Delivered,
    [Description("Cancelled by the customer")]
    Cancelled
}

/// <summary>
/// One order as the catalogue keeps it: plain data, shared by every window that shows it.
/// </summary>
internal sealed record OrderRecord(string Id, string Number, string Customer, string Country, OrderStatus Status, int Quantity, decimal Total, DateTime Ordered, bool Paid, int Fulfilment)
{
    /// <summary>The value a sort or a filter reads, by the property the term names; the shape the client reads it in — an enum by its name.</summary>
    public object? ValueOf(string property)
        => property switch
        {
            nameof(Number) => Number,
            nameof(Customer) => Customer,
            nameof(Country) => Country,
            nameof(Status) => Status.ToString(),
            nameof(Quantity) => Quantity,
            nameof(Total) => Total,
            // The ISO text the wire carries: a filter term compares it as text, and it orders as the moments do.
            nameof(Ordered) => Ordered.ToString("s", CultureInfo.InvariantCulture),
            nameof(Paid) => Paid,
            nameof(Fulfilment) => Fulfilment,
            nameof(SearchText) => SearchText,
            _ => null
        };

    /// <summary>The number, the customer and the country in one text, for the search box.</summary>
    public string SearchText => $"{Number} {Customer} {Country}";
}

/// <summary>
/// One row of every grid on the page: an order, with a value of each kind a typed column formats. A row belongs to the one
/// collection that shows it, so a window builds its rows afresh from the catalogue's records.
/// </summary>
internal sealed partial class Order(OrderRecord record) : RecursiveObservable, IBindableItem
{
    [RecursiveMember(false)]
    public string Id { get; } = record.Id;

    [RecursiveMember]
    public partial string Number { get; set; } = record.Number;

    [RecursiveMember]
    public partial string Customer { get; set; } = record.Customer;

    [RecursiveMember]
    public partial string Country { get; set; } = record.Country;

    [RecursiveMember]
    public partial OrderStatus Status { get; set; } = record.Status;

    [RecursiveMember]
    public partial int Quantity { get; set; } = record.Quantity;

    [RecursiveMember]
    public partial decimal Total { get; set; } = record.Total;

    [RecursiveMember]
    public partial DateTime Ordered { get; set; } = record.Ordered;

    [RecursiveMember]
    public partial bool Paid { get; set; } = record.Paid;

    /// <summary>How far the order has come, in percent: what a template column draws as a bar.</summary>
    [RecursiveMember]
    public partial int Fulfilment { get; set; } = record.Fulfilment;

    /// <summary>The words a viewer would search an order by, in one text; the grid's search box matches it. Kept in step by <see cref="Refresh"/>.</summary>
    [RecursiveMember]
    public partial string SearchText { get; set; } = record.SearchText;

    /// <summary>The status as a badge reads it: its caption and its colour, kept in step with <see cref="Status"/> by <see cref="Refresh"/>.</summary>
    [RecursiveMember]
    public partial string StatusCaption { get; set; } = CaptionOf(record.Status);

    [RecursiveMember]
    public partial UIBadgeType StatusStyle { get; set; } = StyleOf(record.Status);

    private static readonly IReadOnlyList<UIChoice> StatusChoices = UIChoices.FromEnum<OrderStatus>();

    /// <summary>What the status derives — the badge's words and colour — read again after the status was written from the page.</summary>
    public void Refresh()
    {
        StatusCaption = CaptionOf(Status);
        StatusStyle = StyleOf(Status);
        SearchText = ToRecord().SearchText;
    }

    private static string CaptionOf(OrderStatus status)
        => StatusChoices.FirstOrDefault(choice => choice.Value == status.ToString())?.Caption ?? status.ToString();

    private static UIBadgeType StyleOf(OrderStatus status)
        => status switch
        {
            OrderStatus.Draft => UIBadgeType.Surface,
            OrderStatus.Confirmed => UIBadgeType.Info,
            OrderStatus.Shipped => UIBadgeType.Primary,
            OrderStatus.Delivered => UIBadgeType.Success,
            _ => UIBadgeType.Danger
        };

    /// <summary>The row as the catalogue keeps it, after an edit.</summary>
    public OrderRecord ToRecord()
        => new(Id, Number, Customer, Country, Status, Quantity, Total, Ordered, Paid, Fulfilment);

    /// <summary>The value a status line reads, by the property an edit named.</summary>
    public object? ValueOf(string property)
        => ToRecord().ValueOf(property);

    /// <summary>
    /// Takes a value the client sent for one property, in the shape the wire delivers it, and says whether the property took it.
    /// </summary>
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
            case nameof(Status) when RecursiveValueCoercion.TryCoerce(value, out OrderStatus status):
                Status = status;
                return true;
            case nameof(Quantity) when RecursiveValueCoercion.TryCoerce(value, out int quantity):
                Quantity = quantity;
                return true;
            case nameof(Total) when RecursiveValueCoercion.TryCoerce(value, out decimal total):
                Total = total;
                return true;
            case nameof(Ordered) when RecursiveValueCoercion.TryCoerce(value, out DateTime ordered):
                Ordered = ordered;
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
/// The orders, generated once from their index so every run and every window agree.
/// </summary>
internal static class OrderCatalogue
{
    public const int TotalOrders = 100_000;

    /// <summary>The customers an order may name, for a search over them.</summary>
    public static readonly string[] Customers =
    [
        "Northwind Traders", "Contoso", "Fabrikam", "Adventure Works", "Wide World Importers", "Tailspin Toys", "Alpine Ski House",
        "Coho Winery", "Litware", "Proseware", "Woodgrove Bank", "Blue Yonder Airlines", "Lucerne Publishing", "Margie's Travel"
    ];

    private static readonly string[] Countries = ["Germany", "France", "Spain", "Italy", "Poland", "Netherlands", "Sweden", "Portugal"];

    private static readonly DateTime Epoch = new(2024, 1, 1, 0, 0, 0, DateTimeKind.Unspecified);

    private static readonly Lazy<OrderRecord[]> All = new(static () => [.. Enumerable.Range(0, TotalOrders).Select(Create)]);

    public static IReadOnlyList<OrderRecord> Everything => All.Value;

    /// <summary>Keeps an edit a window took, so the next window and the next sort see it.</summary>
    public static void Update(OrderRecord record)
    {
        var index = Array.FindIndex(All.Value, candidate => string.Equals(candidate.Id, record.Id, StringComparison.Ordinal));

        if (index >= 0)
            All.Value[index] = record;
    }

    /// <summary>A run of orders as rows of their own, for a grid that holds them whole; from the middle, so the windowed grid starts elsewhere.</summary>
    public static List<Order> Slice(int start, int count)
        => [.. Enumerable.Range(start, count).Select(static index => new Order(Create(index)))];

    /// <summary>One order from its index: a small mixer scatters the fields so a sort has something to do.</summary>
    public static OrderRecord Create(int index)
    {
        var mixed = unchecked((uint)index * 2654435761u);
        var quantity = 1 + (int)(mixed % 40);
        var unitPrice = 4.5m + ((mixed >> 8) % 300 / 4m);
        OrderStatus status = (OrderStatus)((mixed >> 5) % 5);
        var fulfilment = status switch
        {
            OrderStatus.Draft => 0,
            OrderStatus.Confirmed => 10 + (int)((mixed >> 13) % 30),
            OrderStatus.Shipped => 50 + (int)((mixed >> 13) % 45),
            OrderStatus.Delivered => 100,
            _ => (int)((mixed >> 13) % 50)
        };

        return new OrderRecord(
            string.Create(CultureInfo.InvariantCulture, $"order-{index}"),
            string.Create(CultureInfo.InvariantCulture, $"ORD-{index + 1:D6}"),
            Customers[(mixed >> 3) % Customers.Length],
            Countries[(mixed >> 11) % Countries.Length],
            status,
            quantity,
            quantity * unitPrice,
            Epoch.AddHours((mixed >> 2) % (24 * 640)),
            (mixed >> 7) % 3 != 0,
            fulfilment);
    }
}

/// <summary>
/// A hundred thousand orders read a window at a time: the query the grid's headers and rules resolve to is answered here, by
/// a sort and a scan over rows kept in memory — a source over a database would translate the terms instead.
/// </summary>
internal sealed class OrderSource : UIItemSourceBase<Order>
{
    private static readonly JsonSerializerOptions QueryJsonOptions = new(JsonSerializerDefaults.Web);

    // The last query's answer, kept: a window the viewer scrolls to is the same order sliced elsewhere.
    private string? _lastQuery;
    private OrderRecord[] _ordered = [];

    // What the footer asks over the whole query — the count, the quantities, the totals — computed once per query beside the order.
    private Dictionary<string, object> _aggregates = [];

    /// <summary>The rows the last query left, in the order it asked for.</summary>
    public int MatchCount => _ordered.Length;

    /// <summary>A cell's editor wrote a value into a row of the window: the row takes it, the catalogue keeps it, and the order is read anew.</summary>
    protected override Task<bool> TryWriteAsync(Order item, string itemProperty, object? value, CancellationToken cancellationToken)
    {
        if (!item.TryWrite(itemProperty, value))
            return Task.FromResult(false);

        item.Refresh();
        OrderCatalogue.Update(item.ToRecord());
        _lastQuery = null;

        return Task.FromResult(true);
    }

    protected override Task<UIItemWindow<Order>> GetWindowAsync(UIItemWindowRequest request, CancellationToken cancellationToken)
    {
        OrderRecord[] ordered = Resolve(request.Query);
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

        Order[] rows = new Order[count];

        for (var i = 0; i < count; i++)
            rows[i] = new Order(ordered[start + i]);

        return Task.FromResult(new UIItemWindow<Order>(rows)
        {
            Offset = start,
            TotalCount = total,
            HasMoreBefore = start > 0,
            HasMoreAfter = start + count < total,
            Aggregates = _aggregates
        });
    }

    private OrderRecord[] Resolve(UIItemsQuery query)
    {
        var key = JsonSerializer.Serialize(query, QueryJsonOptions);

        if (string.Equals(key, _lastQuery, StringComparison.Ordinal))
            return _ordered;

        IEnumerable<OrderRecord> rows = OrderCatalogue.Everything;

        // Every filter term must hold, through the same comparison the client makes on a list it holds whole.
        for (var i = 0; i < query.Filters.Length; i++)
        {
            UIItemFilterTerm term = query.Filters[i];

            rows = rows.Where(order => UIComparisonEvaluator.Evaluate(order.ValueOf(term.ItemProperty), term.Operator, term.Value));
        }

        // OrderBy rather than Array.Sort: stable, so equal rows keep the source order the client's own sort would keep.
        IOrderedEnumerable<OrderRecord>? sorted = null;

        for (var i = 0; i < query.Sorts.Length; i++)
        {
            UIItemSortTerm term = query.Sorts[i];
            var descending = term.Direction == UIItemsSortDirection.Descending;

            sorted = sorted is null
                ? (descending ? rows.OrderByDescending(order => order.ValueOf(term.ItemProperty), ValueComparer.Instance) : rows.OrderBy(order => order.ValueOf(term.ItemProperty), ValueComparer.Instance))
                : (descending ? sorted.ThenByDescending(order => order.ValueOf(term.ItemProperty), ValueComparer.Instance) : sorted.ThenBy(order => order.ValueOf(term.ItemProperty), ValueComparer.Instance));
        }

        _ordered = [.. sorted ?? rows];
        _lastQuery = key;

        var quantity = 0L;
        var total = 0m;

        for (var i = 0; i < _ordered.Length; i++)
        {
            quantity += _ordered[i].Quantity;
            total += _ordered[i].Total;
        }

        _aggregates = new Dictionary<string, object>(StringComparer.Ordinal)
        {
            [nameof(OrderRecord.Number)] = _ordered.Length,
            [nameof(OrderRecord.Quantity)] = quantity,
            [nameof(OrderRecord.Total)] = total
        };

        return _ordered;
    }

    private static int PositionOf(OrderRecord[] ordered, string key)
        => Array.FindIndex(ordered, order => string.Equals(order.Id, key, StringComparison.Ordinal));

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
