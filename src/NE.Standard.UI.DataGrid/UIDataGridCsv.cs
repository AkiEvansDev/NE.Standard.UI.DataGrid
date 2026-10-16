using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Compiled.Resolution;
using NE.Standard.UI.Primitives.Text;

namespace NE.Standard.UI.DataGrid;

/// <summary>
/// Writes a grid's rows as CSV, for a command to hand to <c>IUIDownloadService</c>.
/// </summary>
public static class UIDataGridCsv
{
    // To the second, without a zone: what a spreadsheet reads back as a moment.
    private const string MomentFormat = "s";

    /// <summary>The file as UTF-8 behind a byte-order mark, which is what a spreadsheet needs to read it as UTF-8 at all.</summary>
    public static byte[] WriteBytes(IReadOnlyList<UITableColumn> columns, IEnumerable rows, UIDataGridCsvOptions? options = null)
    {
        using MemoryStream stream = new();

        // Straight into bytes, the writer's mark first: a whole text and its encoded copy would hold the file several times over.
        using (StreamWriter writer = new(stream, Encoding.UTF8, leaveOpen: true))
            Write(writer, columns, rows, options);

        return stream.ToArray();
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
            WriteField(writer, settings, i, Disarmed(Caption(written[i], settings), settings));

        writer.Write("\r\n");

        foreach (var row in rows)
        {
            for (var i = 0; i < written.Count; i++)
                WriteField(writer, settings, i, Cell(written[i], row, settings));

            writer.Write("\r\n");
        }
    }

    /// <summary>
    /// The property a column exports, as it sorts, filters and totals by — the raw value behind a formatted one; null for a column with
    /// no property behind it, which writes nothing.
    /// </summary>
    private static string? PropertyOf(UITableColumn column)
        => column switch
        {
            UIDataGridColumn { DetailToggle: true } => null,
            UIDataGridColumn typed => typed.EffectiveSortPath,
            _ => null
        };

    /// <summary>The column's caption, else the name the grid calls a column with none by; a content caption stays as written.</summary>
    private static string Caption(UITableColumn column, UIDataGridCsvOptions settings)
    {
        if (!string.IsNullOrEmpty(column.Caption) && column.IsContent)
            return column.Caption;

        var caption = !string.IsNullOrEmpty(column.Caption) ? column.Caption : column is UIDataGridColumn typed ? typed.FallbackCaption : column.Key;

        return settings.Translate is null ? caption : settings.Translate(caption);
    }

    /// <summary>
    /// The text with a quote before each place a spreadsheet would run a formula from — its start, and the start of a cell after a
    /// comma, a semicolon or a tab, where a spreadsheet splitting at its own list separator rather than the file's starts one — unless
    /// the options say the file is a program's.
    /// </summary>
    private static string Disarmed(string text, UIDataGridCsvOptions settings)
    {
        var start = settings.EscapeFormulas ? FormulaStart(text, 0) : -1;

        if (start < 0)
            return text;

        StringBuilder disarmed = new(text.Length + 1);
        var copied = 0;

        while (start >= 0)
        {
            _ = disarmed.Append(text, copied, start - copied).Append('\'');
            copied = start;
            start = FormulaStart(text, start + 1);
        }

        return disarmed.Append(text, copied, text.Length - copied).ToString();
    }

    /// <summary>
    /// Where, from <paramref name="from"/> on, a spreadsheet would read a formula or a DDE call: a trigger at the text's start or after a
    /// comma, a semicolon or a tab; -1 for nowhere.
    /// </summary>
    private static int FormulaStart(string text, int from)
    {
        for (var i = from; i < text.Length; i++)
        {
            if (text[i] is '=' or '+' or '-' or '@' or '\t' or '\r' && (i == 0 || text[i - 1] is ',' or ';' or '\t'))
                return i;
        }

        return -1;
    }

    /// <summary>
    /// One cell: the formatter's answer, else the plain value, with a would-be formula disarmed — judged by the text written, not the
    /// value behind it. A NaN or an infinity is empty, as the grid shows the null it travels as.
    /// </summary>
    private static string Cell(UITableColumn column, object? row, UIDataGridCsvOptions settings)
    {
        if (PropertyOf(column) is not string property || !ItemContext.TryReadPath(row, property, out var value) || UIScriptNumber.ReadsAsNull(value))
            return string.Empty;

        var formatted = column is UIDataGridColumn typed && settings.Format is not null ? settings.Format(value, typed) : null;
        var text = formatted ?? AsValue(value, settings);

        return IsNegativeNumber(column, value, text, formatted is not null) ? text : Disarmed(text, settings);
    }

    /// <summary>
    /// A value as a spreadsheet reads it back typed; a <see cref="DateTimeOffset"/> as its UTC moment, since a spreadsheet keeps no zone.
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
    /// A finite negative number's own text, as its value's formatting wrote it: the minus is a sign, and a quote would turn the number
    /// into text. A flag's or a choice's caption is words — the author's or a row's — and so is an enum's name; either counts only as a
    /// plain number, which is what a choice that matched none and an enum value with no name write.
    /// </summary>
    private static bool IsNegativeNumber(UITableColumn column, object value, string text, bool formatted)
    {
        if (text.Length == 0 || text[0] != '-')
            return false;

        if (value is Enum || (formatted && column is UIDataGridColumn { Kind: UIDataGridColumnKind.Boolean or UIDataGridColumnKind.Enum }))
            return (value is Enum || IsNumber(value)) && IsPlainNumber(text);

        return IsNumber(value) || IsNumberText(column, value);
    }

    /// <summary>A number a spreadsheet reads as one: never a NaN or an infinity, which a cell writes empty.</summary>
    private static bool IsNumber(object value)
        => value is double or float or decimal or int or long or short or byte or sbyte or uint or ulong or ushort;

    /// <summary>A text that is an invariant finite number and nothing else — no sign of a formula around it.</summary>
    private static bool IsPlainNumber(string text)
        => double.TryParse(text, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint | NumberStyles.AllowExponent, CultureInfo.InvariantCulture, out var number) && double.IsFinite(number);

    /// <summary>A number column's numeric text, which the column writes as the number it reads.</summary>
    private static bool IsNumberText(UITableColumn column, object value)
        => column is UIDataGridColumn { Kind: UIDataGridColumnKind.Number or UIDataGridColumnKind.Money } && value is string text
            && double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var number) && double.IsFinite(number);

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
