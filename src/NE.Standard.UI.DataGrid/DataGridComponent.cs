using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Binding;
using NE.Standard.UI.Abstractions.Binding.Properties;
using NE.Standard.UI.Abstractions.Interaction;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.BuiltIns;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.BuiltIns.Actions;
using NE.Standard.UI.Components.BuiltIns.Inputs;
using NE.Standard.UI.Components.BuiltIns.Items;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Components.BuiltIns.Navigation;
using NE.Standard.UI.Components.Foundation;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Primitives.Binding;
using NE.Standard.UI.Primitives.Constants;
using NE.Standard.UI.Primitives.Items;
using NE.Standard.UI.Primitives.Styling;

namespace NE.Standard.UI.DataGrid;

/// <summary>
/// A <see cref="TableComponent{T}"/> with sorting by header, typed and formatted columns, and editing in place.
/// </summary>
public abstract partial class DataGridComponent<T> : TableComponent<T>, IRegionContainerComponent
    where T : DataGridComponent<T>, IUIComponentDefinition
{
    /// <summary>The argument a cell-edit command receives the row's key under.</summary>
    private const string RowArgumentName = "id";

    /// <summary>The argument a cell-edit command receives the column's key under.</summary>
    private const string ColumnArgumentName = "column";

    /// <summary>The region the search box stands in, over the rows.</summary>
    public const string SearchRegionName = "search";

    /// <summary>The region the column chooser's menu stands in, over the rows.</summary>
    public const string ColumnsRegionName = "columns";

    /// <summary>The template variant a row's detail renders through, and the key of the detail column.</summary>
    public const string DetailTemplateKey = "detail";

    /// <summary>
    /// The key of the grid's own checkbox column, shown while many rows may be chosen; not in <see cref="TableComponent{T}.Columns"/>.
    /// </summary>
    public const string SelectionColumnKey = "selection";

    /// <summary>The region of the checkbox over that column, which takes or clears the rows the grid has drawn.</summary>
    public const string SelectAllRegionName = "selection-all";

    /// <summary>The region the pager stands in, under the rows of a windowed grid that pages.</summary>
    public const string PagerRegionName = "pager";

    // The band's parts and the header's checkbox stand outside every row: a template variant is compiled in the row's scope, so
    // each would carry the row's key in its address with no row around it to supply one.
    private readonly Dictionary<string, IVisualComponent> _regions = new(StringComparer.Ordinal);

    // Every editor registers the cell-edit command when it is added, or when the command is named later, whichever comes second.
    private readonly List<Action<string>> _editorRegistrations = [];
    private string? _cellEditCommand;

    // Built with the grid, so it may be configured before the grid pages; it joins the regions once the grid is windowed and pages.
    private readonly PagerComponent _pager;

    // The search box's placeholder, kept apart from the box so it may be named before or after SetSearch draws one.
    private string _searchPlaceholder = UIDataGridWords.Search;
    private TextInputComponent? _searchField;

    /// <summary>Initializes the grid.</summary>
    protected DataGridComponent(string? id = null) : base(id)
    {
        // Alone in their cells with no words of their own, so each is named for a screen reader.
        _ = SetTemplateVariantCore($"{UITableColumn.TemplatePrefix}:{SelectionColumnKey}", new CheckboxComponent().SetHorizontalAlignment(UIAlignment.Center).SetAccessibleName(UIDataGridWords.SelectRow));
        _regions[SelectAllRegionName] = new CheckboxComponent().SetHorizontalAlignment(UIAlignment.Center).SetAccessibleName(UIDataGridWords.SelectAll);
        _pager = new PagerComponent().SetTarget(Id);

        // The grid's own client reads rows raw — a total over any column, an export, a filter on any field — past what its templates bind.
        _ = ReadsWholeItems();
    }

    /// <inheritdoc/>
    /// <remarks>Read when the view compiles, once <c>BindSource</c> and <c>SetPaging</c> have both been said, in whichever order.</remarks>
    public IReadOnlyDictionary<string, IVisualComponent> Regions
    {
        get
        {
            if (Pages())
                _regions[PagerRegionName] = _pager;
            else
                _ = _regions.Remove(PagerRegionName);

            return _regions;
        }
    }

    /// <summary>Whether the grid shows its window as a page: windowed, and <c>Paging</c> on or bound.</summary>
    private bool Pages()
    {
        if (HostMode != UIItemsHostMode.Windowed)
            return false;

        if (Paging == true)
            return true;

        for (var i = 0; i < Bindings.Count; i++)
        {
            if (Bindings[i].Target.Equals(IItemsHostComponent.PagingProperty))
                return true;
        }

        return false;
    }

    /// <inheritdoc/>
    public bool HasRegions => _regions.Count > 0;

    /// <summary>
    /// Gets or sets whether editable cells open their editors; off, a double click opens the row as on any other cell.
    /// </summary>
    [UIComponentProperty(DefaultValue = true)]
    public bool? Editable { get; set; }

    /// <summary>
    /// Gets whether the band holds a column chooser, whose choices persist in the browser; set by <c>SetColumnChooser</c>. Render-time only.
    /// </summary>
    [UIComponentProperty(DefaultValue = false, IsBindable = false, GenerateSetter = false)]
    public bool ColumnChooser { get; private set; }

    /// <summary>
    /// Gets or sets whether a click anywhere on a row opens its detail, beside the chevron of a detail column. Render-time only.
    /// </summary>
    [UIComponentProperty(DefaultValue = false, IsBindable = false)]
    public bool ExpandOnClick { get; set; }

    /// <summary>
    /// Gets or sets whether several rows may stand open at once; off, opening one closes the row that was open. Render-time only.
    /// </summary>
    [UIComponentProperty(DefaultValue = false, IsBindable = false)]
    public bool MultipleDetails { get; set; }

    /// <summary>
    /// Gets the row property the search box matches, set by <see cref="SetSearch"/>; null draws no box. Render-time only.
    /// </summary>
    [UIComponentProperty(DefaultValue = null, IsBindable = false, GenerateSetter = false)]
    public string? SearchPath { get; private set; }

    /// <summary>
    /// Puts a column chooser in the band: a menu of check entries the viewer turns off to hide a column.
    /// </summary>
    public T SetColumnChooser(bool chooser = true)
    {
        ColumnChooser = chooser;

        if (chooser)
            RefreshChooser();

        return Self;
    }

    /// <summary>The chooser's menu, built once the chooser is asked for and kept level with the columns as they are added.</summary>
    private void RefreshChooser()
    {
        List<MenuItem> entries = new(Columns.Count);

        for (var i = 0; i < Columns.Count; i++)
        {
            UITableColumn column = Columns[i];

            // A content caption is shown as written here too; the grid's own word or a key standing in for none is not a caption.
            entries.Add(new MenuItem { Id = column.Key, Title = ChooserTitleOf(column), Icon = column.Icon, IconColor = column.IconColor, Kind = UIMenuItemKind.Check, Checked = !column.Hidden, IsContent = !string.IsNullOrEmpty(column.Caption) && IsContentCaption(column) });
        }

        _regions[ColumnsRegionName] = new MenuComponent().SetOrientation(UIOrientation.Vertical).SetItems(entries);
    }

    /// <summary>A column's name in the chooser: its caption, the grid's own word for the detail chevron's column, else its key.</summary>
    private static string ChooserTitleOf(UITableColumn column)
    {
        if (!string.IsNullOrEmpty(column.Caption))
            return column.Caption;

        return column is UIDataGridColumn { DetailToggle: true } ? UIDataGridWords.Details : column.Key;
    }

    /// <summary>Whether a column's caption is shown as written: the column says so, or the grid said it of all its columns.</summary>
    private bool IsContentCaption(UITableColumn column)
        => column.IsContent || IsContent(ColumnsProperty);

    /// <summary>Every column, whatever verb added it: the grid's own key is refused, and the chooser keeps its entries level with them.</summary>
    protected override T AddColumn(UITableColumn column, IVisualComponent template)
    {
        ArgumentNullException.ThrowIfNull(column);

        if (string.Equals(column.Key, SelectionColumnKey, StringComparison.Ordinal))
            throw new ArgumentException($"'{SelectionColumnKey}' is the key of the grid's own column of checkboxes.", nameof(column));

        T self = base.AddColumn(column, template);

        if (ColumnChooser)
            RefreshChooser();

        return self;
    }

    /// <summary>A column changed after it was added — hidden, given an icon, made filterable — and the chooser's entry with it.</summary>
    protected override void ReplaceColumn(int index, UITableColumn column)
    {
        base.ReplaceColumn(index, column);

        if (ColumnChooser)
            RefreshChooser();
    }

    /// <summary>
    /// Marks translatable properties content; the columns' reaches every place the grid names a column — the chooser's entries and
    /// the filters' captions — whether the chooser and the filters came before or after.
    /// </summary>
    public override T AsContent(params UIProperty[] properties)
    {
        T self = base.AsContent(properties);

        if (!IsContent(ColumnsProperty))
            return self;

        if (ColumnChooser)
            RefreshChooser();

        for (var i = 0; i < Columns.Count; i++)
        {
            if (Columns[i] is UIDataGridColumn { Filterable: true } column && _regions.TryGetValue(column.FilterRegionName, out IVisualComponent? region) && region is DataGridFilterComponent filter)
                _ = filter.AsContent(DataGridFilterComponent.CaptionProperty);
        }

        return self;
    }

    /// <summary>
    /// Configures the pager under the rows — its look, the page sizes it offers — drawn while a windowed grid pages (<c>Paging</c>).
    /// </summary>
    public T ConfigurePager(Action<PagerComponent> configure)
    {
        ArgumentNullException.ThrowIfNull(configure);

        configure(_pager);

        return Self;
    }

    /// <summary>
    /// Draws a search box over the grid; what is typed matches <paramref name="propertyPath"/> as case-insensitive text, with every
    /// term required.
    /// </summary>
    public T SetSearch(string propertyPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(propertyPath);

        SearchPath = propertyPath;

        // A field of the page's own ground, not a ghost: the band is a row of controls, and the buttons beside it take the same
        // ground. Tonal, a toolbar's lone search beside its buttons, with no line the buttons would not have.
        _searchField = new TextInputComponent().SetPlaceholder(_searchPlaceholder).SetAppearance(UIInputAppearance.Tonal).SetShowClearButton(true).SetDebounceMilliseconds(300);

        _regions[SearchRegionName] = new DataGridFilterComponent().SetProperty(propertyPath).SetKind(UIDataGridColumnKind.Text).AddChild(_searchField);

        return Self;
    }

    /// <summary>
    /// Sets the search box's placeholder, a key or a text, in place of the grid's own word; before or after <see cref="SetSearch"/>.
    /// </summary>
    public T SetSearchPlaceholder(string text)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(text);

        _searchPlaceholder = text;
        _ = _searchField?.SetPlaceholder(text);

        return Self;
    }

    /// <summary>
    /// Draws <paramref name="template"/>, bound to the row, under a row opened at its <see cref="AddDetailColumn"/> chevron or,
    /// with <c>ExpandOnClick</c>, anywhere on it.
    /// </summary>
    public T SetDetailTemplate(IVisualComponent template)
    {
        ArgumentNullException.ThrowIfNull(template);

        return SetTemplateVariantCore(DetailTemplateKey, template);
    }

    /// <summary>
    /// Adds the narrow column whose chevron opens a row's detail, in the place it is added.
    /// </summary>
    public T AddDetailColumn(UIGridUnit? width = null, bool pinned = false)
    {
        UIDataGridColumn column = new(DetailTemplateKey, null, width ?? UIGridUnit.Absolute(40), UITextAlignment.Center) { DetailToggle = true, Pinned = pinned };

        // The tooltip is what names an icon-only button for a reader who cannot see the chevron.
        return AddColumn(column, new ButtonComponent().SetIcon(UIGlyphs.ChevronRight).SetType(UIButtonType.Ghost).SetSize(UIButtonSize.Small).SetTooltip(UIDataGridWords.Details));
    }

    /// <summary>
    /// Adds a column showing the row's text at <paramref name="propertyPath"/>, sortable by it.
    /// </summary>
    public override T AddTextColumn(string caption, string propertyPath, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool pinned = false, string? icon = null, bool hidden = false, bool content = false)
        => AddTextColumn(caption, propertyPath, sortable: true, width, alignment, key, pinned: pinned, icon: icon, hidden: hidden, content: content);

    /// <summary>
    /// Adds a column showing the row's text at <paramref name="propertyPath"/>, sortable by it unless told otherwise, edited in a text field when
    /// <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its rules (<c>Validate</c>, <c>Required</c>, <c>Regex</c>).
    /// </summary>
    public T AddTextColumn(string caption, string propertyPath, bool sortable, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool editable = false, bool filterable = false, UIDataGridAggregate aggregate = UIDataGridAggregate.None, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<TextInputComponent>? configureEditor = null)
    {
        UIDataGridColumn column = CreateColumn(caption, propertyPath, UIDataGridColumnKind.Text, sortable, editable, filterable, width, alignment, key, pinned, aggregate, icon, hidden, content, configureEditor is not null);

        _ = AddColumn(column, CreateTextCell(propertyPath, alignment));

        if (filterable)
            _ = SetFilter(column);

        return editable ? SetEditor(column, Configured(new TextInputComponent(), Typed(configureEditor)), propertyPath) : Self;
    }

    private UIDataGridColumn CreateColumn(string caption, string propertyPath, UIDataGridColumnKind kind, bool sortable, bool editable, bool filterable, UIGridUnit? width, UITextAlignment? alignment, string? key, bool pinned, UIDataGridAggregate aggregate, string? icon, bool hidden, bool content, bool configured)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(propertyPath);

        // An editor configured on a column that never opens one would carry rules nobody meets.
        if (configured && !editable)
            throw new ArgumentException("An editor is configured only on an editable column.", nameof(configured));

        return new UIDataGridColumn(key ?? PropertyColumnKey(propertyPath), caption, width ?? UIGridUnit.Auto(), alignment) { Kind = kind, PropertyPath = propertyPath, Sortable = sortable, Editable = editable, EditPath = editable ? propertyPath : null, Filterable = filterable, FilterKind = kind, Pinned = pinned, Aggregate = aggregate, Icon = icon, Hidden = hidden, IsContent = content };
    }

    /// <summary>A property column is keyed by its property, a template column by its sort path — the key a cell-edit command names — unless a column has that key already.</summary>
    private string PropertyColumnKey(string propertyPath)
    {
        for (var i = 0; i < Columns.Count; i++)
        {
            if (string.Equals(Columns[i].Key, propertyPath, StringComparison.Ordinal))
                return NextColumnKey();
        }

        return propertyPath;
    }

    /// <summary>
    /// Installs the column's filter region, its fields unbound since the client writes the query.
    /// </summary>
    private T SetFilter(UIDataGridColumn column)
    {
        DataGridFilterComponent filter = new DataGridFilterComponent()
            .SetProperty(column.EffectiveSortPath ?? column.Key)
            .SetKind(column.FilterKind)
            .SetCaption(column.Caption);

        if (IsContentCaption(column))
            _ = filter.AsContent(DataGridFilterComponent.CaptionProperty);

        _ = column.FilterKind switch
        {
            UIDataGridColumnKind.Number or UIDataGridColumnKind.Money => filter
                .AddChild(new NumberInputComponent().SetPlaceholder(UIDataGridWords.From))
                .AddChild(new NumberInputComponent().SetPlaceholder(UIDataGridWords.To)),
            UIDataGridColumnKind.Date => filter.AddChild(new DateInputComponent()).AddChild(new DateInputComponent()),
            UIDataGridColumnKind.Boolean => filter.AddChild(new SelectComponent()
                .SetOptions(CreateOptions(column.Choices ?? UIChoices.Boolean(UIDataGridWords.Yes, UIDataGridWords.No)))
                .SetPlaceholder(UIDataGridWords.Any)
                .SetShowClearButton(true)
            ),
            UIDataGridColumnKind.Enum => filter.AddChild(new SelectComponent()
                .SetOptions(CreateOptions(column.Choices))
                .SetPlaceholder(UIDataGridWords.Any)
                .SetShowClearButton(true)
            ),
            _ => filter.AddChild(new TextInputComponent().SetPlaceholder(UIDataGridWords.Filter).SetShowClearButton(true).SetDebounceMilliseconds(300))
        };

        _regions[column.FilterRegionName] = filter;

        return Self;
    }

    private static List<OptionItem> CreateOptions(IReadOnlyList<UIChoice>? choices)
    {
        List<OptionItem> options = [];

        if (choices is null)
            return options;

        for (var i = 0; i < choices.Count; i++)
            options.Add(new OptionItem { Id = choices[i].Value, Title = choices[i].Caption });

        return options;
    }

    /// <summary>
    /// Installs the column's editor as its edit variant, with the cell-edit command attached once named.
    /// </summary>
    private T SetEditor<TInput>(UIDataGridColumn column, TInput editor, string? propertyPath)
        where TInput : VisualComponentBase<TInput>, IInputComponent, IUIComponentDefinition
    {
        // A field in a cell draws no box of its own: the cell is plainly the editor, and a box moved the row.
        if (editor is IFieldInputComponent { Appearance: null } field)
            field.Appearance = UIInputAppearance.Ghost;

        // Spelled out: the raw Bind is one-way whatever the property declares, and a value that never came back would be no edit.
        if (propertyPath is not null)
            _ = editor.Bind(IInputComponent.ValueProperty, propertyPath, UIBindingScope.Relative, UIBindingMode.TwoWay);

        void Register(string command)
        {
            _ = editor.On(DataGridEvents.CellEdit, command, UIAction.ArgCurrentItemKey(RowArgumentName), UIAction.Arg(ColumnArgumentName, column.Key));
        }

        _editorRegistrations.Add(Register);

        if (_cellEditCommand is not null)
            Register(_cellEditCommand);

        return SetTemplateVariantCore(column.EditTemplateKey, editor);
    }

    /// <summary>
    /// Adds a column showing the number at <paramref name="propertyPath"/>, formatted as <c>N2</c> unless given, end-aligned and
    /// sorted numerically; edited in a number field when <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its
    /// rules (<c>Validate</c>, <c>Required</c>) or bounds.
    /// </summary>
    public T AddNumberColumn(string caption, string propertyPath, string? format = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, UIDataGridAggregate aggregate = UIDataGridAggregate.None, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<NumberInputComponent>? configureEditor = null)
        => AddTypedColumn(caption, propertyPath, UIDataGridColumnKind.Number, format ?? "N2", null, null, sortable, editable, filterable, width, alignment ?? UITextAlignment.End, key, aggregate, pinned, icon, hidden, content, Typed(configureEditor));

    private T AddTypedColumn(string caption, string propertyPath, UIDataGridColumnKind kind, string? format, string? currency, IReadOnlyList<UIChoice>? choices, bool sortable, bool editable, bool filterable, UIGridUnit? width, UITextAlignment? alignment, string? key, UIDataGridAggregate aggregate, bool pinned, string? icon, bool hidden, bool content, Action<IInputComponent>? configureEditor)
    {
        UIDataGridColumn column = CreateColumn(caption, propertyPath, kind, sortable, editable, filterable, width, alignment, key, pinned, aggregate, icon, hidden, content, configureEditor is not null) with { Format = format, Currency = currency, Choices = choices };

        DataGridCellComponent cell = new DataGridCellComponent()
            .SetKind(kind)
            .SetFormat(format)
            .SetCurrency(currency)
            .SetChoices(choices)
            .BindValue(propertyPath, UIBindingScope.Relative);

        _ = AddColumn(column, cell);

        if (filterable)
            _ = SetFilter(column);

        if (!editable)
            return Self;

        return kind switch
        {
            UIDataGridColumnKind.Number or UIDataGridColumnKind.Money => SetEditor(column, Configured(new NumberInputComponent(), configureEditor), propertyPath),
            UIDataGridColumnKind.Date when HasTimeToken(format) => SetEditor(column, Configured(new DateTimeInputComponent(), configureEditor), propertyPath),
            UIDataGridColumnKind.Date => SetEditor(column, Configured(new DateInputComponent(), configureEditor), propertyPath),
            UIDataGridColumnKind.Boolean => SetEditor(column, Configured(new CheckboxComponent(), configureEditor), propertyPath),
            UIDataGridColumnKind.Enum => SetEditor(column, Configured(new SelectComponent().SetOptions(CreateOptions(choices)), configureEditor), propertyPath),
            _ => SetEditor(column, Configured(new TextInputComponent(), configureEditor), propertyPath)
        };
    }

    /// <summary>The editor after the author's own configuration — its rules, its bounds — where there is one.</summary>
    private static TInput Configured<TInput>(TInput editor, Action<IInputComponent>? configure)
        where TInput : IInputComponent
    {
        configure?.Invoke(editor);
        return editor;
    }

    /// <summary>A typed method's configuration, as the typed columns' shared path takes it.</summary>
    private static Action<IInputComponent>? Typed<TInput>(Action<TInput>? configure)
        where TInput : IInputComponent
        => configure is null ? null : editor => configure((TInput)editor);

    /// <summary>Whether a date pattern shows a time — an hour, a minute or a second token — so the editor offers one.</summary>
    private static bool HasTimeToken(string? format)
        => format is not null && (format.Contains('H', StringComparison.Ordinal) || format.Contains('h', StringComparison.Ordinal) || format.Contains('m', StringComparison.Ordinal) || format.Contains('s', StringComparison.Ordinal));

    /// <summary>
    /// Adds a column showing the amount at <paramref name="propertyPath"/> as money, in the page's currency format or
    /// <paramref name="currency"/>; edited in a number field when <paramref name="editable"/>, which <paramref name="configureEditor"/>
    /// gives its rules or bounds.
    /// </summary>
    public T AddMoneyColumn(string caption, string propertyPath, string? currency = null, string? format = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, UIDataGridAggregate aggregate = UIDataGridAggregate.None, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<NumberInputComponent>? configureEditor = null)
        => AddTypedColumn(caption, propertyPath, UIDataGridColumnKind.Money, format ?? "C", currency, null, sortable, editable, filterable, width, alignment ?? UITextAlignment.End, key, aggregate, pinned, icon, hidden, content, Typed(configureEditor));

    /// <summary>
    /// Adds a column showing the date at <paramref name="propertyPath"/>, patterned as <c>yyyy-MM-dd</c> unless given; edited in a
    /// date or date-and-time picker when <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its rules.
    /// </summary>
    public T AddDateColumn(string caption, string propertyPath, string? format = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<IInputComponent>? configureEditor = null)
        => AddTypedColumn(caption, propertyPath, UIDataGridColumnKind.Date, format ?? "yyyy-MM-dd", null, null, sortable, editable, filterable, width, alignment, key, UIDataGridAggregate.None, pinned, icon, hidden, content, Typed(configureEditor));

    /// <summary>
    /// Adds a column showing the flag at <paramref name="propertyPath"/> as a word: the two given, or the page's own yes and no; edited as a
    /// checkbox when <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its rules.
    /// </summary>
    public T AddBooleanColumn(string caption, string propertyPath, string? trueCaption = null, string? falseCaption = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<CheckboxComponent>? configureEditor = null)
    {
        IReadOnlyList<UIChoice>? choices = trueCaption is null && falseCaption is null
            ? null
            : UIChoices.Boolean(trueCaption ?? UIDataGridWords.Yes, falseCaption ?? UIDataGridWords.No);

        return AddTypedColumn(caption, propertyPath, UIDataGridColumnKind.Boolean, null, null, choices, sortable, editable, filterable, width, alignment ?? UITextAlignment.Center, key, UIDataGridAggregate.None, pinned, icon, hidden, content, Typed(configureEditor));
    }

    /// <summary>
    /// Adds a column showing the value at <paramref name="propertyPath"/> by the caption of the choice it matches; edited in a select over the
    /// same choices when <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its rules.
    /// </summary>
    public T AddEnumColumn(string caption, string propertyPath, IReadOnlyList<UIChoice> choices, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<SelectComponent>? configureEditor = null)
    {
        ArgumentNullException.ThrowIfNull(choices);

        return AddTypedColumn(caption, propertyPath, UIDataGridColumnKind.Enum, null, null, choices, sortable, editable, filterable, width, alignment, key, UIDataGridAggregate.None, pinned, icon, hidden, content, Typed(configureEditor));
    }

    /// <summary>
    /// Adds a column showing the <typeparamref name="TEnum"/> at <paramref name="propertyPath"/>: each member by its
    /// <see cref="System.ComponentModel.DescriptionAttribute"/>, or its name with the words separated.
    /// </summary>
    public T AddEnumColumn<TEnum>(string caption, string propertyPath, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<SelectComponent>? configureEditor = null)
        where TEnum : struct, Enum
        => AddEnumColumn(caption, propertyPath, UIChoices.FromEnum<TEnum>(), width, alignment, key, sortable, editable, filterable, pinned, icon, hidden, content, configureEditor);

    /// <summary>
    /// Adds a column whose cells render <paramref name="template"/> against the row, sortable by <paramref name="sortPath"/>.
    /// </summary>
    public T AddColumn(string caption, IVisualComponent template, string sortPath, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool pinned = false, string? icon = null, bool hidden = false, bool content = false)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sortPath);

        return AddColumn(new UIDataGridColumn(key ?? PropertyColumnKey(sortPath), caption, width ?? UIGridUnit.Auto(), alignment) { SortPath = sortPath, Sortable = true, Pinned = pinned, Icon = icon, Hidden = hidden, IsContent = content }, template);
    }

    /// <summary>
    /// Adds a column rendering <paramref name="template"/>, opening <paramref name="editor"/> on a double click or F2. Sortable by
    /// <paramref name="sortPath"/> when named.
    /// </summary>
    public T AddEditableColumn<TInput>(string caption, IVisualComponent template, TInput editor, string? sortPath = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool pinned = false, string? icon = null, bool hidden = false, bool content = false)
        where TInput : VisualComponentBase<TInput>, IInputComponent, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(editor);

        UIDataGridColumn column = new(key ?? (sortPath is null ? NextColumnKey() : PropertyColumnKey(sortPath)), caption, width ?? UIGridUnit.Auto(), alignment) { SortPath = sortPath, Sortable = sortPath is not null, Editable = true, EditPath = RelativeValuePath(editor), Pinned = pinned, Icon = icon, Hidden = hidden, IsContent = content };

        _ = AddColumn(column, template);

        return SetEditor(column, editor, null);
    }

    /// <summary>The row property an editor's value is bound to, relatively, as a closed cell is judged by it; null where it is bound to none.</summary>
    private static string? RelativeValuePath(IVisualComponent editor)
    {
        for (var i = 0; i < editor.Bindings.Count; i++)
        {
            UIBinding binding = editor.Bindings[i];

            if (binding.Target == IInputComponent.ValueProperty && binding.Scope == UIBindingScope.Relative)
                return binding.Source.ToString();
        }

        return null;
    }

    /// <summary>
    /// Puts a filter field for a template column, keyed by <paramref name="columnKey"/>: a text match, a number/date range, or a
    /// choice among <paramref name="choices"/> by <paramref name="kind"/>.
    /// </summary>
    public T AddFilter(string columnKey, UIDataGridColumnKind kind, IReadOnlyList<UIChoice>? choices = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(columnKey);

        for (var i = 0; i < Columns.Count; i++)
        {
            if (Columns[i] is UIDataGridColumn { EffectiveSortPath: not null } column && string.Equals(column.Key, columnKey, StringComparison.Ordinal))
            {
                ReplaceColumn(i, column with { Filterable = true, FilterKind = kind, Choices = choices ?? column.Choices });

                return SetFilter((UIDataGridColumn)Columns[i]);
            }
        }

        throw new ArgumentException($"'{TypeKey}' has no column keyed '{columnKey}' with a property to filter by.", nameof(columnKey));
    }

    /// <summary>
    /// Registers a command run after a cell's editor committed a value and the row's property took it: the row's key as <c>id</c>, the
    /// column's as <c>column</c>.
    /// </summary>
    public T OnCellEdit(string command)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(command);

        _cellEditCommand = command;

        for (var i = 0; i < _editorRegistrations.Count; i++)
            _editorRegistrations[i](command);

        return Self;
    }

    /// <summary>
    /// Registers a command run after the viewer sorted or filtered and the query reached the server.
    /// </summary>
    public T OnQueryChange(string command)
        => On(DataGridEvents.QueryChange, command);

    /// <summary>
    /// Registers a command run after the viewer changed the chosen rows and the keys reached the server.
    /// </summary>
    public T OnSelectionChange(string command)
        => On(DataGridEvents.SelectionChange, command);
}

/// <summary>
/// The table with sorting by header, typed and formatted columns, and editing in place.
/// </summary>
public sealed class DataGridComponent(string? id = null) : DataGridComponent<DataGridComponent>(id), IUIComponentDefinition
{
    /// <inheritdoc/>
    public static string ComponentTypeKey => "datagrid.grid";
}
