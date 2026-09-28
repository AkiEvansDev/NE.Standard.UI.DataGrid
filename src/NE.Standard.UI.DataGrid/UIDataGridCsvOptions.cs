using System;
using System.Globalization;

namespace NE.Standard.UI.DataGrid;

/// <summary>
/// How <see cref="UIDataGridCsv"/> writes a file: values a spreadsheet reads back, or the text the cells show.
/// </summary>
public sealed record UIDataGridCsvOptions
{
    /// <summary>
    /// Formats a typed cell as the grid shows it — money with its symbol, a date under its pattern; <c>DataGridCellFormatter.AsCsvFormat</c>
    /// on the web. Null for a cell falls back to its plain value; unset (the default), values write round-trip so a spreadsheet
    /// reads them typed.
    /// </summary>
    public Func<object, UIDataGridColumn, string?>? Format { get; init; }

    /// <summary>The culture a value with no other form is written in; the invariant one unless given.</summary>
    public CultureInfo? Culture { get; init; }

    /// <summary>
    /// What turns a column's caption into the page's words; without it captions are written as the grid was authored. A cell's
    /// choices are the <see cref="Format"/>'s to translate — <c>DataGridCellFormatter.AsCsvFormat</c> takes its own translator.
    /// </summary>
    public Func<string, string>? Translate { get; init; }

    /// <summary>What stands between two fields: a comma unless set — a semicolon suits a spreadsheet whose culture writes its decimals with a comma.</summary>
    public char Separator { get; init; } = ',';

    /// <summary>
    /// Whether text a spreadsheet would run as a formula — opening with <c>=</c>, <c>+</c>, <c>-</c>, <c>@</c>, a tab or a carriage return —
    /// is written behind a quote, so it opens as the words it is; on unless turned off. A number, a date or a flag is never touched.
    /// </summary>
    public bool EscapeFormulas { get; init; } = true;
}
