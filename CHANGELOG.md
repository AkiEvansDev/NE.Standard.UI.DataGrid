# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `datagrid/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.DataGrid/releases.

## 1.9.0

- A CSV disarms formulas in every text it writes — the headers and a flag's or a choice's caption too, which went out as they
  were — and a `=`, `+`, `-`, `@`, tab or carriage return after a comma, a semicolon or a tab inside a field, whatever the file's
  separator: a spreadsheet splitting at another list separator starts a cell there. Only a number's own minus stays bare.
- A NaN or an infinity is an empty cell, on the page and in a CSV with or without `Format`: the server painted its text, which
  the page's first write of the null it travels as wiped, and a CSV wrote it, disarmed.
- A number or money cell of more than fifteen significant digits is painted as the double the page holds — `9.000000000000001`
  as `9.000000000000002`, 2^53 + 1 as 2^53 —: painted in its own digits, it changed at the page's first patch or language switch.
  A CSV written through `DataGridCellFormatter.AsCsvFormat` keeps a number's own digits in every column, where a text or a
  choice column wrote an id past 2^53 rounded.
- An open editor and its draft stay while the reader scrolls a virtualized grid far from its row, and through a refill of the
  row's item, until the focus leaves: the row went out of range, and the editor and the draft with it.
- A virtualized grid's footer reads its items again only when they change, a column is hidden or shown, or the language
  switches: every batch of rows a scroll drew read all of them again.
- A grid scrolling sideways keeps its sticky totals over the table's edge shades, on their own ground.
- A grid paints and exports with less work: a culture's number and date formats are built once per culture, once per file in a
  CSV export, not per cell; a column's choices are written as JSON once per list; `UIDataGridCsv.WriteBytes` writes straight to
  bytes rather than through the whole text and a copy of it. A column, and a cell, keeps a copy of the `Choices` it is given, so a
  list changed afterwards changes no column.
