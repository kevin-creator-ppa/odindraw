import { Element } from "./Element.js";
import { defaultLabel, drawLabel, labelToSVG } from "./shapeLabel.js";

/** Nuvem (rede/"Internet") com rótulo de texto opcional embutido — contorno fixo em bezier, escalado pro bbox. */
export class Cloud extends Element {
    constructor({ textLabel, ...props } = {}) {
        super("cloud", props);
        this.textLabel = defaultLabel(textLabel);
    }

    /** Pontos de controle normalizados (0..1) de um contorno de nuvem — escalados por width/height em _path(). */
    _segments() {
        return [
            { c1: [0.05, 0.62], c2: [0.0, 0.5], to: [0.08, 0.34] },
            { c1: [0.02, 0.16], c2: [0.22, 0.08], to: [0.32, 0.22] },
            { c1: [0.34, 0.02], c2: [0.62, -0.02], to: [0.7, 0.16] },
            { c1: [0.86, 0.08], c2: [1.02, 0.22], to: [0.92, 0.4] },
            { c1: [1.08, 0.42], c2: [1.05, 0.68], to: [0.86, 0.72] },
            { c1: [0.9, 0.88], c2: [0.68, 0.96], to: [0.56, 0.84] },
            { c1: [0.46, 0.98], c2: [0.2, 0.96], to: [0.14, 0.8] },
            { c1: [0.0, 0.82], c2: [-0.02, 0.68], to: [0.05, 0.62] },
        ];
    }

    _path(ctx, x, y, width, height) {
        const map = ([px, py]) => ({ x: x + px * width, y: y + py * height });
        const segments = this._segments();
        const start = map(segments[0].to);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        segments.forEach((seg, i) => {
            const next = segments[(i + 1) % segments.length];
            const c1 = map(seg.c2 ?? seg.c1);
            const c2 = map(next.c1);
            const to = map(next.to);
            ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, to.x, to.y);
        });
        ctx.closePath();
    }

    _labelBounds(x, y, width, height) {
        return { x: x + width * 0.22, y: y + height * 0.32, width: width * 0.56, height: height * 0.4 };
    }

    drawShape(ctx, x, y, width, height) {
        this._path(ctx, x, y, width, height);
        if (this.style.fill !== "transparent") ctx.fill();
        if (this.style.strokeWidth > 0) ctx.stroke();

        if (this.isEditing) return;
        const zoom = this.width > 0 ? width / this.width : 1;
        drawLabel(ctx, this.textLabel, this._labelBounds(x, y, width, height), zoom);
    }

    /** Aproximação por elipse inscrita no bbox — mais fiel ao contorno arredondado da nuvem do que um retângulo. */
    containsPoint(point) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const rad = (-this.rotation * Math.PI) / 180;
        const dx = point.x - cx;
        const dy = point.y - cy;
        const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
        const localY = dx * Math.sin(rad) + dy * Math.cos(rad);
        const rx = Math.abs(this.width) / 2 || 1;
        const ry = Math.abs(this.height) / 2 || 1;
        return (localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1;
    }

    toSVG() {
        const map = ([px, py]) => ({ x: this.x + px * this.width, y: this.y + py * this.height });
        const segments = this._segments();
        const start = map(segments[0].to);
        let d = `M ${start.x} ${start.y}`;
        segments.forEach((seg, i) => {
            const next = segments[(i + 1) % segments.length];
            const c1 = map(seg.c2 ?? seg.c1);
            const c2 = map(next.c1);
            const to = map(next.to);
            d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
        });
        d += " Z";

        const labelSvg = labelToSVG(this.textLabel, this._labelBounds(this.x, this.y, this.width, this.height));
        return `<g${this.svgTransform()}><path d="${d}" fill="${this.resolvedFill()}" stroke="${this.resolvedStroke()}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()} />${labelSvg}</g>`;
    }
}
