# Changelog — DataGrid

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.DataGrid`) and is removed from this file after the release is cut.

## 2.10.0

- **Streaming, unboxed `UIDataGridCsv` export**: `UIDataGridCsv.WriteAsync` writes UTF-8 CSV directly to a `Stream` over pooled `ArrayPool<byte>` / `ArrayPool<char>` buffers without boxing struct or primitive cells (`ISpanFormattable` / `IUtf8SpanFormattable`), paired with `Context.Downloads.DownloadAsync` streaming downloads.
- **Virtualized scroll mutation filtering**: `DataGrid` client skips scroll-driven row window swaps instead of rescanning grid geometry on every virtualized scroll frame.
- **Stable `NE.Standard.UI.Desktop` `2.10.0` host**: `DemoApp.DataGrid.Desktop` updated to the stable `2.10.0` desktop host.
