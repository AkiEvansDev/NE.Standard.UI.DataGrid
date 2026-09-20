namespace NE.Standard.UI.DataGrid;

/// <summary>
/// The events the grid raises beyond the table's, by the names its client dispatches them under.
/// </summary>
public static class DataGridEvents
{
    /// <summary>The viewer changed the query — a header sorted, a filter typed — and the value has reached the server.</summary>
    public const string QueryChange = "query-change";

    /// <summary>A cell's editor committed a value into the row's property, and the value has reached the server; carries the row's key and the column's.</summary>
    public const string CellEdit = "cell-edit";

    /// <summary>The viewer took a row or let it go at a checkbox, and the chosen keys have reached the server.</summary>
    public const string SelectionChange = "selection-change";
}
