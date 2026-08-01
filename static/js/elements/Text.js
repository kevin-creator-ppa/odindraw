import { Element } from "./Element.js";

let measureCtx = null;
function getMeasureCtx() {
    if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
    return measureCtx;
}

function escapeXml(value) {
    return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

const LINE_HEIGHT_RATIO = 1.35;

/**
 * Elemento de texto, com edição inline (duplo clique, ou direto ao
 * criar via TextTool — ver ui/TextEditor.js) e suporte a múltiplas
 * linhas, negrito, itálico e sublinhado.
 */
export class Text extends Element {
    constructor({
        x,
        y,
        content = "Texto",
        font = "Inter",
        fontSize = 14,
        align = "left",
        bold = false,
        italic = false,
        underline = false,
        style,
    } = {}) {
        super("text", { x, y, width: 40, height: fontSize * LINE_HEIGHT_RATIO, style: { fill: "#1e1e1e", strokeWidth: 0, ...style } });
        this.content = content;
        this.font = font;
        this.fontSize = fontSize;
        this.align = align;
        this.bold = bold;
        this.italic = italic;
        this.underline = underline;
        this.isEditing = false;
        this.autoSize();
    }

    _fontString() {
        return `${this.italic ? "italic " : ""}${this.bold ? "700 " : ""}${this.fontSize}px ${this.font}, sans-serif`;
    }

    /** Recalcula width/height a partir do conteúdo atual (chamado após qualquer edição de texto/fonte). */
    autoSize() {
        const ctx = getMeasureCtx();
        ctx.font = this._fontString();
        const lines = this.content.split("\n");
        const widths = lines.map((line) => ctx.measureText(line).width);
        this.width = Math.max(20, ...widths) + 4;
        this.height = lines.length * this.fontSize * LINE_HEIGHT_RATIO;
    }

    drawShape(ctx, x, y, width, height) {
        if (this.isEditing) return;

        ctx.font = this._fontString();
        ctx.textBaseline = "top";
        ctx.textAlign = this.align;
        const lineHeight = this.fontSize * LINE_HEIGHT_RATIO;

        this.content.split("\n").forEach((line, i) => {
            const lineX = this.align === "center" ? x + width / 2 : this.align === "right" ? x + width : x;
            const lineY = y + i * lineHeight;
            ctx.fillText(line, lineX, lineY);

            if (this.underline) {
                const w = ctx.measureText(line).width;
                const underlineX = this.align === "center" ? lineX - w / 2 : this.align === "right" ? lineX - w : lineX;
                const underlineY = lineY + this.fontSize * 1.05;
                ctx.save();
                ctx.strokeStyle = ctx.fillStyle;
                ctx.lineWidth = Math.max(1, this.fontSize * 0.06);
                ctx.beginPath();
                ctx.moveTo(underlineX, underlineY);
                ctx.lineTo(underlineX + w, underlineY);
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    toSVG() {
        const anchor = this.align === "center" ? "middle" : this.align === "right" ? "end" : "start";
        const xPos = this.align === "center" ? this.x + this.width / 2 : this.align === "right" ? this.x + this.width : this.x;
        const lineHeight = this.fontSize * LINE_HEIGHT_RATIO;
        const tspans = this.content
            .split("\n")
            .map((line, i) => `<tspan x="${xPos}" y="${this.y + this.fontSize * 0.9 + i * lineHeight}">${escapeXml(line)}</tspan>`)
            .join("");
        const weight = this.bold ? ' font-weight="bold"' : "";
        const styleAttr = this.italic ? ' font-style="italic"' : "";
        const decoration = this.underline ? ' text-decoration="underline"' : "";
        return `<text font-family="${this.font}" font-size="${this.fontSize}" text-anchor="${anchor}"${weight}${styleAttr}${decoration} fill="${this.style.fill}">${tspans}</text>`;
    }

    serialize() {
        return {
            ...super.serialize(),
            content: this.content,
            font: this.font,
            fontSize: this.fontSize,
            align: this.align,
            bold: this.bold,
            italic: this.italic,
            underline: this.underline,
        };
    }
}
