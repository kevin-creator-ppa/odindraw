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

export class Freehand extends Element {
    constructor({ points, style } = {}) {
        super("freehand", { ...boundsFromPoints(points), style: { fill: "transparent", ...style } });
        this.points = points;
    }

    translate(dx, dy) {
        super.translate(dx, dy);
        this.points = this.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    }

    render(ctx, camera) {
        ctx.save();
        this.applyStyle(ctx);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        this.points.forEach((p, i) => {
            const s = camera.worldToScreen(p.x, p.y);
            if (i === 0) ctx.moveTo(s.x, s.y);
            else ctx.lineTo(s.x, s.y);
        });
        ctx.stroke();
        ctx.restore();
    }

    containsPoint(point, tolerance = 8) {
        for (let i = 0; i < this.points.length - 1; i++) {
            if (distanceToSegment(point, this.points[i], this.points[i + 1]) <= tolerance) return true;
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
        const pointsAttr = this.points.map((p) => `${p.x},${p.y}`).join(" ");
        return `<polyline points="${pointsAttr}" fill="none" stroke="${this.style.stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()} stroke-linecap="round" stroke-linejoin="round" />`;
    }
}
