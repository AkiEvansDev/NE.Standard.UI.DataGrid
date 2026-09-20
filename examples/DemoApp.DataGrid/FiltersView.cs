using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Authoring.Views;
using NE.Standard.UI.Extensions;

namespace DemoApp.DataGrid;

/// <summary>
/// What stands around the rows rather than in them: the band over the header with its search box, filters and column chooser, and
/// the footer of totals under them.
/// </summary>
internal sealed class FiltersView : DataGridDemoView, IUIViewDefinition
{
    public static string ViewKey => "datagrid.filters";

    protected override string Route => FiltersRoute;

    public override string Title => "Search, filters and totals";

    protected override string Description
        => "A hundred and twenty orders the page holds whole: sort, search and filters run in the browser, and the footer adds up what they leave.";

    protected override IVisualComponent[] CreateSections()
        =>
        [
            UIPage.Section("The filters behind a button",
                "The band over the header holds the search box, the filters button and the columns button. What is typed in the search box matches one text the row composes — the number, the customer, the country — since a query's terms are all required and cannot say \"any of\". Behind the filters button stands a captioned filter per column: a text match, a from and a to for numbers and dates, a select for enums and booleans; the count beside the word says how many hold something. The columns button shows and hides columns, and the country and the payment give way on their own on a narrower screen. The cells do not edit here — that is the first page.",
                OrderGrid.Create("orders-flyout", band: true, totals: true)
                    .BindItems(nameof(FiltersController.Orders))
                    .SetEditable(false)
                    .SetMaxHeight(UILayoutLength.Absolute(420))
            )
        ];
}
