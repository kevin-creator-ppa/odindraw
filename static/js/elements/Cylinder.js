import { Element } from "./Element.js";
import { defaultLabel, drawLabel, labelToSVG } from "./shapeLabel.js";

const CAP_RATIO = 0.22;

/** Cilindro (ícone de banco de dados) com rótulo de texto opcional embutido. */
export class Cylinder extends Element {
    constructor({ textLabel, ...props } = {}) {
        super("cylinder", props);
        this.textLabel = defaultLabel(textLabel);
    }

    _capHeight(width, height) {
        return Math.min(height * CAP_RATIO, height / 2 - 1, width / 2);
    }

    _labelBounds(x, y, width, height) {
        const capH = this._capHeight(width, height);
        return { x: x + width * 0.1, y: y + capH * 1.6, width: width * 0.8, height: height - capH * 2.6 };
    }

    /**
     * O corpo é preenchido como um bloco fechado com a costura reta do topo
     * (invisível, fica coberta pela "tampa"); os contornos visíveis do corpo
     * são traçados à parte (laterais + arco frontal da base, nunca a
     * costura reta) pra não aparecer uma linha reta cruzando o topo. A tampa
     * é uma elipse completa desenhada por cima, com preenchimento e contorno
     * próprios.
     */
    drawShape(ctx, x, y, width, height) {
        const capH = this._capHeight(width, height);
        const cx = x + width / 2;
        const left = x;
        const right = x + width;
        const top = y;
        const bottom = y + height;

        ctx.beginPath();
        ctx.moveTo(left, top + capH);
        ctx.lineTo(left, bottom - capH);
        ctx.ellipse(cx, bottom - capH, width / 2, capH, 0, Math.PI, 0, true);
        ctx.lineTo(right, top + capH);
        ctx.closePath();
        if (this.style.fill !== "transparent") ctx.fill();

        if (this.style.strokeWidth > 0) {
            ctx.beginPath();
            ctx.moveTo(left, top + capH);
            ctx.lineTo(left, bottom - capH);
            ctx.moveTo(left, bottom - capH);
            ctx.ellipse(cx, bottom - capH, width / 2, capH, 0, Math.PI, 0, true);
            ctx.moveTo(right, bottom - capH);
            ctx.lineTo(right, top + capH);
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.ellipse(cx, top + capH, width / 2, capH, 0, 0, Math.PI * 2);
        if (this.style.fill !== "transparent") ctx.fill();
        if (this.style.strokeWidth > 0) ctx.stroke();

        if (this.isEditing) return;
        const zoom = this.width > 0 ? width / this.width : 1;
        drawLabel(ctx, this.textLabel, this._labelBounds(x, y, width, height), zoom);
    }

    /** Aproximação simples: retângulo do bbox (o corte das bordas do "boné" é pequeno o bastante pra não importar no clique). */
    containsPoint(point) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const rad = (-this.rotation * Math.PI) / 180;
        const dx = point.x - cx;
        const dy = point.y - cy;
        const localX = cx + (dx * Math.cos(rad) - dy * Math.sin(rad));
        const localY = cy + (dx * Math.sin(rad) + dy * Math.cos(rad));
        return localX >= this.x && localX <= this.x + this.width && localY >= this.y && localY <= this.y + this.height;
    }

    toSVG() {
        const capH = this._capHeight(this.width, this.height);
        const cx = this.x + this.width / 2;
        const left = this.x;
        const right = this.x + this.width;
        const top = this.y;
        const bottom = this.y + this.height;
        const rx = this.width / 2;
        const opacity = this.style.opacity;
        const strokeWidth = this.style.strokeWidth;
        const stroke = this.resolvedStroke();
        const fill = this.resolvedFill();

        const bodyFillPath = `M ${left} ${top + capH} L ${left} ${bottom - capH} A ${rx} ${capH} 0 0 0 ${right} ${bottom - capH} L ${right} ${top + capH} Z`;
        const bodyStrokePath = `M ${left} ${top + capH} L ${left} ${bottom - capH} M ${left} ${bottom - capH} A ${rx} ${capH} 0 0 0 ${right} ${bottom - capH} M ${right} ${bottom - capH} L ${right} ${top + capH}`;
        const labelSvg = labelToSVG(this.textLabel, this._labelBounds(this.x, this.y, this.width, this.height));

        return `<g${this.svgTransform()}>
            <path d="${bodyFillPath}" fill="${fill}" stroke="none" opacity="${opacity}" />
            <path d="${bodyStrokePath}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"${this.svgDashArray()} />
            <ellipse cx="${cx}" cy="${top + capH}" rx="${rx}" ry="${capH}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"${this.svgDashArray()} />
            ${labelSvg}
        </g>`;
    }
}
