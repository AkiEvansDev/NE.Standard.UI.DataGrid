using System;
using System.Collections.Concurrent;
using System.Globalization;
using NE.Standard.UI.Web.Abstractions.Theming;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>
/// A culture's number and date packs, built once for every cell formatted in it rather than once per value; a money column's
/// symbol has a pack of its own, kept by the symbol.
/// </summary>
internal sealed class DataGridCulturePacks(CultureInfo culture)
{
    // Built on first use, so a value formatted alone builds only the pack it reads; two threads racing build equal packs, and
    // either one is kept.
    private ConcurrentDictionary<string, WebNumberCulturePack>? _money;

    public WebNumberCulturePack Number => field ??= WebNumberCulturePack.FromCulture(culture);

    public WebTemporalCulturePack Temporal => field ??= WebTemporalCulturePack.FromCulture(culture);

    public WebNumberCulturePack Money(string currency)
        => (_money ??= new ConcurrentDictionary<string, WebNumberCulturePack>(StringComparer.Ordinal)).GetOrAdd(currency, static (symbol, pack) => pack with { CurrencySymbol = symbol }, Number);
}
