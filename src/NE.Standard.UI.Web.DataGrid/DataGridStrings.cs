using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using NE.Standard.UI.Shell.Localization;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>
/// The words the grid's chrome writes — a boolean cell's yes/no, a sortable header's name — translated by an application exactly
/// as the framework's <see cref="UIStrings"/> are.
/// </summary>
public sealed class DataGridStrings : IUIStringsSource
{
    public const string Yes = "ui.grid.yes";
    public const string No = "ui.grid.no";
    public const string SortBy = "ui.grid.sort-by";
    public const string Filter = "ui.grid.filter";
    public const string From = "ui.grid.from";
    public const string To = "ui.grid.to";
    public const string Any = "ui.grid.any";
    public const string Search = "ui.grid.search";
    public const string Filters = "ui.grid.filters";
    public const string Columns = "ui.grid.columns";
    public const string Details = "ui.grid.details";
    public const string PageOf = "ui.grid.page-of";
    public const string PageRange = "ui.grid.page-range";
    public const string FirstPage = "ui.grid.first-page";
    public const string PreviousPage = "ui.grid.previous-page";
    public const string NextPage = "ui.grid.next-page";
    public const string LastPage = "ui.grid.last-page";

    /// <inheritdoc/>
    public IReadOnlyDictionary<string, string> English { get; } = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        [Yes] = "Yes",
        [No] = "No",
        [SortBy] = "Sort by {column}",
        [Filter] = "Filter",
        [From] = "From",
        [To] = "To",
        [Any] = "Any",
        [Search] = "Search",
        [Filters] = "Filters",
        [Columns] = "Columns",
        [Details] = "Details",
        [PageOf] = "{from}–{to} of {total}",
        [PageRange] = "{from}–{to}",
        [FirstPage] = "First page",
        [PreviousPage] = "Previous page",
        [NextPage] = "Next page",
        [LastPage] = "Last page"
    }.ToFrozenDictionary(StringComparer.Ordinal);
}
