# Changelog

One section per release of this slice, headed `## X.Y.Z` and named by the tag — `datagrid/vX.Y.Z`. The release
workflow cuts the matching section out to become the body of the GitHub release, and a tag with no section
fails the release before anything is published.

## 1.4.1

- **Built on the framework's 1.4.1.** Nothing of this package's own changed; it moves with the framework.

## 1.4.0

- **Escape takes a cell's edit back, whatever opened the editor.** Chromium raises a `change` from a field that held the focus
  with an edit as its editor leaves the page; after a real double click that change sent the very value Escape was taking back
  (a number cell, after an Enter commit on it). The grid stops that change: the close has already said what the edit becomes.
- **Tab moves on from a select's or a search's open list** to the next editable cell, committing what the field holds, as from
  a closed field; it left the grid. Tab inside a popup that is not a list (a date picker's) stays the popup's.
- **An untouched select cell commits nothing.** Its value was read before the select's engine had filled it from its markup, so
  Enter or Tab on a select nobody changed sent its value again and raised `OnCellEdit` ("Status is now Trial").
- **An editor opened past the grid's edge scrolls into the box.** A grid wider than its box scrolls sideways (the framework's
  table now does by default); the editor Tab or F2 opens off screen is brought in, clear of the pinned columns, where the focus
  alone scrolled nothing. The demo's comment on column floors says the grids scroll, not clip.
- **The filters' flyout fits a phone.** Its panel is capped at the window less the popup's margins, padding and edge; a range's
  two fields side by side ran it flush to the window's right edge.
- **New:** `UIDataGridWords`, the keys of the words the grid's own controls carry — public, as Graph's `UIGraphWords` and
  CodeInput's `UICodeInputStrings`; `DataGridStrings` takes its keys from it.
- **A search as a cell's editor is the framework's new search:** the cell's field shows the row's value as a select does, the
  editor opens with the list and the keyboard in the search field pinned at its top, and a pick puts the keyboard back on the
  field, where Enter commits, Escape takes the edit back and Tab moves to the next cell, as on a select's cell. The demo's
  customer column drops `SetSelectionDisplayMode`, which the framework no longer has.
- **A sortable caption's press shows on a touch screen.** Its pressed wash, and its forced-colours mark, asked for a hovering
  pointer too; they answer the press alone, still not a press on the column's resize edge.
- **The cell editor's field is the framework's first focusable** (`focus.first`), so a disabled control or one taken out of the
  tab order is passed over as the framework's dialogs pass it.
- **Built on the framework's 1.4.0:** its copy of the plugin contract carries `focus.first(container)` and the new tokens and mixins (`@ui-tinted-fill`, `@ui-part-radius`, the `@ui-z-*` ladder, `.ui-picture-glass()`, `.ui-user-select()`).

## 1.4.0-rc.4

- **The filters' Clear takes a list entry's corner** (`@ui-list-entry-radius`), as the date picker's Clear does, where it was 4 px.
- **A number cell opens for edit without a twitch.** The value stood a pixel to the left in the editor — the caret's room past an
  end-aligned field's text — and now ends where the cell's did; every editor's field box spans the cell, where the field's own
  `max-width: 100%` left it short by both its insets and pushed an end column's past the edge.
- **Built on the framework's 1.4.0-rc.4.** Its copy of the plugin contract carries the
  framework's action bar — `names.actionBar` and `names.actionBarKey`, and the `actionBar` flag of `ui-context-menu-opening` raised before a bar shows a
  menu's entries — and its stylesheet's `.ui-popup-scroll()` caps a list at the dynamic viewport's height (`100dvh`), `@ui-popup-radius`
  and `@ui-list-entry-radius` round a popup and its entries, and `.ui-dialog-look()` is the framework dialog's panel.

## 1.4.0-rc.3

- **A filter's caption takes a phrase**, as every text of the framework's now does. **Breaking:** `DataGridFilterComponent.Caption`
  is a `UIPhrase?`; a string still assigns, and code reading it as a string reads `.Key` or `.ToString()`.
- **`UIDataGridCsv` writes a cell read off a phrase as its key, unless `Format` writes it.** An author's text is the plain text it
  stands for and is written as written; a translated phrase has no one text on the server, so a CSV that wants the reader's
  words hands them through `UIDataGridCsvOptions.Format`.
- **Built on the framework's 1.4.0-rc.3.** Its copy of the plugin
  stylesheet carries the framework's field actions: `.ui-field-actions()` compacts a split button and a flyout's button as
  it does a plain one (`.ui-field-action-button()`), and the eight file-kind glyphs' variables (`@ui-glyph-draft`,
  `@ui-glyph-picture-as-pdf`, …).

## 1.4.0-rc.2

- **A column's caption is judged once, at the column, and can be content.** The Development unkeyed report named a caption from
  the column chooser and from a filter, but never from the header, so a grid with neither reported nothing; it now judges the
  caption at the grid's columns and names the grid and the column's key, and the chooser's entry and the filter's caption, which
  draw the same text again, are not reported a second time. Every `Add…Column` helper takes `content:` (`UITableColumn.IsContent`),
  and `AsContent(DataGridComponent.ColumnsProperty)` says it of every column, before or after the chooser and the filters are
  built: a content caption is shown as written in the header, the sort name a screen reader hears, the chooser's entry and the
  filter's caption, and is never reported. `UIDataGridCsv` writes a column's `IsContent` caption untranslated; it is handed the
  columns, not the grid, so a grid-wide `AsContent` does not reach a CSV's header row. **Breaking:** the helpers and the
  table's virtual `AddColumn`/`AddTextColumn` take the new optional parameter, so a grid overriding them follows.
- **Built on the framework's 1.4.0-rc.2.** Its copy of the plugin contract carries the framework's new `Moment` type:
  `strings.format` takes a moment among its values and writes it in the reader's time zone.

## 1.4.0-rc.1

- **A filter's caption follows a language switch.** The Filters flyout's captions (Subscription, Country, Plan…) stayed in the
  language the page was drawn in while the column chooser's entries switched: a filter marked its caption with the words it had
  already been translated to, not the author's key, so a switch had nothing to look up. It is marked with the key now, as the
  column's header is.
- **A number filter reads every field as the number it holds.** A change in one field read every other number field's shown
  text as though it were invariant, so under a culture that writes its decimals with a comma a "from" showing `10,50` filtered
  from 1050, and `1.000` from 1. The framework's `values.read` now answers a number field's invariant text, what its binding
  sends, so the grid reads each field through it and keeps no culture parse of its own; an editor's unsaved number is kept and
  written back in that form too. A text the field could not read as a number, handed back as it was typed, makes no term: the
  grid dropped its commas, and read a German `1,5` as 15.
- **A column carries an icon, and may start hidden.** `UITableColumn.Icon` and `IconColor` draw a mark before the caption — in the
  header, beside the sort mark, and on the column's entry in the chooser; the column's name for a screen reader stays its caption.
  `UITableColumn.Hidden`, `HideColumn(key)` or `hidden: true` starts a column hidden at every width: the chooser lists it unchecked,
  and a viewer's own choice kept in the browser wins over it, as it already wins over `HideColumnBelow`. Every `Add…Column` helper
  takes `icon:` and `hidden:`; `SetColumnIcon(key, icon, color)` gives the colour. **Breaking:** the helpers and the table's virtual
  `AddColumn`/`AddTextColumn` take the two new optional parameters, so a grid overriding them follows.
- **Rows move by a drag, as a table's do.** The grid inherits the table's `Draggable` and `OnRowMove`/`OnRowMoveWithItemKey`: a row
  whose item does not refuse it is dropped between two others, or moved a place by Alt+Up and Alt+Down, and the command gets the
  row's key and the index it takes; in a windowed grid, its place in the source's whole query. An open detail is not the row to
  lift — a press in it drags nothing.
- **A list in a template column shows its row's items.** An items view in a cell, bound to a collection on the row, drew its empty
  state in every row: the runtime sent a table's column slots no nested collection, taking them for template variants a row
  wears only by name. A table's columns are now slots every row wears.
- **A date cell in a year under a hundred reads the same on both sides.** The browser's reader took the years 1 to 99 for 1901 to
  1999 and left the cell as its raw text where the server had formatted it; the framework's reader is fixed, and
  `DataGridCellFormatter` reads a text moment through the framework's `UIWrittenMoment` rather than a copy of its own.
- **The grid's words ship in Russian and Simplified Chinese.** `DataGridStrings.Translations` carries `ru` and `zh-Hans`, and an
  application turns them on with the framework's `application.AddFrameworkWords("ru", "zh-Hans")`: a registered grid brings its
  table along, ranked below the application's own words, so any of them can still be overridden by its key. The Russian is new;
  the Chinese is the demo's. The demo keeps only its own `grid-demo.*` words.
- **A number, a date and a total follow a language switch at once.** A number or a date cell, a footer's total and the pager's
  figures kept the culture the page was rendered in until the next render, where a temporal field and a timestamp are drawn
  again at once. The framework now writes the grid's culture packs again at a switch (`data-ui-page-culture`), and the grid
  draws every cell that keeps its value again from it — a date cell keeps its moment in `data-ui-grid-moment` for that.

## 1.3.0

- **Needs the framework's plugin contract 2.** The engines read every framework attribute and class name from the plugin
  surface's `names` rather than spelling them again — the table's parts, the window's attributes, the query's and the menu's
  entries included — ask its `states` whether a part answers the reader and turn the grid's own controls off through
  `states.setDisabled`, and write a value back into an editor through `values.write`; against an older framework client the
  package refuses to start, saying which contract it wants. The footer takes the framework's `@ui-table-ground` and the filters
  count is the framework's bare count badge (`BadgeRenderer.RenderCountBadge`).
- **The grid's words switch in place with the page.** Its chrome words are marked (the band's Filters and Columns, Clear
  filters, a sortable header's name, the pager's buttons and its line), a filter's caption as the author's text, and a flag's or a
  choice's caption is drawn again from the value its cell keeps (`data-ui-grid-choice`, `DataGridCellRenderer.ChoiceAttribute`).
  The choices travel to the cell as the author wrote them (`data-ui-grid-choices`) and are translated by the page — **breaking**
  for a script reading that attribute as the words shown. A sortable header's name is filled through `Translate(key, arguments)`
  rather than a hand-spliced caption, its caption passed as the author's text (`UIPhrase.Text`) — looked up by the plain rule,
  so under `KeyPrefixes` a plain caption is no longer reported as a missing word in every language; a column with no caption is
  named by what it sorts, in words, rather than by its raw key. The pager's hints are the framework's tooltip (`data-ui-tooltip`),
  written through the words like the rest, rather than the browser's own `title`. `DataGridComponent.SetSearchPlaceholder(text)`
  names the search box's placeholder in place of `ui.grid.search`, before or after `SetSearch`.
- **F2 on a focused disabled or loading grid opens no editor** — under the framework's disabled model the grid's root stays
  focusable and only its children are inert.
- **A key in the band, a flyout, the header or the pager is that control's own.** F2 in the search box or a filter field opened
  the editor of the keyboard's row, and Enter there counted as the row's Enter for a detail; the grid's keys now answer only on
  the grid itself or in a row.
- **`OnSelectionChange` runs whenever the chosen rows change**, not only at a checkbox: Space on the keyboard's row, or a range
  taken with Shift and an arrow, changed the chosen keys the server held without the command running, so a status line or a
  button acting on the choice stayed stale. A grid choosing one row (`SelectionMode.One`) raises it too, where it never ran. A
  list the controller pushes runs nothing.
- **A row that cannot be chosen says so on its box.** A row whose item refuses the choice (`CanSelect = false`), or a disabled
  one, has its box turned off rather than ticking under the press and unticking again; the box over them no longer takes it or
  counts it, and is itself turned off while no row can be taken. A row whose item's `CanSelect` changes while it is shown turns
  its box off or on with it.
- **The grid's own controls turn off the framework's way.** The pager's buttons, Clear filters and the checkboxes wear
  `ui-disabled` and `aria-disabled="true"` and the framework refuses them, rather than taking the native `disabled` — which
  dropped the focus to the page when Enter on *Last page* or *Clear filters* turned the button off under it. **Breaking** for a
  stylesheet keyed on `:disabled` of those parts or a script reading their `disabled`. Clear filters wears the framework's
  disabled look (faded) rather than a muted ink of its own, and eases into it.
- **A double click on an editable cell opens its row while the grid does not edit.** The cell claimed the double click for its
  editor whatever `Editable` said, so a grid with editing off raised no `OnItemOpen` from such a cell; the claim
  (`data-ui-no-row-open`) now stands only while the grid edits.
- **An open editor closes, sending nothing, when the grid stops editing** — `Editable` turned off, or the grid turned disabled or
  loading, itself or through anything around it (a card, a view's section) — as Escape closes it, rather than staying open with
  Enter still committing into a grid that no longer edits.
- **With `ExpandOnClick`, a row of a table inside a detail opens nothing of the grid's**, where a click or Enter on it drew the
  grid's detail into the inner table's row.
- **With `ExpandOnClick`, a double click leaves the details as they stood before it.** Its two clicks toggled the row's detail
  open and shut (and, one detail at a time, closed another row's) before the row's `OnItemOpen` ran; the open a double click
  raises now puts back what its first click found — the same detail elements, so what a reader did inside one stays. The
  row's `OnItemOpen` reaches the controller after the `OnSelectionChange` its first click raised (the core's commands now
  leave in the order raised), so the demo's status line ends on "opened".
- **An editor reopened on a row the server redrew keeps its draft, and one taken back shows the old value.** The draft and a
  change Escape takes back are written through the field's own binding (`values.write`), so a select's, a search's or a date's
  visible parts show them too, where a value written into its hidden input was committed unseen.
- **Under forced colours the grid's own states show**: an open band button, a sortable caption under the pointer and pressed,
  and Clear filters under the pointer take outlines in the system's colours, where the washes and shadows they are drawn with
  vanished.
- **The keyboard's cursor on a chosen row shows in a pinned cell too**, as the row shows it, rather than the chosen ground alone —
  the framework's table draws it for every pinned cell now (framework 1.3.0), so the grid keeps no rule of its own.
- **A row's detail fades in** as it opens.
- **A sortable caption in a grid whose captions also drag shows the hand**, on purpose rather than by the order the stylesheets
  load in; a caption that only drags keeps the grab.
- **A cell reads a value the same on the server and in the browser**, now held to one corpus on both sides: a flag written as
  `TRUE` showed Yes on a painted row and No on a row the browser built; a flag in a text or number column showed `True` on the
  server and `true` in the browser, and now shows `true` on both; and the server read a date text in any shape .NET parses
  (`09/11/2026`, `Sep 11 2026`) where the browser reads only the wire's own, so such a text now shows as it is on both.
- **A sortable caption answers the pointer the framework's way.** Its hover and press are the shared washes, laid over the
  header's ground rather than replacing it, so a pinned caption no longer turns see-through over the columns scrolled under it;
  the resize handle at a caption's edge no longer lights the caption, nor the one beside it that it overhangs; and a press
  shows before the rows move.
- **The sort arrow turns** from ascending to descending, and **the detail chevron turns** as its row opens, rather than
  snapping — the chevron's turn was lost under the ghost button's own transition; the glyph turns now, inside a button that
  keeps its own transitions, its fade on Show and Hide included.
- **A table in a row's detail keeps its own rows.** The grid's taller rows, its cells' padding, its checkbox column's and its
  sortable captions' rules and its sticky footer reached a table nested in a detail through descendant selectors; they are the
  grid's own rows, header and footer now, as the framework's table rules are.
- **A choice from a cell editor's list keeps the keyboard in the grid.** Choosing a customer in a search editor — Enter on an
  option or a click — dropped the focus to the page as the list closed under it, and the editor committed and closed; the
  keyboard goes back to the editor's field now, as a select's list gives it back to its trigger, and the next Enter commits.
- **Switching to another window with an editor open leaves it open and sends nothing.** Alt+Tab, a click in the address bar or
  the developer tools committed and closed the editor; the focus the window keeps is still the editor's, and it waits for the
  reader's return. The `change` a browser raises in the typed field as the window loses the focus is held back before the value
  binding hears it, and the value goes when the editor commits.
- **An editor whose column hides under it leaves the keyboard on the grid.** A column hidden at a narrower width took the
  focused editor with it; the editor commits as a blur commits it, and the grid's root takes the focus rather than the page.
- **A key right after a choice is the editor's.** Whether the field's list is open is read off its opener (`aria-expanded`), not
  off the list's box, which a closing list keeps while it fades: an Escape pressed then was the field's, and could commit.
- **No hand beside a turned-off row box**: the checkbox's root, the box and its gap, takes the pointer's hand back with it.
- **Under forced colours a caption or Clear filters focused by a press keeps its hover outline**, which only the keyboard's ring
  replaces now (`@ui-keyboard-focus`).
- **The band's Filters and Columns buttons show the keyboard and their open flyout** with the field's active edge, as the search
  box beside them and a select do. **Clear filters** fades its wash in and answers a press.
- **The demo keeps its words under its own key prefix** (`grid-demo.`, `KeyPrefixes`), so its page prose and its data are
  content and the missing-word report in Development names only what its table lacks. The column captions, the plans and
  statuses (the *Plan* column was left English among Chinese captions) and the status lines under the grids are its words; the
  lines are phrases with plural forms rather than English spliced in the controllers, and the CSV export writes the captions
  in the page's language. Its Chinese table is whole — every framework, code field and grid word it registers, held so by a
  test — the page's own buttons and tooltips are words too, and the line an edit leaves names the column by its caption and the
  value as its cell shows it (a choice or a flag by its words, a date under the column's pattern) rather than the column's key
  and the wire's value; the pages' names in the sidebar and their title bands are words too. The filters page chooses one row
  by a click (`SelectionMode.One` with `OnSelectionChange`), opens its detail on the click (`ExpandOnClick`) and says which row
  a double click opened in a grid that does not edit; its detail holds a table of its own, the plans' prices, to click in. A
  cancelled subscription refuses the choice (`CanSelect`), so the first page shows a turned-off row box, and the box over them
  all turned off once only such rows are left.
- **The demo's captions fit.** The *Subscription* column is 140 px, so its caption no longer ends in an ellipsis beside the
  sort mark, and the filters page is *Filters and totals* (筛选与合计), a title whole on a phone.
- **An end-aligned column's editor keeps its caret off the last character**, with the framework's `.ui-field-value-at-end()`:
  the value as wide as its text plus a caret, at the cell's end; a press in the rest of the editor reaches it.

## 1.2.0

- **Built on the framework's 1.2.0.** Nothing of this package's own changed; it moves with the framework.

## 1.1.0

- **The band's parts and the header's checkbox stand outside the rows.** The search box, the filters, the column chooser and
  the select-all checkbox were the grid's template variants, compiled in a row's scope, so each asked for a row's key in its
  address with no row around it and the page logged a parameter-count warning per filter and chooser; they are the grid's
  regions now. **Breaking:** `SearchTemplateKey`, `ColumnsTemplateKey` and `SelectAllTemplateKey` are `SearchRegionName`,
  `ColumnsRegionName` and `SelectAllRegionName`, and `UIDataGridColumn.FilterTemplateKey`/`FilterTemplatePrefix` are
  `FilterRegionName`/`FilterRegionPrefix`.
- **A sortable header lines its caption up with its column's values.** In a column aligned to the end the sort mark stood
  after the caption and pushed it off the values' edge; it now stands before the caption, which ends where the values end. In a
  centred column the caption stays centred on the values with the mark beside it, whatever the mark's width. The place of a
  column among several sorted ones is the arrow's superscript, tight against it, so it no longer reads as part of the caption.

## 1.0.1

- **The first stable release.** No `--prerelease` is needed any more. Until 2.0.0 the public surface may still move
  between versions; every such change is marked **Breaking:** in this file.
- **Clear filters clears with one press.** A choice filter takes its emptied value onto its field a moment after the press,
  and the query was read back from the fields at once, so the first press wrote the old choice again; the query now drops the
  panel's terms itself, and the count on the filters button is taken from the query rather than the fields, which also puts it
  right after a controller pushes a choice.
- **A query the controller pushes shows in the filter fields.** A term a field could have written is written back into it — a
  text, a range's end, a choice — and a field whose term went empties, so the fields say what narrows the rows; the field the
  viewer is typing in is left alone. The demo's large source page has two buttons that set the query from the controller, and
  its status line counts the rows the pushed query leaves rather than the ones before it.
- **A grid's checkboxes have names.** The box of each row and the box over them all stand alone in their cells, with no words
  of their own; they are named *Select row* and *Select all rows* (`ui.grid.select-row`, `ui.grid.select-all`). The footer's
  cells take the role its rows' cells take — `gridcell` in a grid whose rows are chosen.
- **A CSV export runs no formulas.** Text that opens with `=`, `+`, `-`, `@`, a tab or a carriage return is written behind a
  quote, so a spreadsheet opens it as words rather than running it — a customer's name could have been a formula.
  `UIDataGridCsvOptions.EscapeFormulas`, on by default; a number, a date or a flag is never touched.
- **A CSV moment is written to the second without a zone**, a `DateTimeOffset` as its UTC moment: the round-trip form a
  `DateTimeOffset` took carried an offset a spreadsheet does not read back as a date. **A table column the grid did not add
  itself is left out of the file**, as a detail column is — its key is a name or a position, and was read as a property.
- **A windowed grid's footer shows the source's totals or nothing.** A source that sent no `Aggregates` had the window's own
  sum shown as the column's; the footer stays blank. The totals are worked out once a frame at most, since a scroll through a
  virtualized grid swaps rows batch after batch, and a `Min` or `Max` over many rows no longer overflows the stack. The demo's
  source sends new totals after a cell edit.
- **A filter term the controller set on a property no field shows, or in a shape no field writes, is kept** when the viewer
  types in a field; the fields used to rewrite the whole query's filters and drop it, and the viewer had no way to bring it
  back. Such a term — an `Equal` on a text, a `Greater` on a number — no longer shows in the field either, which rewrote it
  in the field's own shape (`LikeIgnoreCase`, `GreaterOrEqual`) at the next edit and let back rows the controller excluded. **A date range's end takes the
  whole last day** — *before the next day* rather than `T23:59:59`, which missed a row with a fraction of a second or a zone.
- **The pager's Previous and Last land on a page boundary**, so the pages stepped through are the ones First counts from; an
  offset reached by scrolling or by a short last page stepped back by a page size from wherever it stood.
- **Tab and F2 follow the columns as the viewer sees them.** A cell editor moved along the row in the author's order and
  reached a hidden column's cell, which cannot take the focus; it now follows the viewer's order and skips a hidden column. A
  row redrawn while its editor was open lets the held field go.
- **The box over a grid's checkboxes takes and counts only the rows the filters left**: it chose rows a filter hid, and read
  *all chosen* as *some*.
- **A detail row answers its own presses.** A press on a button, a field or the text inside an open detail opened or closed the
  row under `SetExpandOnClick`. The detail column's chevron is named *Details* (`ui.grid.details`) and says whether its detail
  is out; a boolean column given only one of its two captions translates the default of the other (`ui.grid.yes`,
  `ui.grid.no`) rather than writing a bare *Yes* or *No*.
- **A grid with no chooser or no row choice skips the work**: its engines heard every change inside the grid, a scrolled host's
  spacers among them.
- **The package's stylesheet and script are served under `/_ne/css/` and `/_ne/js/`** with the framework's own paths (see the
  core's changelog).
- **A number cell the server paints writes a value no decimal holds as it is**: a `NaN`, an infinity or a real past 7.9e28 in a
  Number or Money column failed the render with an overflow, where the client's cell wrote it as it is; and a numeric text is
  formatted as a number on both sides — and now totalled as one on both, and written by a CSV as the number it is rather than
  behind a formula's quote. A numeric text is decimal digits on both sides: the client read `0x10` as sixteen and a blank as
  zero. The demo keeps a viewer's edits to its own page rather than in the catalogue every page
  reads.
- **The filters flyout has a Clear filters button** under its filters, which empties every one of them at once and is
  disabled while none holds anything; the search box keeps its text. The filter fields expose their `Value` to the
  package's client for it.
- **Clearing the only filter shows every row again** — the framework's rule watcher missed an emptied query (see the
  core's changelog).
- **A committed cell edit lets its field go.** Only Escape released the field the editor held for the value engine, so a
  commit that changed nothing left a detached editor held for the page's life; every close releases it now.
- The totals engine escapes a column's key in its selector, as the edit engine already did.
- **The filters and columns flyouts are drawn through the foundation's `FlyoutRenderer`**, not by copying the flyout
  engine's class names; the markup is the same.
- **The package checks the plugin contract it was built for.** The framework's client says which contract it implements
  (`GlobalApi.contractVersion`), and the package refuses to register against another one, with an error naming both
  numbers, instead of working in part.
- **Both packages bring their namespaces as global usings.** Installing the package is enough to write against it; a
  project that would rather write its own `using` lines sets `NEStandardUIImplicitUsings` to `false`.
- **The demo lists Orvane Cloud's subscriptions**, and every sample shows its source.
- **The mirror's demo builds against the framework's packages.** It reached this slice's own namespaces only through
  the monorepo's usings, and this slice's sources wrote `using` lines the framework's packages now bring, which is
  IDE0005; `Directory.Build.targets` travels to the mirror and a package's sources keep their own lines.
- The README's licence link names the mirror, so it resolves on nuget.org too.
- **The packages carry their symbols and sources inside their assemblies**, so a debugger steps into them.
- **A grid in another grid's detail is its own.** The outer grid's engines looked its parts up anywhere inside it and found the
  inner grid's: its row boxes and the box over them were written from the outer rows' choices, its filter count and Clear
  button from the outer query, its chooser from the outer columns, and F2 could open an inner cell's editor.
- **With `SetExpandOnClick`, Enter on the keyboard's row opens and closes its detail** as a click does; the keyboard had no way
  to a detail but the chevron. While the grid's editing is off, a click on an editable column's cell opens the row too.
- **The detail column's chevron says its detail is in from the start**, not only once it has been pressed.
- **The column chooser keeps one column showing**: the last checked entry cannot be unchecked, which left an empty frame.
- **A grid that holds all its rows draws no pager**, `Paging` or not; the pager's four buttons could do nothing there.
- **A query written as it already stands raises nothing**: `OnQueryChange` ran, and a windowed grid read its window again, for
  a filter edit that made no term.
- **A date text with an offset shows the clock it is written with** on the server as the client does; the server turned it into
  its own zone, so a moment near midnight showed another day before the client drew the row again.
- **`DataGridCellFormatter.AsCsvFormat` without a translator writes no key**: a boolean column given one caption wrote
  `ui.grid.no` for the other; it writes the plain value.
- **A cell editor whose field binds more than its value — a search binding its typed text too — holds, restores and compares
  the value**, not the typed text.

## 1.0.0-rc.3

The first version: `NE.Standard.UI.DataGrid` (the component) and `NE.Standard.UI.Web.DataGrid` (the web
rendering). The number lines up with the framework's, which goes out as a release candidate with everything that
plugs into it.

- `DataGridComponent`: the framework's table, derived rather than copied, with sorting by header — a click, a
  second to reverse, a third to clear, Shift for several columns — written into the items component's own
  `Query`, so a grid over rows the page holds sorts in the browser and one over a windowed source is sorted by
  the source. A column shows which way it goes, and one that goes neither shows the two ways it could.
- Typed columns — `AddNumberColumn`, `AddMoneyColumn`, `AddDateColumn`, `AddBooleanColumn`, `AddEnumColumn` — each
  formatted in the page's culture on both sides, and a template column that sorts by a property it names.
- Editing in place: a column that says `editable: true` opens the kind's own field in the cell on a double click or
  F2 — a text, a number, a date, a checkbox, a select — and a template column takes the author's editor
  (`AddEditableColumn`). Enter or a blur commits through the row property's two-way binding, Escape puts the value
  back, Tab moves along the row; `OnCellEdit` runs after the value landed, with the row's key and the column's.
- A band over the header, outside the table's frame: a search box across the grid (`SetSearch`) and the filters of every
  column that says `filterable: true` — a text match, a range for numbers and dates, a select for enums and booleans —
  behind a Filters button whose flyout holds a captioned filter per column and counts the ones in use. Every one is a
  term of the same query the headers sort by, so a grid the page holds narrows in the browser and a windowed one asks
  its source.
- Paging (`Paging`, bindable): a windowed grid shows its window as a page, with a pager under the rows — the rows the page
  holds out of the source's count, and first, previous, next and last — instead of reading the next window as the viewer
  scrolls.
- A footer of totals: a column that says `aggregate: Sum` (or Average, Count, Min, Max) shows the number under its rows,
  formatted as its cells are — computed in the browser over the rows the filters leave, or answered by a windowed source
  beside its window (`UIItemWindow.Aggregates`).
- Wide grids and pinned columns: a grid whose `HorizontalScroll` is on scrolls sideways as a whole, its header moving with
  the rows, and a column that says `pinned: true` stays in place while the rest slide under it. The band and the pager
  stand inside the frame then, sticky at its start edge, and the footer of totals over the pager.
- The band reads as a row of controls: the search box is a field rather than a ghost, and the Filters and Columns buttons
  wear a field's ground, height and corner instead of an outline.
- CSV export: `UIDataGridCsv.Write`/`WriteBytes` over the grid's columns and any rows — the captions as the header line,
  values a spreadsheet parses, or the cells' own text through `DataGridCellFormatter.AsCsvFormat`. No button on the grid: an
  application's command writes the file and hands it to `IUIDownloadService`.
- A detail row: `SetDetailTemplate(template)` draws a template under a row across every column, opened at the chevron of
  `AddDetailColumn()` or anywhere on the row with `SetExpandOnClick(true)`; one row stands open at a time unless
  `SetMultipleDetails(true)`. A windowed grid's client-built rows get the same, through the framework's row decorators.
- A column chooser (`SetColumnChooser()`): a button in the band opening the framework's menu with a check entry per column,
  the viewer's choices kept in the browser under the grid's id; and columns that give way on a narrower screen (`HideColumnBelow`).
- Columns the viewer moves (`SetReorderableColumns()`): a caption dragged along the header, or moved with Ctrl and an arrow,
  takes its column with it, and the order is kept in the browser beside the widths. A pinned column and the grid's own column
  of checkboxes stay where they were written.
