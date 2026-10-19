using System;
using System.Collections.Generic;
using System.Globalization;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.DataGrid;
using NE.Standard.UI.Primitives.Localization;
using NE.Standard.UI.Primitives.Text;
using NE.Standard.UI.Web.Abstractions.Theming;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>
/// A cell's value as text by the column's kind — the server half of <c>data-grid-cell.ts</c>, both held to
/// <c>datagrid-cell-corpus.json</c>.
/// </summary>
public static class DataGridCellFormatter
{
    // A flag's two words, made once rather than once a cell.
    private static readonly UIPhrase YesPhrase = UIPhrase.Of(DataGridStrings.Yes);
    private static readonly UIPhrase NoPhrase = UIPhrase.Of(DataGridStrings.No);

    /// <summary>
    /// A <see cref="UIDataGridCsvOptions.Format"/> writing cells as the grid shows them, a number in the server's own digits — the page's
    /// double would round an id past 2^53; without a translator a flag writes its plain value rather than one of the grid's keys.
    /// </summary>
    public static Func<object, UIDataGridColumn, string?> AsCsvFormat(CultureInfo culture, Func<UIPhrase, string>? translate)
    {
        ArgumentNullException.ThrowIfNull(culture);

        // Once for the file, not once per cell.
        DataGridCulturePacks packs = new(culture);

        if (translate is not null)
            return (value, column) => Format(value, column.Kind, column.Format, column.Currency, column.Choices, packs, translate, exactDigits: true);

        return (value, column) =>
        {
            var text = Format(value, column.Kind, column.Format, column.Currency, column.Choices, packs, static words => words.Key, exactDigits: true);

            return column.Kind == UIDataGridColumnKind.Boolean && text is DataGridStrings.Yes or DataGridStrings.No ? null : text;
        };
    }

    /// <summary>A cell's value as the text its column's kind writes: a number under its format, a date under its pattern, a flag or a choice by its caption.</summary>
    public static string Format(object? value, UIDataGridColumnKind kind, string? format, string? currency, IReadOnlyList<UIChoice>? choices, CultureInfo culture, Func<UIPhrase, string> translate)
    {
        ArgumentNullException.ThrowIfNull(culture);

        return Format(value, kind, format, currency, choices, new DataGridCulturePacks(culture), translate);
    }

    /// <summary>A cell's text over its culture's packs as they were built for many cells — a page's culture, a file's.</summary>
    internal static string Format(object? value, UIDataGridColumnKind kind, string? format, string? currency, IReadOnlyList<UIChoice>? choices, DataGridCulturePacks packs, Func<UIPhrase, string> translate)
        => Format(value, kind, format, currency, choices, packs, translate, exactDigits: false);

    /// <summary>
    /// A cell's text, a decimal or an integer in its own digits where <paramref name="exactDigits"/> asks for them, as a file keeps
    /// them, else in those of the double the page holds.
    /// </summary>
    private static string Format(object? value, UIDataGridColumnKind kind, string? format, string? currency, IReadOnlyList<UIChoice>? choices, DataGridCulturePacks packs, Func<UIPhrase, string> translate, bool exactDigits)
    {
        ArgumentNullException.ThrowIfNull(packs);
        ArgumentNullException.ThrowIfNull(translate);

        // A NaN or an infinity too: the wire writes it as null, and painted as anything else the cell would change at the page's first write.
        if (UIScriptNumber.ReadsAsNull(value))
            return string.Empty;

        return kind switch
        {
            UIDataGridColumnKind.Number or UIDataGridColumnKind.Money => FormatNumber(value, kind, format, currency, packs, exactDigits) ?? AsText(value, exactDigits),
            UIDataGridColumnKind.Date => TryToDateTime(value, out DateTime moment) ? WebTemporalFormat.Format(moment, format, packs.Temporal) : AsText(value, exactDigits),
            UIDataGridColumnKind.Boolean => FormatBoolean(value, choices, translate),
            UIDataGridColumnKind.Enum => FormatChoice(AsText(value, exactDigits), choices, translate),
            UIDataGridColumnKind.Text => AsText(value, exactDigits),
            _ => AsText(value, exactDigits)
        };
    }

    /// <summary>A number under the column's format, as the client's cell writes it; null for a value that is no finite number.</summary>
    private static string? FormatNumber(object value, UIDataGridColumnKind kind, string? format, string? currency, DataGridCulturePacks packs, bool exactDigits)
    {
        if (!TryToNumber(value, exactDigits, out var exact, out var real))
            return null;

        WebNumberCulturePack pack = kind == UIDataGridColumnKind.Money && !string.IsNullOrEmpty(currency) ? packs.Money(currency) : packs.Number;

        return exact is decimal number ? WebNumberFormat.Format(number, format, pack) : WebNumberFormat.Format(real, format, pack);
    }

    /// <summary>
    /// A number, or a numeric text as .NET's invariant float reads one, as the page holds it: a decimal or an integer exact while a
    /// double gives its digits back — always, where <paramref name="exactDigits"/> asks for its own — any other as the double the
    /// client holds (<see cref="UIScriptNumber.TryRead"/>); false for no number, or one past a double.
    /// </summary>
    private static bool TryToNumber(object value, bool exactDigits, out decimal? exact, out double real)
    {
        exact = null;

        switch (value)
        {
            case decimal number:
                ReadAsThePage(number, exactDigits, out exact, out real);
                return true;
            case int or long or short or byte or sbyte or uint or ulong or ushort:
                ReadAsThePage(Convert.ToDecimal(value, CultureInfo.InvariantCulture), exactDigits, out exact, out real);
                return true;
            case string text when double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed):
                real = parsed;
                return double.IsFinite(real);
            default:
                return UIScriptNumber.TryRead(value, out real);
        }
    }

    /// <summary>
    /// An exact number as the page holds it — the wire writes its digits and the page reads them into a double: exact, its trailing
    /// zeros dropped, up to fifteen significant digits, which a double always gives back; past them the double's own, as a patch or
    /// a language switch on the page writes it (9.000000000000001 reads as 9.000000000000002, 2^53 + 1 as 2^53) — unless
    /// <paramref name="exactDigits"/> keeps its own. <paramref name="real"/> is the double only where it is not kept exact.
    /// </summary>
    private static void ReadAsThePage(decimal number, bool exactDigits, out decimal? exact, out double real)
    {
        var trimmed = WebNumberFormat.WithoutTrailingZeros(number);

        exact = exactDigits || HasFewDigits(trimmed) ? trimmed : null;
        real = exact is null ? UIScriptNumber.Read(trimmed) : 0;
    }

    /// <summary>Whether a decimal has at most fifteen significant digits: its unscaled integer under 10^15.</summary>
    private static bool HasFewDigits(decimal number)
    {
        Span<int> bits = stackalloc int[4];
        _ = decimal.GetBits(number, bits);

        return new UInt128((uint)bits[2], ((ulong)(uint)bits[1] << 32) | (uint)bits[0]) < 1_000_000_000_000_000UL;
    }

    /// <summary>
    /// A value as the client's cell writes it, the page's <c>String()</c> (<see cref="UIScriptText"/>): a flag in the wire's own words
    /// rather than .NET's <c>True</c>, a number never in the page's culture (<c>12.5</c>, not <c>12,5</c>; <c>1e+21</c>); a decimal or
    /// an integer in its own digits where <paramref name="exactDigits"/> asks for them.
    /// </summary>
    private static string AsText(object value, bool exactDigits)
        => value switch
        {
            decimal number when exactDigits => WebNumberFormat.WithoutTrailingZeros(number).ToString(CultureInfo.InvariantCulture),
            int or long or short or byte or sbyte or uint or ulong or ushort when exactDigits => Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty,
            _ => UIScriptText.Of(value)
        };

    /// <summary>A moment in any of its shapes; a text by the wall clock it is written with.</summary>
    private static bool TryToDateTime(object value, out DateTime moment)
    {
        switch (value)
        {
            case DateTime dateTime:
                moment = dateTime;
                return true;
            case DateTimeOffset offset:
                moment = offset.DateTime;
                return true;
            case DateOnly date:
                moment = date.ToDateTime(TimeOnly.MinValue);
                return true;
            // An offset after the clock is ignored, as the client's cell does: converted to the server's zone, a moment near
            // midnight would show another day.
            case string text:
                return UIWrittenMoment.TryRead(text, out moment);
            default:
                moment = default;
                return false;
        }
    }

    /// <summary>A flag by its caption: a text says true in any case, anything else is false, and the captions are keyed by the two words.</summary>
    private static string FormatBoolean(object value, IReadOnlyList<UIChoice>? choices, Func<UIPhrase, string> translate)
    {
        var flag = IsTrue(value);

        return FindChoice(choices, flag ? "true" : "false") is { } caption
            ? translate(caption)
            : translate(flag ? YesPhrase : NoPhrase);
    }

    private static bool IsTrue(object value)
        => value is bool truth ? truth : string.Equals(AsText(value, exactDigits: false), "true", StringComparison.OrdinalIgnoreCase);

    private static UIPhrase? FindChoice(IReadOnlyList<UIChoice>? choices, string value)
    {
        if (choices is null)
            return null;

        for (var i = 0; i < choices.Count; i++)
        {
            if (string.Equals(choices[i].Value, value, StringComparison.Ordinal))
                return choices[i].Caption;
        }

        return null;
    }

    private static string FormatChoice(string text, IReadOnlyList<UIChoice>? choices, Func<UIPhrase, string> translate)
        => FindChoice(choices, text) is { } caption ? translate(caption) : text;

    /// <summary>A flag's or a choice's value as its choices are keyed — <c>true</c>/<c>false</c>, or the value's text; null for any other kind.</summary>
    internal static string? ChoiceValue(object? value, UIDataGridColumnKind kind)
    {
        if (UIScriptNumber.ReadsAsNull(value))
            return null;

        return kind switch
        {
            UIDataGridColumnKind.Boolean => IsTrue(value) ? "true" : "false",
            UIDataGridColumnKind.Enum => AsText(value, exactDigits: false),
            _ => null
        };
    }

    /// <summary>A number cell's value as the invariant number a footer adds up — a numeric text's too, as the cell shows it; null for any other.</summary>
    internal static string? RawNumber(object? value)
        => value is not null && TryToNumber(value, exactDigits: false, out var exact, out var real) ? exact?.ToString(CultureInfo.InvariantCulture) ?? real.ToString("R", CultureInfo.InvariantCulture) : null;

    /// <summary>A date cell's value as the wire writes a moment — the wall clock the cell shows, to the millisecond; null for any other.</summary>
    internal static string? WrittenMoment(object? value)
        => value is not null && TryToDateTime(value, out DateTime moment) ? moment.ToString("yyyy-MM-dd'T'HH:mm:ss.fff", CultureInfo.InvariantCulture) : null;
}
