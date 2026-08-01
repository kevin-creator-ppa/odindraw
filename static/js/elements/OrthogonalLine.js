import { Line } from "./Line.js";

/** Line com rota ortogonal (cotovelo) por padrão — o desenho é todo genérico (ver Line.js). */
export class OrthogonalLine extends Line {
    constructor(props) {
        super({ ...props, type: "orthogonal-line", routeType: props?.routeType ?? "orthogonal" });
    }
}
