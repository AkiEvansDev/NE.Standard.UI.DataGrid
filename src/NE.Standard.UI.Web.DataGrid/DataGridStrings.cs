using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using NE.Standard.UI.DataGrid;
using NE.Standard.UI.Shell.Localization;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>
/// The words the grid's chrome writes, translated by an application as the framework's <see cref="UIStrings"/> are.
/// </summary>
public sealed partial class DataGridStrings : IUIStringsSource
{
    /// <summary>A boolean cell's word for true, where the column names none.</summary>
    public const string Yes = UIDataGridWords.Yes;

    /// <summary>A boolean cell's word for false, where the column names none.</summary>
    public const string No = UIDataGridWords.No;

    /// <summary>A sortable header's name for a screen reader; <c>{column}</c> is its caption.</summary>
    public const string SortBy = "ui.grid.sort-by";

    /// <summary>A text filter's placeholder.</summary>
    public const string Filter = UIDataGridWords.Filter;

    /// <summary>A range filter's placeholder for its start.</summary>
    public const string From = UIDataGridWords.From;

    /// <summary>A range filter's placeholder for its end.</summary>
    public const string To = UIDataGridWords.To;

    /// <summary>A choice filter's placeholder while it chooses nothing.</summary>
    public const string Any = UIDataGridWords.Any;

    /// <summary>The search box's placeholder.</summary>
    public const string Search = UIDataGridWords.Search;

    /// <summary>The word on the band's filters button.</summary>
    public const string Filters = "ui.grid.filters";

    /// <summary>The button that empties every filter of the flyout.</summary>
    public const string ClearFilters = "ui.grid.clear-filters";

    /// <summary>The word on the band's column chooser button.</summary>
    public const string Columns = "ui.grid.columns";

    /// <summary>The detail column's name, in the chooser and on its chevron's tooltip.</summary>
    public const string Details = UIDataGridWords.Details;

    /// <summary>The pager's line when the source counts its rows; <c>{from}</c>, <c>{to}</c> and <c>{total}</c> are row numbers.</summary>
    public const string PageOf = "ui.grid.page-of";

    /// <summary>The pager's line when the source does not count its rows; <c>{from}</c> and <c>{to}</c> are row numbers.</summary>
    public const string PageRange = "ui.grid.page-range";

    /// <summary>The pager's first-page button.</summary>
    public const string FirstPage = "ui.grid.first-page";

    /// <summary>The pager's previous-page button.</summary>
    public const string PreviousPage = "ui.grid.previous-page";

    /// <summary>The pager's next-page button.</summary>
    public const string NextPage = "ui.grid.next-page";

    /// <summary>The pager's last-page button.</summary>
    public const string LastPage = "ui.grid.last-page";

    /// <summary>A row's checkbox name for a screen reader.</summary>
    public const string SelectRow = UIDataGridWords.SelectRow;

    /// <summary>The name of the checkbox over the rows, for a screen reader.</summary>
    public const string SelectAll = UIDataGridWords.SelectAll;

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
        [ClearFilters] = "Clear filters",
        [Columns] = "Columns",
        [Details] = "Details",
        [PageOf] = "{from}–{to} of {total}",
        [PageRange] = "{from}–{to}",
        [FirstPage] = "First page",
        [PreviousPage] = "Previous page",
        [NextPage] = "Next page",
        [LastPage] = "Last page",
        [SelectRow] = "Select row",
        [SelectAll] = "Select all rows"
    }.ToFrozenDictionary(StringComparer.Ordinal);
}
