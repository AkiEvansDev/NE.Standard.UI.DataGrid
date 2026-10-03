using System;

namespace DemoApp.DataGrid;

public sealed class DataGridAppStartup : UIStartupBase
{
    protected override void ConfigureApplication(UIApplicationBuilder application)
    {
        ArgumentNullException.ThrowIfNull(application);

        _ = application.AddLocalizationSource(DataGridDemoWords.Build());

        // The framework's and its packages' own words in the demo's other languages, as they ship.
        _ = application.AddFrameworkWords("zh-Hans");

        // Only a string starting "grid-demo." is a key: the page's prose and its data are content, so the missing-word report in
        // Development names only words the demo has not translated.
        _ = application.ConfigureLocalization(options => options.KeyPrefixes.Add(DataGridDemoWords.KeyPrefix));

        // The focus ring in the brand's ink, as on every demo: the framework's default purple read 2.3:1 on the dark page.
        _ = application.ConfigureTheme(theme => theme
            .ConfigureLightPalette(static palette => palette with { FocusRing = palette.PrimaryInk })
            .ConfigureDarkPalette(static palette => palette with { FocusRing = palette.PrimaryInk }));

        _ = application.Route<ColumnsView, ColumnsController>(DataGridDemoView.ColumnsRoute);
        _ = application.Route<FiltersView, FiltersController>(DataGridDemoView.FiltersRoute);
        _ = application.Route<SourceView, SourceController>(DataGridDemoView.SourceRoute);
    }
}
