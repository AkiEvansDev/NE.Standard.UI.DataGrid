using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.DataGrid.Web;

internal sealed class DataGridWebStartup : WebStartupBase<DataGridAppStartup>
{
    protected override void ConfigureServices(IServiceCollection services)
        => DataGridWebServices.Register(services);
}
