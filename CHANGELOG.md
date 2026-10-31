# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `datagrid/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.DataGrid/releases.

## 2.1.0

- Typed `Expression<Func<TRow, object?>>` sort-path overloads on `DataGridComponent.AddColumn` and `AddEditableColumn`. Built on
  the framework's 2.1.0.
