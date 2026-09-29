using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.DataGrid;
using NE.Standard.UI.Web.Abstractions.Theming;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>
/// A cell's value as text by the column's kind — the server half of <c>data-grid-cell.ts</c>, both held to
/// <c>datagrid-cell-corpus.json</c>.
/// </summary>
public static partial class DataGridCellFormatter
{
    // Just under decimal.MaxValue: a double at it may round past it and overflow the conversion.
    private const double LargestDecimal = 7.9e28;

    /// <summary>
    /// A <see cref="UIDataGridCsvOptions.Format"/> writing cells as the grid shows them; without a translator a flag writes its
    /// plain value rather than one of the grid's keys.
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

    /// <summary>A number, or an invariant numeric text, as a decimal; false where a decimal cannot hold it.</summary>
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

    /// <summary>A value as the client's cell writes it: a flag in the wire's own words rather than .NET's <c>True</c>.</summary>
    private static string AsText(object value, CultureInfo culture)
        => value switch
        {
            string text => text,
            bool flag => flag ? "true" : "false",
            _ => Convert.ToString(value, culture) ?? string.Empty
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
                return TryReadWritten(text, out moment);
            default:
                moment = default;
                return false;
        }
    }

    /// <summary>The wall clock a text in the wire's shapes names, as <c>temporal.parse</c> reads it; false for any other.</summary>
    private static bool TryReadWritten(string text, out DateTime moment)
    {
        Match written = WrittenMomentRegex().Match(text.Trim());

        moment = default;

        if (!written.Success)
            return false;

        var year = ReadField(written, 1);
        var month = ReadField(written, 2);
        var day = ReadField(written, 3);
        var hour = ReadField(written, 4);
        var minute = ReadField(written, 5);
        var second = ReadField(written, 6);

        if (year < 1 || month is < 1 or > 12 || day < 1 || day > DateTime.DaysInMonth(year, month) || hour > 23 || minute > 59 || second > 59)
            return false;

        // The fraction's first three digits are the milliseconds; the rest is finer than a moment carries.
        var fraction = written.Groups[7].Success ? written.Groups[7].Value.PadRight(3, '0')[..3] : "0";

        moment = new DateTime(year, month, day, hour, minute, second, int.Parse(fraction, CultureInfo.InvariantCulture), DateTimeKind.Unspecified);
        return true;
    }

    private static int ReadField(Match written, int group)
        => written.Groups[group].Success ? int.Parse(written.Groups[group].ValueSpan, CultureInfo.InvariantCulture) : 0;

    // temporal-format.ts's WrittenMomentPattern, with ASCII digits as JavaScript's \d reads them.
    [GeneratedRegex("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:[T ]([0-9]{1,2}):([0-9]{1,2})(?::([0-9]{1,2})(?:\\.([0-9]+))?)?)?(?:Z|[+-][0-9]{2}(?::?[0-9]{2})?)?$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex WrittenMomentRegex();

    /// <summary>A flag by its caption: a text says true in any case, anything else is false, and the captions are keyed by the two words.</summary>
    private static string FormatBoolean(object value, IReadOnlyList<UIChoice>? choices, CultureInfo culture, Func<string, string> translate)
    {
        var flag = IsTrue(value, culture);

        return FindChoice(choices, flag ? "true" : "false") is { } caption
            ? translate(caption)
            : translate(flag ? DataGridStrings.Yes : DataGridStrings.No);
    }

    private static bool IsTrue(object value, CultureInfo culture)
        => value is bool truth ? truth : string.Equals(AsText(value, culture), "true", StringComparison.OrdinalIgnoreCase);

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

    /// <summary>A flag's or a choice's value as its choices are keyed — <c>true</c>/<c>false</c>, or the value's text; null for any other kind.</summary>
    internal static string? ChoiceValue(object? value, UIDataGridColumnKind kind, CultureInfo culture)
    {
        if (value is null)
            return null;

        return kind switch
        {
            UIDataGridColumnKind.Boolean => IsTrue(value, culture) ? "true" : "false",
            UIDataGridColumnKind.Enum => AsText(value, culture),
            _ => null
        };
    }

    /// <summary>A number cell's value as the invariant number a footer adds up — a numeric text's too, as the cell shows it; null for any other.</summary>
    internal static string? RawNumber(object? value)
        => value is not null && TryToDecimal(value, out var number) ? number.ToString(CultureInfo.InvariantCulture) : null;
}
