import { Element } from "./Element.js";
import { defaultLabel, drawLabel, labelToSVG } from "./shapeLabel.js";

const HEADER_HEIGHT = 28;

/**
 * Container/raia (swimlane): forma retangular com uma faixa de
 * cabeçalho, que "contém" outros elementos — arrastar o container move
 * os filhos junto (ver `containerId` em Element.js e a lógica de
 * arraste/pertencimento em tools/SelectTool.js). Um elemento vira
 * filho de um container quando seu centro é solto dentro dele.
 */
export class Container extends Element {
    constructor({ textLabel, ...props } = {}) {
        super("container", { style: { fill: "transparent", ...props.style }, ...props });
        this.textLabel = defaultLabel({ text: "Container", align: "left", ...textLabel });
    }

    _headerHeight(height) {
        return Math.min(HEADER_HEIGHT, height);
    }

    drawShape(ctx, x, y, width, height) {
        const headerH = this._headerHeight(height);

        if (this.style.fill !== "transparent") ctx.fillRect(x, y, width, height);
        if (this.style.strokeWidth > 0) ctx.strokeRect(x, y, width, height);

        ctx.save();
        ctx.globalAlpha = this.style.opacity * 0.5;
        ctx.fillStyle = this.resolvedStroke();
        ctx.fillRect(x, y, width, headerH);
        ctx.restore();

        if (this.style.strokeWidth > 0) {
            ctx.beginPath();
            ctx.moveTo(x, y + headerH);
            ctx.lineTo(x + width, y + headerH);
            ctx.stroke();
        }

        if (this.isEditing) return;
        const zoom = this.width > 0 ? width / this.width : 1;
        drawLabel(ctx, this.textLabel, { x: x + 6 * zoom, y, width: width - 12 * zoom, height: headerH }, zoom);
    }

    toSVG() {
        const headerH = this._headerHeight(this.height);
        const stroke = this.resolvedStroke();
        const labelSvg = labelToSVG(this.textLabel, { x: this.x + 6, y: this.y, width: this.width - 12, height: headerH });
        const fill =
            this.style.fill !== "transparent"
                ? `<rect x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" fill="${this.resolvedFill()}" />`
                : "";
        return `<g opacity="${this.style.opacity}"${this.svgTransform()}>
            ${fill}
            <rect x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" fill="none" stroke="${stroke}" stroke-width="${this.style.strokeWidth}" />
            <rect x="${this.x}" y="${this.y}" width="${this.width}" height="${headerH}" fill="${stroke}" opacity="0.15" />
            <line x1="${this.x}" y1="${this.y + headerH}" x2="${this.x + this.width}" y2="${this.y + headerH}" stroke="${stroke}" stroke-width="${this.style.strokeWidth}" />
            ${labelSvg}
        </g>`;
    }
}
