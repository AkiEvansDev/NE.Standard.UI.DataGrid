using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NE.Standard.UI.Shell.Localization;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.DataGrid;

public static class DataGridWebExtensions
{
    private const string AssemblyName = "NE.Standard.UI.Web.DataGrid";

    /// <summary>
    /// Renders the data grid: its renderer and its cell's, the words its chrome writes, and the script and stylesheet the package
    /// embeds. Calling it twice registers nothing more.
    /// </summary>
    public static IServiceCollection AddDataGrid(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.TryAddEnumerable(ServiceDescriptor.Singleton<IWebComponentRenderer, DataGridComponentRenderer>());
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IWebComponentRenderer, DataGridCellRenderer>());
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IWebComponentRenderer, DataGridFilterRenderer>());
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IUIStringsSource, DataGridStrings>());

        return services.AddPackageClient(AssemblyName, "ui-data-grid");
    }
}
