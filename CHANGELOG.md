# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `datagrid/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.DataGrid/releases.

## 1.7.2

- Enter on a row's box cell turns its box, as Space does, rather than raising the row's open; the box stands centred in its cell.
- The plugin stylesheet's `@ui-button-live` reads the client's `data-ui-popup-hover` mark rather than a `:has()`.
- The plugin stylesheet's `@ui-field-focus` and `.ui-entry-quiet()` read the client's `data-ui-focus-within` mark rather than a
  `:has()`; `.ui-entry-quiet()` goes on the list or an element below its component root.
- The plugin stylesheet's `@ui-row-live` and `.ui-row-bar()` read the rows' `data-ui-row-idle` and `data-ui-row-bar` marks rather
  than a `:has()`; `.ui-row-bar()` takes no `@bar`.
- A sortable caption's wash, a two-line cell's field box and an off box's pointer read marks, not a `:has()`: the core's
  `data-ui-inner-pointer` on a caption whose column edge has the pointer, `data-ui-grid-two-line` and `data-ui-grid-box-off`.
- **Breaking:** a column moves with Alt+Left/Right on its caption, as the core table's does; Ctrl+Left/Right no longer moves it.
- A cell editor claims its Escape (`names.ownsKeys`): in a dialog, a flyout or a drawer, Escape takes the edit back rather than
  closing what the grid stands in and committing the cell (#148).
- A committed cell no longer flashes its old value: the editor stays over it, showing the new one and taking nothing, until the
  commit's answer — the `OnCellEdit` command's, else the value's own — has written the cell.
- **Breaking:** the grid's keyboard is the framework's cell cursor: the arrows walk every cell, Home and End the row's ends,
  Ctrl+Home and Ctrl+End the first and last row. Right and Left no longer open and close the row's detail: Enter or Space on the
  chevron's cell does, and an open detail is a cell spanning the columns shown (`gridcell`, `aria-colindex`, `aria-colspan`) that
  Down reaches.
- Enter, F2 or a typed character on an editable cell opens its editor, the character replacing the value; Enter commits and
  stays on the cell, Escape takes the edit back, Tab and Shift+Tab commit and open the next or previous editable cell, past a row's
  end on the next row. Left and Right in an editor move the caret.
- The editable ground answers the pointer alone, no longer every editable cell of the keyboard's row, and no cell takes it while
  the keyboard's cell frame shows, the framed one neither: the frame alone is the cursor. A committed editor waiting for its answer
  wears the cursor's frame.
- Needs the framework's plugin contract 4.
- A choice cell's list opens on the cell's value, not its first option.
- Every cell says where its column stands, so a moved column is heard at its place.
- Enter or Space with Ctrl or Alt on a sorting caption no longer sorts; Shift still adds the column.
- The totals footer paints the ground the grid stands on, a raised card's too, not the page's (#155).
- A cell's text reads the same painted and built by the client: a number in a text column in the invariant culture (`12.5`, not
  `12,5` on a Russian page), a real past a decimal's range under its format rather than `1E+30`, a real's full digits, and a
  numeric text by the framework's invariant reading (#152).
- A number a cell writes as it stands — in a text, date or choice column, or a CSV written as the grid shows its cells — reads as
  the page writes it (`UIScriptNumber`): `1000000000000000`, `1e+21`, `1e-7`, not .NET's `1E+15` (#152).
- Safari's Enter that ends an input method's composition no longer commits a cell (#153).
- A cell's `MinWidth` and `MaxWidth` apply at every tier; the validation mark reads the framework's `@ui-validation-marked` (#153).
- On a phone (below 640 px) the grid's choice lists — a boolean or an enum column's filter, an enum cell's editor — open as the
  framework's sheet from the bottom, being its select's; the filters' and the columns' panels stay flyouts beside their buttons.
- The demo's Status column is wide enough for its longest badge, so a cancelled row no longer reads "CANCELLED BY THE CUSTO…".
