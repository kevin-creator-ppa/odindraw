import { Line } from "./Line.js";

/** Line com seta no fim por padrão — a lógica de desenho é toda genérica (ver Line.js). */
export class Arrow extends Line {
    constructor(props) {
        super({ ...props, type: "arrow", endArrow: props?.endArrow ?? true });
    }
}
