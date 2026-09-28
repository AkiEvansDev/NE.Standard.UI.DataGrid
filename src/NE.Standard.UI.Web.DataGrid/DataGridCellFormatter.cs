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
    // Just under decimal.MaxValue: a double at it may round past it and overflow the conversion.
    private const double LargestDecimal = 7.9e28;

    /// <summary>
    /// The formatter a CSV takes through <see cref="UIDataGridCsvOptions.Format"/>: cells as the grid shows them. Without a
    /// translator a boolean whose word would be one of the grid's own keys falls back to its plain value rather than the key.
    /// </summary>
    public static Func<object, UIDataGridColumn, string?> AsCsvFormat(CultureInfo culture, Func<string, string>? translate)
    {
        ArgumentNullException.ThrowIfNull(culture);

        if (translate is not null)
            return (value, column) => Format(value, column.Kind, column.Format, column.Currency, column.Choices, culture, translate);

        return (value, column) =>
        {
            var text = Format(value, column.Kind, column.Format, column.Currency, column.Choices, culture, static text => text);

            return column.Kind == UIDataGridColumnKind.Boolean && text is DataGridStrings.Yes or DataGridStrings.No ? null : text;
        };
    }

    /// <summary>A cell's value as the text its column's kind writes: a number under its format, a date under its pattern, a flag or a choice by its caption.</summary>
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

    /// <summary>
    /// A number of any CLR width as a decimal, and a text that reads as one invariantly, as the client's cell reads it; a flag, a
    /// text that is no number, and a real no decimal holds — not a number, an infinity, past 7.9e28 — are written as they are.
    /// </summary>
    private static bool TryToDecimal(object value, out decimal number)
    {
        switch (value)
        {
            case decimal d:
                number = d;
                return true;
            case double or float:
                return TryFromReal(Convert.ToDouble(value, CultureInfo.InvariantCulture), out number);
            case int or long or short or byte or sbyte or uint or ulong or ushort:
                number = Convert.ToDecimal(value, CultureInfo.InvariantCulture);
                return true;
            case string text when double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed):
                return TryFromReal(parsed, out number);
            default:
                number = 0;
                return false;
        }
    }

    private static bool TryFromReal(double real, out decimal number)
    {
        if (double.IsFinite(real) && Math.Abs(real) < LargestDecimal)
        {
            number = (decimal)real;
            return true;
        }

        number = 0;
        return false;
    }

    private static string FormatNumber(decimal number, UIDataGridColumnKind kind, string? format, string? currency, CultureInfo culture)
    {
        WebNumberCulturePack pack = WebNumberCulturePack.FromCulture(culture);

        if (kind == UIDataGridColumnKind.Money && !string.IsNullOrEmpty(currency))
            pack = pack with { CurrencySymbol = currency };

        return WebNumberFormat.Format(number, format, pack);
    }

    private static string AsText(object value, CultureInfo culture)
        => value as string ?? Convert.ToString(value, culture) ?? string.Empty;

    /// <summary>
    /// A moment in any of its shapes. Text is read by the clock it is written with, an offset after it tolerated and ignored, as the
    /// client's cell reads it: converted to the server's own zone, a moment near midnight would show another day.
    /// </summary>
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
            case string text when DateTimeOffset.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTimeOffset parsed):
                moment = parsed.DateTime;
                return true;
            default:
                moment = default;
                return false;
        }
    }

    private static string FormatBoolean(object value, IReadOnlyList<UIChoice>? choices, CultureInfo culture, Func<string, string> translate)
    {
        var text = value is bool flag ? (flag ? "true" : "false") : AsText(value, culture).ToLowerInvariant();

        return FindChoice(choices, text) is { } caption
            ? translate(caption)
            : translate(text == "true" ? DataGridStrings.Yes : DataGridStrings.No);
    }

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

    private static string FormatChoice(string text, IReadOnlyList<UIChoice>? choices, Func<string, string> translate)
        => FindChoice(choices, text) is { } caption ? translate(caption) : text;

    /// <summary>A number cell's value as the invariant number a footer adds up — a numeric text's too, as the cell shows it; null for any other.</summary>
    internal static string? RawNumber(object? value)
        => value is not null && TryToDecimal(value, out var number) ? number.ToString(CultureInfo.InvariantCulture) : null;
}
