import { Element } from "./Element.js";
import { drawArrowhead, arrowheadSvgLines } from "./arrowhead.js";
import { drawRoutePath, routeNearPoint, routeContainsPoint, routeSvgPath } from "./routeGeometry.js";

/**
 * Elemento definido por dois pontos (x1,y1)-(x2,y2), não por um bounding
 * box com rotação. O bbox (x,y,width,height) herdado de Element existe
 * só para participar do culling/seleção por área; o desenho de fato usa
 * sempre os pontos.
 *
 * `routeType` (reta/ortogonal/curva) e seta em cada ponta (startArrow/
 * endArrow) são independentes e editáveis depois de criada — Arrow.js e
 * OrthogonalLine.js só mudam os padrões (endArrow / routeType) pra
 * combinar com a ferramenta que os cria.
 */
export class Line extends Element {
    constructor({
        x1,
        y1,
        x2,
        y2,
        style,
        type = "line",
        startArrow = false,
        endArrow = false,
        routeType = "straight",
    } = {}) {
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
        this.routeType = routeType;
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
        drawRoutePath(ctx, a, b, this.routeType);
        if (this.startArrow) drawArrowhead(ctx, routeNearPoint(a, b, this.routeType, "start"), a);
        if (this.endArrow) drawArrowhead(ctx, routeNearPoint(a, b, this.routeType, "end"), b);
        ctx.restore();
    }

    containsPoint(point, tolerance = 6) {
        return routeContainsPoint(point, { x: this.x1, y: this.y1 }, { x: this.x2, y: this.y2 }, this.routeType, tolerance);
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
            routeType: this.routeType,
        };
    }

    toSVG() {
        const start = { x: this.x1, y: this.y1 };
        const end = { x: this.x2, y: this.y2 };
        const arrowLines = [
            ...(this.startArrow ? arrowheadSvgLines(routeNearPoint(start, end, this.routeType, "start"), start) : []),
            ...(this.endArrow ? arrowheadSvgLines(routeNearPoint(start, end, this.routeType, "end"), end) : []),
        ].join("");

        return `<g fill="none" stroke="${this.style.stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()}>
            <path d="${routeSvgPath(start, end, this.routeType)}" />
            ${arrowLines}
        </g>`;
    }
}
