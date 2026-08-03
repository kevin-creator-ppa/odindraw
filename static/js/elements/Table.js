import { Element } from "./Element.js";

const DEFAULT_ROWS = 3;
const DEFAULT_COLS = 3;

/**
 * Tabela com grade fixa de linhas/colunas (larguras/alturas uniformes
 * dentro do bbox — redimensionar a tabela redimensiona todas as
 * células junto). Cada célula guarda um texto simples, editável com
 * duplo clique (ver `cellAtPoint` + TextEditor.js, modo "cell").
 */
export class Table extends Element {
    constructor({ rows = DEFAULT_ROWS, cols = DEFAULT_COLS, cells, ...props } = {}) {
        super("table", props);
        this.rows = rows;
        this.cols = cols;
        this.cells = cells ?? Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));
        this.editingCell = null;
    }

    cellSize() {
        return { w: this.width / this.cols, h: this.height / this.rows };
    }

    /** Bounding box (mundo, sem levar rotação em conta) de uma célula — usado pra posicionar o editor inline. */
    cellBounds(row, col) {
        const { w, h } = this.cellSize();
        return { x: this.x + col * w, y: this.y + row * h, width: w, height: h };
    }

    /** Célula sob um ponto de mundo (desfazendo a rotação atual), ou null se o ponto cair fora da tabela. */
    cellAtPoint(point) {
        if (!this.containsPoint(point)) return null;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const rad = (-this.rotation * Math.PI) / 180;
        const dx = point.x - cx;
        const dy = point.y - cy;
        const localX = cx + (dx * Math.cos(rad) - dy * Math.sin(rad));
        const localY = cy + (dx * Math.sin(rad) + dy * Math.cos(rad));

        const { w, h } = this.cellSize();
        const col = Math.min(this.cols - 1, Math.max(0, Math.floor((localX - this.x) / w)));
        const row = Math.min(this.rows - 1, Math.max(0, Math.floor((localY - this.y) / h)));
        return { row, col };
    }

    setCellText(row, col, text) {
        if (!this.cells[row]) return;
        this.cells[row][col] = text;
    }

    addRow() {
        this.cells.push(Array.from({ length: this.cols }, () => ""));
        this.rows += 1;
    }

    removeRow() {
        if (this.rows <= 1) return;
        this.cells.pop();
        this.rows -= 1;
    }

    addColumn() {
        this.cells.forEach((row) => row.push(""));
        this.cols += 1;
    }

    removeColumn() {
        if (this.cols <= 1) return;
        this.cells.forEach((row) => row.pop());
        this.cols -= 1;
    }

    _fontSize(cellHeight) {
        return Math.max(9, Math.min(14, cellHeight * 0.32));
    }

    drawShape(ctx, x, y, width, height) {
        const cellW = width / this.cols;
        const cellH = height / this.rows;

        if (this.style.fill !== "transparent") ctx.fillRect(x, y, width, height);

        if (this.style.strokeWidth > 0) {
            for (let r = 0; r <= this.rows; r++) {
                ctx.beginPath();
                ctx.moveTo(x, y + r * cellH);
                ctx.lineTo(x + width, y + r * cellH);
                ctx.stroke();
            }
            for (let c = 0; c <= this.cols; c++) {
                ctx.beginPath();
                ctx.moveTo(x + c * cellW, y);
                ctx.lineTo(x + c * cellW, y + height);
                ctx.stroke();
            }
        }

        ctx.save();
        ctx.fillStyle = this.resolvedStroke();
        ctx.font = `${this._fontSize(cellH)}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.editingCell && this.editingCell.row === r && this.editingCell.col === c) continue;
                const text = this.cells[r]?.[c];
                if (!text) continue;
                this._drawCellText(ctx, text, x + c * cellW + cellW / 2, y + r * cellH + cellH / 2, cellW - 8);
            }
        }
        ctx.restore();
    }

    /** Trunca com reticências se o texto não couber na largura da célula (v1: sem quebra de linha). */
    _drawCellText(ctx, text, cx, cy, maxWidth) {
        let display = text;
        while (display.length > 1 && ctx.measureText(display).width > maxWidth) {
            display = display.slice(0, -1);
        }
        if (display !== text) display = display.length > 1 ? `${display.slice(0, -1)}…` : display;
        ctx.fillText(display, cx, cy);
    }

    toSVG() {
        const cellW = this.width / this.cols;
        const cellH = this.height / this.rows;
        const stroke = this.resolvedStroke();

        let lines = "";
        if (this.style.strokeWidth > 0) {
            for (let r = 0; r <= this.rows; r++) {
                const yPos = this.y + r * cellH;
                lines += `<line x1="${this.x}" y1="${yPos}" x2="${this.x + this.width}" y2="${yPos}" stroke="${stroke}" stroke-width="${this.style.strokeWidth}" />`;
            }
            for (let c = 0; c <= this.cols; c++) {
                const xPos = this.x + c * cellW;
                lines += `<line x1="${xPos}" y1="${this.y}" x2="${xPos}" y2="${this.y + this.height}" stroke="${stroke}" stroke-width="${this.style.strokeWidth}" />`;
            }
        }

        const fontSize = this._fontSize(cellH);
        let texts = "";
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const text = this.cells[r]?.[c];
                if (!text) continue;
                const cx = this.x + c * cellW + cellW / 2;
                const cy = this.y + r * cellH + cellH / 2;
                texts += `<text x="${cx}" y="${cy}" font-family="Inter, sans-serif" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle" fill="${stroke}">${this._escapeXml(text)}</text>`;
            }
        }

        const fill =
            this.style.fill !== "transparent"
                ? `<rect x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" fill="${this.resolvedFill()}" />`
                : "";
        return `<g opacity="${this.style.opacity}"${this.svgTransform()}>${fill}${lines}${texts}</g>`;
    }

    _escapeXml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    serialize() {
        return { ...super.serialize(), rows: this.rows, cols: this.cols, cells: this.cells.map((row) => [...row]) };
    }

    /** Sobrescreve Element.clone(): sem isso, a cópia compartilharia a mesma matriz `cells` do original (edição em um vazaria pro outro). */
    clone() {
        const copy = super.clone();
        copy.cells = this.cells.map((row) => [...row]);
        copy.editingCell = null;
        return copy;
    }
}
