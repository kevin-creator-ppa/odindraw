import { DrawShapeTool } from "./DrawShapeTool.js";
import { worldRectToScreen, drawRectPreview } from "./shapePreview.js";

export class CommentTool extends DrawShapeTool {
    constructor() {
        super("comment", "comment");
    }

    drawPreview(context, start, end) {
        const rect = worldRectToScreen(context.camera, start, end);
        drawRectPreview(context.renderer.interactiveCtx, rect);
    }
}
