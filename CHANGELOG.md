# Changelog — DataGrid

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.DataGrid`) and is removed from this file after the release is cut.

## 2.7.0

- **Breaking:** targets `.NET 11` (`net11.0`; building requires the `.NET 11` SDK).
- Recomputed `DataGridTotalsEngine` footer totals when virtualized row windows update (`data-ui-items-version`), reduced totals pass overhead with a bounded 256-entry null-prototype choice map cache, single-pass row collection, and lazy culture resolution, and added a `1 px` vertical divider between the search input and trailing filter/column buttons in `.ui-data-grid__band` alongside the updated `checklist` columns icon.
- Built on the framework's 2.7.0 release.
