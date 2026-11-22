# Changelog — DataGrid

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.DataGrid`) and is removed from this file after the release is cut.

## 2.13.0

- **CSV surrogate-pair streaming and dictionary path segments**: `UIDataGridCsv` reuses a single stateful UTF-8 `Encoder` across `StringBuilder` chunks so surrogate pairs split across chunk boundaries encode cleanly without `U+FFFD`, and falls back to dictionary key lookup when a column path traverses `IDictionary` or `IReadOnlyDictionary<,>`.
- **Detail row DOM cache invalidation and client slot parity**: `DataGridDetailEngine` invalidates `DomRegistry` row caches when restoring expanded detail rows, and `UIClientRow` / `UITestRow` exclude collapsed `detail`, inactive `edit:*`, and hidden columns when resolving active row slots.
- Built on the framework's 2.13.0 release.
