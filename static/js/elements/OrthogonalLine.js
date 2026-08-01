import { Line } from "./Line.js";
import { distanceToSegment } from "../utils/geometry.js";

/** Linha em ângulo reto (cotovelo): sobe/desce, depois vai reto até o destino. */
export class OrthogonalLine extends Line {
    constructor(props) {
        super({ ...props, type: "orthogonal-line" });
    }

    drawPath(ctx, a, b) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }

    containsPoint(point, tolerance = 6) {
        const corner = { x: this.x2, y: this.y1 };
        const d1 = distanceToSegment(point, { x: this.x1, y: this.y1 }, corner);
        const d2 = distanceToSegment(point, corner, { x: this.x2, y: this.y2 });
        return Math.min(d1, d2) <= tolerance;
    }

    toSVG() {
        return `<polyline points="${this.x1},${this.y1} ${this.x2},${this.y1} ${this.x2},${this.y2}" fill="none" stroke="${this.style.stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()} />`;
    }
}
