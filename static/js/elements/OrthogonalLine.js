import { Line } from "./Line.js";
import { distanceToSegment } from "../utils/geometry.js";
import { drawArrowhead, arrowheadSvgLines } from "./arrowhead.js";

/** Linha em ângulo reto (cotovelo): sobe/desce, depois vai reto até o destino. */
export class OrthogonalLine extends Line {
    constructor(props) {
        super({ ...props, type: "orthogonal-line" });
    }

    /** Ponto do cotovelo (screen) — a seta em qualquer ponta segue a direção do trecho adjacente a ele, não a reta direta. */
    render(ctx, camera) {
        const a = camera.worldToScreen(this.x1, this.y1);
        const b = camera.worldToScreen(this.x2, this.y2);
        const corner = { x: b.x, y: a.y };

        ctx.save();
        this.applyStyle(ctx);
        this.drawPath(ctx, a, b);
        if (this.startArrow) drawArrowhead(ctx, corner, a);
        if (this.endArrow) drawArrowhead(ctx, corner, b);
        ctx.restore();
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
        const corner = { x: this.x2, y: this.y1 };
        const start = { x: this.x1, y: this.y1 };
        const end = { x: this.x2, y: this.y2 };
        const arrowLines = [
            ...(this.startArrow ? arrowheadSvgLines(corner, start) : []),
            ...(this.endArrow ? arrowheadSvgLines(corner, end) : []),
        ].join("");

        return `<g fill="none" stroke="${this.style.stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()}>
            <polyline points="${this.x1},${this.y1} ${this.x2},${this.y1} ${this.x2},${this.y2}" />
            ${arrowLines}
        </g>`;
    }
}
