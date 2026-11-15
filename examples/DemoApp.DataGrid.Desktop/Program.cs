using System;

namespace DemoApp.DataGrid.Desktop;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
        => DesktopStartupBuilder.Run<DataGridDesktopStartup, DataGridAppStartup>(args);
}
