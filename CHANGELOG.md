# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `datagrid/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.DataGrid/releases.

## 2.1.1

- `UIDataGridCsv` disarms formula operators and cell delimiters carried inside custom-formatted negative number cells; client
  inline-edit and detail-row engines reset open and cancelled row state cleanly on row replacement and teardown. Built on the
  framework's 2.1.1.
