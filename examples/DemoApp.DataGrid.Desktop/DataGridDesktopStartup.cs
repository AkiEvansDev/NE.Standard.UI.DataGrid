using System;
using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.DataGrid.Desktop;

internal sealed class DataGridDesktopStartup : DesktopStartupBase<DataGridAppStartup>
{
    protected override void ConfigureHost(DesktopHostOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        options.WindowTitle = "NE.Standard — DataGrid";
        options.InitialWidth = 1400;
        options.InitialHeight = 880;
    }

    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddStandardRenderers();
        _ = services.AddCodeInput();
        _ = services.AddDataGrid();
        _ = services.AddMaterialWebIcons(MaterialIconStyle.Outlined, [DataGridDemoView.LightIcon, DataGridDemoView.DarkIcon, DataGridDemoView.CodeIcon, DataGridDemoView.CopyIcon, .. DataGridDemoView.PageIcons]);
    }
}
