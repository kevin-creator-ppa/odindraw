import { DrawShapeTool } from "./DrawShapeTool.js";
import { worldRectToScreen, drawEllipsePreview } from "./shapePreview.js";

export class EllipseTool extends DrawShapeTool {
    constructor(name = "ellipse", shapeType = "ellipse") {
        super(name, shapeType);
    }

    drawPreview(context, start, end) {
        const rect = worldRectToScreen(context.camera, start, end);
        drawEllipsePreview(context.renderer.interactiveCtx, rect);
    }
}
