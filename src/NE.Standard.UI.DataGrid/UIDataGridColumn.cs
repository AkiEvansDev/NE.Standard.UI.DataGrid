using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Primitives.Styling;

namespace NE.Standard.UI.DataGrid;

/// <summary>
/// A grid's column: the table's key, caption, track and alignment, plus the value's kind and format, the row properties it reads
/// and sorts by, and whether its cells edit.
/// </summary>
public record UIDataGridColumn(string Key, string? Caption, UIGridUnit Width, UITextAlignment? Alignment = null) : UITableColumn(Key, Caption, Width, Alignment)
{
    /// <summary>The prefix an editable column's editor variant is keyed under.</summary>
    public const string EditTemplatePrefix = "edit";

    /// <summary>The prefix a filterable column's filter region is named under.</summary>
    public const string FilterRegionPrefix = "filter";

    /// <summary>What the column holds; a template column the author drew is <see cref="UIDataGridColumnKind.Text"/> with no property.</summary>
    public UIDataGridColumnKind Kind { get; init; } = UIDataGridColumnKind.Text;

    /// <summary>The row property a typed column reads; null for a column whose cell is an authored template.</summary>
    public string? PropertyPath { get; init; }

    /// <summary>The row property a header click sorts by when it is not <see cref="PropertyPath"/> — the raw value behind a formatted one.</summary>
    public string? SortPath { get; init; }

    /// <summary>Whether a click on the caption sorts the rows by this column.</summary>
    public bool Sortable { get; init; }

    /// <summary>Whether a cell opens its editor on a double click or F2; the editor is the template variant keyed <see cref="EditTemplateKey"/>.</summary>
    public bool Editable { get; init; }

    /// <summary>Whether the column's cells hold the chevron that opens and closes a row's detail, rather than a value.</summary>
    public bool DetailToggle { get; init; }

    /// <summary>Whether the grid holds a filter for this column: the grid's region named <see cref="FilterRegionName"/>, a <c>DataGridFilterComponent</c> over the field or the two ends of a range.</summary>
    public bool Filterable { get; init; }

    /// <summary>What the filter's field takes, when the column is a template one and says nothing by its kind.</summary>
    public UIDataGridColumnKind FilterKind { get; init; } = UIDataGridColumnKind.Text;

    /// <summary>What the footer shows under the column: nothing, or one number over the rows the filters leave.</summary>
    public UIDataGridAggregate Aggregate { get; init; }

    /// <summary>A standard number format (<c>N2</c>, <c>C</c>, <c>P1</c>) or a date pattern of the shared token subset; null is the kind's default.</summary>
    public string? Format { get; init; }

    /// <summary>A money column's symbol when it is not the page's own.</summary>
    public string? Currency { get; init; }

    /// <summary>The values an enum or boolean column may hold, each with the caption its cells show.</summary>
    public IReadOnlyList<UIChoice>? Choices { get; init; }

    /// <summary>
    /// The property the column sorts, filters, totals and exports by; set even on a column that does not sort.
    /// </summary>
    public string? EffectiveSortPath => SortPath ?? PropertyPath;

    /// <summary>The template-variant key an editable column's editor renders through.</summary>
    public string EditTemplateKey => $"{EditTemplatePrefix}:{Key}";

    /// <summary>The name of the grid's region a filterable column's filter stands in, in the band over the rows.</summary>
    public string FilterRegionName => $"{FilterRegionPrefix}:{Key}";
}
