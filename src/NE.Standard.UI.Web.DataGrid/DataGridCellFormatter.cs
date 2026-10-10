using System;
using System.Collections.Generic;
using System.Globalization;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.DataGrid;
using NE.Standard.UI.Primitives.Text;
using NE.Standard.UI.Web.Abstractions.Theming;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>
/// A cell's value as text by the column's kind — the server half of <c>data-grid-cell.ts</c>, both held to
/// <c>datagrid-cell-corpus.json</c>.
/// </summary>
public static class DataGridCellFormatter
{
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
            UIDataGridColumnKind.Number or UIDataGridColumnKind.Money => FormatNumber(value, kind, format, currency, culture) ?? AsText(value),
            UIDataGridColumnKind.Date => TryToDateTime(value, out DateTime moment) ? WebTemporalFormat.Format(moment, format, WebTemporalCulturePack.FromCulture(culture)) : AsText(value),
            UIDataGridColumnKind.Boolean => FormatBoolean(value, choices, translate),
            UIDataGridColumnKind.Enum => FormatChoice(AsText(value), choices, translate),
            UIDataGridColumnKind.Text => AsText(value),
            _ => AsText(value)
        };
    }

    /// <summary>A number under the column's format, as the client's cell writes it; null for a value that is no finite number.</summary>
    private static string? FormatNumber(object value, UIDataGridColumnKind kind, string? format, string? currency, CultureInfo culture)
    {
        if (!TryToNumber(value, out var exact, out var real))
            return null;

        WebNumberCulturePack pack = WebNumberCulturePack.FromCulture(culture);

        if (kind == UIDataGridColumnKind.Money && !string.IsNullOrEmpty(currency))
            pack = pack with { CurrencySymbol = currency };

        return exact is decimal number ? WebNumberFormat.Format(number, format, pack) : WebNumberFormat.Format(real, format, pack);
    }

    /// <summary>
    /// A number, or a numeric text as .NET's invariant float reads one: a decimal or an integer kept exact, any other as the double
    /// the client holds (a float by its own shortest text, as the wire writes it); false for no number, or one past a double.
    /// </summary>
    private static bool TryToNumber(object value, out decimal? exact, out double real)
    {
        exact = null;

        switch (value)
        {
            case decimal number:
                exact = number;
                real = (double)number;
                return true;
            case int or long or short or byte or sbyte or uint or ulong or ushort:
                exact = Convert.ToDecimal(value, CultureInfo.InvariantCulture);
                real = (double)exact.Value;
                return true;
            case double number:
                real = number;
                return double.IsFinite(real);
            case float number:
                real = double.Parse(number.ToString("R", CultureInfo.InvariantCulture), CultureInfo.InvariantCulture);
                return double.IsFinite(real);
            case string text when double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed):
                real = parsed;
                return double.IsFinite(real);
            default:
                real = 0;
                return false;
        }
    }

    /// <summary>
    /// A value as the client's cell writes it: a flag in the wire's own words rather than .NET's <c>True</c>, a number as the page's
    /// <c>String()</c> writes it (<see cref="UIScriptNumber"/>), never in the page's culture (<c>12.5</c>, not <c>12,5</c>; <c>1e+21</c>).
    /// </summary>
    private static string AsText(object value)
        => value switch
        {
            string text => text,
            bool flag => flag ? "true" : "false",
            _ when UIScriptNumber.TryRead(value, out var number) => UIScriptNumber.Format(number),
            _ => Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty
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
    private static string FormatBoolean(object value, IReadOnlyList<UIChoice>? choices, Func<string, string> translate)
    {
        var flag = IsTrue(value);

        return FindChoice(choices, flag ? "true" : "false") is { } caption
            ? translate(caption)
            : translate(flag ? DataGridStrings.Yes : DataGridStrings.No);
    }

    private static bool IsTrue(object value)
        => value is bool truth ? truth : string.Equals(AsText(value), "true", StringComparison.OrdinalIgnoreCase);

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
    internal static string? ChoiceValue(object? value, UIDataGridColumnKind kind)
    {
        if (value is null)
            return null;

        return kind switch
        {
            UIDataGridColumnKind.Boolean => IsTrue(value) ? "true" : "false",
            UIDataGridColumnKind.Enum => AsText(value),
            _ => null
        };
    }

    /// <summary>A number cell's value as the invariant number a footer adds up — a numeric text's too, as the cell shows it; null for any other.</summary>
    internal static string? RawNumber(object? value)
        => value is not null && TryToNumber(value, out var exact, out var real) ? exact?.ToString(CultureInfo.InvariantCulture) ?? real.ToString("R", CultureInfo.InvariantCulture) : null;

    /// <summary>A date cell's value as the wire writes a moment — the wall clock the cell shows, to the millisecond; null for any other.</summary>
    internal static string? WrittenMoment(object? value)
        => value is not null && TryToDateTime(value, out DateTime moment) ? moment.ToString("yyyy-MM-dd'T'HH:mm:ss.fff", CultureInfo.InvariantCulture) : null;
}
