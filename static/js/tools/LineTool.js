import { DrawShapeTool } from "./DrawShapeTool.js";
import { drawLinePreview } from "./shapePreview.js";

export class LineTool extends DrawShapeTool {
    constructor(name = "line", shapeType = "line") {
        super(name, shapeType);
    }

    drawPreview(context, start, end) {
        const a = context.camera.worldToScreen(start.x, start.y);
        const b = context.camera.worldToScreen(end.x, end.y);
        drawLinePreview(context.renderer.interactiveCtx, a, b);
    }
}
