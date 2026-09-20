import "./styles/ui-data-grid.less";
import { CellOperationKind } from "./data-grid-cell.ts";
import { DataGridEngine } from "./data-grid-engine.ts";
import { CellEditEventName } from "./data-grid-edit-engine.ts";
import { SelectionChangeEventName } from "./data-grid-selection-engine.ts";
import { QueryChangeEventName } from "./data-grid-query.ts";
import { frameworkApi } from "./framework-api.ts";

const api = frameworkApi();

let engine: DataGridEngine | undefined;

// All three are raised after a field's or the query element's `change`; the command waits for that value to reach the server first.
api.registerEvent(QueryChangeEventName, { settlesValue: true });
api.registerEvent(CellEditEventName, { settlesValue: true });
api.registerEvent(SelectionChangeEventName, { settlesValue: true });

api.registerEngine(context => {
    engine = new DataGridEngine(context);
});

// A typed cell's value, on a row the client builds or a value it patches: formatted by the attributes the renderer left on the cell.
api.registerDomOperation({
    kind: CellOperationKind,
    handler: context => engine?.applyCellValue(context.target, context.value)
});
