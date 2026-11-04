using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using NE.Standard.UI.Abstractions.Binding;
using NE.Standard.UI.Abstractions.Binding.Properties;
using NE.Standard.UI.Abstractions.Data;
using NE.Standard.UI.Abstractions.Interaction;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Abstractions.Recursive;
using NE.Standard.UI.Abstractions.Styling;
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
using NE.Standard.UI.Primitives.Interaction;
using NE.Standard.UI.Primitives.Items;
using NE.Standard.UI.Primitives.Localization;
using NE.Standard.UI.Primitives.Styling;

namespace NE.Standard.UI.DataGrid;

/// <summary>
/// A <see cref="TableComponent{T}"/> with sorting by header, typed and formatted columns, and editing in place.
/// </summary>
public abstract partial class DataGridComponent<T> : TableComponent<T>, IPressablePartsComponent, IItemsQueryTermsComponent
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

    /// <summary>The region the pager stands in, under the rows of a windowed grid that pages.</summary>
    public const string PagerRegionName = "pager";

    // What each filter kind writes (`data-grid-filter-engine.ts`, `createTerm`): a text match, a range's two ends, a date's day after, a choice.
    private static readonly UIComparisonOperator[] TextFilterOperators = [UIComparisonOperator.LikeIgnoreCase];
    private static readonly UIComparisonOperator[] RangeFilterOperators = [UIComparisonOperator.GreaterOrEqual, UIComparisonOperator.LessOrEqual];
    private static readonly UIComparisonOperator[] DateFilterOperators = [UIComparisonOperator.GreaterOrEqual, UIComparisonOperator.Less, UIComparisonOperator.LessOrEqual];
    private static readonly UIComparisonOperator[] ChoiceFilterOperators = [UIComparisonOperator.Equal];

    // Every editor registers the cell-edit command when it is added, or when the command is named later, whichever comes second.
    private readonly List<Action<string, KeyValuePair<string, UIActionArgument>[]>> _editorRegistrations = [];
    private string? _cellEditCommand;
    private KeyValuePair<string, UIActionArgument>[] _cellEditArguments = [];

    // Each editor's Enabled, written from the grid's Editable as the view compiles: the client alone would let a forged edit through.
    private readonly List<Action<bool?, UIBinding?>> _editorGates = [];

    // Built with the grid, so it may be configured before the grid pages; it joins the regions once the grid is windowed and pages.
    private readonly PagerComponent _pager;

    // Built with the grid: the search box is a standard part of every grid, matching all columns unless SetSearch narrows it to one.
    private readonly TextInputComponent _searchField;
    private readonly DataGridFilterComponent _searchFilter;
    private UIPhrase _searchPlaceholder = UIDataGridWords.Search;

    /// <summary>Initializes the grid.</summary>
    protected DataGridComponent(string? id = null) : base(id)
    {
        _pager = new PagerComponent().SetTarget(Id);
        _searchField = new TextInputComponent().SetSearch(_searchPlaceholder).SetShowFocusEdge(false).SetDebounceMilliseconds(300);
        _searchFilter = new DataGridFilterComponent().SetKind(UIDataGridColumnKind.Text).AddChild(_searchField);
        SetRegion(SearchRegionName, _searchFilter);
    }

    /// <inheritdoc/>
    /// <remarks>
    /// Read when the view compiles, ahead of the rows' templates, once <c>BindSource</c>, <c>SetPaging</c> and <c>Editable</c> have all
    /// been said, in whichever order.
    /// </remarks>
    public override IReadOnlyDictionary<string, IVisualComponent> Regions
    {
        get
        {
            SetRegion(PagerRegionName, Pages() ? _pager : null);
            CloseEditors();

            return base.Regions;
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

    /// <summary>
    /// Every editor's <c>Enabled</c> closed by the grid's <c>Editable</c>, static or bound, as well as by its own, so the server refuses a
    /// forged edit and its cell-edit command as it refuses any closed field's.
    /// </summary>
    /// <exception cref="InvalidOperationException">An editor binds its own <c>Enabled</c> while <c>Editable</c> is off or bound.</exception>
    private void CloseEditors()
    {
        UIBinding? bound = null;

        for (var i = 0; i < Bindings.Count; i++)
        {
            if (Bindings[i].Target.Equals(EditableProperty))
                bound = Bindings[i];
        }

        for (var i = 0; i < _editorGates.Count; i++)
            _editorGates[i](Editable, bound);
    }

    /// <inheritdoc/>
    /// <remarks>
    /// The filterable columns' and the search box's properties, by the operators the grid's filters write, and the sortable columns'
    /// properties: what a windowed grid's viewer may ask its source for past the grid's own <c>ItemsView</c>. Render-time only.
    /// </remarks>
    [UIComponentProperty(Contract = typeof(IItemsQueryTermsComponent), IsBindable = false, GenerateSetter = false, DefaultValue = null)]
    public UIItemsQueryTerms? QueryTerms
    {
        get
        {
            List<KeyValuePair<string, IEnumerable<UIComparisonOperator>>> filters = [];
            List<string> sorts = [];

            if (SearchPath is { } search)
                filters.Add(new KeyValuePair<string, IEnumerable<UIComparisonOperator>>(search, TextFilterOperators));

            for (var i = 0; i < Columns.Count; i++)
            {
                if (Columns[i] is not UIDataGridColumn column)
                    continue;

                if (column.Filterable)
                    filters.Add(new KeyValuePair<string, IEnumerable<UIComparisonOperator>>(column.EffectiveSortPath ?? column.Key, FilterOperatorsOf(column.FilterKind)));

                if (column.Sortable && column.EffectiveSortPath is { } sort)
                    sorts.Add(sort);
            }

            return new UIItemsQueryTerms(filters, sorts, allowSearch: SearchPath is null);
        }
    }

    private static UIComparisonOperator[] FilterOperatorsOf(UIDataGridColumnKind kind)
        => kind switch
        {
            UIDataGridColumnKind.Number or UIDataGridColumnKind.Money => RangeFilterOperators,
            UIDataGridColumnKind.Date => DateFilterOperators,
            UIDataGridColumnKind.Boolean or UIDataGridColumnKind.Enum => ChoiceFilterOperators,
            _ => TextFilterOperators
        };

    /// <summary>
    /// Gets or sets whether editable cells open their editors; off, a double click opens the row as on any other cell.
    /// </summary>
    [UIComponentProperty(DefaultValue = true)]
    public bool? Editable { get; set; }

    /// <summary>
    /// Gets whether the band holds a column chooser, whose choices persist in the browser; set by <c>SetColumnChooser</c>. Render-time only.
    /// </summary>
    [UIComponentProperty(DefaultValue = false, IsBindable = false, GenerateSetter = false)]
    public bool? ColumnChooser { get; private set; }

    /// <summary>
    /// Gets or sets whether a click anywhere on a row opens its detail, beside the chevron of a detail column. Render-time only.
    /// </summary>
    [UIComponentProperty(DefaultValue = false, IsBindable = false)]
    public bool? ExpandOnClick { get; set; }

    /// <summary>
    /// Gets or sets whether several rows may stand open at once; off, opening one closes the row that was open. Render-time only.
    /// </summary>
    [UIComponentProperty(DefaultValue = false, IsBindable = false)]
    public bool? MultipleDetails { get; set; }

    /// <summary>
    /// Gets the single row property the search box is narrowed to by <see cref="SetSearch(string)"/>; null searches across the grid's columns. Render-time only.
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
            entries.Add(new MenuItem { Id = column.Key, Title = ChooserTitleOf(column), Icon = column.Icon, IconColor = column.IconColor, Kind = UIMenuItemKind.Check, Checked = !column.Hidden, IsContent = column.Caption is { IsText: true } && column.HasCaption && IsContentCaption(column) });
        }

        SetRegion(ColumnsRegionName, new MenuComponent().SetOrientation(UIOrientation.Vertical).SetItems(entries));
    }

    /// <summary>
    /// A column's name in the chooser: its caption, the grid's own word for the detail chevron's column, else the name the sort and a
    /// CSV call it by.
    /// </summary>
    private static UIPhrase ChooserTitleOf(UITableColumn column)
    {
        if (column.HasCaption && column.Caption is { } caption)
            return caption;

        return column switch
        {
            UIDataGridColumn { DetailToggle: true } => UIDataGridWords.Details,
            UIDataGridColumn typed => typed.FallbackCaption,
            _ => column.Key
        };
    }

    /// <summary>Whether a column's caption is shown as written: the column says so, or the grid said it of all its columns.</summary>
    private bool IsContentCaption(UITableColumn column)
        => column.IsContent || IsContent(ColumnsProperty);

    /// <summary>Every column, whatever verb added it: the table's own key is refused, and the chooser keeps its entries level with them.</summary>
    protected override T AddColumn(UITableColumn column, IVisualComponent template)
    {
        ArgumentNullException.ThrowIfNull(column);

        // An unpinned detail column added first pins itself once pinned columns follow it, so pinned columns still lead together.
        if (column.Pinned && Columns.Count == 1 && Columns[0] is UIDataGridColumn { DetailToggle: true, Pinned: false } detail)
            base.ReplaceColumn(0, detail with { Pinned = true });

        if (IsContent(ColumnsProperty) && !column.IsContent && column.HasCaption && column.Caption is { IsText: true })
            column = column with { IsContent = true };

        T self = base.AddColumn(column, template);

        ReadsColumn(column);

        if (ColumnChooser == true)
            RefreshChooser();

        return self;
    }

    /// <summary>
    /// The row properties a column reads past its template — its sort, its filter, its total, its editor's — which the grid's client
    /// reads off a row raw, so each row carries them and nothing the grid names nowhere.
    /// </summary>
    private void ReadsColumn(UITableColumn column)
    {
        if (column is not UIDataGridColumn typed)
            return;

        if (typed.PropertyPath is { } property)
            _ = AddItemReads(property);

        if (typed.SortPath is { } sort)
            _ = AddItemReads(sort);

        if (typed.EditPath is { } edit)
            _ = AddItemReads(edit);

        // A filter and a total over a column with no property read the row's value under the column's key.
        if (typed.EffectiveSortPath is null && (typed.Filterable || typed.Aggregate != UIDataGridAggregate.None))
            _ = AddItemReads(typed.Key);
    }

    /// <summary>A column changed after it was added — hidden, given an icon, made filterable — and the chooser's entry with it.</summary>
    protected override void ReplaceColumn(int index, UITableColumn column)
    {
        base.ReplaceColumn(index, column);

        ReadsColumn(column);

        if (ColumnChooser == true)
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

        for (var i = 0; i < Columns.Count; i++)
        {
            UITableColumn current = Columns[i];

            if (!current.IsContent && current.HasCaption && current.Caption is { IsText: true })
                base.ReplaceColumn(i, current with { IsContent = true });

            if (Columns[i] is UIDataGridColumn { Filterable: true } column && TryGetRegion(column.FilterRegionName, out IVisualComponent? region) && region is DataGridFilterComponent filter)
                _ = filter.AsContent(DataGridFilterComponent.TitleProperty);
        }

        if (ColumnChooser == true)
            RefreshChooser();

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
    public T SetSearch<TRow>(Expression<Func<TRow, object?>> propertyPath)
        => SetSearch(RecursivePath.FromExpression(propertyPath).ToString());

    /// <summary>
    /// Narrows the grid's built-in search box to <paramref name="propertyPath"/> as case-insensitive text; without this call, search matches across the grid's columns.
    /// </summary>
    public T SetSearch(string propertyPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(propertyPath);

        SearchPath = propertyPath;
        _ = AddItemReads(propertyPath);
        _ = _searchFilter.SetProperty(propertyPath);

        return Self;
    }

    /// <summary>
    /// Sets the search box's placeholder in place of the grid's own word, before or after <see cref="SetSearch"/>; a string is the
    /// author's text, a key with arguments a phrase.
    /// </summary>
    public T SetSearchPlaceholder(UIPhrase text)
    {
        ArgumentNullException.ThrowIfNull(text);

        if (!UIPhrase.HasWords(text))
            throw new ArgumentException("A placeholder needs words.", nameof(text));

        _searchPlaceholder = text;
        _ = _searchField.SetPlaceholder(text);

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
        UIDataGridColumn column = new(DetailTemplateKey, null, width ?? UIGridUnit.Absolute(36), UITextAlignment.Center) { DetailToggle = true, Fixed = true, Pinned = pinned };

        // The tooltip is what names an icon-only button for a reader who cannot see the chevron.
        return AddColumn(column, new ButtonComponent().SetIcon(UIGlyphs.ChevronRight).SetVariant(UIButtonVariant.Ghost).SetSize(UISize.Small).SetTooltip(UIDataGridWords.Details));
    }

    /// <summary>
    /// Adds a column showing the row's text at <paramref name="propertyPath"/>, sortable by it.
    /// </summary>
    public override T AddTextColumn(UIPhrase caption, string propertyPath, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool pinned = false, string? icon = null, bool hidden = false, bool content = false)
        => AddTextColumn(caption, propertyPath, sortable: true, width, alignment, key, pinned: pinned, icon: icon, hidden: hidden, content: content);

    /// <summary>
    /// Adds a column showing the row's text at <paramref name="propertyPath"/>, sortable by it unless told otherwise, edited in a text field when
    /// <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its rules (<c>Validate</c>, <c>Required</c>, <c>Regex</c>).
    /// </summary>
    public T AddTextColumn<TRow>(UIPhrase caption, Expression<Func<TRow, object?>> propertyPath, bool sortable, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool editable = false, bool filterable = false, UIDataGridAggregate aggregate = UIDataGridAggregate.None, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<TextInputComponent>? configureEditor = null)
        => AddTextColumn(caption, RecursivePath.FromExpression(propertyPath).ToString(), sortable, width, alignment, key, editable, filterable, aggregate, pinned, icon, hidden, content, configureEditor);

    /// <summary>
    /// Adds a column showing the row's text at <paramref name="propertyPath"/>, sortable by it unless told otherwise, edited in a text field when
    /// <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its rules (<c>Validate</c>, <c>Required</c>, <c>Regex</c>).
    /// </summary>
    public T AddTextColumn(UIPhrase caption, string propertyPath, bool sortable, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool editable = false, bool filterable = false, UIDataGridAggregate aggregate = UIDataGridAggregate.None, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<TextInputComponent>? configureEditor = null)
    {
        UIDataGridColumn column = CreateColumn(caption, propertyPath, UIDataGridColumnKind.Text, sortable, editable, filterable, width, alignment, key, pinned, aggregate, icon, hidden, content, configureEditor is not null);

        _ = AddColumn(column, CreateTextCell(propertyPath, alignment));

        if (filterable)
            _ = SetFilter(column);

        return editable ? SetEditor(column, Configured(new TextInputComponent(), Typed(configureEditor)), propertyPath) : Self;
    }

    private UIDataGridColumn CreateColumn(UIPhrase caption, string propertyPath, UIDataGridColumnKind kind, bool sortable, bool editable, bool filterable, UIGridUnit? width, UITextAlignment? alignment, string? key, bool pinned, UIDataGridAggregate aggregate, string? icon, bool hidden, bool content, bool configured)
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
            .SetTitle(column.HasCaption ? column.Caption : column.FallbackCaption);

        if (IsContentCaption(column))
            _ = filter.AsContent(DataGridFilterComponent.TitleProperty);

        // Every filter field clears by its own cross; a date's placeholder is the format it is typed in, so it takes no word.
        _ = column.FilterKind switch
        {
            UIDataGridColumnKind.Number or UIDataGridColumnKind.Money => filter
                .AddChild(new NumberInputComponent().SetSize(UISize.Small).SetPlaceholder(UIDataGridWords.From).SetAccessibleName(UIDataGridWords.From).SetShowClearButton())
                .AddChild(new NumberInputComponent().SetSize(UISize.Small).SetPlaceholder(UIDataGridWords.To).SetAccessibleName(UIDataGridWords.To).SetShowClearButton()),
            UIDataGridColumnKind.Date => filter
                .AddChild(new DateInputComponent().SetSize(UISize.Small).SetAccessibleName(UIDataGridWords.From).SetShowClearButton())
                .AddChild(new DateInputComponent().SetSize(UISize.Small).SetAccessibleName(UIDataGridWords.To).SetShowClearButton()),
            UIDataGridColumnKind.Boolean => filter.AddChild(new SelectComponent()
                .SetSize(UISize.Small)
                .SetOptions(CreateOptions(column.Choices ?? UIChoices.Boolean(UIDataGridWords.Yes, UIDataGridWords.No)))
                .SetPlaceholder(UIDataGridWords.Any)
                .SetAccessibleName(UIDataGridWords.Any)
                .SetShowClearButton()
            ),
            UIDataGridColumnKind.Enum => filter.AddChild(new SelectComponent()
                .SetSize(UISize.Small)
                .SetOptions(CreateOptions(column.Choices))
                .SetPlaceholder(UIDataGridWords.Any)
                .SetAccessibleName(UIDataGridWords.Any)
                .SetShowClearButton()
            ),
            _ => filter.AddChild(new TextInputComponent().SetSize(UISize.Small).SetPlaceholder(UIDataGridWords.Filter).SetAccessibleName(UIDataGridWords.Filter).SetShowClearButton().SetDebounceMilliseconds(300))
        };

        SetRegion(column.FilterRegionName, filter);

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

        void Register(string command, KeyValuePair<string, UIActionArgument>[] arguments)
        {
            _ = editor.On(DataGridEvents.CellEdit, command, [UIAction.Offered(UIAction.ArgCurrentItemKey(RowArgumentName)), UIAction.Offered(UIAction.Arg(ColumnArgumentName, column.Key)), .. arguments]);
        }

        _editorRegistrations.Add(Register);

        if (_cellEditCommand is not null)
            Register(_cellEditCommand, _cellEditArguments);

        // The Enabled the author gave the editor, put back once a static Editable turns on again; the editor is open only where both
        // the grid's Editable and its own Enabled leave it so.
        var authored = editor.Enabled;
        var closed = false;
        var boundByGrid = false;

        void Gate(bool? editable, UIBinding? bound)
        {
            if (bound is null && editable != false)
            {
                if (closed)
                {
                    closed = false;
                    editor.Enabled = authored;
                }

                return;
            }

            // One Enabled holds one binding, and a binding outweighs a static false: the server would hold only one of the two.
            if (!boundByGrid && BindsEnabled(editor))
                throw new InvalidOperationException($"'{TypeKey}' column '{column.Key}': its editor binds its own Enabled while the grid's Editable is {(bound is null ? "off" : "bound")}, and the server can hold only one of the two; bind one of them.");

            if (!closed)
                authored = editor.Enabled;

            closed = true;

            // An editor its author closed stays closed whatever the grid's Editable reads.
            if (bound is { } binding && authored != false)
            {
                _ = editor.Bind(IVisualComponent.EnabledProperty, binding.Source, EditorScope(binding.Scope), UIBindingMode.OneWay, binding.Optional);
                boundByGrid = true;
            }
            else
            {
                editor.Enabled = false;
            }
        }

        _editorGates.Add(Gate);

        return SetTemplateVariantCore(column.EditTemplateKey, editor);
    }

    private static bool BindsEnabled(IVisualComponent editor)
    {
        for (var i = 0; i < editor.Bindings.Count; i++)
        {
            if (editor.Bindings[i].Target == IVisualComponent.EnabledProperty)
                return true;
        }

        return false;
    }

    /// <summary>
    /// Where an editor, the root of a row's variant, reads the path the grid's <c>Editable</c> is bound to: the controller's root
    /// as it stands, and the grid's own context one scope out of the row.
    /// </summary>
    private UIBindingScope EditorScope(UIBindingScope scope)
        => scope switch
        {
            UIBindingScope.Root => UIBindingScope.Root,
            UIBindingScope.Relative => UIBindingScope.Parent,
            _ => throw new InvalidOperationException($"'{TypeKey}' binds Editable in the scope around its own, which no editor in its rows can reach; bind it from the root or the grid's own context.")
        };

    /// <summary>
    /// Adds a column showing the number at <paramref name="propertyPath"/>, formatted as <c>N2</c> unless given, end-aligned and
    /// sorted numerically; edited in a number field when <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its
    /// rules (<c>Validate</c>, <c>Required</c>) or bounds.
    /// </summary>
    public T AddNumberColumn<TRow>(UIPhrase caption, Expression<Func<TRow, object?>> propertyPath, string? format = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, UIDataGridAggregate aggregate = UIDataGridAggregate.None, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<NumberInputComponent>? configureEditor = null)
        => AddNumberColumn(caption, RecursivePath.FromExpression(propertyPath).ToString(), format, width, alignment, key, sortable, editable, filterable, aggregate, pinned, icon, hidden, content, configureEditor);

    /// <summary>
    /// Adds a column showing the number at <paramref name="propertyPath"/>, formatted as <c>N2</c> unless given, end-aligned and
    /// sorted numerically; edited in a number field when <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its
    /// rules (<c>Validate</c>, <c>Required</c>) or bounds.
    /// </summary>
    public T AddNumberColumn(UIPhrase caption, string propertyPath, string? format = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, UIDataGridAggregate aggregate = UIDataGridAggregate.None, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<NumberInputComponent>? configureEditor = null)
        => AddTypedColumn(caption, propertyPath, UIDataGridColumnKind.Number, format ?? "N2", null, null, sortable, editable, filterable, width, alignment ?? UITextAlignment.End, key, aggregate, pinned, icon, hidden, content, Typed(configureEditor));

    private T AddTypedColumn(UIPhrase caption, string propertyPath, UIDataGridColumnKind kind, string? format, string? currency, IReadOnlyList<UIChoice>? choices, bool sortable, bool editable, bool filterable, UIGridUnit? width, UITextAlignment? alignment, string? key, UIDataGridAggregate aggregate, bool pinned, string? icon, bool hidden, bool content, Action<IInputComponent>? configureEditor)
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
            UIDataGridColumnKind.Number => SetEditor(column, Configured(new NumberInputComponent(), configureEditor), propertyPath),
            // The editor carries no format of the column's, so it would group nothing: money is told to, as its cell does.
            UIDataGridColumnKind.Money => SetEditor(column, Configured(new NumberInputComponent().SetAllowThousandsSeparator(), configureEditor), propertyPath),
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
    public T AddMoneyColumn<TRow>(UIPhrase caption, Expression<Func<TRow, object?>> propertyPath, string? currency = null, string? format = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, UIDataGridAggregate aggregate = UIDataGridAggregate.None, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<NumberInputComponent>? configureEditor = null)
        => AddMoneyColumn(caption, RecursivePath.FromExpression(propertyPath).ToString(), currency, format, width, alignment, key, sortable, editable, filterable, aggregate, pinned, icon, hidden, content, configureEditor);

    /// <summary>
    /// Adds a column showing the amount at <paramref name="propertyPath"/> as money, in the page's currency format or
    /// <paramref name="currency"/>; edited in a number field when <paramref name="editable"/>, which <paramref name="configureEditor"/>
    /// gives its rules or bounds.
    /// </summary>
    public T AddMoneyColumn(UIPhrase caption, string propertyPath, string? currency = null, string? format = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, UIDataGridAggregate aggregate = UIDataGridAggregate.None, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<NumberInputComponent>? configureEditor = null)
        => AddTypedColumn(caption, propertyPath, UIDataGridColumnKind.Money, format ?? "C", currency, null, sortable, editable, filterable, width, alignment ?? UITextAlignment.End, key, aggregate, pinned, icon, hidden, content, Typed(configureEditor));

    /// <summary>
    /// Adds a column showing the date at <paramref name="propertyPath"/>, patterned as <c>yyyy-MM-dd</c> unless given; edited in a
    /// date or date-and-time picker when <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its rules.
    /// </summary>
    public T AddDateColumn<TRow>(UIPhrase caption, Expression<Func<TRow, object?>> propertyPath, string? format = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<IInputComponent>? configureEditor = null)
        => AddDateColumn(caption, RecursivePath.FromExpression(propertyPath).ToString(), format, width, alignment, key, sortable, editable, filterable, pinned, icon, hidden, content, configureEditor);

    /// <summary>
    /// Adds a column showing the date at <paramref name="propertyPath"/>, patterned as <c>yyyy-MM-dd</c> unless given; edited in a
    /// date or date-and-time picker when <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its rules.
    /// </summary>
    public T AddDateColumn(UIPhrase caption, string propertyPath, string? format = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<IInputComponent>? configureEditor = null)
        => AddTypedColumn(caption, propertyPath, UIDataGridColumnKind.Date, format ?? "yyyy-MM-dd", null, null, sortable, editable, filterable, width, alignment, key, UIDataGridAggregate.None, pinned, icon, hidden, content, Typed(configureEditor));

    /// <summary>
    /// Adds a column showing the flag at <paramref name="propertyPath"/> as a word: the two given, or the page's own yes and no; edited as a
    /// checkbox when <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its rules.
    /// </summary>
    public T AddBooleanColumn<TRow>(UIPhrase caption, Expression<Func<TRow, object?>> propertyPath, UIPhrase? trueCaption = null, UIPhrase? falseCaption = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<CheckboxComponent>? configureEditor = null)
        => AddBooleanColumn(caption, RecursivePath.FromExpression(propertyPath).ToString(), trueCaption, falseCaption, width, alignment, key, sortable, editable, filterable, pinned, icon, hidden, content, configureEditor);

    /// <summary>
    /// Adds a column showing the flag at <paramref name="propertyPath"/> as a word: the two given, or the page's own yes and no; edited as a
    /// checkbox when <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its rules.
    /// </summary>
    public T AddBooleanColumn(UIPhrase caption, string propertyPath, UIPhrase? trueCaption = null, UIPhrase? falseCaption = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<CheckboxComponent>? configureEditor = null)
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
    public T AddEnumColumn<TRow>(UIPhrase caption, Expression<Func<TRow, object?>> propertyPath, IReadOnlyList<UIChoice> choices, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<SelectComponent>? configureEditor = null)
        => AddEnumColumn(caption, RecursivePath.FromExpression(propertyPath).ToString(), choices, width, alignment, key, sortable, editable, filterable, pinned, icon, hidden, content, configureEditor);

    /// <summary>
    /// Adds a column showing the value at <paramref name="propertyPath"/> by the caption of the choice it matches; edited in a select over the
    /// same choices when <paramref name="editable"/>, which <paramref name="configureEditor"/> gives its rules.
    /// </summary>
    public T AddEnumColumn(UIPhrase caption, string propertyPath, IReadOnlyList<UIChoice> choices, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<SelectComponent>? configureEditor = null)
    {
        ArgumentNullException.ThrowIfNull(choices);

        return AddTypedColumn(caption, propertyPath, UIDataGridColumnKind.Enum, null, null, choices, sortable, editable, filterable, width, alignment, key, UIDataGridAggregate.None, pinned, icon, hidden, content, Typed(configureEditor));
    }

    /// <summary>
    /// Adds a column showing the <typeparamref name="TEnum"/> at <paramref name="propertyPath"/>: each member by its
    /// <see cref="System.ComponentModel.DescriptionAttribute"/>, or its name with the words separated.
    /// </summary>
    public T AddEnumColumn<TRow, TEnum>(UIPhrase caption, Expression<Func<TRow, TEnum>> propertyPath, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<SelectComponent>? configureEditor = null)
        where TEnum : struct, Enum
        => AddEnumColumn<TEnum>(caption, RecursivePath.FromExpression(propertyPath).ToString(), width, alignment, key, sortable, editable, filterable, pinned, icon, hidden, content, configureEditor);

    /// <summary>
    /// Adds a column showing the <typeparamref name="TEnum"/> at <paramref name="propertyPath"/>: each member by its
    /// <see cref="System.ComponentModel.DescriptionAttribute"/>, or its name with the words separated.
    /// </summary>
    public T AddEnumColumn<TEnum>(UIPhrase caption, string propertyPath, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool sortable = true, bool editable = false, bool filterable = false, bool pinned = false, string? icon = null, bool hidden = false, bool content = false, Action<SelectComponent>? configureEditor = null)
        where TEnum : struct, Enum
        => AddEnumColumn(caption, propertyPath, UIChoices.FromEnum<TEnum>(), width, alignment, key, sortable, editable, filterable, pinned, icon, hidden, content, configureEditor);

    /// <summary>
    /// Adds a column whose cells render <paramref name="template"/> against the row, sortable by <paramref name="sortPath"/>.
    /// </summary>
    public T AddColumn<TRow>(UIPhrase caption, IVisualComponent template, Expression<Func<TRow, object?>> sortPath, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool pinned = false, string? icon = null, bool hidden = false, bool content = false)
        => AddColumn(caption, template, RecursivePath.FromExpression(sortPath).ToString(), width, alignment, key, pinned, icon, hidden, content);

    /// <summary>
    /// Adds a column whose cells render <paramref name="template"/> against the row, sortable by <paramref name="sortPath"/>.
    /// </summary>
    public T AddColumn(UIPhrase caption, IVisualComponent template, string sortPath, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool pinned = false, string? icon = null, bool hidden = false, bool content = false)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(sortPath);

        return AddColumn(new UIDataGridColumn(key ?? PropertyColumnKey(sortPath), caption, width ?? UIGridUnit.Auto(), alignment) { SortPath = sortPath, Sortable = true, Pinned = pinned, Icon = icon, Hidden = hidden, IsContent = content }, template);
    }

    /// <summary>
    /// Adds a column rendering <paramref name="template"/>, opening <paramref name="editor"/> on a double click or F2, sortable by <paramref name="sortPath"/>.
    /// </summary>
    public T AddEditableColumn<TRow, TInput>(UIPhrase caption, IVisualComponent template, TInput editor, Expression<Func<TRow, object?>> sortPath, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool pinned = false, string? icon = null, bool hidden = false, bool content = false)
        where TInput : VisualComponentBase<TInput>, IInputComponent, IUIComponentDefinition
        => AddEditableColumn(caption, template, editor, RecursivePath.FromExpression(sortPath).ToString(), width, alignment, key, pinned, icon, hidden, content);

    /// <summary>
    /// Adds a column rendering <paramref name="template"/>, opening <paramref name="editor"/> on a double click or F2. Sortable by
    /// <paramref name="sortPath"/> when named.
    /// </summary>
    public T AddEditableColumn<TInput>(UIPhrase caption, IVisualComponent template, TInput editor, string? sortPath = null, UIGridUnit? width = null, UITextAlignment? alignment = null, string? key = null, bool pinned = false, string? icon = null, bool hidden = false, bool content = false)
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
    /// Puts a filter field for a template column, keyed by <paramref name="propertyPath"/>: a text match, a number/date range, or a
    /// choice among <paramref name="choices"/> by <paramref name="kind"/>.
    /// </summary>
    public T AddFilter<TRow>(Expression<Func<TRow, object?>> propertyPath, UIDataGridColumnKind kind, IReadOnlyList<UIChoice>? choices = null)
        => AddFilter(RecursivePath.FromExpression(propertyPath).ToString(), kind, choices);

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
        => OnCellEdit(command, []);

    /// <summary>
    /// Registers a command run after a cell's editor committed a value, with the row's key as <c>id</c> and the column's as
    /// <c>column</c> as ever — the edit says which cell, which no argument of the grid's could — and these arguments after them.
    /// </summary>
    public T OnCellEdit(string command, params KeyValuePair<string, UIActionArgument>[] arguments)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(command);
        ArgumentNullException.ThrowIfNull(arguments);

        _cellEditCommand = command;
        _cellEditArguments = arguments;

        for (var i = 0; i < _editorRegistrations.Count; i++)
            _editorRegistrations[i](command, arguments);

        return Self;
    }

    /// <summary>
    /// Registers a command run after a cell's editor committed a value, with the row's key and the column's as ever and these literal
    /// values after them.
    /// </summary>
    public T OnCellEditLiteral(string command, params KeyValuePair<string, object?>[] arguments)
        => OnCellEdit(command, UIActionArgument.Literals(arguments));

    /// <summary>
    /// Registers a command run after the viewer sorted or filtered and the query reached the server.
    /// </summary>
    public T OnQueryChange(string command)
        => On(DataGridEvents.QueryChange, command);

    /// <summary>
    /// Registers a command run after the viewer sorted or filtered, with UI action arguments.
    /// </summary>
    public T OnQueryChange(string command, params KeyValuePair<string, UIActionArgument>[] arguments)
        => On(DataGridEvents.QueryChange, command, arguments);

    /// <summary>
    /// Registers a command run after the viewer sorted or filtered, with literal argument values; the query itself reaches the server
    /// first, as with every form.
    /// </summary>
    public T OnQueryChangeLiteral(string command, params KeyValuePair<string, object?>[] arguments)
        => OnLiteral(DataGridEvents.QueryChange, command, arguments);

    /// <summary>
    /// Registers a command run after the viewer changed the chosen rows and the keys reached the server.
    /// </summary>
    public T OnSelectionChange(string command)
        => On(DataGridEvents.SelectionChange, command);

    /// <summary>
    /// Registers a command run after the viewer changed the chosen rows, with UI action arguments.
    /// </summary>
    public T OnSelectionChange(string command, params KeyValuePair<string, UIActionArgument>[] arguments)
        => On(DataGridEvents.SelectionChange, command, arguments);

    /// <summary>
    /// Registers a command run after the viewer changed the chosen rows, with literal argument values; the keys reach the server first,
    /// as with every form.
    /// </summary>
    public T OnSelectionChangeLiteral(string command, params KeyValuePair<string, object?>[] arguments)
        => OnLiteral(DataGridEvents.SelectionChange, command, arguments);
}

/// <summary>
/// The table with sorting by header, typed and formatted columns, and editing in place.
/// </summary>
public sealed class DataGridComponent(string? id = null) : DataGridComponent<DataGridComponent>(id), IUIComponentDefinition
{
    /// <inheritdoc/>
    public static string ComponentTypeKey => "datagrid.grid";
}
