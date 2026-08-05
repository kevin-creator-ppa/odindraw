import { Element } from "./Element.js";
import { defaultLabel, drawLabel, labelToSVG } from "./shapeLabel.js";
import { sketchState, sketchyPolygon, seedFromId } from "./sketch.js";

/** Triângulo com rótulo de texto opcional embutido — aponta pra cima, base ocupando a largura inferior do bbox. */
export class Triangle extends Element {
    constructor({ textLabel, ...props } = {}) {
        super("triangle", props);
        this.textLabel = defaultLabel(textLabel);
    }

    _localPoints(width, height) {
        return [
            { x: 0, y: -height / 2 },
            { x: width / 2, y: height / 2 },
            { x: -width / 2, y: height / 2 },
        ];
    }

    /** Retângulo inscrito na metade inferior do triângulo, onde o rótulo é centralizado. */
    _labelBounds(x, y, width, height) {
        return { x: x + width * 0.15, y: y + height * 0.45, width: width * 0.7, height: height * 0.5 };
    }

    drawShape(ctx, x, y, width, height) {
        const points = this._localPoints(width, height);
        if (sketchState.enabled) {
            if (this.style.fill !== "transparent") {
                ctx.beginPath();
                points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
                ctx.closePath();
                ctx.fill();
            }
            if (this.style.strokeWidth > 0) sketchyPolygon(ctx, points, seedFromId(this.id));
        } else {
            ctx.beginPath();
            points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
            ctx.closePath();
            if (this.style.fill !== "transparent") ctx.fill();
            if (this.style.strokeWidth > 0) ctx.stroke();
        }

        if (this.isEditing) return;
        const zoom = this.width > 0 ? width / this.width : 1;
        drawLabel(ctx, this.textLabel, this._labelBounds(x, y, width, height), zoom);
    }

    /** Triângulo isósceles apontando pra cima: pra cada altura Y, a metade da largura disponível cresce linearmente do ápice até a base. */
    containsPoint(point) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const rad = (-this.rotation * Math.PI) / 180;
        const dx = point.x - cx;
        const dy = point.y - cy;
        const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localY = dx * Math.sin(rad) + dy * Math.cos(rad);
        const halfW = Math.abs(this.width) / 2 || 1;
        const h = Math.abs(this.height) || 1;
        const topY = -h / 2;
        const baseY = h / 2;
        if (localY < topY || localY > baseY) return false;
        const t = (localY - topY) / h;
        return Math.abs(localX) <= halfW * t;
    }

    toSVG() {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const points = this._localPoints(this.width, this.height).map((p) => `${cx + p.x},${cy + p.y}`).join(" ");
        const labelSvg = labelToSVG(this.textLabel, this._labelBounds(this.x, this.y, this.width, this.height));
        return `<g${this.svgTransform()}><polygon points="${points}" fill="${this.resolvedFill()}" stroke="${this.resolvedStroke()}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()} />${labelSvg}</g>`;
    }
}
