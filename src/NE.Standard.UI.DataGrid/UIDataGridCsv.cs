using System;
using System.Buffers;
using System.Collections;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq.Expressions;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Compiled.Resolution;
using NE.Standard.UI.Primitives.Localization;
using NE.Standard.UI.Primitives.Text;

namespace NE.Standard.UI.DataGrid;

/// <summary>
/// Writes a grid's rows as CSV, for a command to hand to <c>IUIDownloadService</c>.
/// </summary>
public static class UIDataGridCsv
{
    private delegate (string Text, bool IsNegativeNumber) TypedCellReader(object row);

    // To the second, without a zone: what a spreadsheet reads back as a moment.
    private const string MomentFormat = "s";

    private static readonly SearchValues<char> CommaSpecialChars = SearchValues.Create(",\"\r\n");

    private static readonly ConcurrentDictionary<(Type RowType, string PropertyPath, bool IsNumericColumn), TypedCellReader?> TypedReaders = new();

    /// <summary>Streams the CSV as UTF-8 behind a byte-order mark directly into <paramref name="destination"/> without buffering a full byte array.</summary>
    public static async ValueTask WriteAsync(Stream destination, IReadOnlyList<UITableColumn> columns, IEnumerable rows, UIDataGridCsvOptions? options = null, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(destination);
        ArgumentNullException.ThrowIfNull(columns);
        ArgumentNullException.ThrowIfNull(rows);

        cancellationToken.ThrowIfCancellationRequested();

        StreamWriter writer = new(destination, Encoding.UTF8, bufferSize: 16 * 1024, leaveOpen: true);

        await using (writer.ConfigureAwait(false))
        {
            WriteCore(writer, columns, rows, options, cancellationToken);
            await writer.FlushAsync(cancellationToken).ConfigureAwait(false);
        }
    }

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

        WriteCore(writer, columns, rows, options, CancellationToken.None);
    }

    private static void WriteCore(TextWriter writer, IReadOnlyList<UITableColumn> columns, IEnumerable rows, UIDataGridCsvOptions? options, CancellationToken cancellationToken)
    {
        UIDataGridCsvOptions settings = options ?? new UIDataGridCsvOptions();
        List<(UITableColumn Column, string PropertyPath, bool IsNumericColumn)> written = [];

        for (var i = 0; i < columns.Count; i++)
        {
            UITableColumn column = columns[i];

            if (PropertyOf(column) is string path)
            {
                var isNumeric = column is UIDataGridColumn { Kind: UIDataGridColumnKind.Number or UIDataGridColumnKind.Money };
                written.Add((column, path, isNumeric));
            }
        }

        if (written.Count == 0)
            return;

        for (var i = 0; i < written.Count; i++)
            WriteField(writer, settings, i, Disarmed(Caption(written[i].Column, settings), settings));

        writer.Write("\r\n");

        Type? lastRowType = null;
        TypedCellReader?[]? lastReaders = settings.Format is null ? new TypedCellReader?[written.Count] : null;
        var rowIndex = 0;

        foreach (var row in rows)
        {
            if ((++rowIndex & 255) == 0)
                cancellationToken.ThrowIfCancellationRequested();

            if (lastReaders is not null && row is not null and not IDictionary and not IReadOnlyDictionary<string, object?>)
            {
                Type rowType = row.GetType();
                if (rowType != lastRowType)
                {
                    lastRowType = rowType;
                    for (var i = 0; i < written.Count; i++)
                        lastReaders[i] = GetTypedReader(rowType, written[i].PropertyPath, written[i].IsNumericColumn);
                }

                for (var i = 0; i < written.Count; i++)
                {
                    TypedCellReader? reader = lastReaders[i];
                    var cellText = reader is not null
                        ? FormatFast(reader(row), settings)
                        : CellSlow(written[i].Column, written[i].PropertyPath, row, settings);
                    WriteField(writer, settings, i, cellText);
                }
            }
            else
            {
                for (var i = 0; i < written.Count; i++)
                    WriteField(writer, settings, i, CellSlow(written[i].Column, written[i].PropertyPath, row, settings));
            }

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

    /// <summary>
    /// The column's caption, else the name the grid calls a column with none by; a content caption stays as written, and a key with no
    /// translator is written as the key.
    /// </summary>
    private static string Caption(UITableColumn column, UIDataGridCsvOptions settings)
    {
        if (column.HasCaption && column.Caption is { IsText: true } content && (column.IsContent || settings.ContentCaptions))
            return content.Key;

        UIPhrase caption = column.HasCaption && column.Caption is { } words ? words : UIPhrase.Text(column is UIDataGridColumn typed ? typed.FallbackCaption : column.Key);

        return settings.Translate is null ? caption.Key : settings.Translate(caption);
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

    private static TypedCellReader? GetTypedReader(Type rowType, string propertyPath, bool isNumericColumn)
        => TypedReaders.GetOrAdd((rowType, propertyPath, isNumericColumn), static key => BuildTypedReader(key.RowType, key.PropertyPath, key.IsNumericColumn));

    private static TypedCellReader? BuildTypedReader(Type rowType, string propertyPath, bool isNumericColumn)
    {
        if (string.IsNullOrWhiteSpace(propertyPath) || propertyPath.Contains('[', StringComparison.Ordinal))
            return null;

        var segments = propertyPath.Split('.');
        ParameterExpression rowParam = Expression.Parameter(typeof(object), "row");
        Expression current = Expression.Convert(rowParam, rowType);
        List<(ParameterExpression Variable, Expression Assign, Expression IsNull)> guards = [];

        for (var i = 0; i < segments.Length; i++)
        {
            var segment = segments[i];
            if (string.IsNullOrEmpty(segment))
                return null;

            Type ownerType = current.Type;
            Type? underlyingOwner = Nullable.GetUnderlyingType(ownerType);

            if (underlyingOwner is not null)
            {
                ParameterExpression nullableVar = Expression.Variable(ownerType, $"n{i}");
                guards.Add((
                    nullableVar,
                    Expression.Assign(nullableVar, current),
                    Expression.Not(Expression.Property(nullableVar, "HasValue"))
                ));
                current = Expression.Property(nullableVar, "Value");
                ownerType = underlyingOwner;
            }
            else if (!ownerType.IsValueType && i > 0)
            {
                ParameterExpression refVar = Expression.Variable(ownerType, $"r{i}");
                guards.Add((
                    refVar,
                    Expression.Assign(refVar, current),
                    Expression.ReferenceEqual(refVar, Expression.Constant(null, ownerType))
                ));
                current = refVar;
            }

            PropertyInfo? prop = ownerType.GetProperty(segment, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
            if (prop is null || !prop.CanRead || prop.GetIndexParameters().Length != 0)
                return null;

            current = Expression.Property(current, prop);
        }

        Type leafType = current.Type;
        Type? nullableLeaf = Nullable.GetUnderlyingType(leafType);

        if (nullableLeaf is not null)
        {
            ParameterExpression leafVar = Expression.Variable(leafType, "leaf");
            guards.Add((
                leafVar,
                Expression.Assign(leafVar, current),
                Expression.Not(Expression.Property(leafVar, "HasValue"))
            ));
            current = Expression.Property(leafVar, "Value");
            leafType = nullableLeaf;
        }

        Expression? formatExpr = CreateFormatExpression(current, leafType, isNumericColumn);
        if (formatExpr is null)
            return null;

        ConstantExpression emptyTuple = Expression.Constant((string.Empty, false));
        Expression body = formatExpr;

        for (var i = guards.Count - 1; i >= 0; i--)
        {
            (ParameterExpression variable, Expression assign, Expression isNull) = guards[i];
            body = Expression.Block(
                [variable],
                assign,
                Expression.Condition(isNull, emptyTuple, body)
            );
        }

        return Expression.Lambda<TypedCellReader>(body, rowParam).Compile();
    }

    private static Expression? CreateFormatExpression(Expression valueExpr, Type leafType, bool isNumericColumn)
    {
        if (leafType == typeof(bool))
            return Expression.Condition(valueExpr, Expression.Constant(("true", false)), Expression.Constant(("false", false)));

        if (leafType == typeof(string))
            return Expression.Call(typeof(UIDataGridCsv).GetMethod(nameof(FormatStringCell), BindingFlags.NonPublic | BindingFlags.Static)!, valueExpr, Expression.Constant(isNumericColumn));

        if (leafType == typeof(int) || leafType == typeof(long) || leafType == typeof(short) || leafType == typeof(sbyte) || leafType == typeof(decimal))
            return CallHelper(nameof(FormatInvariantFormattableCell), leafType, valueExpr);

        if (leafType == typeof(uint) || leafType == typeof(ulong) || leafType == typeof(ushort) || leafType == typeof(byte))
            return CallHelper(nameof(FormatUnsignedCell), leafType, valueExpr);

        if (leafType == typeof(double))
            return Expression.Call(typeof(UIDataGridCsv).GetMethod(nameof(FormatDoubleCell), BindingFlags.NonPublic | BindingFlags.Static)!, valueExpr);

        if (leafType == typeof(float))
            return Expression.Call(typeof(UIDataGridCsv).GetMethod(nameof(FormatSingleCell), BindingFlags.NonPublic | BindingFlags.Static)!, valueExpr);

        if (leafType == typeof(DateTime))
            return Expression.Call(typeof(UIDataGridCsv).GetMethod(nameof(FormatDateTimeCell), BindingFlags.NonPublic | BindingFlags.Static)!, valueExpr);

        if (leafType == typeof(DateTimeOffset))
            return Expression.Call(typeof(UIDataGridCsv).GetMethod(nameof(FormatDateTimeOffsetCell), BindingFlags.NonPublic | BindingFlags.Static)!, valueExpr);

        if (leafType == typeof(DateOnly))
            return Expression.Call(typeof(UIDataGridCsv).GetMethod(nameof(FormatDateOnlyCell), BindingFlags.NonPublic | BindingFlags.Static)!, valueExpr);

        if (leafType.IsEnum)
            return CallHelper(nameof(FormatEnumCell), leafType, valueExpr);

        return null;
    }

    private static MethodCallExpression CallHelper(string methodName, Type typeArg, Expression argument)
        => Expression.Call(
            typeof(UIDataGridCsv).GetMethod(methodName, BindingFlags.NonPublic | BindingFlags.Static)!.MakeGenericMethod(typeArg),
            argument
        );

    private static (string Text, bool IsNegativeNumber) FormatStringCell(string? value, bool isNumericColumn)
    {
        if (string.IsNullOrEmpty(value))
            return (string.Empty, false);

        return (value, isNumericColumn && value[0] == '-' && IsPlainNumber(value));
    }

    /// <summary>A text that is an invariant finite number and nothing else — no sign of a formula around it.</summary>
    private static bool IsPlainNumber(string text)
        => double.TryParse(text, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint | NumberStyles.AllowExponent, CultureInfo.InvariantCulture, out var number) && double.IsFinite(number);

    private static (string Text, bool IsNegativeNumber) FormatInvariantFormattableCell<T>(T value)
        where T : struct, IFormattable
    {
        var text = value.ToString(null, CultureInfo.InvariantCulture);
        return (text, text.Length > 0 && text[0] == '-');
    }

    private static (string Text, bool IsNegativeNumber) FormatUnsignedCell<T>(T value)
        where T : struct, IFormattable
        => (value.ToString(null, CultureInfo.InvariantCulture), false);

    private static (string Text, bool IsNegativeNumber) FormatDoubleCell(double value)
    {
        if (!double.IsFinite(value))
            return (string.Empty, false);

        var text = value.ToString(null, CultureInfo.InvariantCulture);
        return (text, text.Length > 0 && text[0] == '-');
    }

    private static (string Text, bool IsNegativeNumber) FormatSingleCell(float value)
    {
        if (!float.IsFinite(value))
            return (string.Empty, false);

        var text = value.ToString(null, CultureInfo.InvariantCulture);
        return (text, text.Length > 0 && text[0] == '-');
    }

    private static (string Text, bool IsNegativeNumber) FormatDateTimeCell(DateTime value)
        => (value.ToString(MomentFormat, CultureInfo.InvariantCulture), false);

    private static (string Text, bool IsNegativeNumber) FormatDateTimeOffsetCell(DateTimeOffset value)
        => (value.UtcDateTime.ToString(MomentFormat, CultureInfo.InvariantCulture), false);

    private static (string Text, bool IsNegativeNumber) FormatDateOnlyCell(DateOnly value)
        => (value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), false);

    private static (string Text, bool IsNegativeNumber) FormatEnumCell<TEnum>(TEnum value)
        where TEnum : struct, Enum
    {
        var text = value.ToString();
        return (text, text.Length > 0 && text[0] == '-' && IsPlainNumber(text));
    }

    private static string FormatFast((string Text, bool IsNegativeNumber) evaluated, UIDataGridCsvOptions settings)
        => evaluated.IsNegativeNumber || evaluated.Text.Length == 0 ? evaluated.Text : Disarmed(evaluated.Text, settings);

    /// <summary>
    /// One cell: the formatter's answer, else the plain value, with a would-be formula disarmed — judged by the text written, not the
    /// value behind it. A NaN or an infinity is empty, as the grid shows the null it travels as.
    /// </summary>
    private static string CellSlow(UITableColumn column, string property, object? row, UIDataGridCsvOptions settings)
    {
        if (!ItemContext.TryReadPath(row, property, out var value) || UIScriptNumber.ReadsAsNull(value))
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

        if (!IsNumber(value) && !IsNumberText(column, value))
            return false;

        return formatted ? IsFormattedNegativeNumber(text) : IsPlainNumber(text);
    }

    /// <summary>A number a spreadsheet reads as one: never a NaN or an infinity, which a cell writes empty.</summary>
    private static bool IsNumber(object value)
        => value is double or float or decimal or int or long or short or byte or sbyte or uint or ulong or ushort;

    /// <summary>A number column's numeric text, which the column writes as the number it reads.</summary>
    private static bool IsNumberText(UITableColumn column, object value)
        => column is UIDataGridColumn { Kind: UIDataGridColumnKind.Number or UIDataGridColumnKind.Money } && value is string text && IsPlainNumber(text);

    /// <summary>A negative number written in a culture's digits or currency, carrying no formula operator or cell split.</summary>
    private static bool IsFormattedNegativeNumber(string text)
    {
        var hasDigit = false;

        for (var i = 1; i < text.Length; i++)
        {
            var ch = text[i];

            if (char.IsAsciiDigit(ch))
            {
                hasDigit = true;
                continue;
            }

            if (ch is '=' or '@' or '*' or '/' or '^' or '&' or ';' or '|' or '!' or '(' or ')' or '\t' or '\r' or '\n')
                return false;

            if (ch is '+' or '-' && (text[i - 1] is not ('e' or 'E') || i + 1 >= text.Length || !char.IsAsciiDigit(text[i + 1])))
                return false;
        }

        return hasDigit && FormulaStart(text, 1) < 0;
    }

    /// <summary>A field, quoted where it holds the separator, a quote or a line break, with its own quotes doubled (RFC 4180).</summary>
    private static void WriteField(TextWriter writer, UIDataGridCsvOptions settings, int index, string text)
    {
        if (index > 0)
            writer.Write(settings.Separator);

        ReadOnlySpan<char> span = text.AsSpan();
        var needsQuotes = settings.Separator == ','
            ? span.IndexOfAny(CommaSpecialChars) >= 0
            : span.IndexOfAny(settings.Separator, '"', '\n') >= 0 || span.Contains('\r');

        if (!needsQuotes)
        {
            writer.Write(text);
            return;
        }

        writer.Write('"');

        while (true)
        {
            var quote = span.IndexOf('"');
            if (quote < 0)
            {
                writer.Write(span);
                break;
            }

            writer.Write(span[..(quote + 1)]);
            writer.Write('"');
            span = span[(quote + 1)..];
        }

        writer.Write('"');
    }
}
