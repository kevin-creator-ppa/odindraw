import { Element } from "./Element.js";
import { drawMarker, markerSvg } from "./arrowhead.js";
import { drawRoutePath, routeNearPoint, routeContainsPoint, routeSvgPath, routeMidpoint } from "./routeGeometry.js";
import { defaultLabel, drawLabel, labelToSVG } from "./shapeLabel.js";
import { sketchState, sketchyLine, seedFromId } from "./sketch.js";

const LABEL_BOX_WIDTH = 140;
const LABEL_BOX_HEIGHT = 32;

/** `true`/`false` (formato antigo) vira "open"/"none"; string passa direto; sem valor usa o padrão. */
function normalizeArrowType(value, fallback) {
    if (value === true) return "open";
    if (value === false) return "none";
    if (typeof value === "string") return value;
    return fallback;
}

/** Ponto na borda do bbox, na direção de `towardPoint` a partir do centro — "desliza" pela borda conforme o objeto se move. */
function edgeAnchorPoint(bounds, towardPoint) {
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const dx = towardPoint.x - cx;
    const dy = towardPoint.y - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };

    const halfW = Math.max(bounds.width / 2, 0.001);
    const halfH = Math.max(bounds.height / 2, 0.001);
    const scale = Math.min(Math.abs(halfW / (dx || 1e-6)), Math.abs(halfH / (dy || 1e-6)));
    return { x: cx + dx * scale, y: cy + dy * scale };
}

/**
 * Conexão entre dois pontos. Quando ligada a um objeto (startObjectId/
 * endObjectId), a ponta correspondente é recalculada a cada render a
 * partir da posição atual do objeto — desliza pela borda dele, na
 * direção da outra ponta — em vez de usar um ponto fixo. Uma ponta sem
 * objeto associado usa startPoint/endPoint (fixo). A geometria da rota
 * (reta/ortogonal/curva + waypoints) é compartilhada com Line via
 * routeGeometry.js.
 */
export class Connector extends Element {
    constructor({
        startObjectId = null,
        endObjectId = null,
        startPoint,
        endPoint,
        routeType = "straight",
        startArrow,
        endArrow,
        startArrowType,
        endArrowType,
        waypoints,
        bend = null, // formato antigo (um único ponto) — migra pra waypoints=[bend] se não vier `waypoints`
        textLabel,
        startAnchor = null,
        endAnchor = null,
        style,
    } = {}) {
        super("connector", {
            x: Math.min(startPoint.x, endPoint.x),
            y: Math.min(startPoint.y, endPoint.y),
            width: Math.abs(endPoint.x - startPoint.x),
            height: Math.abs(endPoint.y - startPoint.y),
            style,
        });
        this.startObjectId = startObjectId;
        this.endObjectId = endObjectId;
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.routeType = routeType;
        this.startArrowType = normalizeArrowType(startArrowType ?? startArrow, "none");
        this.endArrowType = normalizeArrowType(endArrowType ?? endArrow, "open");
        this.waypoints = waypoints ?? (bend ? [bend] : []);
        this.textLabel = defaultLabel({ fontSize: 12, ...textLabel });
        this.startAnchor = startAnchor;
        this.endAnchor = endAnchor;
        this._resolvedStart = startPoint;
        this._resolvedEnd = endPoint;
    }

    /** Ponto fixo (fração fx/fy do bbox, 0-1) — usado no lugar do edgeAnchorPoint dinâmico quando a ponta nasceu ou foi reconectada bem em cima de um ponto de conexão marcado (ver SelectTool._getBoxHandlePositions). */
    _anchorPoint(bounds, anchor) {
        return { x: bounds.x + anchor.fx * bounds.width, y: bounds.y + anchor.fy * bounds.height };
    }

    /** Bounds (mundo) do rótulo embutido, centrado no meio da rota resolvida — usado pelo TextEditor.js (ver `labelBounds`, checado por duck-typing). */
    labelBounds() {
        const mid = routeMidpoint(this._resolvedStart, this._resolvedEnd, this.routeType, this.waypoints);
        return { x: mid.x - LABEL_BOX_WIDTH / 2, y: mid.y - LABEL_BOX_HEIGHT / 2, width: LABEL_BOX_WIDTH, height: LABEL_BOX_HEIGHT };
    }

    /** Recalcula os pontos resolvidos (mundo) a partir dos objetos ligados, se houver, e sincroniza o bbox. */
    resolveEndpoints(scene) {
        const startObj = this.startObjectId ? scene.objects.find((o) => o.id === this.startObjectId) : null;
        const endObj = this.endObjectId ? scene.objects.find((o) => o.id === this.endObjectId) : null;

        const endCenterOrPoint = endObj ? this._center(endObj.getBounds()) : this.endPoint;
        const startCenterOrPoint = startObj ? this._center(startObj.getBounds()) : this.startPoint;

        const start = startObj
            ? this.startAnchor
                ? this._anchorPoint(startObj.getBounds(), this.startAnchor)
                : edgeAnchorPoint(startObj.getBounds(), endCenterOrPoint)
            : this.startPoint;
        const end = endObj
            ? this.endAnchor
                ? this._anchorPoint(endObj.getBounds(), this.endAnchor)
                : edgeAnchorPoint(endObj.getBounds(), startCenterOrPoint)
            : this.endPoint;

        this._resolvedStart = start;
        this._resolvedEnd = end;
        this.x = Math.min(start.x, end.x);
        this.y = Math.min(start.y, end.y);
        this.width = Math.abs(end.x - start.x);
        this.height = Math.abs(end.y - start.y);

        return { start, end };
    }

    _center(bounds) {
        return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    }

    translate(dx, dy) {
        super.translate(dx, dy);
        if (!this.startObjectId) this.startPoint = { x: this.startPoint.x + dx, y: this.startPoint.y + dy };
        if (!this.endObjectId) this.endPoint = { x: this.endPoint.x + dx, y: this.endPoint.y + dy };
        this.waypoints = this.waypoints.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    }

    beforeHitTest(scene) {
        this.resolveEndpoints(scene);
    }

    containsPoint(point, tolerance = 6) {
        return routeContainsPoint(point, this._resolvedStart, this._resolvedEnd, this.routeType, tolerance, this.waypoints);
    }

    render(ctx, camera, scene) {
        const { start, end } = this.resolveEndpoints(scene);
        const a = camera.worldToScreen(start.x, start.y);
        const b = camera.worldToScreen(end.x, end.y);
        const waypoints = this.waypoints.map((p) => camera.worldToScreen(p.x, p.y));

        ctx.save();
        this.applyStyle(ctx);
        if (sketchState.enabled && this.routeType === "straight" && waypoints.length === 0) {
            sketchyLine(ctx, a.x, a.y, b.x, b.y, seedFromId(this.id));
        } else {
            drawRoutePath(ctx, a, b, this.routeType, waypoints);
        }
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

    serialize() {
        return {
            ...super.serialize(),
            startObjectId: this.startObjectId,
            endObjectId: this.endObjectId,
            startPoint: this._resolvedStart ?? this.startPoint,
            endPoint: this._resolvedEnd ?? this.endPoint,
            routeType: this.routeType,
            startArrowType: this.startArrowType,
            endArrowType: this.endArrowType,
            waypoints: this.waypoints,
            startAnchor: this.startAnchor,
            endAnchor: this.endAnchor,
        };
    }

    toSVG() {
        const start = this._resolvedStart ?? this.startPoint;
        const end = this._resolvedEnd ?? this.endPoint;
        const stroke = this.resolvedStroke();
        const markers =
            markerSvg(this.startArrowType, routeNearPoint(start, end, this.routeType, "start", this.waypoints), start, stroke) +
            markerSvg(this.endArrowType, routeNearPoint(start, end, this.routeType, "end", this.waypoints), end, stroke);

        const labelSvg = this.textLabel.text ? labelToSVG(this.textLabel, this.labelBounds()) : "";

        return `<g fill="none" stroke="${stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}">
            <path d="${routeSvgPath(start, end, this.routeType, this.waypoints)}"${this.svgDashArray()} />
            ${markers}
        </g>${labelSvg}`;
    }

    /** Sobrescreve Element.clone(): sem isso, a cópia compartilharia os mesmos objetos de ponto (startPoint/endPoint/waypoints) do original. */
    clone() {
        const copy = super.clone();
        copy.startPoint = { ...this.startPoint };
        copy.endPoint = { ...this.endPoint };
        copy.waypoints = this.waypoints.map((p) => ({ ...p }));
        return copy;
    }
}
