import { Element } from "./Element.js";
import { distanceToSegment } from "../utils/geometry.js";

function boundsFromPoints(points) {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
    };
}

/** Traço livre. Usa o render()/containsPoint() padrão de Element (via drawShape) para poder girar como qualquer outra forma. */
export class Freehand extends Element {
    constructor({ points, style } = {}) {
        super("freehand", { ...boundsFromPoints(points), style: { fill: "transparent", ...style } });
        this.points = points;
    }

    translate(dx, dy) {
        super.translate(dx, dy);
        this.points = this.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    }

    /** `x,y,width,height` chegam em pixels de tela, relativos ao centro já rotacionado (ver Element.render). */
    drawShape(ctx, x, y, width, height) {
        const scale = this.width > 0 ? width / this.width : 1;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        this.points.forEach((p, i) => {
            const lx = (p.x - cx) * scale;
            const ly = (p.y - cy) * scale;
            if (i === 0) ctx.moveTo(lx, ly);
            else ctx.lineTo(lx, ly);
        });
        ctx.stroke();
    }

    containsPoint(point, tolerance = 8) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const rad = (-this.rotation * Math.PI) / 180;
        const dx = point.x - cx;
        const dy = point.y - cy;
        const localPoint = {
            x: cx + (dx * Math.cos(rad) - dy * Math.sin(rad)),
            y: cy + (dx * Math.sin(rad) + dy * Math.cos(rad)),
        };

        for (let i = 0; i < this.points.length - 1; i++) {
            if (distanceToSegment(localPoint, this.points[i], this.points[i + 1]) <= tolerance) return true;
        }
        return false;
    }

    clone() {
        const copy = super.clone();
        copy.points = this.points.map((p) => ({ ...p }));
        return copy;
    }

    serialize() {
        return { ...super.serialize(), points: this.points };
    }

    toSVG() {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const pointsAttr = this.points.map((p) => `${p.x},${p.y}`).join(" ");
        return `<polyline points="${pointsAttr}" fill="none" stroke="${this.style.stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()} stroke-linecap="round" stroke-linejoin="round" transform="rotate(${this.rotation} ${cx} ${cy})" />`;
    }
}
