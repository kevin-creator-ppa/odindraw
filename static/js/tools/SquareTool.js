import { RectangleTool } from "./RectangleTool.js";
import { squareConstrain } from "./shapePreview.js";

/** Retângulo com lados forçados a serem iguais. */
export class SquareTool extends RectangleTool {
    constructor() {
        super("square", "square");
    }

    constrainEnd(start, end) {
        return squareConstrain(start, end);
    }
}
