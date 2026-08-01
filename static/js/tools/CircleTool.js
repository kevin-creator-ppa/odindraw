import { EllipseTool } from "./EllipseTool.js";
import { squareConstrain } from "./shapePreview.js";

/** Elipse com raios forçados a serem iguais. */
export class CircleTool extends EllipseTool {
    constructor() {
        super("circle", "circle");
    }

    constrainEnd(start, end) {
        return squareConstrain(start, end);
    }
}
