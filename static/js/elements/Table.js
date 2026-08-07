import { Element } from "./Element.js";

const DEFAULT_ROWS = 3;
const DEFAULT_COLS = 3;

/**
 * Tabela com grade fixa de linhas/colunas (larguras/alturas uniformes
 * dentro do bbox — redimensionar a tabela redimensiona todas as
 * células junto). Cada célula guarda um texto simples, editável com
 * duplo clique (ver `cellAtPoint` + TextEditor.js, modo "cell").
 *
 * Células podem ser mescladas (`merges`, estilo draw.io/Excel): cada
 * entrada é `{row, col, rowSpan, colSpan}` e descreve um retângulo de
 * células cobrindo (row,col) como âncora. Toda leitura/escrita de uma
 * célula coberta por uma mesclagem (que não a âncora) é redirecionada
 * pra âncora — ver `_mergeInfoAt`.
 */
export class Table extends Element {
    constructor({ rows = DEFAULT_ROWS, cols = DEFAULT_COLS, cells, merges, ...props } = {}) {
        super("table", props);
        this.rows = rows;
        this.cols = cols;
        this.cells = cells ?? Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));
        this.merges = (merges ?? []).map((m) => ({ ...m }));
        this.editingCell = null;
    }

    cellSize() {
        return { w: this.width / this.cols, h: this.height / this.rows };
    }

    /** Mesclagem que cobre (row,col), ou uma região 1x1 se a célula não estiver mesclada. */
    _mergeInfoAt(row, col) {
        const merge = this.merges.find(
            (m) => row >= m.row && row < m.row + m.rowSpan && col >= m.col && col < m.col + m.colSpan
        );
        return merge ?? { row, col, rowSpan: 1, colSpan: 1 };
    }

    /** Todas as regiões a desenhar: cada mesclagem uma vez (pela âncora) + toda célula não coberta como 1x1. */
    _allRegions() {
        const covered = new Set();
        this.merges.forEach((m) => {
            for (let r = m.row; r < m.row + m.rowSpan; r++) {
                for (let c = m.col; c < m.col + m.colSpan; c++) covered.add(`${r},${c}`);
            }
        });

        const regions = this.merges.map((m) => ({ ...m }));
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!covered.has(`${r},${c}`)) regions.push({ row: r, col: c, rowSpan: 1, colSpan: 1 });
            }
        }
        return regions;
    }

    static _regionsOverlap(a, b) {
        return (
            a.row < b.row + b.rowSpan &&
            a.row + a.rowSpan > b.row &&
            a.col < b.col + b.colSpan &&
            a.col + a.colSpan > b.col
        );
    }

    /** Mescla o retângulo de células a partir de (row,col); mesclagens existentes que se sobrepõem são desfeitas primeiro. Texto das células cobertas (exceto a âncora) é perdido. */
    mergeCells(row, col, rowSpan, colSpan) {
        rowSpan = Math.max(1, Math.min(rowSpan, this.rows - row));
        colSpan = Math.max(1, Math.min(colSpan, this.cols - col));
        if (rowSpan <= 1 && colSpan <= 1) return;

        const region = { row, col, rowSpan, colSpan };
        this.merges = this.merges.filter((m) => !Table._regionsOverlap(m, region));
        for (let r = row; r < row + rowSpan; r++) {
            for (let c = col; c < col + colSpan; c++) {
                if (r !== row || c !== col) this.cells[r][c] = "";
            }
        }
        this.merges.push(region);
    }

    /** Desfaz a mesclagem que cobre (row,col), se houver — as células voltam a ser individuais (texto da âncora é mantido nela, as demais continuam vazias). */
    splitCell(row, col) {
        const index = this.merges.findIndex(
            (m) => row >= m.row && row < m.row + m.rowSpan && col >= m.col && col < m.col + m.colSpan
        );
        if (index !== -1) this.merges.splice(index, 1);
    }

    /** Remove/encolhe mesclagens que ficaram fora dos limites depois de remover linha/coluna. */
    _clampMerges() {
        this.merges = this.merges
            .map((m) => ({
                ...m,
                rowSpan: Math.min(m.rowSpan, this.rows - m.row),
                colSpan: Math.min(m.colSpan, this.cols - m.col),
            }))
            .filter((m) => m.row < this.rows && m.col < this.cols && m.rowSpan >= 1 && m.colSpan >= 1 && (m.rowSpan > 1 || m.colSpan > 1));
    }

    /** Bounding box (mundo, sem levar rotação em conta) de uma célula — o retângulo inteiro da mesclagem, se houver. Usado pra posicionar o editor inline. */
    cellBounds(row, col) {
        const { w, h } = this.cellSize();
        const info = this._mergeInfoAt(row, col);
        return {
            x: this.x + info.col * w,
            y: this.y + info.row * h,
            width: info.colSpan * w,
            height: info.rowSpan * h,
        };
    }

    /** Célula sob um ponto de mundo (desfazendo a rotação atual) — já resolvida pra âncora se cair numa célula mesclada. Null se o ponto cair fora da tabela. */
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
        const info = this._mergeInfoAt(row, col);
        return { row: info.row, col: info.col };
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
        this._clampMerges();
    }

    addColumn() {
        this.cells.forEach((row) => row.push(""));
        this.cols += 1;
    }

    removeColumn() {
        if (this.cols <= 1) return;
        this.cells.forEach((row) => row.pop());
        this.cols -= 1;
        this._clampMerges();
    }

    _fontSize(cellHeight) {
        return Math.max(9, Math.min(14, cellHeight * 0.32));
    }

    drawShape(ctx, x, y, width, height) {
        const cellW = width / this.cols;
        const cellH = height / this.rows;
        const regions = this._allRegions();

        if (this.style.fill !== "transparent") ctx.fillRect(x, y, width, height);

        if (this.style.strokeWidth > 0) {
            regions.forEach(({ row, col, rowSpan, colSpan }) => {
                ctx.strokeRect(x + col * cellW, y + row * cellH, colSpan * cellW, rowSpan * cellH);
            });
        }

        ctx.save();
        ctx.fillStyle = this.resolvedStroke();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        regions.forEach(({ row, col, rowSpan, colSpan }) => {
            if (this.editingCell && this.editingCell.row === row && this.editingCell.col === col) return;
            const text = this.cells[row]?.[col];
            if (!text) return;
            const regionW = colSpan * cellW;
            const regionH = rowSpan * cellH;
            ctx.font = `${this._fontSize(regionH)}px Inter, sans-serif`;
            this._drawCellText(ctx, text, x + col * cellW + regionW / 2, y + row * cellH + regionH / 2, regionW - 8);
        });
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
        const regions = this._allRegions();

        let lines = "";
        if (this.style.strokeWidth > 0) {
            regions.forEach(({ row, col, rowSpan, colSpan }) => {
                const rx = this.x + col * cellW;
                const ry = this.y + row * cellH;
                lines += `<rect x="${rx}" y="${ry}" width="${colSpan * cellW}" height="${rowSpan * cellH}" fill="none" stroke="${stroke}" stroke-width="${this.style.strokeWidth}" />`;
            });
        }

        let texts = "";
        regions.forEach(({ row, col, rowSpan, colSpan }) => {
            const text = this.cells[row]?.[col];
            if (!text) return;
            const fontSize = this._fontSize(rowSpan * cellH);
            const cx = this.x + col * cellW + (colSpan * cellW) / 2;
            const cy = this.y + row * cellH + (rowSpan * cellH) / 2;
            texts += `<text x="${cx}" y="${cy}" font-family="Inter, sans-serif" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle" fill="${stroke}">${this._escapeXml(text)}</text>`;
        });

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
        return {
            ...super.serialize(),
            rows: this.rows,
            cols: this.cols,
            cells: this.cells.map((row) => [...row]),
            merges: this.merges.map((m) => ({ ...m })),
        };
    }

    /** Sobrescreve Element.clone(): sem isso, a cópia compartilharia a mesma matriz `cells`/`merges` do original (edição em um vazaria pro outro). */
    clone() {
        const copy = super.clone();
        copy.cells = this.cells.map((row) => [...row]);
        copy.merges = this.merges.map((m) => ({ ...m }));
        copy.editingCell = null;
        return copy;
    }
}
