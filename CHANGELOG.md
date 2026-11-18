# Changelog — DataGrid

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.DataGrid`) and is removed from this file after the release is cut.

## 2.11.0

- `UIDataGridCsv.WriteAsync` flushes asynchronously over streaming response bodies, walks inherited properties with `DeclaredOnly` (matching `ItemContext`), and reads `IDictionary<string, object?>` rows without caching dynamic keys in `TypedReaders`.
