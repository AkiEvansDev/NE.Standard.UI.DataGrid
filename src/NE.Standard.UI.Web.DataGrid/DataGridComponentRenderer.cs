using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Json;
using NE.Standard.UI.Abstractions.Identity;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Compiled.Models;
using NE.Standard.UI.Compiled.Views;
using NE.Standard.UI.Components.BuiltIns.Items;
using NE.Standard.UI.DataGrid;
using NE.Standard.UI.Primitives.Constants;
using NE.Standard.UI.Primitives.Localization;
using NE.Standard.UI.Primitives.Styling;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Abstractions.Theming;
using NE.Standard.UI.Web.Renderers.Foundation;
using NE.Standard.UI.Web.Renderers.Items;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>
/// Renders the grid through the table's renderer, adding sorting, editing, the band, the totals and the pager.
/// </summary>
public class DataGridComponentRenderer : TableComponentRenderer
{
    /// <summary>On a header cell that sorts: the row property a click sorts by.</summary>
    public const string SortAttribute = "data-ui-grid-sort";

    /// <summary>On every cell wrapper, the display and the editor alike: the column's key.</summary>
    public const string ColumnAttribute = "data-ui-grid-column";

    /// <summary>On a cell that edits: the template variant its editor is drawn from, which the engine stamps when the cell opens.</summary>
    public const string EditorTemplateAttribute = "data-ui-grid-editor";

    /// <summary>
    /// On the root: the editable columns whose editors carry rules, as JSON by key — the editor's component and the row property it
    /// writes — so a closed cell is judged by the rules its editor would show.
    /// </summary>
    public const string RulesAttribute = "data-ui-grid-rules";

    /// <summary>On the root while the grid's <c>Editable</c> is off: no cell opens its editor.</summary>
    public const string ReadOnlyAttribute = "data-ui-grid-readonly";

    /// <summary>On the root: a click anywhere on a row, or Enter on the keyboard's row, opens its detail.</summary>
    public const string ExpandOnClickAttribute = "data-ui-grid-expand-click";

    /// <summary>On the root: several rows may stand open at once.</summary>
    public const string MultipleDetailsAttribute = "data-ui-grid-multiple-details";

    /// <summary>On a footer cell: the total it shows; the kind and the format are the column's, as on a cell.</summary>
    public const string AggregateAttribute = "data-ui-grid-aggregate";

    /// <summary>On a footer cell: the row property its total is over.</summary>
    public const string PropertyAttribute = "data-ui-grid-property";

    /// <summary>On a filter: the row property its term reads.</summary>
    public const string FilterAttribute = "data-ui-grid-filter";

    /// <summary>On a filter: the kind of term it writes.</summary>
    public const string FilterKindAttribute = "data-ui-grid-filter-kind";

    /// <summary>On a range filter's part: which end of the range it is, <c>from</c> or <c>to</c>.</summary>
    public const string FilterBoundAttribute = "data-ui-grid-filter-bound";

    protected const string GridClassName = "ui-data-grid";
    protected const string FooterClassName = "ui-data-grid__footer";
    protected const string TotalClassName = "ui-data-grid__total";
    protected const string BandClassName = "ui-data-grid__band";
    protected const string BandButtonClassName = "ui-data-grid__band-button";
    protected const string FiltersCountClassName = "ui-data-grid__filters-count";
    protected const string FilterPanelClassName = "ui-data-grid__filter-panel";
    protected const string FiltersClearClassName = "ui-data-grid__filters-clear";
    protected const string ColumnsPanelClassName = "ui-data-grid__columns-panel";
    protected const string SortMarkClassName = "ui-data-grid__sort-mark";
    protected const string SortIdleClassName = "ui-data-grid__sort-idle";
    protected const string EditableCellClassName = "ui-data-grid__cell--editable";
    protected const string DetailCellClassName = "ui-data-grid__cell--detail";

    public override string ComponentTypeKey => DataGridComponent.ComponentTypeKey;

    protected override void RenderComponent(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        _ = root.Class(GridClassName);

        // Once, on the root: every typed cell under it formats by the nearest packs, and the session's language is the page's culture.
        CultureInfo culture = ResolveCulture(context);

        NumberCultureRenderer.RenderNumberCulture(root, culture);
        TemporalCultureRenderer.RenderTemporalCulture(root, culture);
        // So a language switch writes both packs again, and the cells draw again from the values they keep.
        _ = root.Attribute(WebAttributes.PageCulture);
        RenderFlagAttribute(context, root, DataGridComponent.EditableProperty, ReadOnlyAttribute, WebValueCondition.IsFalse);
        RenderFlagAttribute(context, root, DataGridComponent.ExpandOnClickProperty, ExpandOnClickAttribute);
        RenderFlagAttribute(context, root, DataGridComponent.MultipleDetailsProperty, MultipleDetailsAttribute);
        RenderCellRules(context, root);

        base.RenderComponent(context, root);
    }

    /// <summary>Names each editable column whose editor carries rules, with the editor's component and the row property it writes.</summary>
    private void RenderCellRules(WebRenderContext context, IHtmlElementBuilder root)
    {
        CompiledView view = context.ViewResolution.View;
        Dictionary<string, CellRules>? rules = null;

        foreach (UITableColumn column in ResolveColumns(context))
        {
            if (column is not UIDataGridColumn { Editable: true, EditPath: { } path } editable
                || !view.Graph.TryGetSlot(context.Node.ComponentId, UIComponentSlotKind.TemplateVariant, out UIComponentSlot? slot, editable.EditTemplateKey)
                || view.Validations.GetByComponent(slot.RootComponentId).Count == 0)
            {
                continue;
            }

            rules ??= new(StringComparer.Ordinal);
            rules[editable.Key] = new CellRules(slot.RootComponentId.Value, path);
        }

        if (rules is not null)
            _ = root.Attribute(RulesAttribute, JsonSerializer.Serialize(rules, WebWireJson.Options));
    }

    /// <summary>An editable column's editor, by its component, and the row property it writes.</summary>
    private sealed record CellRules(int Editor, string Path);

    /// <summary>A leading detail chevron column stands before the table's own checkbox column, both fixed at the row's start.</summary>
    protected override IReadOnlyList<UITableColumn> ResolveColumns(WebRenderContext context)
    {
        IReadOnlyList<UITableColumn> columns = base.ResolveColumns(context);

        if (columns.Count < 2 || columns[0].Key != TableComponent.SelectionColumnKey || columns[1] is not UIDataGridColumn { DetailToggle: true } detail)
            return columns;

        UITableColumn[] ordered = new UITableColumn[columns.Count];
        ordered[0] = detail;
        ordered[1] = columns[0];

        for (var i = 2; i < columns.Count; i++)
            ordered[i] = columns[i];

        return ordered;
    }

    /// <summary>A grid is one whatever its rows do: the keyboard walks its header and its rows.</summary>
    protected override bool ActsAsGrid(WebRenderContext context)
        => true;

    /// <summary>A grid sorts on the client by what the rows hold, so a static grid publishes its values as a virtualized one does.</summary>
    protected override bool PublishItemValues => true;

    /// <summary>
    /// The band over the table, outside its scrolling frame: the search box, the filters button and the columns button.
    /// </summary>
    protected override void RenderOverTable(WebRenderContext context, IHtmlElementBuilder root, IReadOnlyList<UITableColumn> columns)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);
        ArgumentNullException.ThrowIfNull(columns);

        var flyout = HasFilters(columns);
        var chooser = ReadRenderValue(context, DataGridComponent.ColumnChooserProperty, false) && columns.Count > 0;

        _ = root.Element("div", band =>
        {
            _ = band.Class(BandClassName);

            RenderRegion(context, band, DataGridComponent.SearchRegionName);

            if (flyout)
            {
                RenderBandFlyout(context, band, UIGlyphs.Filter, DataGridStrings.Filters, counted: true, FilterPanelClassName, panel =>
                {
                    for (var i = 0; i < columns.Count; i++)
                    {
                        if (columns[i] is UIDataGridColumn { Filterable: true } filterable)
                            RenderRegion(context, panel, filterable.FilterRegionName);
                    }

                    // Disabled the framework's way rather than natively, so the focused button keeps the focus as it turns off.
                    _ = panel.Element("button", clear =>
                    {
                        _ = clear.Class(WebClassNames.Button);
                        _ = clear.Class(WebClassNames.ButtonVariant(UIButtonVariant.Ghost));
                        _ = clear.Class(WebClassNames.ButtonSize(UISize.Small));
                        _ = clear.Class(FiltersClearClassName);
                        _ = clear.Class(WebClassNames.Disabled);
                        _ = clear.Attribute("type", "button");
                        _ = clear.Attribute("aria-disabled", "true");
                        WebWords.Write(context, clear, null, DataGridStrings.ClearFilters);
                    });
                });
            }

            // The chooser's entries are chrome, so no command stands behind a click.
            if (chooser)
                RenderBandFlyout(context, band, UIGlyphs.Columns, DataGridStrings.Columns, counted: false, ColumnsPanelClassName, panel => RenderRegion(context, panel, DataGridComponent.ColumnsRegionName));
        });
    }

    private static bool HasFilters(IReadOnlyList<UITableColumn> columns)
    {
        for (var i = 0; i < columns.Count; i++)
        {
            if (columns[i] is UIDataGridColumn { Filterable: true })
                return true;
        }

        return false;
    }

    /// <summary>
    /// A band flyout in the foundation's markup, since a grid cannot compose a core component around its own parts.
    /// </summary>
    private static void RenderBandFlyout(WebRenderContext context, IHtmlElementBuilder band, string icon, string wordKey, bool counted, string panelClassName, Action<IHtmlElementBuilder> renderPanel)
        => FlyoutRenderer.RenderFlyout(band, UIPopupPlacement.BottomEnd, anchor =>
        {
            _ = anchor.Element("button", button =>
            {
                _ = button.Class(WebClassNames.Button);
                _ = button.Class(WebClassNames.ButtonVariant(UIButtonVariant.Ghost));
                _ = button.Class(WebClassNames.ButtonSize(UISize.Small));
                _ = button.Class(BandButtonClassName);
                _ = button.Attribute("type", "button");
                WebWords.Write(context, button, "aria-label", wordKey);
                WebWords.Write(context, button, WebAttributes.Tooltip, wordKey);
                IconValueRenderer.RenderIcon(button, icon);

                // The count of the filters in use, the framework's bare count badge, which the engine writes and hides at none.
                if (counted)
                    BadgeRenderer.RenderCountBadge(button, UIBadgeVariant.Primary, configure: count => count.Class(FiltersCountClassName).Attribute("hidden"));
            });
        }, content =>
        {
            if (!counted)
            {
                _ = content.Class(panelClassName);
                renderPanel(content);
                return;
            }

            _ = content.Element("div", panel =>
            {
                _ = panel.Class(panelClassName);
                renderPanel(panel);
            });
        });

    /// <summary>
    /// The caption, the sort mark when the column sorts, then the resize handle; a sorting cell is a named stop of the header's keyboard.
    /// </summary>
    protected override void RenderHeaderCellContent(WebRenderContext context, IHtmlElementBuilder cell, UITableColumn column, int index)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(cell);
        ArgumentNullException.ThrowIfNull(column);

        if (column.Key == TableComponent.SelectionColumnKey)
        {
            base.RenderHeaderCellContent(context, cell, column, index);
            return;
        }

        RenderCaption(context, cell, column);

        if (column is UIDataGridColumn { Sortable: true, EffectiveSortPath: { } sortPath } typed)
        {
            // The caption, looked up as the one beside it is — or, an author's text that is content, set in as it stands; a column with
            // none is named by what it sorts, in words.
            var caption = !column.HasCaption || column.Caption is not { } words
                ? UIPhrase.Text(typed.FallbackCaption)
                : words.IsText && IsContentCaption(context, column) ? (object)words.Key : words;

            _ = cell.Attribute(SortAttribute, sortPath);
            // Focusable, but no stop of the Tab order: the grid is the one stop, and its header is reached by Up from the first row.
            _ = cell.Attribute("tabindex", "-1");
            _ = cell.Attribute("aria-sort", "none");
            // The caption stays the cell's name, as on every column; what a press does is said after it.
            WebWords.Write(context, cell, "aria-description", DataGridStrings.SortBy, new Dictionary<string, object?>(StringComparer.Ordinal) { ["column"] = caption });

            // Two marks, one drawn at a time: the idle two-way mark while unsorted, the framework's arrow once sorted — one mark
            // alone would misread as "up" on an unsorted column.
            IconValueRenderer.RenderIcon(cell, UIGlyphs.Sort, SortIdleClassName);
            IconValueRenderer.RenderIcon(cell, UIGlyphs.ArrowUp, SortMarkClassName);
        }

        RenderResizer(context, cell, column, index);
    }

    /// <summary>The rows, then a footer of totals in the columns' tracks when a column asked for one; the engine writes the numbers.</summary>
    protected override void RenderRows(WebRenderContext context, IHtmlElementBuilder parent, IReadOnlyList<UITableColumn> columns, WebRenderItemsCompositeMetadata composite)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(parent);
        ArgumentNullException.ThrowIfNull(columns);

        base.RenderRows(context, parent, columns, composite);

        var totals = false;

        for (var i = 0; i < columns.Count && !totals; i++)
            totals = columns[i] is UIDataGridColumn { Aggregate: not UIDataGridAggregate.None };

        if (!totals)
            return;

        // A grid's footer cells are grid cells, as its rows' are.
        var cellRole = CellRole(context);

        _ = parent.Element("div", footer =>
        {
            _ = footer.Class(FooterClassName);
            _ = footer.Attribute("role", "row");

            for (var i = 0; i < columns.Count; i++)
                RenderTotalCell(footer, columns, i, cellRole);
        });
    }

    /// <summary>A footer cell: empty for a column with no total, else the total's name and the column's property, kind and format for the engine.</summary>
    private static void RenderTotalCell(IHtmlElementBuilder footer, IReadOnlyList<UITableColumn> columns, int index, string cellRole)
    {
        UITableColumn column = columns[index];

        _ = footer.Element("div", cell =>
        {
            _ = cell.Class($"{TotalClassName} {CellClassName}");
            _ = cell.Attribute("role", cellRole);
            _ = cell.Attribute(ColumnAttribute, column.Key);
            // The column's index as the table writes it on a row's cells, so the footer's tracks hide and rearrange by the same
            // rules a moved column follows.
            _ = cell.Attribute(WebAttributes.TableColumn, index.ToString(CultureInfo.InvariantCulture));

            if (column.Alignment == UITextAlignment.Center)
                _ = cell.Class($"{CellClassName}--center");
            else if (column.Alignment == UITextAlignment.End)
                _ = cell.Class($"{CellClassName}--end");

            RenderPinned(cell, CellClassName, columns, index);

            if (column is not UIDataGridColumn { Aggregate: not UIDataGridAggregate.None } total)
                return;

            // A count is a plain number whatever the column holds; the rest keep the column's own format.
            var counted = total.Aggregate == UIDataGridAggregate.Count;
            var format = counted ? "N0" : total.Format;

            _ = cell.Attribute(AggregateAttribute, total.Aggregate.ToString().ToLowerInvariant());
            _ = cell.Attribute(PropertyAttribute, total.EffectiveSortPath ?? column.Key);
            _ = cell.Attribute(DataGridCellRenderer.KindAttribute, DataGridCellRenderer.KindName(counted ? UIDataGridColumnKind.Number : total.Kind));

            if (!string.IsNullOrEmpty(format))
                _ = cell.Attribute(DataGridCellRenderer.FormatAttribute, format);

            if (!counted && !string.IsNullOrEmpty(total.Currency))
                _ = cell.Attribute(DataGridCellRenderer.CurrencyAttribute, total.Currency);
        });
    }

    /// <summary>
    /// The pager under the rows, outside the frame: the framework's pager aimed at the grid, there while a windowed grid pages; a
    /// bound <c>Paging</c> turned off leaves it with no page to show, and it hides.
    /// </summary>
    protected override void RenderUnderTable(WebRenderContext context, IHtmlElementBuilder root, IReadOnlyList<UITableColumn> columns)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        RenderRegion(context, root, DataGridComponent.PagerRegionName);
    }

    /// <summary>A detail's chevron says nothing of its row: the first column of words heads the rows instead.</summary>
    protected override bool HeadsRows(UITableColumn column)
        => base.HeadsRows(column) && column is not UIDataGridColumn { DetailToggle: true };

    /// <summary>Marks an editable and a detail column's cells, for the engine and the pointer.</summary>
    protected override string CellClass(UITableColumn column)
    {
        ArgumentNullException.ThrowIfNull(column);

        return column switch
        {
            UIDataGridColumn { Editable: true } => $"{base.CellClass(column)} {EditableCellClassName}",
            UIDataGridColumn { DetailToggle: true } => $"{base.CellClass(column)} {DetailCellClassName}",
            _ => base.CellClass(column)
        };
    }

    /// <summary>
    /// The column's key on every cell, and an editable cell's editor variant and its claim on the double click, which the client
    /// drops while <c>Editable</c> is off; the chevron's cell claims its own always.
    /// </summary>
    protected override IReadOnlyDictionary<string, string>? CellAttributes(IReadOnlyList<UITableColumn> columns, int index)
    {
        ArgumentNullException.ThrowIfNull(columns);

        Dictionary<string, string> attributes = new(4, StringComparer.Ordinal) { [ColumnAttribute] = columns[index].Key };

        if (base.CellAttributes(columns, index) is { } inherited)
        {
            foreach (KeyValuePair<string, string> attribute in inherited)
                attributes[attribute.Key] = attribute.Value;
        }

        if (columns[index] is UIDataGridColumn { Editable: true } editable)
        {
            attributes[EditorTemplateAttribute] = editable.EditTemplateKey;
            attributes[WebAttributes.NoRowOpen] = string.Empty;
        }

        // The chevron answers the click itself, so it never stands for the row the keyboard presses (`soleControlOf`); the detail
        // engine opens it from the keyboard by Enter and Space on the chevron cell.
        if (columns[index] is UIDataGridColumn { DetailToggle: true })
            attributes[WebAttributes.NoRowOpen] = string.Empty;

        return attributes;
    }
}
