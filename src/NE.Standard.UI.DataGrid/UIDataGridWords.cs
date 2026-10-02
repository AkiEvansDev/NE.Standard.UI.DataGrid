namespace NE.Standard.UI.DataGrid;

/// <summary>
/// The keys of the words the grid's own controls carry, translated as the framework's are; the web package lists their English
/// (<c>DataGridStrings</c>), beside the words only its chrome writes.
/// </summary>
public static class UIDataGridWords
{
    /// <summary>A boolean cell's word for true, where the column names none.</summary>
    public const string Yes = "ui.grid.yes";

    /// <summary>A boolean cell's word for false, where the column names none.</summary>
    public const string No = "ui.grid.no";

    /// <summary>A text filter's placeholder.</summary>
    public const string Filter = "ui.grid.filter";

    /// <summary>A range filter's placeholder for its start.</summary>
    public const string From = "ui.grid.from";

    /// <summary>A range filter's placeholder for its end.</summary>
    public const string To = "ui.grid.to";

    /// <summary>A choice filter's placeholder while it chooses nothing.</summary>
    public const string Any = "ui.grid.any";

    /// <summary>The search box's placeholder.</summary>
    public const string Search = "ui.grid.search";

    /// <summary>The detail column's name, in the chooser and on its chevron's tooltip.</summary>
    public const string Details = "ui.grid.details";

    /// <summary>A row's checkbox name for a screen reader.</summary>
    public const string SelectRow = "ui.grid.select-row";

    /// <summary>The name of the checkbox over the rows, for a screen reader.</summary>
    public const string SelectAll = "ui.grid.select-all";
}
