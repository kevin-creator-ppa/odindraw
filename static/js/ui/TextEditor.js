import { resolveInkColor } from "./theme.js";

/**
 * Edição inline de texto: sobrepõe uma `<textarea>` no canvas, na posição/
 * tamanho/fonte exatos do alvo. Três modos:
 *  - Texto (element.type === "text"): overlay cresce com o conteúdo,
 *    posicionado na origem do elemento. Enter confirma, Shift+Enter quebra
 *    linha, Escape cancela (some se ficar vazio e for novo).
 *  - Rótulo embutido numa forma (element.textLabel): overlay preenche o
 *    bbox da forma e quebra linha normalmente; Enter só quebra linha,
 *    confirma ao sair do campo (blur) ou Escape.
 *  - Célula de uma Table (openCell): overlay preenche o bbox da célula;
 *    mesmo comportamento de Enter/blur do rótulo, mas escreve em
 *    `table.cells[row][col]` em vez de `element.textLabel`.
 */
export class TextEditor {
    constructor({ canvasArea, camera, renderer, eventBus, historyManager, scene, selectionManager }) {
        this.canvasArea = canvasArea;
        this.camera = camera;
        this.renderer = renderer;
        this.eventBus = eventBus;
        this.historyManager = historyManager;
        this.scene = scene;
        this.selectionManager = selectionManager;

        this.textarea = null;
        this.element = null;
        this._isNew = false;
        this._cell = null;

        eventBus.on("camera:change", () => {
            if (this.element) this._position();
        });
    }

    isEditing() {
        return Boolean(this.element);
    }

    /** Abre o editor sobre `element` (Text ou forma com textLabel). `isNew: true` remove o Text se o usuário cancelar/deixar vazio. */
    open(element, { isNew = false } = {}) {
        if (this.element) this.commit();

        this.element = element;
        this._isLabel = element.type !== "text";
        this._isNew = isNew;
        this._cell = null;
        element.isEditing = true;
        this.canvasArea.classList.add("is-editing-text");
        this.renderer.markDirty();

        const textarea = this._createTextarea(this._isLabel ? element.textLabel.text : isNew ? "" : element.content);
        if (!this._isLabel) {
            textarea.addEventListener("input", () => this._autoGrow());
            this._autoGrow();
        }
    }

    /** Abre o editor sobre uma célula de `table` (duplo clique — ver app.js initTextEditing). */
    openCell(table, row, col) {
        if (this.element) this.commit();

        this.element = table;
        this._isLabel = false;
        this._isNew = false;
        this._cell = { row, col };
        table.editingCell = { row, col };
        this.canvasArea.classList.add("is-editing-text");
        this.renderer.markDirty();

        this._createTextarea(table.cells[row]?.[col] ?? "");
    }

    _createTextarea(value) {
        const textarea = document.createElement("textarea");
        textarea.className = this._cell || this._isLabel ? "text-editor-overlay text-editor-overlay--label" : "text-editor-overlay";
        textarea.value = value;
        textarea.spellcheck = false;
        this.canvasArea.appendChild(textarea);
        this.textarea = textarea;
        this._position();

        textarea.addEventListener("keydown", (event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
                event.preventDefault();
                this.cancel();
            } else if (event.key === "Enter" && !event.shiftKey && !this._isLabel && !this._cell) {
                event.preventDefault();
                this.commit();
            }
        });
        textarea.addEventListener("blur", () => this.commit());

        requestAnimationFrame(() => {
            textarea.focus();
            textarea.select();
        });
        return textarea;
    }

    commit() {
        if (!this.element) return;
        const element = this.element;
        const isLabel = this._isLabel;
        const cell = this._cell;
        const value = this.textarea.value;
        this._close();

        if (cell) {
            element.setCellText(cell.row, cell.col, value);
        } else if (isLabel) {
            element.textLabel.text = value;
        } else if (value.trim() === "") {
            this.scene.removeObject(element);
            this.selectionManager.clear();
        } else {
            element.content = value;
            element.autoSize();
        }
        this.renderer.markDirty();
        this.historyManager?.pushSnapshot();
    }

    cancel() {
        if (!this.element) return;
        const element = this.element;
        const wasNew = this._isNew && !this._isLabel && !this._cell;
        this._close();

        if (wasNew) {
            this.scene.removeObject(element);
            this.selectionManager.clear();
        }
        this.renderer.markDirty();
    }

    _close() {
        if (this._cell) this.element.editingCell = null;
        this.element.isEditing = false;
        this.canvasArea.classList.remove("is-editing-text");
        this.textarea.remove();
        this.textarea = null;
        this.element = null;
        this._cell = null;
    }

    _position() {
        const zoom = this.camera.zoom;

        if (this._cell) {
            const table = this.element;
            const bounds = table.cellBounds(this._cell.row, this._cell.col);
            const topLeft = this.camera.worldToScreen(bounds.x, bounds.y);
            Object.assign(this.textarea.style, {
                left: `${topLeft.x}px`,
                top: `${topLeft.y}px`,
                width: `${bounds.width * zoom}px`,
                height: `${bounds.height * zoom}px`,
                minWidth: "0",
                fontSize: `${table._fontSize(bounds.height) * zoom}px`,
                fontFamily: "Inter, sans-serif",
                color: resolveInkColor(table.style.stroke),
                fontWeight: "400",
                fontStyle: "normal",
                textDecoration: "none",
                textAlign: "center",
                lineHeight: 1.3,
            });
            return;
        }

        const el = this.element;
        if (this._isLabel) {
            const bounds = el.getBounds();
            const topLeft = this.camera.worldToScreen(bounds.x, bounds.y);
            const label = el.textLabel;
            Object.assign(this.textarea.style, {
                left: `${topLeft.x}px`,
                top: `${topLeft.y}px`,
                width: `${bounds.width * zoom}px`,
                height: `${bounds.height * zoom}px`,
                minWidth: "0",
                fontSize: `${label.fontSize * zoom}px`,
                fontFamily: `${label.font}, sans-serif`,
                color: resolveInkColor(label.color),
                fontWeight: label.bold ? "700" : "400",
                fontStyle: label.italic ? "italic" : "normal",
                textDecoration: label.underline ? "underline" : "none",
                textAlign: label.align,
                lineHeight: 1.3,
            });
            return;
        }

        const screen = this.camera.worldToScreen(el.x, el.y);
        Object.assign(this.textarea.style, {
            left: `${screen.x}px`,
            top: `${screen.y}px`,
            width: "auto",
            height: "auto",
            minWidth: `${Math.max(el.width * zoom, 60)}px`,
            fontSize: `${el.fontSize * zoom}px`,
            fontFamily: `${el.font}, sans-serif`,
            color: resolveInkColor(el.style.fill),
            fontWeight: el.bold ? "700" : "400",
            fontStyle: el.italic ? "italic" : "normal",
            textDecoration: el.underline ? "underline" : "none",
            textAlign: el.align,
            lineHeight: 1.35,
        });
    }

    _autoGrow() {
        this.textarea.style.height = "auto";
        this.textarea.style.height = `${this.textarea.scrollHeight}px`;
    }
}
