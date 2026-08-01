import { Line } from "./Line.js";

/** Line com seta aberta no fim por padrão — a lógica de desenho é toda genérica (ver Line.js). */
export class Arrow extends Line {
    constructor(props) {
        super({ ...props, type: "arrow", endArrowType: props?.endArrowType ?? "open" });
    }
}
