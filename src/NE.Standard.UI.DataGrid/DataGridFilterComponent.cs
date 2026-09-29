using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.Foundation;
using NE.Standard.UI.Primitives.Annotations;

namespace NE.Standard.UI.DataGrid;

/// <summary>
/// One filter of a grid: a field, or a from/to range, over the property the term reads. The grid builds one per filterable
/// column and one for its search box.
/// </summary>
public abstract partial class DataGridFilterComponent<T>(string? id = null) : ContainerComponentBase<T>(id)
    where T : DataGridFilterComponent<T>, IUIComponentDefinition
{
    /// <summary>
    /// Gets or sets the row property the term reads.
    /// </summary>
    [UIComponentProperty(DefaultValue = null, IsBindable = false)]
    public string? Property { get; set; }

    /// <summary>
    /// Gets or sets what the term compares: a text match, a number's or a date's range, a chosen value.
    /// </summary>
    [UIComponentProperty(DefaultValue = UIDataGridColumnKind.Text, IsBindable = false)]
    public UIDataGridColumnKind Kind { get; set; }

    /// <summary>
    /// Gets or sets the caption over the field — the column's — where the filter stands apart from its column.
    /// </summary>
    [Translatable]
    [UIComponentProperty(DefaultValue = null, IsBindable = false)]
    public string? Caption { get; set; }
}

/// <summary>
/// One filter of a grid: the field, or the from and the to of a range, over the property the term reads.
/// </summary>
public sealed class DataGridFilterComponent(string? id = null) : DataGridFilterComponent<DataGridFilterComponent>(id), IUIComponentDefinition
{
    /// <inheritdoc/>
    public static string ComponentTypeKey => "datagrid.filter";
}
