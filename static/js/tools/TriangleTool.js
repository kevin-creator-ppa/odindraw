import { DrawShapeTool } from "./DrawShapeTool.js";
import { worldRectToScreen, drawTrianglePreview } from "./shapePreview.js";

export class TriangleTool extends DrawShapeTool {
    constructor() {
        super("triangle", "triangle");
    }

    drawPreview(context, start, end) {
        drawTrianglePreview(context.renderer.interactiveCtx, worldRectToScreen(context.camera, start, end));
    }
}
