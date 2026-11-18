using System;
using DemoApp.DataGrid.Web;
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
        => DataGridWebServices.Register(services);
}
