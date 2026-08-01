import { DrawShapeTool } from "./DrawShapeTool.js";
import { worldRectToScreen, drawRectPreview } from "./shapePreview.js";

export class RectangleTool extends DrawShapeTool {
    constructor(name = "rectangle", shapeType = "rectangle") {
        super(name, shapeType);
    }

    drawPreview(context, start, end) {
        const rect = worldRectToScreen(context.camera, start, end);
        drawRectPreview(context.renderer.interactiveCtx, rect);
    }
}
