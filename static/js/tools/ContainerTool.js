import { DrawShapeTool } from "./DrawShapeTool.js";
import { worldRectToScreen, drawRectPreview } from "./shapePreview.js";

export class ContainerTool extends DrawShapeTool {
    constructor() {
        super("container", "container");
    }

    drawPreview(context, start, end) {
        const rect = worldRectToScreen(context.camera, start, end);
        drawRectPreview(context.renderer.interactiveCtx, rect);
    }
}
