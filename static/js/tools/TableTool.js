import { DrawShapeTool } from "./DrawShapeTool.js";
import { worldRectToScreen, drawRectPreview } from "./shapePreview.js";

export class TableTool extends DrawShapeTool {
    constructor() {
        super("table", "table");
    }

    drawPreview(context, start, end) {
        const rect = worldRectToScreen(context.camera, start, end);
        drawRectPreview(context.renderer.interactiveCtx, rect);
    }
}
