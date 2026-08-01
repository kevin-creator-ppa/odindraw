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

function arrowheadWings(from, to) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    return [
        { x: to.x - ARROW_SIZE * Math.cos(angle - Math.PI / 6), y: to.y - ARROW_SIZE * Math.sin(angle - Math.PI / 6) },
        { x: to.x - ARROW_SIZE * Math.cos(angle + Math.PI / 6), y: to.y - ARROW_SIZE * Math.sin(angle + Math.PI / 6) },
    ];
}

function drawArrowhead(ctx, from, to) {
    const [wing1, wing2] = arrowheadWings(from, to);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(wing1.x, wing1.y);
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(wing2.x, wing2.y);
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
        if (this.startArrow) drawArrowhead(ctx, this._nearPoint(a, b, "start"), a);
        if (this.endArrow) drawArrowhead(ctx, this._nearPoint(a, b, "end"), b);
        ctx.restore();
    }

    /**
     * Ponto adjacente ao início/fim ao longo da rota (não o outro extremo),
     * usado só para calcular o ângulo da seta — em rotas ortogonais/curvas
     * a direção real no bico é a do último trecho, não a linha reta entre
     * os dois extremos.
     */
    _nearPoint(a, b, which) {
        if (this.routeType === "orthogonal") return { x: b.x, y: a.y };
        if (this.routeType === "curved") {
            const midX = (a.x + b.x) / 2;
            return { x: midX, y: which === "start" ? a.y : b.y };
        }
        return which === "start" ? b : a;
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

        const arrowLines = [];
        if (this.startArrow) arrowLines.push(...this._arrowheadSvgLines(this._nearPoint(start, end, "start"), start));
        if (this.endArrow) arrowLines.push(...this._arrowheadSvgLines(this._nearPoint(start, end, "end"), end));

        return `<g fill="none" stroke="${this.style.stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}">
            <path d="${pathD}"${this.svgDashArray()} />
            ${arrowLines.join("\n            ")}
        </g>`;
    }

    _arrowheadSvgLines(from, to) {
        const [wing1, wing2] = arrowheadWings(from, to);
        return [
            `<line x1="${to.x}" y1="${to.y}" x2="${wing1.x}" y2="${wing1.y}" />`,
            `<line x1="${to.x}" y1="${to.y}" x2="${wing2.x}" y2="${wing2.y}" />`,
        ];
    }
}
