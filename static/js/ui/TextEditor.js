/**
 * Edição inline de um elemento Text: sobrepõe uma `<textarea>` no canvas,
 * na posição/tamanho/fonte exatos do elemento (o Text real fica com
 * `isEditing = true` e não é desenhado enquanto isso). Enter confirma,
 * Shift+Enter quebra linha, Escape cancela.
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

    /** Abre o editor sobre `element`. `isNew: true` remove o elemento se o usuário cancelar/deixar vazio. */
    open(element, { isNew = false } = {}) {
        if (this.element) this.commit();

        this.element = element;
        this._isNew = isNew;
        element.isEditing = true;
        this.canvasArea.classList.add("is-editing-text");
        this.renderer.markDirty();

        const textarea = document.createElement("textarea");
        textarea.className = "text-editor-overlay";
        textarea.value = isNew ? "" : element.content;
        textarea.spellcheck = false;
        this.canvasArea.appendChild(textarea);
        this.textarea = textarea;
        this._position();
        this._autoGrow();

        textarea.addEventListener("input", () => this._autoGrow());
        textarea.addEventListener("keydown", (event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
                event.preventDefault();
                this.cancel();
            } else if (event.key === "Enter" && !event.shiftKey) {
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
        const value = this.textarea.value;
        this._close();

        if (value.trim() === "") {
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
        const wasNew = this._isNew;
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
        const screen = this.camera.worldToScreen(el.x, el.y);

        Object.assign(this.textarea.style, {
            left: `${screen.x}px`,
            top: `${screen.y}px`,
            minWidth: `${Math.max(el.width * zoom, 60)}px`,
            fontSize: `${el.fontSize * zoom}px`,
            fontFamily: `${el.font}, sans-serif`,
            color: el.style.fill,
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
