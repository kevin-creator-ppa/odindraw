import { Element } from "./Element.js";
import { ICONS } from "./icons/iconDefinitions.js";
import { drawIconOnCanvas, iconToSvgMarkup } from "./icons/iconRenderer.js";

const ICON_VIEWBOX = 100;
const LABEL_AREA_RATIO = 0.28;

/** Objeto da biblioteca de componentes (Etapa 9): um ícone vetorial + rótulo, com o mesmo contrato dos demais Elements. */
export class Component extends Element {
    constructor({ componentType, label, x, y, width = 90, height = 90, style } = {}) {
        super("component", { x, y, width, height, style: { fill: "transparent", strokeWidth: 2.5, ...style } });
        this.componentType = componentType;
        this.label = label ?? componentType;
    }

    _iconHeight() {
        return this.label ? this.height * (1 - LABEL_AREA_RATIO) : this.height;
    }

    drawShape(ctx, x, y, width, height) {
        const commands = ICONS[this.componentType] ?? [];
        const iconHeight = this.label ? height * (1 - LABEL_AREA_RATIO) : height;
        drawIconOnCanvas(ctx, commands, x, y, width, iconHeight, this.resolvedStroke(), ICON_VIEWBOX);

        if (!this.label) return;
        ctx.save();
        ctx.fillStyle = this.resolvedStroke();
        ctx.font = `${Math.max(10, height * 0.13)}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(this.label, x + width / 2, y + iconHeight + height * 0.05);
        ctx.restore();
    }

    toSVG() {
        const commands = ICONS[this.componentType] ?? [];
        const iconHeight = this._iconHeight();
        const stroke = this.resolvedStroke();
        const iconSvg = iconToSvgMarkup(commands, this.x, this.y, this.width, iconHeight, stroke, ICON_VIEWBOX);
        const labelSvg = this.label
            ? `<text x="${this.x + this.width / 2}" y="${this.y + iconHeight + this.height * 0.14}" font-family="Inter, sans-serif" font-size="${Math.max(10, this.height * 0.13)}" text-anchor="middle" fill="${stroke}">${this.label}</text>`
            : "";
        return `<g opacity="${this.style.opacity}"${this.svgTransform()}>${iconSvg}${labelSvg}</g>`;
    }

    serialize() {
        return { ...super.serialize(), componentType: this.componentType, label: this.label };
    }
}
