import { resolveInkColor, AUTO_INK } from "../ui/theme.js";

const LINE_HEIGHT_RATIO = 1.3;
const MIN_FONT_SIZE = 8;
const PADDING = 6;

let measureCtx = null;
function getMeasureCtx() {
    if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
    return measureCtx;
}

function escapeXml(value) {
    return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

/** Rótulo de texto embutido numa forma (Rectangle/Ellipse), editável com duplo clique — ver TextEditor.js. */
export function defaultLabel(overrides = {}) {
    return {
        text: "",
        font: "Inter",
        fontSize: 16,
        bold: false,
        italic: false,
        underline: false,
        align: "center",
        color: AUTO_INK,
        ...overrides,
    };
}

function fontString(label, fontSizePx) {
    return `${label.italic ? "italic " : ""}${label.bold ? "700 " : ""}${fontSizePx}px ${label.font}, sans-serif`;
}

/** Quebra `text` em linhas que cabem em `maxWidth`, respeitando quebras manuais (\n) e quebrando por palavra. */
function wrapLines(ctx, text, maxWidth) {
    const lines = [];
    text.split("\n").forEach((paragraph) => {
        const words = paragraph.split(" ");
        let current = "";
        words.forEach((word) => {
            const candidate = current ? `${current} ${word}` : word;
            if (current && ctx.measureText(candidate).width > maxWidth) {
                lines.push(current);
                current = word;
            } else {
                current = candidate;
            }
        });
        lines.push(current);
    });
    return lines;
}

/** Quebra o texto e, se o bloco não couber na altura disponível, reduz a fonte (até MIN_FONT_SIZE) recalculando a quebra a cada passo. */
function fitLabel(ctx, label, startFontSize, maxWidth, maxHeight) {
    let size = Math.max(MIN_FONT_SIZE, startFontSize);
    let lines;
    do {
        ctx.font = fontString(label, size);
        lines = wrapLines(ctx, label.text, maxWidth);
        const blockHeight = lines.length * size * LINE_HEIGHT_RATIO;
        if (blockHeight <= maxHeight || size <= MIN_FONT_SIZE) break;
        size -= 1;
    } while (size > MIN_FONT_SIZE);
    return { size, lines };
}

/**
 * Desenha `label` centralizado (ou alinhado) em `bounds`, já no espaço local
 * de desenho da forma (ver Element.render — origem no centro do bbox,
 * unidades já em pixels de tela). `zoom` escala fonte/padding pra
 * acompanhar o zoom da câmera (ver truque em Freehand.js).
 */
export function drawLabel(ctx, label, bounds, zoom = 1) {
    if (!label.text) return;
    const padding = PADDING * zoom;
    const maxWidth = Math.max(1, bounds.width - padding * 2);
    const maxHeight = Math.max(1, bounds.height - padding * 2);
    const { size, lines } = fitLabel(ctx, label, label.fontSize * zoom, maxWidth, maxHeight);

    ctx.font = fontString(label, size);
    ctx.textAlign = label.align;
    ctx.textBaseline = "top";
    ctx.fillStyle = resolveInkColor(label.color);

    const lineHeight = size * LINE_HEIGHT_RATIO;
    const blockHeight = lines.length * lineHeight;
    const startY = bounds.y + (bounds.height - blockHeight) / 2;
    const centerX = bounds.x + bounds.width / 2;
    const leftX = bounds.x + padding;
    const rightX = bounds.x + bounds.width - padding;

    lines.forEach((line, i) => {
        const lineX = label.align === "center" ? centerX : label.align === "right" ? rightX : leftX;
        const lineY = startY + i * lineHeight;
        ctx.fillText(line, lineX, lineY);

        if (label.underline) {
            const w = ctx.measureText(line).width;
            const underlineX = label.align === "center" ? lineX - w / 2 : label.align === "right" ? lineX - w : lineX;
            const underlineY = lineY + size * 1.05;
            ctx.save();
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = Math.max(1, size * 0.06);
            ctx.beginPath();
            ctx.moveTo(underlineX, underlineY);
            ctx.lineTo(underlineX + w, underlineY);
            ctx.stroke();
            ctx.restore();
        }
    });
}

/** Equivalente de drawLabel() pra exportação SVG — `bounds` em coordenadas de mundo (sem rotação; o chamador aplica o transform). */
export function labelToSVG(label, bounds) {
    if (!label.text) return "";
    const ctx = getMeasureCtx();
    const maxWidth = Math.max(1, bounds.width - PADDING * 2);
    const maxHeight = Math.max(1, bounds.height - PADDING * 2);
    const { size, lines } = fitLabel(ctx, label, label.fontSize, maxWidth, maxHeight);

    const lineHeight = size * LINE_HEIGHT_RATIO;
    const blockHeight = lines.length * lineHeight;
    const startY = bounds.y + (bounds.height - blockHeight) / 2;
    const anchor = label.align === "center" ? "middle" : label.align === "right" ? "end" : "start";
    const xPos =
        label.align === "center"
            ? bounds.x + bounds.width / 2
            : label.align === "right"
              ? bounds.x + bounds.width - PADDING
              : bounds.x + PADDING;

    const tspans = lines
        .map((line, i) => `<tspan x="${xPos}" y="${startY + size * 0.9 + i * lineHeight}">${escapeXml(line)}</tspan>`)
        .join("");
    const weight = label.bold ? ' font-weight="bold"' : "";
    const styleAttr = label.italic ? ' font-style="italic"' : "";
    const decoration = label.underline ? ' text-decoration="underline"' : "";
    return `<text font-family="${label.font}" font-size="${size}" text-anchor="${anchor}"${weight}${styleAttr}${decoration} fill="${resolveInkColor(label.color)}">${tspans}</text>`;
}
