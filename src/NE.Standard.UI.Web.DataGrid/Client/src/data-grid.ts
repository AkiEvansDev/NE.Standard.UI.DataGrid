import "./styles/ui-data-grid.less";
import { CellEditAnswers } from "./data-grid-edit-engine.ts";
import { DataGridEngine } from "./data-grid-engine.ts";
import { CellOperationKind, GridEvents } from "./data-grid-names.ts";
import { frameworkApi } from "./framework-api.ts";

const api = frameworkApi();
const cellEditAnswers = new CellEditAnswers();

let engine: DataGridEngine | undefined;

// All three are raised after a field's, the query element's or the host's `change`; the command waits for that value to reach the server first.
api.registerEvent(GridEvents.queryChange, { settlesValue: true });
// A committed editor stands over its cell until this command's answer has written the cell.
api.registerEvent(GridEvents.cellEdit, {
    settlesValue: true,
    started: context => cellEditAnswers.start(context.domEvent),
    completed: context => cellEditAnswers.finish(context.domEvent)
});
api.registerEvent(GridEvents.selectionChange, { settlesValue: true });

api.registerEngine(context => {
    engine = new DataGridEngine(context, cellEditAnswers);
});

// A typed cell's value, on a row the client builds or a value it patches: formatted by the attributes the renderer left on the cell.
api.registerDomOperation({
    kind: CellOperationKind,
    handler: context => engine?.applyCellValue(context.target, context.value)
});
