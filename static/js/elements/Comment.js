import { Element } from "./Element.js";
import { defaultLabel, drawLabel, labelToSVG } from "./shapeLabel.js";

const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 100;
const NOTE_FILL = "#fff3bf";
const NOTE_STROKE = "#f1c40f";
const FOLD_RATIO = 0.18;

/**
 * Anotação fixada no diagrama — visualmente um post-it com o canto
 * superior direito dobrado, texto editável por duplo clique (mesmo
 * mecanismo de rótulo embutido do Rectangle — ver TextEditor.js).
 *
 * Não é um sistema de comentários encadeados com autor/resposta (o app
 * é de uma sessão só, sem contas) — é uma nota livre, útil pra deixar
 * observações no diagrama. Combina bem com camadas: dá pra jogar todas
 * as notas numa camada "Notas" e ocultá-las de uma vez (ver LayersPanel).
 */
export class Comment extends Element {
    constructor({ textLabel, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, style, ...props } = {}) {
        super("comment", {
            ...props,
            width,
            height,
            style: { fill: NOTE_FILL, stroke: NOTE_STROKE, strokeWidth: 1.5, ...style },
        });
        this.textLabel = defaultLabel({ align: "left", fontSize: 13, ...textLabel });
    }

    _fold(width, height) {
        return Math.min(width, height) * FOLD_RATIO;
    }

    drawShape(ctx, x, y, width, height) {
        const fold = this._fold(width, height);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width - fold, y);
        ctx.lineTo(x + width, y + fold);
        ctx.lineTo(x + width, y + height);
        ctx.lineTo(x, y + height);
        ctx.closePath();
        if (this.style.fill !== "transparent") ctx.fill();
        if (this.style.strokeWidth > 0) ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + width - fold, y);
        ctx.lineTo(x + width - fold, y + fold);
        ctx.lineTo(x + width, y + fold);
        ctx.stroke();

        if (this.isEditing) return;
        const zoom = this.width > 0 ? width / this.width : 1;
        drawLabel(ctx, this.textLabel, { x, y, width, height }, zoom);
    }

    toSVG() {
        const fold = this._fold(this.width, this.height);
        const { x, y, width, height } = this;
        const stroke = this.resolvedStroke();
        const path = `M ${x} ${y} L ${x + width - fold} ${y} L ${x + width} ${y + fold} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
        const foldPath = `M ${x + width - fold} ${y} L ${x + width - fold} ${y + fold} L ${x + width} ${y + fold}`;
        const labelSvg = labelToSVG(this.textLabel, { x, y, width, height });
        return `<g${this.svgTransform()}>
            <path d="${path}" fill="${this.resolvedFill()}" stroke="${stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}" />
            <path d="${foldPath}" fill="none" stroke="${stroke}" stroke-width="${this.style.strokeWidth}" />
            ${labelSvg}
        </g>`;
    }
}
