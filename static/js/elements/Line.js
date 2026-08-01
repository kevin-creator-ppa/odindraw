import { Element } from "./Element.js";
import { distanceToSegment } from "../utils/geometry.js";
import { drawArrowhead, arrowheadSvgLines } from "./arrowhead.js";

/**
 * Elemento definido por dois pontos (x1,y1)-(x2,y2), não por um bounding
 * box com rotação. O bbox (x,y,width,height) herdado de Element existe
 * só para participar do culling/seleção por área; o desenho de fato usa
 * sempre os pontos. Seta em cada ponta é opcional e independente
 * (startArrow/endArrow) — Arrow.js só liga endArrow por padrão.
 */
export class Line extends Element {
    constructor({ x1, y1, x2, y2, style, type = "line", startArrow = false, endArrow = false } = {}) {
        super(type, {
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
            style,
        });
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.startArrow = startArrow;
        this.endArrow = endArrow;
    }

    translate(dx, dy) {
        super.translate(dx, dy);
        this.x1 += dx;
        this.y1 += dy;
        this.x2 += dx;
        this.y2 += dy;
    }

    /** Move um dos extremos (alça de edição de pontos do SelectTool) e ressincroniza o bbox. */
    setEndpoint(kind, point) {
        if (kind === "start") {
            this.x1 = point.x;
            this.y1 = point.y;
        } else {
            this.x2 = point.x;
            this.y2 = point.y;
        }
        this.x = Math.min(this.x1, this.x2);
        this.y = Math.min(this.y1, this.y2);
        this.width = Math.abs(this.x2 - this.x1);
        this.height = Math.abs(this.y2 - this.y1);
    }

    render(ctx, camera) {
        const a = camera.worldToScreen(this.x1, this.y1);
        const b = camera.worldToScreen(this.x2, this.y2);
        ctx.save();
        this.applyStyle(ctx);
        this.drawPath(ctx, a, b);
        if (this.startArrow) drawArrowhead(ctx, b, a);
        if (this.endArrow) drawArrowhead(ctx, a, b);
        ctx.restore();
    }

    drawPath(ctx, a, b) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }

    containsPoint(point, tolerance = 6) {
        return distanceToSegment(point, { x: this.x1, y: this.y1 }, { x: this.x2, y: this.y2 }) <= tolerance;
    }

    serialize() {
        return {
            ...super.serialize(),
            x1: this.x1,
            y1: this.y1,
            x2: this.x2,
            y2: this.y2,
            startArrow: this.startArrow,
            endArrow: this.endArrow,
        };
    }

    toSVG() {
        const start = { x: this.x1, y: this.y1 };
        const end = { x: this.x2, y: this.y2 };
        const arrowLines = [
            ...(this.startArrow ? arrowheadSvgLines(end, start) : []),
            ...(this.endArrow ? arrowheadSvgLines(start, end) : []),
        ].join("");

        return `<g fill="none" stroke="${this.style.stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()}>
            <line x1="${this.x1}" y1="${this.y1}" x2="${this.x2}" y2="${this.y2}" />
            ${arrowLines}
        </g>`;
    }
}
