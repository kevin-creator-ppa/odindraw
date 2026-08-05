import { Element } from "./Element.js";
import { defaultLabel, drawLabel, labelToSVG } from "./shapeLabel.js";

/** Retângulo com um rótulo de texto opcional embutido (duplo clique pra editar — ver TextEditor.js), centralizado e que quebra/encolhe pra caber. `rounded` alterna cantos retos/arredondados (ver PropertiesPanel.js, aba Estilo). */
export class Rectangle extends Element {
    constructor({ textLabel, rounded = false, ...props } = {}) {
        super("rectangle", props);
        this.textLabel = defaultLabel(textLabel);
        this.rounded = rounded;
    }

    _cornerRadius(width, height) {
        return Math.min(width, height) * 0.12;
    }

    drawShape(ctx, x, y, width, height) {
        if (this.style.fill !== "transparent" || this.style.strokeWidth > 0) {
            ctx.beginPath();
            if (this.rounded) ctx.roundRect(x, y, width, height, this._cornerRadius(width, height));
            else ctx.rect(x, y, width, height);
            if (this.style.fill !== "transparent") ctx.fill();
            if (this.style.strokeWidth > 0) ctx.stroke();
        }

        if (this.isEditing) return;
        const zoom = this.width > 0 ? width / this.width : 1;
        drawLabel(ctx, this.textLabel, { x, y, width, height }, zoom);
    }

    toSVG() {
        const labelSvg = labelToSVG(this.textLabel, { x: this.x, y: this.y, width: this.width, height: this.height });
        const r = this.rounded ? this._cornerRadius(this.width, this.height) : 0;
        return `<g${this.svgTransform()}><rect x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" rx="${r}" ry="${r}" fill="${this.resolvedFill()}" stroke="${this.resolvedStroke()}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}"${this.svgDashArray()} />${labelSvg}</g>`;
    }

    serialize() {
        return { ...super.serialize(), rounded: this.rounded };
    }
}
