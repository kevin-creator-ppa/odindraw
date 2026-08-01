import { Element } from "./Element.js";

function escapeXml(value) {
    return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

/**
 * Elemento de texto. A edição inline (duplo clique para digitar) fica
 * para um refinamento posterior; por ora o conteúdo é definido na
 * criação e editável apenas via dados serializados.
 */
export class Text extends Element {
    constructor({ x, y, content = "Texto", font = "Inter", fontSize = 14, align = "left", style } = {}) {
        const width = Math.max(40, content.length * fontSize * 0.6);
        const height = fontSize * 1.4;
        super("text", { x, y, width, height, style: { fill: "#1e1e1e", strokeWidth: 0, ...style } });
        this.content = content;
        this.font = font;
        this.fontSize = fontSize;
        this.align = align;
    }

    drawShape(ctx, x, y, width, height) {
        ctx.font = `${this.fontSize}px ${this.font}, sans-serif`;
        ctx.textBaseline = "middle";
        ctx.textAlign = this.align;
        const textX = this.align === "center" ? x + width / 2 : this.align === "right" ? x + width : x;
        ctx.fillText(this.content, textX, y + height / 2);
    }

    toSVG() {
        const anchor = this.align === "center" ? "middle" : this.align === "right" ? "end" : "start";
        return `<text x="${this.x}" y="${this.y + this.height / 2}" font-family="${this.font}" font-size="${this.fontSize}" text-anchor="${anchor}" dominant-baseline="middle" fill="${this.style.fill}">${escapeXml(this.content)}</text>`;
    }

    serialize() {
        return { ...super.serialize(), content: this.content, font: this.font, fontSize: this.fontSize, align: this.align };
    }
}
