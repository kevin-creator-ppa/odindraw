import { Element } from "./Element.js";
import { drawMarker, markerSvg } from "./arrowhead.js";
import { drawRoutePath, routeNearPoint, routeContainsPoint, routeSvgPath, routeMidpoint } from "./routeGeometry.js";
import { defaultLabel, drawLabel, labelToSVG } from "./shapeLabel.js";

const LABEL_BOX_WIDTH = 140;
const LABEL_BOX_HEIGHT = 32;

/** `true`/`false` (formato antigo) vira "open"/"none"; string passa direto; sem valor usa o padrão. */
function normalizeArrowType(value, fallback) {
    if (value === true) return "open";
    if (value === false) return "none";
    if (typeof value === "string") return value;
    return fallback;
}

/**
 * Elemento definido por dois pontos (x1,y1)-(x2,y2), não por um bounding
 * box com rotação. O bbox (x,y,width,height) herdado de Element existe
 * só para participar do culling/seleção por área; o desenho de fato usa
 * sempre os pontos.
 *
 * `routeType` (reta/ortogonal/curva), o marcador em cada ponta
 * (startArrowType/endArrowType — ver arrowhead.js pros tipos) e
 * `waypoints` (pontos intermediários arrastáveis — ver
 * tools/SelectTool.js e elements/routeGeometry.js) são independentes e
 * editáveis depois de criada — Arrow.js e OrthogonalLine.js só mudam os
 * padrões (endArrowType / routeType) pra combinar com a ferramenta que
 * os cria.
 */
export class Line extends Element {
    constructor({
        x1,
        y1,
        x2,
        y2,
        style,
        type = "line",
        startArrow,
        endArrow,
        startArrowType,
        endArrowType,
        routeType = "straight",
        waypoints,
        bend = null, // formato antigo (um único ponto) — migra pra waypoints=[bend] se não vier `waypoints`
        textLabel,
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
        this.startArrowType = normalizeArrowType(startArrowType ?? startArrow, "none");
        this.endArrowType = normalizeArrowType(endArrowType ?? endArrow, "none");
        this.routeType = routeType;
        this.waypoints = waypoints ?? (bend ? [bend] : []);
        this.textLabel = defaultLabel({ fontSize: 12, ...textLabel });
    }

    translate(dx, dy) {
        super.translate(dx, dy);
        this.x1 += dx;
        this.y1 += dy;
        this.x2 += dx;
        this.y2 += dy;
        this.waypoints = this.waypoints.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    }

    /** Bounds (mundo) do rótulo embutido, centrado no meio da rota — usado pelo TextEditor.js pra posicionar o textarea (ver `labelBounds`, checado por duck-typing). */
    labelBounds() {
        const mid = routeMidpoint({ x: this.x1, y: this.y1 }, { x: this.x2, y: this.y2 }, this.routeType, this.waypoints);
        return { x: mid.x - LABEL_BOX_WIDTH / 2, y: mid.y - LABEL_BOX_HEIGHT / 2, width: LABEL_BOX_WIDTH, height: LABEL_BOX_HEIGHT };
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
        const waypoints = this.waypoints.map((p) => camera.worldToScreen(p.x, p.y));
        ctx.save();
        this.applyStyle(ctx);
        drawRoutePath(ctx, a, b, this.routeType, waypoints);
        drawMarker(ctx, this.startArrowType, routeNearPoint(a, b, this.routeType, "start", waypoints), a);
        drawMarker(ctx, this.endArrowType, routeNearPoint(a, b, this.routeType, "end", waypoints), b);
        ctx.restore();

        if (this.textLabel.text && !this.isEditing) {
            const bounds = this.labelBounds();
            const screenMid = camera.worldToScreen(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
            const w = bounds.width * camera.zoom;
            const h = bounds.height * camera.zoom;
            drawLabel(ctx, this.textLabel, { x: screenMid.x - w / 2, y: screenMid.y - h / 2, width: w, height: h }, camera.zoom);
        }
    }

    containsPoint(point, tolerance = 6) {
        return routeContainsPoint(
            point,
            { x: this.x1, y: this.y1 },
            { x: this.x2, y: this.y2 },
            this.routeType,
            tolerance,
            this.waypoints
        );
    }

    serialize() {
        return {
            ...super.serialize(),
            x1: this.x1,
            y1: this.y1,
            x2: this.x2,
            y2: this.y2,
            startArrowType: this.startArrowType,
            endArrowType: this.endArrowType,
            routeType: this.routeType,
            waypoints: this.waypoints,
        };
    }

    toSVG() {
        const start = { x: this.x1, y: this.y1 };
        const end = { x: this.x2, y: this.y2 };
        const stroke = this.resolvedStroke();
        const markers =
            markerSvg(this.startArrowType, routeNearPoint(start, end, this.routeType, "start", this.waypoints), start, stroke) +
            markerSvg(this.endArrowType, routeNearPoint(start, end, this.routeType, "end", this.waypoints), end, stroke);

        const labelSvg = this.textLabel.text ? labelToSVG(this.textLabel, this.labelBounds()) : "";

        return `<g fill="none" stroke="${stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()}>
            <path d="${routeSvgPath(start, end, this.routeType, this.waypoints)}" />
            ${markers}
        </g>${labelSvg}`;
    }

    /** Sobrescreve Element.clone(): sem isso, a cópia compartilharia os mesmos objetos de ponto do array `waypoints` do original. */
    clone() {
        const copy = super.clone();
        copy.waypoints = this.waypoints.map((p) => ({ ...p }));
        return copy;
    }
}
