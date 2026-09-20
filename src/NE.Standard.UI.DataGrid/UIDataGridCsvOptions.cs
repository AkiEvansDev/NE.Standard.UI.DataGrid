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

    /// <summary>What turns a caption or a choice into the page's words; without it they are written as the grid was authored.</summary>
    public Func<string, string>? Translate { get; init; }

    /// <summary>What stands between two fields; a comma unless a culture writing its decimals with one asks for a semicolon.</summary>
    public char Separator { get; init; } = ',';
}
