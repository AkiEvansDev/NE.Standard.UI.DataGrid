namespace NE.Standard.UI.DataGrid;

/// <summary>
/// What a column shows under its rows in the footer: nothing, or one number over the rows the filters leave.
/// </summary>
public enum UIDataGridAggregate
{
    /// <summary>No footer cell for the column.</summary>
    None = 0,

    /// <summary>The values added up.</summary>
    Sum = 1,

    /// <summary>The values' mean.</summary>
    Average = 2,

    /// <summary>How many rows there are.</summary>
    Count = 3,

    /// <summary>The smallest value.</summary>
    Min = 4,

    /// <summary>The largest value.</summary>
    Max = 5,
}
