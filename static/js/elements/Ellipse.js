import { Element } from "./Element.js";

export class Ellipse extends Element {
    constructor(props) {
        super("ellipse", props);
    }

    drawShape(ctx, x, y, width, height) {
        ctx.beginPath();
        ctx.ellipse(x + width / 2, y + height / 2, Math.abs(width) / 2, Math.abs(height) / 2, 0, 0, Math.PI * 2);
        if (this.style.fill !== "transparent") ctx.fill();
        if (this.style.strokeWidth > 0) ctx.stroke();
    }

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
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        return `<ellipse cx="${cx}" cy="${cy}" rx="${Math.abs(this.width) / 2}" ry="${Math.abs(this.height) / 2}" fill="${this.style.fill}" stroke="${this.style.stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()} transform="rotate(${this.rotation} ${cx} ${cy})" />`;
    }
}
