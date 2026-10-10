using System;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;

namespace DemoApp.DataGrid;

/// <summary>
/// What every page of the demo wears: the title band with the theme switcher, the sidebar naming the pages, and the page's own
/// sections under them. One page per mechanism rather than one page holding the package.
/// </summary>
public abstract class DataGridDemoView : UIViewBase
{
    public const string ColumnsRoute = "/";
    public const string FiltersRoute = "/filters";
    public const string SourceRoute = "/source";

    /// <summary>The two glyphs the theme switcher wears, which the host registers with the pack.</summary>
    public const string LightIcon = MaterialIcons.LightMode;
    public const string DarkIcon = MaterialIcons.DarkMode;

    /// <summary>The two glyphs a sample's source button and its copy button wear.</summary>
    public const string CodeIcon = MaterialIcons.Code;
    public const string CopyIcon = MaterialIcons.ContentCopy;

    /// <summary>The sidebar's authored id, stable across renders.</summary>
    private const string SidebarId = "datagrid-sidebar";

    private static readonly (string Route, string Label)[] Pages =
    [
        (ColumnsRoute, "grid-demo.page.columns"),
        (FiltersRoute, "grid-demo.page.filters"),
        (SourceRoute, "grid-demo.page.source")
    ];

    /// <summary>The title band and the sidebar stand, the sidebar from the top of the page; the content scrolls by itself.</summary>
    public override UIViewOptions Options { get; } = new() { StickyHeader = true, ScrollContentOnly = true, ShellLayout = UIShellLayout.FullHeightSides };

    protected abstract string Route { get; }
    public abstract override string Title { get; }
    protected abstract string Description { get; }

    /// <summary>The page band from the preset; the language and theme switchers are on every page, since both are the framework's state.</summary>
    protected override IVisualComponent? CreateHeader()
        => UIPage.Header(Title, Description,
            new LanguageSwitcherComponent(),
            new ThemeSwitcherComponent()
                .SetLightIcon(MaterialIcons.Outlined(LightIcon))
                .SetDarkIcon(MaterialIcons.Outlined(DarkIcon))
        );

    /// <summary>The sidebar every page wears: one entry per page, the one being read marked.</summary>
    protected override IVisualComponent? CreateLeftSide()
    {
        MenuItem[] entries = new MenuItem[Pages.Length];

        for (var i = 0; i < Pages.Length; i++)
            entries[i] = new MenuItem { Id = Pages[i].Route, Title = Pages[i].Label, Url = Pages[i].Route, Selected = Pages[i].Route == Route };

        // The width sits on the menu, not the container.
        return new ContainerComponent()
            .SetHorizontalAlignment(UIAlignment.Start)
            .SetPadding(UIThickness.All(16, 16, 16, 24))
            .AddChild(new MenuComponent(SidebarId)
                .SetShowCollapseToggle(true)
                .SetSearch()
                .SetMinWidth(UILayoutLength.Absolute(180))
                .SetItems(entries)
            );
    }

    protected override IVisualComponent CreateContent()
        => new StackPanelComponent()
            .SetOrientation(UIOrientation.Vertical)
            .SetSpacing(24)
            .SetPadding(UIThickness.All(24, 4, 24, 24))
            .AddChildren(CreateSections());

    /// <summary>The page's own content: one <see cref="UIPage.Section"/> per thing it shows.</summary>
    protected abstract IVisualComponent[] CreateSections();

    /// <summary>
    /// <see cref="UIPage.Section"/>'s shape with the <c>&lt;/&gt;</c> button beside the title, showing the source of
    /// <paramref name="content"/>.
    /// </summary>
    /// <remarks>Not the preset itself: it has no place for a control beside its title.</remarks>
    protected static StackPanelComponent Example(string title, string? description, IVisualComponent content, [CallerArgumentExpression(nameof(content))] string code = "")
    {
        // The heading and its note sit closer to each other than to the content, as the preset's do.
        StackPanelComponent heading = UILayout.Stack(4).AddChild(UIText.Title(title).SetTitleWrap(true));

        if (description is not null)
            _ = heading.AddChild(UIText.Note(description));

        // A section's title, note and sample are the author's prose and data, shown as written: content for the unkeyed report.
        return UILayout.Stack(16)
            .AsContentTree()
            .AddChild(new ContainerComponent()
                .SetRow(1, UIGridUnit.Auto())
                .SetColumn(24, UIGridUnit.Auto())
                .AddChild(heading.SetPlacement(1, 1, 23, 1))
                .AddChild(CreateCodeFlyout(code).SetPlacement(24, 1, 1, 1))
            )
            .AddChild(content);
    }

    /// <summary>
    /// The <c>&lt;/&gt;</c> button and the popup it opens: the sample's source, read-only, with a copy button.
    /// </summary>
    /// <remarks>
    /// A copy of the framework demo's own (<c>DemoUI</c>, which a sample's controller tab adds to): every demo carries its shell whole
    /// rather than share a package for it, and <c>DemoShellCopiesTests</c> holds the copies to it.
    /// </remarks>
    private static FlyoutComponent CreateCodeFlyout(string expression)
    {
        var view = FormatSource(expression);
        var rows = Math.Clamp(CountLines(view) + 1, 3, 24);

        return new FlyoutComponent()
            .SetFlyoutPlacement(UIPopupPlacement.BottomEnd)
            .SetHorizontalAlignment(UIAlignment.End)
            .SetVerticalAlignment(UIAlignment.Center)
            // Smaller than a small button's 28px, to fit the title row a group without the button has.
            .SetAnchor(new ButtonComponent()
                .SetType(UIButtonType.Ghost)
                .SetSize(UIButtonSize.Small)
                .SetMinHeight(UILayoutLength.Absolute(24))
                .SetPadding(UIThickness.Uniform(2))
                .SetIcon(MaterialIcons.Outlined(CodeIcon))
                .SetTooltip("grid-demo.code")
            )
            .SetContent(new ContainerComponent()
                .SetWidth(UILayoutLength.Absolute(640))
                .AddChild(CreateCodePane(view, rows))
            );
    }

    /// <summary>
    /// The captured argument as it would be written on its own: the first line flush left, the rest moved by as much.
    /// </summary>
    /// <remarks>
    /// The compiler hands over the text with the call site's indentation on every line but the first, so the base is found from the
    /// first line at the expression's own depth: a closing bracket stands on the base, a chained call one step (four spaces) in.
    /// </remarks>
    private static string FormatSource(string expression)
    {
        var lines = expression.Trim().Replace("\r\n", "\n", StringComparison.Ordinal).Split('\n');
        var cut = BaseIndent(lines);
        StringBuilder text = new(lines[0].TrimEnd());

        for (var i = 1; i < lines.Length; i++)
        {
            var line = lines[i].TrimEnd();
            var indent = line.Length - line.TrimStart().Length;
            _ = text.Append('\n').Append(line[Math.Min(indent, cut)..]);
        }

        return text.ToString();
    }

    private static int BaseIndent(string[] lines)
    {
        var depth = CountDepth(lines[0], 0);
        var fallback = int.MaxValue;

        for (var i = 1; i < lines.Length; i++)
        {
            var body = lines[i].TrimStart();

            if (body.Length == 0)
                continue;

            var indent = lines[i].Length - body.Length;
            var closers = 0;

            while (closers < body.Length && body[closers] is ')' or ']' or '}')
                closers++;

            if (depth - closers <= 0)
                return closers > 0 ? indent : Math.Max(0, indent - 4);

            fallback = Math.Min(fallback, indent);
            depth = CountDepth(lines[i], depth);
        }

        return fallback == int.MaxValue ? 0 : Math.Max(0, fallback - 4);
    }

    /// <summary>
    /// The bracket depth after a line, skipping string and character literals and a trailing line comment.
    /// </summary>
    private static int CountDepth(string line, int depth)
    {
        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];

            if (c is '"' or '\'')
            {
                for (i++; i < line.Length && line[i] != c; i++)
                {
                    if (line[i] == '\\')
                        i++;
                }
            }
            else if (c == '/' && i + 1 < line.Length && line[i + 1] == '/')
            {
                break;
            }
            else if (c is '(' or '[' or '{')
            {
                depth++;
            }
            else if (c is ')' or ']' or '}')
            {
                depth--;
            }
        }

        return depth;
    }

    private static int CountLines(string source)
        => source.Count(static c => c == '\n') + 1;

    /// <summary>One source in the framework's code field, read-only, with its own copy button.</summary>
    private static ContainerComponent CreateCodePane(string source, int rows)
        => new ContainerComponent()
            .AddChild(new CodeInputComponent()
                .SetLanguage(UICodeLanguages.CSharp)
                .SetValue(source)
                .SetIsReadOnly(true)
                .SetStatusBar(false)
                .SetSearch(false)
                .SetCompletions(false)
                // One row over the text's own: a long line brings a horizontal scrollbar, which would cover the last one.
                .SetRows(rows)
                .SetPlacement(1, 1, 24, 1)
            )
            // A literal rather than the field's value: the text is fixed, and a literal needs no id unique across the page.
            .AddChild(new ButtonComponent()
                .SetType(UIButtonType.Ghost)
                .SetSize(UIButtonSize.Small)
                .SetIcon(MaterialIcons.Outlined(CopyIcon))
                .SetTooltip("grid-demo.copy")
                .SetHorizontalAlignment(UIAlignment.End)
                .SetVerticalAlignment(UIAlignment.Start)
                // Clear of the text's vertical scrollbar, which runs down the same edge once the source is longer than the box.
                .SetMargin(UIThickness.All(4, 4, 16, 4))
                .InteractOn(EventNames.Click, CopyToClipboardEffect.Literal(source))
                .SetPlacement(1, 1, 24, 1)
            )
            .SetPlacement(1, 1, 24, 1);

    /// <summary>The line under a grid that reads what the controller last noted.</summary>
    protected static TextComponent CreateStatus(string property)
        => new TextComponent()
            .BindTitle(property)
            .SetTitleType(UITextAppearance.Caption)
            .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
            .SetTitleWrap(true);
}
