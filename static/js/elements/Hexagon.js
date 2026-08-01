import { Element } from "./Element.js";
import { defaultLabel, drawLabel, labelToSVG } from "./shapeLabel.js";

/** Hexágono (fluxograma "preparação") com rótulo de texto opcional embutido — topo/base retos, laterais em ponta. */
export class Hexagon extends Element {
    constructor({ textLabel, ...props } = {}) {
        super("hexagon", props);
        this.textLabel = defaultLabel(textLabel);
    }

    _localPoints(width, height) {
        return [
            { x: -width * 0.25, y: -height / 2 },
            { x: width * 0.25, y: -height / 2 },
            { x: width / 2, y: 0 },
            { x: width * 0.25, y: height / 2 },
            { x: -width * 0.25, y: height / 2 },
            { x: -width / 2, y: 0 },
        ];
    }

    _labelBounds(x, y, width, height) {
        return { x: x + width * 0.28, y: y + height * 0.15, width: width * 0.44, height: height * 0.7 };
    }

    drawShape(ctx, x, y, width, height) {
        const points = this._localPoints(width, height);
        ctx.beginPath();
        points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        if (this.style.fill !== "transparent") ctx.fill();
        if (this.style.strokeWidth > 0) ctx.stroke();

        if (this.isEditing) return;
        const zoom = this.width > 0 ? width / this.width : 1;
        drawLabel(ctx, this.textLabel, this._labelBounds(x, y, width, height), zoom);
    }

    /** Pra cada altura Y, a metade da largura disponível encolhe linearmente de halfW (no meio) até 0.5*halfW (topo/base). */
    containsPoint(point) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const rad = (-this.rotation * Math.PI) / 180;
        const dx = point.x - cx;
        const dy = point.y - cy;
        const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localY = dx * Math.sin(rad) + dy * Math.cos(rad);
        const halfW = Math.abs(this.width) / 2 || 1;
        const halfH = Math.abs(this.height) / 2 || 1;
        if (Math.abs(localY) > halfH) return false;
        const t = Math.abs(localY) / halfH;
        const halfWidthAtY = halfW * (1 - 0.5 * t);
        return Math.abs(localX) <= halfWidthAtY;
    }

    toSVG() {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const points = this._localPoints(this.width, this.height).map((p) => `${cx + p.x},${cy + p.y}`).join(" ");
        const labelSvg = labelToSVG(this.textLabel, this._labelBounds(this.x, this.y, this.width, this.height));
        return `<g${this.svgTransform()}><polygon points="${points}" fill="${this.resolvedFill()}" stroke="${this.resolvedStroke()}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()} />${labelSvg}</g>`;
    }
}
