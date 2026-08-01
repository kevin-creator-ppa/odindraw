import { DrawShapeTool } from "./DrawShapeTool.js";
import { worldRectToScreen, drawHexagonPreview } from "./shapePreview.js";

export class HexagonTool extends DrawShapeTool {
    constructor() {
        super("hexagon", "hexagon");
    }

    drawPreview(context, start, end) {
        drawHexagonPreview(context.renderer.interactiveCtx, worldRectToScreen(context.camera, start, end));
    }
}
