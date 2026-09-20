using System;
using System.Collections.Generic;
using System.Globalization;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.DataGrid;
using NE.Standard.UI.Web.Abstractions.Theming;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>
/// A cell's value as text, by the column's kind: the server half of what <c>data-grid-cell.ts</c> does on the client, over the
/// same formatters, so a row painted here and one built there read the same.
/// </summary>
public static class DataGridCellFormatter
{
    /// <summary>
    /// The formatter a CSV takes through <see cref="UIDataGridCsvOptions.Format"/>: cells as the grid shows them. A boolean with no
    /// choices and no translator falls back to its plain value.
    /// </summary>
    public static Func<object, UIDataGridColumn, string?> AsCsvFormat(CultureInfo culture, Func<string, string>? translate)
    {
        ArgumentNullException.ThrowIfNull(culture);

        Func<string, string> words = translate ?? (text => text);

        return (value, column) => column.Kind == UIDataGridColumnKind.Boolean && column.Choices is null && translate is null
            ? null
            : Format(value, column.Kind, column.Format, column.Currency, column.Choices, culture, words);
    }

    public static string Format(object? value, UIDataGridColumnKind kind, string? format, string? currency, IReadOnlyList<UIChoice>? choices, CultureInfo culture, Func<string, string> translate)
    {
        ArgumentNullException.ThrowIfNull(culture);
        ArgumentNullException.ThrowIfNull(translate);

        if (value is null)
            return string.Empty;

        return kind switch
        {
            UIDataGridColumnKind.Number or UIDataGridColumnKind.Money => TryToDecimal(value, out var number) ? FormatNumber(number, kind, format, currency, culture) : AsText(value, culture),
            UIDataGridColumnKind.Date => TryToDateTime(value, out DateTime moment) ? WebTemporalFormat.Format(moment, format, WebTemporalCulturePack.FromCulture(culture)) : AsText(value, culture),
            UIDataGridColumnKind.Boolean => FormatBoolean(value, choices, culture, translate),
            UIDataGridColumnKind.Enum => FormatChoice(AsText(value, culture), choices, translate),
            UIDataGridColumnKind.Text => AsText(value, culture),
            _ => AsText(value, culture)
        };
    }

    private static string FormatNumber(decimal number, UIDataGridColumnKind kind, string? format, string? currency, CultureInfo culture)
    {
        WebNumberCulturePack pack = WebNumberCulturePack.FromCulture(culture);

        if (kind == UIDataGridColumnKind.Money && !string.IsNullOrEmpty(currency))
            pack = pack with { CurrencySymbol = currency };

        return WebNumberFormat.Format(number, format, pack);
    }

    private static string FormatBoolean(object value, IReadOnlyList<UIChoice>? choices, CultureInfo culture, Func<string, string> translate)
    {
        var text = value is bool flag ? (flag ? "true" : "false") : AsText(value, culture).ToLowerInvariant();

        return FindChoice(choices, text) is { } caption
            ? translate(caption)
            : translate(text == "true" ? DataGridStrings.Yes : DataGridStrings.No);
    }

    private static string FormatChoice(string text, IReadOnlyList<UIChoice>? choices, Func<string, string> translate)
        => FindChoice(choices, text) is { } caption ? translate(caption) : text;

    private static string? FindChoice(IReadOnlyList<UIChoice>? choices, string value)
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

    /// <summary>A number of any CLR width as a decimal; a text or a flag is not one, and is written as it is.</summary>
    private static bool TryToDecimal(object value, out decimal number)
    {
        switch (value)
        {
            case decimal d:
                number = d;
                return true;
            case double or float or int or long or short or byte or sbyte or uint or ulong or ushort:
                number = Convert.ToDecimal(value, CultureInfo.InvariantCulture);
                return true;
            default:
                number = 0;
                return false;
        }
    }

    /// <summary>A moment in any of its shapes; text is read as the invariant round-trip form the wire uses.</summary>
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
            case string text:
                return DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out moment);
            default:
                moment = default;
                return false;
        }
    }

    private static string AsText(object value, CultureInfo culture)
        => value as string ?? Convert.ToString(value, culture) ?? string.Empty;
}
