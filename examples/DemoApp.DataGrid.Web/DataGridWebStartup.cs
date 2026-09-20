using System;
using Microsoft.Extensions.DependencyInjection;
using NE.Standard.UI.Web.DataGrid;
using NE.Standard.UI.Web.Icons.Material;
using NE.Standard.UI.Web.Renderers.DI;
using NE.Standard.UI.Web.Startup;

namespace DemoApp.DataGrid.Web;

internal sealed class DataGridWebStartup : WebStartupBase<DataGridAppStartup>
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddStandardRenderers();
        _ = services.AddDataGrid();
        // Only the two glyphs the theme switcher wears: registering a whole Material style costs megabytes.
        _ = services.AddMaterialWebIcons(MaterialIconStyle.Outlined, DataGridDemoView.LightIcon, DataGridDemoView.DarkIcon);
    }
}
