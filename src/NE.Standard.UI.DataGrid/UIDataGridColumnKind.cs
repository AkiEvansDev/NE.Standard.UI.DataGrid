namespace NE.Standard.UI.DataGrid;

/// <summary>
/// What a typed column holds, which decides how its cells are formatted, aligned, sorted, filtered and edited.
/// </summary>
public enum UIDataGridColumnKind
{
    /// <summary>The row's own words, shown as they are.</summary>
    Text = 0,

    /// <summary>A number, formatted by a standard .NET format (<c>N2</c>, <c>F0</c>, <c>P1</c>) in the page's culture; aligned to the end.</summary>
    Number = 1,

    /// <summary>An amount of money: a number under the currency format, the page's symbol or the column's own; aligned to the end.</summary>
    Money = 2,

    /// <summary>A date or a moment, formatted by a pattern of the shared token subset (<c>dd MMM yyyy</c>, <c>HH:mm</c>) in the page's culture.</summary>
    Date = 3,

    /// <summary>A yes or a no, in the words the column names or the page's own.</summary>
    Boolean = 4,

    /// <summary>One of a known set of values, each shown by its caption.</summary>
    Enum = 5,
}
