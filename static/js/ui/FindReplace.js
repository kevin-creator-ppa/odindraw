const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** Escapa caracteres especiais de regex — o termo buscado é usado literalmente, não como padrão. */
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Todo campo de texto editável da página atual, com getter/setter
 * uniforme — cobre Text (content), rótulo embutido de forma/linha/
 * conector (textLabel), label de Component e cada célula de Table.
 */
function textFields(scene) {
    const fields = [];
    scene.objects.forEach((element) => {
        if (element.type === "text") {
            fields.push({ element, get: () => element.content, set: (v) => { element.content = v; element.autoSize(); } });
        } else if (element.type === "table") {
            for (let r = 0; r < element.rows; r++) {
                for (let c = 0; c < element.cols; c++) {
                    fields.push({ element, get: () => element.cells[r]?.[c] ?? "", set: (v) => element.setCellText(r, c, v) });
                }
            }
        } else if (element.type === "component") {
            fields.push({ element, get: () => element.label ?? "", set: (v) => (element.label = v) });
        } else if (element.textLabel) {
            fields.push({ element, get: () => element.textLabel.text, set: (v) => (element.textLabel.text = v) });
        }
    });
    return fields;
}

/**
 * Localizar e substituir texto no diagrama (Ctrl+F): busca em todo
 * texto editável da página atual (não cruza páginas — mesmo escopo de
 * exportar). "Próximo" seleciona e centraliza a câmera no próximo
 * resultado; "Substituir tudo" troca todas as ocorrências de uma vez.
 */
export class FindReplace {
    constructor({ scene, camera, renderer, selectionManager, historyManager }) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.selectionManager = selectionManager;
        this.historyManager = historyManager;
        this._matchIndex = -1;

        this.panel = document.querySelector("[data-find-panel]");
        this.searchInput = document.querySelector("[data-find-search]");
        this.replaceInput = document.querySelector("[data-find-replace]");
        this.resultLabel = document.querySelector("[data-find-result]");

        document.querySelector('[data-action="toggle-find"]').addEventListener("click", () => this._open());
        document.querySelector('[data-action="close-find"]').addEventListener("click", () => this._close());
        document.querySelector('[data-action="find-next"]').addEventListener("click", () => this._findNext());
        document.querySelector('[data-action="replace-all"]').addEventListener("click", () => this._replaceAll());

        this.searchInput.addEventListener("input", () => (this._matchIndex = -1));
        this.searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") this._findNext();
            if (event.key === "Escape") this._close();
        });

        window.addEventListener("keydown", (event) => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "f") return;
            if (EDITABLE_TAGS.has(document.activeElement?.tagName) && document.activeElement !== this.searchInput) return;
            event.preventDefault();
            this._open();
        });
    }

    _open() {
        this.panel.hidden = false;
        this.searchInput.focus();
        this.searchInput.select();
    }

    _close() {
        this.panel.hidden = true;
    }

    _matches() {
        const term = this.searchInput.value.trim().toLowerCase();
        if (!term) return [];
        return textFields(this.scene).filter((field) => (field.get() ?? "").toLowerCase().includes(term));
    }

    _panTo(element) {
        const bounds = element.getBounds();
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        this.camera.offsetX = this.renderer.width / 2 - cx * this.camera.zoom;
        this.camera.offsetY = this.renderer.height / 2 - cy * this.camera.zoom;
        this.renderer.markDirty();
    }

    _findNext() {
        const matches = this._matches();
        if (matches.length === 0) {
            this.resultLabel.textContent = this.searchInput.value.trim() ? "Nenhum resultado" : "";
            return;
        }
        this._matchIndex = (this._matchIndex + 1) % matches.length;
        const match = matches[this._matchIndex];
        this.selectionManager.select(match.element);
        this._panTo(match.element);
        this.resultLabel.textContent = `${this._matchIndex + 1} de ${matches.length}`;
    }

    _replaceAll() {
        const term = this.searchInput.value.trim();
        if (!term) return;
        const replacement = this.replaceInput.value;
        const regex = new RegExp(escapeRegExp(term), "gi");

        let count = 0;
        textFields(this.scene).forEach((field) => {
            const value = field.get() ?? "";
            if (regex.test(value)) {
                regex.lastIndex = 0;
                field.set(value.replace(regex, replacement));
                count += 1;
            }
        });

        this.renderer.markDirty();
        if (count > 0) this.historyManager?.pushSnapshot();
        this.resultLabel.textContent = `${count} substituição(ões) feita(s)`;
    }
}
