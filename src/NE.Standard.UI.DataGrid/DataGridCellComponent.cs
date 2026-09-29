using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.Foundation;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Primitives.Styling;

namespace NE.Standard.UI.DataGrid;

/// <summary>
/// A typed column's cell: one row value, formatted by the column's kind in the page's culture.
/// </summary>
public abstract partial class DataGridCellComponent<T> : VisualComponentBase<T>
    where T : DataGridCellComponent<T>, IUIComponentDefinition
{
    /// <summary>Initializes a cell, centred in its row.</summary>
    protected DataGridCellComponent(string? id = null) : base(id)
    {
        // A single line at the top of a two-line row would jump when the editor opens in its place.
        VerticalAlignment = UIAlignment.Center;
    }

    /// <summary>
    /// Gets or sets the value the cell shows, bound relatively to the row's property; a number, a date, a boolean, an enum or text.
    /// </summary>
    [UIComponentProperty(DefaultValue = null)]
    public object? Value { get; set; }

    /// <summary>
    /// Gets or sets what the value is, which decides the format and the alignment.
    /// </summary>
    [UIComponentProperty(DefaultValue = UIDataGridColumnKind.Text, IsBindable = false)]
    public UIDataGridColumnKind Kind { get; set; }

    /// <summary>
    /// Gets or sets the format the value is written with: a standard number format or a date pattern; unset, the kind's own.
    /// </summary>
    [UIComponentProperty(DefaultValue = null, IsBindable = false)]
    public string? Format { get; set; }

    /// <summary>
    /// Gets or sets a money cell's currency symbol when it is not the page's.
    /// </summary>
    [UIComponentProperty(DefaultValue = null, IsBindable = false)]
    public string? Currency { get; set; }

    /// <summary>
    /// Gets or sets the captions an enum or boolean cell shows for its values.
    /// </summary>
    [UIComponentProperty(DefaultValue = null, IsBindable = false)]
    public IReadOnlyList<UIChoice>? Choices { get; set; }
}

/// <summary>
/// The cell of a typed column: one value the row holds, formatted by the column's kind in the page's culture.
/// </summary>
public sealed class DataGridCellComponent(string? id = null) : DataGridCellComponent<DataGridCellComponent>(id), IUIComponentDefinition
{
    /// <inheritdoc/>
    public static string ComponentTypeKey => "datagrid.cell";
}
