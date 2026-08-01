import { DrawShapeTool } from "./DrawShapeTool.js";
import { worldRectToScreen, drawDiamondPreview } from "./shapePreview.js";

export class DiamondTool extends DrawShapeTool {
    constructor() {
        super("diamond", "diamond");
    }

    drawPreview(context, start, end) {
        drawDiamondPreview(context.renderer.interactiveCtx, worldRectToScreen(context.camera, start, end));
    }
}
