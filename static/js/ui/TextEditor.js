import { resolveInkColor } from "./theme.js";

/**
 * Edição inline de texto: sobrepõe uma `<textarea>` no canvas, na posição/
 * tamanho/fonte exatos do alvo. Dois modos:
 *  - Texto (element.type === "text"): overlay cresce com o conteúdo,
 *    posicionado na origem do elemento. Enter confirma, Shift+Enter quebra
 *    linha, Escape cancela (some se ficar vazio e for novo).
 *  - Rótulo embutido numa forma (element.textLabel): overlay preenche o
 *    bbox da forma e quebra linha normalmente; Enter só quebra linha,
 *    confirma ao sair do campo (blur) ou Escape.
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
        element.isEditing = true;
        this.canvasArea.classList.add("is-editing-text");
        this.renderer.markDirty();

        const textarea = document.createElement("textarea");
        textarea.className = this._isLabel ? "text-editor-overlay text-editor-overlay--label" : "text-editor-overlay";
        textarea.value = this._isLabel ? element.textLabel.text : isNew ? "" : element.content;
        textarea.spellcheck = false;
        this.canvasArea.appendChild(textarea);
        this.textarea = textarea;
        this._position();
        if (!this._isLabel) this._autoGrow();

        textarea.addEventListener("input", () => {
            if (!this._isLabel) this._autoGrow();
        });
        textarea.addEventListener("keydown", (event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
                event.preventDefault();
                this.cancel();
            } else if (event.key === "Enter" && !event.shiftKey && !this._isLabel) {
                event.preventDefault();
                this.commit();
            }
        });
        textarea.addEventListener("blur", () => this.commit());

        requestAnimationFrame(() => {
            textarea.focus();
            textarea.select();
        });
    }

    commit() {
        if (!this.element) return;
        const element = this.element;
        const isLabel = this._isLabel;
        const value = this.textarea.value;
        this._close();

        if (isLabel) {
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
        const wasNew = this._isNew && !this._isLabel;
        this._close();

        if (wasNew) {
            this.scene.removeObject(element);
            this.selectionManager.clear();
        }
        this.renderer.markDirty();
    }

    _close() {
        this.element.isEditing = false;
        this.canvasArea.classList.remove("is-editing-text");
        this.textarea.remove();
        this.textarea = null;
        this.element = null;
    }

    _position() {
        const el = this.element;
        const zoom = this.camera.zoom;

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
