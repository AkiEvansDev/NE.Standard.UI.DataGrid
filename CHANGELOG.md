# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `datagrid/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.DataGrid/releases.

## 1.8.4

- A money column's editor groups its thousands as its cell does, now that the core's number input with no format groups none (core
  #186) and the editor carries none of the column's; a number column's editor edits ungrouped, and `configureEditor` may say
  otherwise for either.
- The search box over the grid is the framework's search field (`TextInputComponent.SetSearch`, core #200): the search glyph before
  its words, as every search field and a menu's search wear it.
