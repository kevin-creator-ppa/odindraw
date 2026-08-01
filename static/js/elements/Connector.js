import { Element } from "./Element.js";
import { distanceToSegment } from "../utils/geometry.js";

const ARROW_SIZE = 12;

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

function drawArrowhead(ctx, from, to) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - ARROW_SIZE * Math.cos(angle - Math.PI / 6), to.y - ARROW_SIZE * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - ARROW_SIZE * Math.cos(angle + Math.PI / 6), to.y - ARROW_SIZE * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

/**
 * Conexão entre dois pontos. Quando ligada a um objeto (startObjectId/
 * endObjectId), a ponta correspondente é recalculada a cada render a
 * partir da posição atual do objeto — desliza pela borda dele, na
 * direção da outra ponta — em vez de usar um ponto fixo. Uma ponta sem
 * objeto associado usa startPoint/endPoint (fixo).
 */
export class Connector extends Element {
    constructor({
        startObjectId = null,
        endObjectId = null,
        startPoint,
        endPoint,
        routeType = "straight",
        startArrow = false,
        endArrow = true,
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
        this.startArrow = startArrow;
        this.endArrow = endArrow;
        this._resolvedStart = startPoint;
        this._resolvedEnd = endPoint;
    }

    /** Recalcula os pontos resolvidos (mundo) a partir dos objetos ligados, se houver, e sincroniza o bbox. */
    resolveEndpoints(scene) {
        const startObj = this.startObjectId ? scene.objects.find((o) => o.id === this.startObjectId) : null;
        const endObj = this.endObjectId ? scene.objects.find((o) => o.id === this.endObjectId) : null;

        const endCenterOrPoint = endObj ? this._center(endObj.getBounds()) : this.endPoint;
        const startCenterOrPoint = startObj ? this._center(startObj.getBounds()) : this.startPoint;

        const start = startObj ? edgeAnchorPoint(startObj.getBounds(), endCenterOrPoint) : this.startPoint;
        const end = endObj ? edgeAnchorPoint(endObj.getBounds(), startCenterOrPoint) : this.endPoint;

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
    }

    beforeHitTest(scene) {
        this.resolveEndpoints(scene);
    }

    containsPoint(point, tolerance = 6) {
        const start = this._resolvedStart;
        const end = this._resolvedEnd;
        if (this.routeType === "orthogonal") {
            const corner = { x: end.x, y: start.y };
            return Math.min(distanceToSegment(point, start, corner), distanceToSegment(point, corner, end)) <= tolerance;
        }
        // Curva aproximada pela reta entre os pontos — suficiente para clique/seleção.
        return distanceToSegment(point, start, end) <= tolerance;
    }

    render(ctx, camera, scene) {
        const { start, end } = this.resolveEndpoints(scene);
        const a = camera.worldToScreen(start.x, start.y);
        const b = camera.worldToScreen(end.x, end.y);

        ctx.save();
        this.applyStyle(ctx);
        this._drawRoute(ctx, a, b);
        if (this.startArrow) drawArrowhead(ctx, b, a);
        if (this.endArrow) drawArrowhead(ctx, a, b);
        ctx.restore();
    }

    _drawRoute(ctx, a, b) {
        ctx.beginPath();
        if (this.routeType === "orthogonal") {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, a.y);
            ctx.lineTo(b.x, b.y);
        } else if (this.routeType === "curved") {
            const midX = (a.x + b.x) / 2;
            ctx.moveTo(a.x, a.y);
            ctx.bezierCurveTo(midX, a.y, midX, b.y, b.x, b.y);
        } else {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
    }

    serialize() {
        return {
            ...super.serialize(),
            startObjectId: this.startObjectId,
            endObjectId: this.endObjectId,
            startPoint: this._resolvedStart ?? this.startPoint,
            endPoint: this._resolvedEnd ?? this.endPoint,
            routeType: this.routeType,
            startArrow: this.startArrow,
            endArrow: this.endArrow,
        };
    }

    toSVG() {
        const start = this._resolvedStart ?? this.startPoint;
        const end = this._resolvedEnd ?? this.endPoint;
        const pathD =
            this.routeType === "orthogonal"
                ? `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`
                : this.routeType === "curved"
                  ? `M ${start.x} ${start.y} C ${(start.x + end.x) / 2} ${start.y}, ${(start.x + end.x) / 2} ${end.y}, ${end.x} ${end.y}`
                  : `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
        return `<path d="${pathD}" fill="none" stroke="${this.style.stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}" />`;
    }
}
