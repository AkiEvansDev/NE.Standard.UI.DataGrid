using System;
using System.Collections.Generic;
using System.Globalization;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.DataGrid;
using NE.Standard.UI.Primitives.Constants;
using NE.Standard.UI.Primitives.Styling;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Abstractions.Theming;
using NE.Standard.UI.Web.Renderers.Foundation;
using NE.Standard.UI.Web.Renderers.Items;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>
/// Renders the grid through the table's renderer: the same root, header, host and rows, plus the page's culture packs, a sort
/// handle on sortable headers, and an editor-template name on editable cells (drawn only when a cell opens).
/// </summary>
public class DataGridComponentRenderer : TableComponentRenderer
{
    /// <summary>On a header cell that sorts: the row property a click sorts by.</summary>
    public const string SortAttribute = "data-ui-grid-sort";

    /// <summary>On every cell wrapper, the display and the editor alike: the column's key.</summary>
    public const string ColumnAttribute = "data-ui-grid-column";

    /// <summary>On a cell that edits: the template variant its editor is drawn from, which the engine stamps when the cell opens.</summary>
    public const string EditorTemplateAttribute = "data-ui-grid-editor";

    /// <summary>On the root while the grid's <c>Editable</c> is off: no cell opens its editor.</summary>
    public const string ReadOnlyAttribute = "data-ui-grid-readonly";

    /// <summary>On the root: a click anywhere on a row opens its detail; several rows may stand open at once. On an open row: it is open.</summary>
    public const string ExpandOnClickAttribute = "data-ui-grid-expand-click";
    public const string MultipleDetailsAttribute = "data-ui-grid-multiple-details";

    /// <summary>On the root while the grid pages: the pager under the rows is drawn, and the host carries <see cref="WebAttributes.WindowPaged"/>.</summary>
    public const string PagingAttribute = "data-ui-grid-paging";

    /// <summary>On a pager's button: which page it turns to.</summary>
    public const string PageAttribute = "data-ui-grid-page";

    /// <summary>On a footer cell: the total it shows and the property it is over; the kind and the format are the column's, as on a cell.</summary>
    public const string AggregateAttribute = "data-ui-grid-aggregate";
    public const string PropertyAttribute = "data-ui-grid-property";

    /// <summary>On a filter cell: the row property its term reads, the kind of the term, and on a range's parts which end each is.</summary>
    public const string FilterAttribute = "data-ui-grid-filter";
    public const string FilterKindAttribute = "data-ui-grid-filter-kind";
    public const string FilterBoundAttribute = "data-ui-grid-filter-bound";

    /// <summary>On the cell and the header cell of the column of checkboxes; the header's carries the one that takes every row on screen.</summary>
    public const string SelectCellAttribute = "data-ui-grid-select";
    public const string SelectAllAttribute = "data-ui-grid-select-all";

    protected const string GridClassName = "ui-data-grid";
    protected const string SelectCellClassName = "ui-data-grid__cell--select";
    protected const string FooterClassName = "ui-data-grid__footer";
    protected const string TotalClassName = "ui-data-grid__total";
    protected const string PagerClassName = "ui-data-grid__pager";
    protected const string PageButtonClassName = "ui-data-grid__page-button";
    protected const string PageStatusClassName = "ui-data-grid__page-status";
    protected const string BandClassName = "ui-data-grid__band";
    protected const string BandButtonClassName = "ui-data-grid__band-button";
    protected const string FiltersCountClassName = "ui-data-grid__filters-count";
    protected const string FilterPanelClassName = "ui-data-grid__filter-panel";
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
        RenderFlagAttribute(context, root, DataGridComponent.EditableProperty, ReadOnlyAttribute, WebValueCondition.IsFalse);

        // While the checkboxes are there they are the only way to choose: a click on a row is the detail's and the editor's.
        if (HasSelectionColumn(context))
            _ = root.Attribute(WebAttributes.NoRowSelect);

        RenderFlagAttribute(context, root, DataGridComponent.ExpandOnClickProperty, ExpandOnClickAttribute);
        RenderFlagAttribute(context, root, DataGridComponent.MultipleDetailsProperty, MultipleDetailsAttribute);

        // One property, two marks: the root's for the pager, the host's for the window engine — the host's static mark is written
        // in ConfigureHost, the live one through the operation's target.
        _ = RenderProperty<bool?>(context, root, DataGridComponent.PagingProperty, static (target, value) =>
        {
            if (value == true)
                _ = target.Attribute(PagingAttribute);
        }, [
            WebDomOperation.ToggleAttribute(PagingAttribute),
            WebDomOperation.ToggleAttribute(WebAttributes.WindowPaged, target: $"[{WebAttributes.ItemsHost}]", condition: WebValueCondition.IsTrue)
        ]);

        base.RenderComponent(context, root);
    }

    /// <summary>Whether the grid draws its column of checkboxes: only where the rows may be chosen, many at a time.</summary>
    private static bool HasSelectionColumn(WebRenderContext context)
        => ReadRenderValue<UISelectionMode?>(context, ISelectableItemsComponent.SelectionModeProperty, null) is UISelectionMode.Many;

    /// <summary>A grid sorts on the client by what the rows hold, so a static grid publishes its values as a virtualized one does.</summary>
    protected override bool PublishItemValues => true;

    /// <summary>
    /// The author's columns, with the grid's own selection-checkbox column prepended while rows may be chosen — fixed, absent from
    /// <c>Columns</c>, and pinned with whatever else is pinned.
    /// </summary>
    protected override IReadOnlyList<UITableColumn> ResolveColumns(WebRenderContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        IReadOnlyList<UITableColumn> columns = base.ResolveColumns(context);

        if (!HasSelectionColumn(context) || columns.Count == 0)
            return columns;

        UITableColumn selection = new(DataGridComponent.SelectionColumnKey, null, UIGridUnit.Absolute(44), UITextAlignment.Center) { Fixed = true, Pinned = columns[0].Pinned };

        return [selection, .. columns];
    }

    /// <summary>
    /// The band over the table, outside its scrolling frame: the search box, the filters button (a flyout with one filter per
    /// column), and the columns button.
    /// </summary>
    protected override void RenderOverTable(WebRenderContext context, IHtmlElementBuilder root, IReadOnlyList<UITableColumn> columns)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);
        ArgumentNullException.ThrowIfNull(columns);

        var search = !string.IsNullOrEmpty(ReadRenderValue<string?>(context, DataGridComponent.SearchPathProperty, null));
        var flyout = HasFilters(columns);
        var chooser = ReadRenderValue(context, DataGridComponent.ColumnChooserProperty, false) && columns.Count > 0;

        if (!search && !flyout && !chooser)
            return;

        _ = root.Element("div", band =>
        {
            _ = band.Class(BandClassName);

            if (search)
                RenderTemplateVariant(context, band, DataGridComponent.SearchTemplateKey);

            if (flyout)
            {
                RenderBandFlyout(context, band, UIGlyphs.Filter, DataGridStrings.Filters, counted: true, FilterPanelClassName, panel =>
                {
                    for (var i = 0; i < columns.Count; i++)
                    {
                        if (columns[i] is UIDataGridColumn { Filterable: true } filterable)
                            RenderTemplateVariant(context, panel, filterable.FilterTemplateKey);
                    }
                });
            }

            // The chooser is the framework's menu, a check entry per column the engine keeps checked while it shows; the entries
            // are chrome, so no command stands behind a click.
            if (chooser)
                RenderBandFlyout(context, band, UIGlyphs.Columns, DataGridStrings.Columns, counted: false, ColumnsPanelClassName, panel => RenderTemplateVariant(context, panel, DataGridComponent.ColumnsTemplateKey));
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
    /// A flyout the framework's engine reads: an anchor button with an icon and a word, and a content panel the caller fills. Drawn
    /// here rather than composed, since a grid can't wrap its own parts in a core component at render time.
    /// </summary>
    private static void RenderBandFlyout(WebRenderContext context, IHtmlElementBuilder band, string icon, string wordKey, bool counted, string panelClassName, Action<IHtmlElementBuilder> renderPanel)
    {
        _ = band.Element("div", flyout =>
        {
            _ = flyout.Class($"ui-flyout {WebClassNames.FlyoutPlacement(UIPopupPlacement.BottomEnd)}");

            _ = flyout.Element("div", anchor =>
            {
                _ = anchor.Class("ui-flyout__anchor");

                _ = anchor.Element("button", button =>
                {
                    _ = button.Class(BandButtonClassName);
                    _ = button.Attribute("type", "button");
                    IconValueRenderer.RenderIcon(button, icon);
                    _ = button.Element("span", word => _ = word.Text(context.Translate(wordKey)));

                    // The count of the filters in use, which the engine writes and hides at none.
                    if (counted)
                    {
                        // The framework's own count badge, drawn in its classes, so its figure is centred the badge's way.
                        _ = button.Element("span", count =>
                        {
                            _ = count.Class("ui-badge");
                            _ = count.Class(WebClassNames.BadgeStyle(UIBadgeType.Primary));
                            _ = count.Class(FiltersCountClassName);
                            _ = count.Attribute("hidden");
                            _ = count.Element("span", text => _ = text.Class("ui-badge__text"));
                        });
                    }
                });
            });

            _ = flyout.Element("div", content =>
            {
                _ = content.Class("ui-flyout__content");
                _ = content.Attribute("role", "dialog");
                _ = content.Attribute("tabindex", "-1");

                _ = content.Element("div", panel =>
                {
                    _ = panel.Class(panelClassName);
                    renderPanel(panel);
                });
            });
        });
    }

    /// <summary>
    /// The caption, the sort mark when the column sorts, then the resize handle. A sorting cell is a tab stop the engine answers
    /// Enter and Space on, labeled by what it sorts.
    /// </summary>
    protected override void RenderHeaderCellContent(WebRenderContext context, IHtmlElementBuilder cell, UITableColumn column, int index)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(cell);
        ArgumentNullException.ThrowIfNull(column);

        // Over the checkboxes stands the one that takes every row the grid is holding — what the filters left, or the window read.
        if (column.Key == DataGridComponent.SelectionColumnKey)
        {
            _ = cell.Attribute(SelectAllAttribute);
            RenderTemplateVariant(context, cell, DataGridComponent.SelectAllTemplateKey);
            return;
        }

        RenderCaption(context, cell, column);

        if (column is UIDataGridColumn { Sortable: true, EffectiveSortPath: { } sortPath })
        {
            var caption = string.IsNullOrEmpty(column.Caption) ? column.Key : context.Translate(column.Caption);

            _ = cell.Attribute(SortAttribute, sortPath);
            _ = cell.Attribute("tabindex", "0");
            _ = cell.Attribute("aria-sort", "none");
            _ = cell.Attribute("aria-label", context.Translate(DataGridStrings.SortBy).Replace("{column}", caption, StringComparison.Ordinal));

            // Two marks, one drawn at a time: the idle two-way mark while unsorted, the framework's arrow once sorted — one mark
            // alone would misread as "up" on an unsorted column.
            IconValueRenderer.RenderIcon(cell, UIGlyphs.Sort, SortIdleClassName);
            IconValueRenderer.RenderIcon(cell, UIGlyphs.ArrowUp, SortMarkClassName);
        }

        RenderResizer(context, cell, column, index);
    }

    /// <summary>A paging grid's host is a paged window: the scroll asks for nothing, the pager does.</summary>
    protected override void ConfigureHost(WebRenderContext context, IHtmlElementBuilder host)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(host);

        if (ReadRenderValue<bool?>(context, DataGridComponent.PagingProperty, null) == true)
            _ = host.Attribute(WebAttributes.WindowPaged);
    }

    /// <summary>
    /// The rows, then a totals footer when a column asked for one — a cell per column in the header's tracks, the engine writing
    /// the numbers. The footer scrolls with the columns' tracks; the pager doesn't.
    /// </summary>
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

        _ = parent.Element("div", footer =>
        {
            _ = footer.Class(FooterClassName);
            _ = footer.Attribute("role", "row");

            for (var i = 0; i < columns.Count; i++)
                RenderTotalCell(footer, columns, i);
        });
    }

    /// <summary>A footer cell: empty for a column with no total, else the total's name and the column's property, kind and format for the engine.</summary>
    private static void RenderTotalCell(IHtmlElementBuilder footer, IReadOnlyList<UITableColumn> columns, int index)
    {
        UITableColumn column = columns[index];

        _ = footer.Element("div", cell =>
        {
            _ = cell.Class($"{TotalClassName} {CellClassName}");
            _ = cell.Attribute("role", "cell");
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

    /// <summary>The pager under the table and outside its frame: four buttons and the line saying which rows the page holds, which the engine writes.</summary>
    protected override void RenderUnderTable(WebRenderContext context, IHtmlElementBuilder root, IReadOnlyList<UITableColumn> columns)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        _ = root.Element("div", pager =>
        {
            _ = pager.Class(PagerClassName);
            _ = pager.Attribute("role", "navigation");

            RenderPageButton(context, pager, "first", UIGlyphs.FirstPage, DataGridStrings.FirstPage);
            RenderPageButton(context, pager, "previous", UIGlyphs.ChevronLeft, DataGridStrings.PreviousPage);

            _ = pager.Element("span", status =>
            {
                _ = status.Class(PageStatusClassName);
                _ = status.Attribute("aria-live", "polite");
            });

            RenderPageButton(context, pager, "next", UIGlyphs.ChevronRight, DataGridStrings.NextPage);
            RenderPageButton(context, pager, "last", UIGlyphs.LastPage, DataGridStrings.LastPage);
        });
    }

    private static void RenderPageButton(WebRenderContext context, IHtmlElementBuilder pager, string page, string icon, string wordKey)
    {
        _ = pager.Element("button", button =>
        {
            var word = context.Translate(wordKey);

            _ = button.Class($"{PageButtonClassName} ui-button ui-button--ghost ui-button--small");
            _ = button.Attribute("type", "button");
            _ = button.Attribute(TextContentRendererBase.IconOnlyButtonAttribute);
            _ = button.Attribute(PageAttribute, page);
            _ = button.Attribute("aria-label", word);
            _ = button.Attribute("title", word);
            IconValueRenderer.RenderIcon(button, icon);
        });
    }

    /// <summary>An editable column's cell says so, for the engine that opens it and the pointer that finds it; a detail column's and the checkbox column's the same.</summary>
    protected override string CellClass(UITableColumn column)
    {
        ArgumentNullException.ThrowIfNull(column);

        return column switch
        {
            UIDataGridColumn { Editable: true } => $"{base.CellClass(column)} {EditableCellClassName}",
            UIDataGridColumn { DetailToggle: true } => $"{base.CellClass(column)} {DetailCellClassName}",
            { Key: DataGridComponent.SelectionColumnKey } => $"{base.CellClass(column)} {SelectCellClassName}",
            _ => base.CellClass(column)
        };
    }

    /// <summary>The table's own attributes (a pinned column's offset), then the column's key on every cell; an editable cell also names its editor's template and claims the double click.</summary>
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

        // The checkbox answers the click itself: neither the row's detail nor anything else opens under it.
        if (columns[index].Key == DataGridComponent.SelectionColumnKey)
        {
            attributes[SelectCellAttribute] = string.Empty;
            attributes[WebAttributes.NoRowOpen] = string.Empty;
        }

        return attributes;
    }
}
