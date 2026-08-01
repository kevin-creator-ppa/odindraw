import { DrawShapeTool } from "./DrawShapeTool.js";
import { drawOrthogonalPreview } from "./shapePreview.js";

/** Linha em ângulo reto (cotovelo), como conectores ortogonais de draw.io. */
export class OrthogonalLineTool extends DrawShapeTool {
    constructor() {
        super("orthogonal-line", "orthogonal-line");
    }

    drawPreview(context, start, end) {
        const a = context.camera.worldToScreen(start.x, start.y);
        const b = context.camera.worldToScreen(end.x, end.y);
        drawOrthogonalPreview(context.renderer.interactiveCtx, a, b);
    }
}
