namespace NE.Standard.UI.DataGrid;

/// <summary>
/// What a column shows under its rows in the footer: nothing, or one number over the rows the filters leave.
/// </summary>
public enum UIDataGridAggregate
{
    None = 0,

    /// <summary>The values added up.</summary>
    Sum = 1,

    /// <summary>The values' mean.</summary>
    Average = 2,

    /// <summary>How many rows there are.</summary>
    Count = 3,

    Min = 4,

    Max = 5,
}
