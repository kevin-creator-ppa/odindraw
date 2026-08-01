import { Element } from "./Element.js";
import { defaultLabel, drawLabel, labelToSVG } from "./shapeLabel.js";

/** Retângulo com um rótulo de texto opcional embutido (duplo clique pra editar — ver TextEditor.js), centralizado e que quebra/encolhe pra caber. */
export class Rectangle extends Element {
    constructor({ textLabel, ...props } = {}) {
        super("rectangle", props);
        this.textLabel = defaultLabel(textLabel);
    }

    drawShape(ctx, x, y, width, height) {
        if (this.style.fill !== "transparent") ctx.fillRect(x, y, width, height);
        if (this.style.strokeWidth > 0) ctx.strokeRect(x, y, width, height);

        if (this.isEditing) return;
        const zoom = this.width > 0 ? width / this.width : 1;
        drawLabel(ctx, this.textLabel, { x, y, width, height }, zoom);
    }

    toSVG() {
        const labelSvg = labelToSVG(this.textLabel, { x: this.x, y: this.y, width: this.width, height: this.height });
        return `<g${this.svgTransform()}><rect x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" fill="${this.resolvedFill()}" stroke="${this.resolvedStroke()}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()} />${labelSvg}</g>`;
    }
}
