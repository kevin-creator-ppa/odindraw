import { applyIcons } from "./icons.js";

/**
 * Painel flutuante de camadas (estilo draw.io): lista as camadas do
 * diagrama da mais alta (topo da pilha) para a mais baixa, com
 * visibilidade/bloqueio por camada, renomear, reordenar, adicionar,
 * remover e escolher a camada ativa (onde novos objetos entram).
 *
 * Ocultar/bloquear uma camada não altera `visible`/`locked` de cada
 * elemento — é um estado à parte, combinado com o do elemento pela
 * Scene (`isElementVisible`/`isElementLocked`).
 */
export class LayersPanel {
    constructor({ scene, renderer, selectionManager, historyManager, eventBus }) {
        this.scene = scene;
        this.renderer = renderer;
        this.selectionManager = selectionManager;
        this.historyManager = historyManager;
        this.eventBus = eventBus;

        this.panel = document.querySelector("[data-layers-panel]");
        this.body = document.querySelector("[data-layers-body]");

        this._bindToggle();
        this._bindAdd();
        eventBus.on("layers:change", () => this._render());
        eventBus.on("selection:change", () => this._render());
        this._render();
    }

    _bindToggle() {
        document.querySelector('[data-action="toggle-layers"]').addEventListener("click", () => {
            this.panel.hidden = !this.panel.hidden;
        });
        document.querySelector('[data-action="close-layers"]').addEventListener("click", () => {
            this.panel.hidden = true;
        });
    }

    _bindAdd() {
        document.querySelector('[data-action="add-layer"]').addEventListener("click", () => {
            this.scene.addLayer();
            this._render();
            this._commit();
        });
    }

    _commit() {
        this.renderer.markDirty();
        this.historyManager?.pushSnapshot();
    }

    /** Move os elementos selecionados para a camada ativa — atalho útil pra reorganizar sem redesenhar nada. */
    _moveSelectionToActiveLayer() {
        const selected = this.selectionManager.getSelected();
        if (selected.length === 0) return;
        selected.forEach((el) => (el.layerId = this.scene.activeLayerId));
        this._commit();
    }

    _render() {
        this.body.innerHTML = "";

        // Do topo da pilha para a base, como no draw.io.
        [...this.scene.layers].reverse().forEach((layer) => this.body.appendChild(this._buildRow(layer)));

        const moveBtn = document.createElement("button");
        moveBtn.type = "button";
        moveBtn.className = "layers-panel__move-selection";
        moveBtn.textContent = "Mover seleção para a camada ativa";
        moveBtn.disabled = this.selectionManager.getSelected().length === 0;
        moveBtn.addEventListener("click", () => this._moveSelectionToActiveLayer());
        this.body.appendChild(moveBtn);

        applyIcons(this.body);
    }

    _buildRow(layer) {
        const row = document.createElement("div");
        row.className = "layer-row";
        row.classList.toggle("layer-row--active", layer.id === this.scene.activeLayerId);
        row.addEventListener("click", () => {
            this.scene.activeLayerId = layer.id;
            this._render();
        });

        const visibleBtn = document.createElement("button");
        visibleBtn.type = "button";
        visibleBtn.className = "layer-row__icon-btn";
        visibleBtn.title = "Mostrar/ocultar camada";
        visibleBtn.dataset.icon = layer.visible ? "eye" : "eye-off";
        visibleBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.scene.setLayerVisible(layer.id, !layer.visible);
            this._render();
            this._commit();
        });

        const lockBtn = document.createElement("button");
        lockBtn.type = "button";
        lockBtn.className = "layer-row__icon-btn";
        lockBtn.title = "Bloquear/desbloquear camada";
        lockBtn.dataset.icon = layer.locked ? "lock" : "unlock";
        lockBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.scene.setLayerLocked(layer.id, !layer.locked);
            this._render();
            this._commit();
        });

        const name = document.createElement("input");
        name.type = "text";
        name.className = "layer-row__name";
        name.value = layer.name;
        name.addEventListener("click", (event) => event.stopPropagation());
        name.addEventListener("change", () => {
            this.scene.renameLayer(layer.id, name.value || layer.name);
            this._commit();
        });

        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "layer-row__icon-btn";
        upBtn.title = "Trazer camada para cima";
        upBtn.dataset.icon = "chevron-up";
        upBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.scene.moveLayer(layer.id, 1);
            this._render();
            this._commit();
        });

        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "layer-row__icon-btn";
        downBtn.title = "Enviar camada para baixo";
        downBtn.dataset.icon = "chevron-down";
        downBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            this.scene.moveLayer(layer.id, -1);
            this._render();
            this._commit();
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "layer-row__icon-btn";
        deleteBtn.title = "Excluir camada (e seu conteúdo)";
        deleteBtn.dataset.icon = "trash";
        deleteBtn.disabled = this.scene.layers.length <= 1;
        deleteBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            if (this.scene.layers.length <= 1) return;
            if (!window.confirm(`Excluir "${layer.name}" e todo o seu conteúdo?`)) return;
            this.scene.removeLayer(layer.id);
            this.selectionManager.clear();
            this._render();
            this._commit();
        });

        row.append(visibleBtn, lockBtn, name, upBtn, downBtn, deleteBtn);
        return row;
    }
}
