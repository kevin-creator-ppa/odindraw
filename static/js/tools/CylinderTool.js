import { DrawShapeTool } from "./DrawShapeTool.js";
import { worldRectToScreen, drawCylinderPreview } from "./shapePreview.js";

export class CylinderTool extends DrawShapeTool {
    constructor() {
        super("cylinder", "cylinder");
    }

    drawPreview(context, start, end) {
        drawCylinderPreview(context.renderer.interactiveCtx, worldRectToScreen(context.camera, start, end));
    }
}
