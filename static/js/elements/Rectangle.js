import { Element } from "./Element.js";

export class Rectangle extends Element {
    constructor(props) {
        super("rectangle", props);
    }

    drawShape(ctx, x, y, width, height) {
        if (this.style.fill !== "transparent") ctx.fillRect(x, y, width, height);
        if (this.style.strokeWidth > 0) ctx.strokeRect(x, y, width, height);
    }

    toSVG() {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        return `<rect x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" fill="${this.style.fill}" stroke="${this.style.stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()} transform="rotate(${this.rotation} ${cx} ${cy})" />`;
    }
}
