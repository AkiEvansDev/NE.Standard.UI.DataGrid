using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NE.Standard.UI.Shell.Localization;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.DataGrid;

/// <summary>Registers the data grid's web rendering.</summary>
public static class DataGridWebExtensions
{
    private const string AssemblyName = "NE.Standard.UI.Web.DataGrid";

    /// <summary>
    /// Registers the data grid's renderers, words, script and stylesheet; a second call registers nothing more.
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
