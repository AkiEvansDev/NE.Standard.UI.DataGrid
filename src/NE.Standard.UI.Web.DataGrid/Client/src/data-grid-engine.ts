// The package's one engine, composing its eight concern engines; the entry reaches every one of them through this.

import type { PluginEngineContext } from "ne-standard-ui";
import { applyCellValue } from "./data-grid-cell.ts";
import type { CellFormatting } from "./data-grid-cell.ts";
import { DataGridChooserEngine } from "./data-grid-chooser-engine.ts";
import { DataGridDetailEngine } from "./data-grid-detail-engine.ts";
import { DataGridEditEngine } from "./data-grid-edit-engine.ts";
import { DataGridFilterEngine } from "./data-grid-filter-engine.ts";
import { DataGridPagerEngine } from "./data-grid-pager-engine.ts";
import { DataGridSelectionEngine } from "./data-grid-selection-engine.ts";
import { DataGridSortEngine } from "./data-grid-sort-engine.ts";
import { DataGridTotalsEngine } from "./data-grid-totals-engine.ts";

export class DataGridEngine {
    private readonly formatting: CellFormatting;

    public constructor(context: PluginEngineContext) {
        this.formatting = { numbers: context.numbers, temporal: context.temporal, strings: context.strings };

        new DataGridSortEngine(context);
        new DataGridEditEngine(context);
        new DataGridFilterEngine(context);
        new DataGridPagerEngine(context);
        new DataGridTotalsEngine(context, this.formatting);
        new DataGridChooserEngine(context);
        new DataGridDetailEngine(context);
        new DataGridSelectionEngine(context);
    }

    /** A typed cell's value, on a row the client builds or a value it patches: formatted by the attributes the renderer left on the cell. */
    public applyCellValue(target: Element, value: unknown): void {
        applyCellValue(target, value, this.formatting);
    }
}
