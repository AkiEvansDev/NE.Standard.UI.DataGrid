import "./styles/ui-data-grid.less";
import { CellEditAnswers } from "./data-grid-edit-engine.ts";
import { DataGridEngine } from "./data-grid-engine.ts";
import { CellOperationKind, GridEvents } from "./data-grid-names.ts";
import { frameworkApi } from "./framework-api.ts";

const api = frameworkApi();
const cellEditAnswers = new CellEditAnswers();
const engines = new Map<ParentNode, DataGridEngine>();

function engineFor(element: Element): DataGridEngine | undefined {
    for (let current: Element | null = element; current !== null; current = current.parentElement) {
        const direct = engines.get(current);

        if (direct !== undefined)
            return direct;
    }

    const rootNode = typeof element.getRootNode === "function" ? element.getRootNode() : null;

    if (rootNode !== null) {
        const rooted = engines.get(rootNode as ParentNode);

        if (rooted !== undefined)
            return rooted;
    }

    return engines.get(element.ownerDocument ?? document);
}

// All three are raised after a field's, the query element's or the host's `change`; the command waits for that value to reach the server first.
// A query and a selection are the grid's own: a grid in a detail template that hears neither runs nothing of the outer grid's.
api.registerEvent(GridEvents.queryChange, { settlesValue: true, ownTarget: true });
// A committed editor stands over its cell until this command's answer has written the cell.
api.registerEvent(GridEvents.cellEdit, {
    settlesValue: true,
    started: context => cellEditAnswers.start(context.domEvent),
    completed: context => cellEditAnswers.finish(context.domEvent)
});
api.registerEvent(GridEvents.selectionChange, { settlesValue: true, ownTarget: true });

api.registerEngine(context => {
    const instance = new DataGridEngine(context, cellEditAnswers);

    engines.set(context.root, instance);

    return {
        dispose: () => {
            if (engines.get(context.root) === instance)
                engines.delete(context.root);

            instance.dispose();
        }
    };
});

// A typed cell's value, on a row the client builds or a value it patches: formatted by the attributes the renderer left on the cell.
api.registerDomOperation({
    kind: CellOperationKind,
    handler: context => engineFor(context.target)?.applyCellValue(context.target, context.value)
});
