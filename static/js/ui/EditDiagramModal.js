import { captureSceneState, applySceneState } from "../io/sceneSerializer.js";

/**
 * "Extras > Edit Diagram" do draw.io: mostra o JSON bruto da página
 * atual (mesmo formato usado por SaveLoad/PageManager/HistoryManager)
 * num textarea editável. Aplicar substitui a página inteira — fica no
 * histórico de desfazer, então um JSON ruim não é destrutivo.
 */
export class EditDiagramModal {
    constructor({ scene, camera, renderer, historyManager }) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.historyManager = historyManager;

        this.modal = document.querySelector("[data-edit-diagram-modal]");
        this.textarea = document.querySelector("[data-edit-diagram-textarea]");
        this.errorEl = document.querySelector("[data-edit-diagram-error]");

        document.querySelector('[data-action="edit-diagram"]').addEventListener("click", () => this.open());
        document.querySelector("[data-edit-diagram-backdrop]").addEventListener("click", () => this.close());
        document.querySelectorAll('[data-action="close-edit-diagram"]').forEach((btn) =>
            btn.addEventListener("click", () => this.close())
        );
        document.querySelector('[data-action="apply-edit-diagram"]').addEventListener("click", () => this._apply());

        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !this.modal.hidden) this.close();
        });
    }

    open() {
        const data = captureSceneState({ scene: this.scene, camera: this.camera, renderer: this.renderer });
        this.textarea.value = JSON.stringify(data, null, 2);
        this.errorEl.hidden = true;
        this.modal.hidden = false;
    }

    close() {
        this.modal.hidden = true;
    }

    _apply() {
        let data;
        try {
            data = JSON.parse(this.textarea.value);
        } catch (error) {
            this._showError(`JSON inválido: ${error.message}`);
            return;
        }

        try {
            applySceneState({ scene: this.scene, camera: this.camera, renderer: this.renderer }, data);
        } catch (error) {
            this._showError(`Não foi possível aplicar: ${error.message}`);
            return;
        }

        this.renderer.markDirty();
        this.historyManager?.pushSnapshot();
        this.close();
    }

    _showError(message) {
        this.errorEl.textContent = message;
        this.errorEl.hidden = false;
    }
}
