using System;
using System.Globalization;

namespace NE.Standard.UI.DataGrid;

/// <summary>
/// How <see cref="UIDataGridCsv"/> writes a file: values a spreadsheet reads back, or the text the cells show.
/// </summary>
public sealed record UIDataGridCsvOptions
{
    /// <summary>
    /// Formats a typed cell as the grid shows it (<c>DataGridCellFormatter.AsCsvFormat</c> on the web); unset or null, the plain value.
    /// </summary>
    public Func<object, UIDataGridColumn, string?>? Format { get; init; }

    /// <summary>The culture a value with no other form is written in; the invariant one unless given.</summary>
    public CultureInfo? Culture { get; init; }

    /// <summary>
    /// Translates a column's caption, unless the column says it is content; a cell's choices are <see cref="Format"/>'s to translate.
    /// </summary>
    public Func<string, string>? Translate { get; init; }

    /// <summary>The field separator; a semicolon suits a spreadsheet whose culture writes decimals with a comma.</summary>
    public char Separator { get; init; } = ',';

    /// <summary>
    /// Whether text a spreadsheet would run as a formula is written behind a quote; a number, a date or a flag is never touched.
    /// </summary>
    public bool EscapeFormulas { get; init; } = true;
}
