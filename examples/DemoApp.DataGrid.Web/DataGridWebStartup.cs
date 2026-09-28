using System;
using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.DataGrid.Web;

internal sealed class DataGridWebStartup : WebStartupBase<DataGridAppStartup>
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddStandardRenderers();
        _ = services.AddCodeInput();
        _ = services.AddDataGrid();
        // Only the glyphs the shell wears: registering a whole Material style costs megabytes.
        _ = services.AddMaterialWebIcons(MaterialIconStyle.Outlined, DataGridDemoView.LightIcon, DataGridDemoView.DarkIcon, DataGridDemoView.CodeIcon, DataGridDemoView.CopyIcon);
    }
}
