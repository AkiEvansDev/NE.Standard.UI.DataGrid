# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `datagrid/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.DataGrid/releases.

## 1.13.0

- **Breaking:** a grid's words are phrases, so a key with arguments fits where a string did: every `Add…Column(caption, …)` and
  `UIDataGridColumn.Caption`, `AddBooleanColumn`'s true and false captions, an enum column's `UIChoice` captions, and
  `SetSearchPlaceholder` (still refusing one with no words). A string still converts as the author's text. A choice's caption that
  is a key reaches the page as its phrase, filled from its arguments there (`strings.resolve`, so the add-on needs the framework's
  1.13) and on the server; the add-on's built script changes with it. Code reading `UIDataGridColumn.Caption` or a choice's
  caption as a string reads its `Key` (the author's text where `IsText`, else the key to translate, as `Context.Translate` does).
- **Breaking:** the translators take a phrase: `UIDataGridCsvOptions.Translate` is a `Func<UIPhrase, string>` (a controller passes
  `Context.Translate`), as are `DataGridCellFormatter.Format`'s and `AsCsvFormat`'s; a caption that is a key with no translator is
  written as its key.
- A grid's events take arguments and literal values as the core's do: `OnQueryChange`/`OnSelectionChange(command, arguments)`
  and their `…Literal` forms, and `OnCellEdit(command, arguments)`/`OnCellEditLiteral`, which pass the row's key as `id` and the
  column as `column` as ever, the given ones after them.
- A grid is a control a link (a card or a surface with `SetUrl`) may not hold — its sorting captions and editors are presses —
  and the view refuses one when it compiles.
