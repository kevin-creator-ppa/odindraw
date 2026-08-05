import { Element } from "./Element.js";
import { defaultLabel, drawLabel, labelToSVG } from "./shapeLabel.js";
import { sketchState, sketchyEllipse, seedFromId } from "./sketch.js";

/** Elipse com um rótulo de texto opcional embutido (duplo clique pra editar — ver TextEditor.js), centralizado e que quebra/encolhe pra caber. */
export class Ellipse extends Element {
    constructor({ textLabel, ...props } = {}) {
        super("ellipse", props);
        this.textLabel = defaultLabel(textLabel);
    }

    drawShape(ctx, x, y, width, height) {
        if (sketchState.enabled) {
            if (this.style.fill !== "transparent") {
                ctx.beginPath();
                ctx.ellipse(x + width / 2, y + height / 2, Math.abs(width) / 2, Math.abs(height) / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            if (this.style.strokeWidth > 0) sketchyEllipse(ctx, x, y, width, height, seedFromId(this.id));
        } else {
            ctx.beginPath();
            ctx.ellipse(x + width / 2, y + height / 2, Math.abs(width) / 2, Math.abs(height) / 2, 0, 0, Math.PI * 2);
            if (this.style.fill !== "transparent") ctx.fill();
            if (this.style.strokeWidth > 0) ctx.stroke();
        }

        if (this.isEditing) return;
        const zoom = this.width > 0 ? width / this.width : 1;
        drawLabel(ctx, this.textLabel, { x, y, width, height }, zoom);
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
        const labelSvg = labelToSVG(this.textLabel, { x: this.x, y: this.y, width: this.width, height: this.height });
        return `<g${this.svgTransform()}><ellipse cx="${cx}" cy="${cy}" rx="${Math.abs(this.width) / 2}" ry="${Math.abs(this.height) / 2}" fill="${this.resolvedFill()}" stroke="${this.resolvedStroke()}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()} />${labelSvg}</g>`;
    }
}
