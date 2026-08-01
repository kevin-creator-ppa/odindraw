import { ConnectableLineTool } from "./ConnectableLineTool.js";
import { drawLinePreview } from "./shapePreview.js";

export class ArrowTool extends ConnectableLineTool {
    constructor() {
        super("arrow", "arrow");
    }

    drawPreview(context, start, end) {
        const a = context.camera.worldToScreen(start.x, start.y);
        const b = context.camera.worldToScreen(end.x, end.y);
        drawLinePreview(context.renderer.interactiveCtx, a, b, { arrowEnd: true });
    }
}
