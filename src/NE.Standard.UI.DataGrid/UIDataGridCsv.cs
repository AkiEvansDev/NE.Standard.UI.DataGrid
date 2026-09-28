using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Compiled.Resolution;

namespace NE.Standard.UI.DataGrid;

/// <summary>
/// Writes a grid's rows as CSV: captions as the header, each cell read by the property its column names. An application's
/// command writes the file and hands it to <c>IUIDownloadService</c>.
/// </summary>
/// <remarks>
/// Values come from the rows via <see cref="ItemContext"/>; what a cell shows is the formatter handed in as
/// <see cref="UIDataGridCsvOptions.Format"/>.
/// </remarks>
public static class UIDataGridCsv
{
    // To the second, without a zone: what a spreadsheet reads back as a moment.
    private const string MomentFormat = "s";

    /// <summary>The file as UTF-8 behind a byte-order mark, which is what a spreadsheet needs to read it as UTF-8 at all.</summary>
    public static byte[] WriteBytes(IReadOnlyList<UITableColumn> columns, IEnumerable rows, UIDataGridCsvOptions? options = null)
    {
        // GetBytes never writes the preamble; the mark is put in front of the text here.
        var body = Encoding.UTF8.GetBytes(Write(columns, rows, options));
        var mark = Encoding.UTF8.GetPreamble();
        var bytes = new byte[mark.Length + body.Length];

        mark.CopyTo(bytes, 0);
        body.CopyTo(bytes, mark.Length);

        return bytes;
    }

    /// <summary>The whole file as text, ready for <c>IUIDownloadService</c> once encoded.</summary>
    public static string Write(IReadOnlyList<UITableColumn> columns, IEnumerable rows, UIDataGridCsvOptions? options = null)
    {
        using StringWriter writer = new(CultureInfo.InvariantCulture);

        Write(writer, columns, rows, options);

        return writer.ToString();
    }

    /// <summary>The header line and a line per row, in the order the columns were added.</summary>
    public static void Write(TextWriter writer, IReadOnlyList<UITableColumn> columns, IEnumerable rows, UIDataGridCsvOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(writer);
        ArgumentNullException.ThrowIfNull(columns);
        ArgumentNullException.ThrowIfNull(rows);

        UIDataGridCsvOptions settings = options ?? new UIDataGridCsvOptions();
        List<UITableColumn> written = [];

        for (var i = 0; i < columns.Count; i++)
        {
            if (PropertyOf(columns[i]) is not null)
                written.Add(columns[i]);
        }

        if (written.Count == 0)
            return;

        for (var i = 0; i < written.Count; i++)
            WriteField(writer, settings, i, Caption(written[i], settings));

        writer.Write("\r\n");

        foreach (var row in rows)
        {
            for (var i = 0; i < written.Count; i++)
                WriteField(writer, settings, i, Cell(written[i], row, settings));

            writer.Write("\r\n");
        }
    }

    /// <summary>
    /// The property a column's cells read: its own, or the one it sorts by where the cells are a template; null writes no column —
    /// a detail column, and a table's own column, whose key is a name or a position rather than a property.
    /// </summary>
    private static string? PropertyOf(UITableColumn column)
        => column switch
        {
            UIDataGridColumn { DetailToggle: true } => null,
            UIDataGridColumn typed => typed.PropertyPath ?? typed.SortPath,
            _ => null
        };

    private static string Caption(UITableColumn column, UIDataGridCsvOptions settings)
    {
        var caption = string.IsNullOrEmpty(column.Caption) ? column.Key : column.Caption;

        return settings.Translate is null ? caption : settings.Translate(caption);
    }

    /// <summary>
    /// One cell: the formatter's answer when options carry one, else the plain value — a number without grouping, a moment to the
    /// second, a flag as true/false — so a spreadsheet reads it back typed. Text a spreadsheet would run as a formula is disarmed.
    /// </summary>
    private static string Cell(UITableColumn column, object? row, UIDataGridCsvOptions settings)
    {
        if (PropertyOf(column) is not string property || !ItemContext.TryReadProperty(row, property, out var value) || value is null)
            return string.Empty;

        var text = column is UIDataGridColumn typed && settings.Format is not null
            ? settings.Format(value, typed) ?? AsValue(value, settings)
            : AsValue(value, settings);

        return settings.EscapeFormulas && !IsTyped(value) && !IsNumberText(column, value) && StartsFormula(text) ? $"'{text}" : text;
    }

    /// <summary>
    /// A value as a spreadsheet reads it back: a moment with or without its offset in one shape, to the second and without a zone —
    /// a spreadsheet keeps neither — so a <see cref="DateTimeOffset"/> is written as its UTC moment.
    /// </summary>
    private static string AsValue(object value, UIDataGridCsvOptions settings)
        => value switch
        {
            bool flag => flag ? "true" : "false",
            DateTime moment => moment.ToString(MomentFormat, CultureInfo.InvariantCulture),
            DateTimeOffset offset => offset.UtcDateTime.ToString(MomentFormat, CultureInfo.InvariantCulture),
            DateOnly date => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            IFormattable number and (decimal or double or float or int or long or short or byte or sbyte or uint or ulong or ushort)
                => number.ToString(null, CultureInfo.InvariantCulture),
            string text => text,
            _ => Convert.ToString(value, settings.Culture ?? CultureInfo.InvariantCulture) ?? string.Empty
        };

    /// <summary>
    /// A value the grid's own types produced, whose text cannot carry a formula: a formatted negative number starts with a minus, and
    /// a quote before it would turn the number into text.
    /// </summary>
    private static bool IsTyped(object value)
        => value is bool or DateTime or DateTimeOffset or DateOnly or TimeOnly or Enum
            or decimal or double or float or int or long or short or byte or sbyte or uint or ulong or ushort;

    /// <summary>
    /// A number column's numeric text, which the grid shows and totals as the number it reads as: a minus before it is the number's
    /// sign, not a formula, and a quote would turn it into text.
    /// </summary>
    private static bool IsNumberText(UITableColumn column, object value)
        => column is UIDataGridColumn { Kind: UIDataGridColumnKind.Number or UIDataGridColumnKind.Money } && value is string text
            && double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var number) && double.IsFinite(number);

    /// <summary>Whether a spreadsheet would read the text as a formula (or a DDE call): it opens with one of the characters that start one.</summary>
    private static bool StartsFormula(string text)
        => text.Length > 0 && text[0] is '=' or '+' or '-' or '@' or '\t' or '\r';

    /// <summary>A field, quoted where it holds the separator, a quote or a line break, with its own quotes doubled (RFC 4180).</summary>
    private static void WriteField(TextWriter writer, UIDataGridCsvOptions settings, int index, string text)
    {
        if (index > 0)
            writer.Write(settings.Separator);

        if (!text.Contains(settings.Separator, StringComparison.Ordinal) && !text.Contains('"', StringComparison.Ordinal)
            && !text.Contains('\n', StringComparison.Ordinal) && !text.Contains('\r', StringComparison.Ordinal))
        {
            writer.Write(text);
            return;
        }

        writer.Write('"');
        writer.Write(text.Replace("\"", "\"\"", StringComparison.Ordinal));
        writer.Write('"');
    }
}
