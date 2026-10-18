# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `datagrid/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.DataGrid/releases.

## 1.11.0

- A text cell holding a date writes it as the page does (`2026-10-17T10:00:00`), not in .NET's invariant form, so a redraw in
  the browser does not change it.
