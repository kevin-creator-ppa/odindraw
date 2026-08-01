import { DrawShapeTool } from "./DrawShapeTool.js";
import { worldRectToScreen, drawCloudPreview } from "./shapePreview.js";

export class CloudTool extends DrawShapeTool {
    constructor() {
        super("cloud", "cloud");
    }

    drawPreview(context, start, end) {
        drawCloudPreview(context.renderer.interactiveCtx, worldRectToScreen(context.camera, start, end));
    }
}
