using System;

namespace DemoApp.DataGrid;

public sealed class DataGridAppStartup : UIStartupBase
{
    protected override void ConfigureApplication(UIApplicationBuilder application)
    {
        ArgumentNullException.ThrowIfNull(application);

        _ = application.Route<ColumnsView, ColumnsController>(DataGridDemoView.ColumnsRoute);
        _ = application.Route<FiltersView, FiltersController>(DataGridDemoView.FiltersRoute);
        _ = application.Route<SourceView, SourceController>(DataGridDemoView.SourceRoute);
    }
}
