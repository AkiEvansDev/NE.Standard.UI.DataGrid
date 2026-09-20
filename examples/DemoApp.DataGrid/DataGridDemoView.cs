using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Authoring.Views;
using NE.Standard.UI.Components.BuiltIns.Actions;
using NE.Standard.UI.Components.BuiltIns.Contents;
using NE.Standard.UI.Components.BuiltIns.Layouts;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Components.BuiltIns.Navigation;
using NE.Standard.UI.Extensions;
using NE.Standard.UI.Icons.Material;
using NE.Standard.UI.Primitives.Styling;

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

    /// <summary>The sidebar's authored id, stable across renders.</summary>
    private const string SidebarId = "datagrid-sidebar";

    private static readonly (string Route, string Label)[] Pages =
    [
        (ColumnsRoute, "Columns and editing"),
        (FiltersRoute, "Search, filters and totals"),
        (SourceRoute, "A large source")
    ];

    /// <summary>The title band and the sidebar stand; the content scrolls by itself.</summary>
    public override UIViewOptions Options { get; } = new() { StickyHeader = true, ScrollContentOnly = true };

    protected abstract string Route { get; }
    public abstract override string Title { get; }
    protected abstract string Description { get; }

    /// <summary>The page band from the preset; the theme switcher is on every page, since the theme is the framework's state.</summary>
    protected override IVisualComponent? CreateHeader()
        => UIPage.Header(Title, Description, new ThemeSwitcherComponent()
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
            .SetPadding(UIThickness.All(16, 0, 16, 24))
            .AddChild(new MenuComponent(SidebarId)
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

    /// <summary>The line under a grid that reads what the controller last noted.</summary>
    protected static TextComponent CreateStatus(string property)
        => new TextComponent()
            .BindTitle(property)
            .SetTitleType(UITextAppearance.Caption)
            .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted));
}
