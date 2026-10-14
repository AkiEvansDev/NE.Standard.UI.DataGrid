# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `datagrid/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.DataGrid/releases.

## 1.8.5

- A column with no caption is named alike in its sort, the chooser and a CSV's header: the last step of what it sorts by, in words.
- A grid that leaves the page drops its open cell editor; a filter's typed number is read as the server reads one.
- **Breaking:** a CSV's header for a column with no caption is that name rather than the column's key, and a CSV exports the
  property the column sorts by (`SortPath`, the raw value behind a formatted one) ahead of its `PropertyPath`, along a dotted path.
