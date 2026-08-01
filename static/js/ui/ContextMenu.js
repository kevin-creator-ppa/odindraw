import { duplicateSelected, deleteSelected } from "../managers/objectActions.js";
import { applyIcons } from "./icons.js";

/**
 * Menu de contexto (botão direito) no canvas: botão direito num objeto
 * seleciona-o (se ainda não fizer parte da seleção atual) e mostra ações
 * rápidas de camada/bloqueio/visibilidade, além de duplicar/excluir.
 * Botão direito em área vazia limpa a seleção e não mostra menu (nada
 * pra agir ali).
 */
export class ContextMenu {
    constructor(engine) {
        this.engine = engine;
        this.menu = document.querySelector("[data-context-menu]");
        this._buildItems();

        engine.canvasArea.addEventListener("contextmenu", (event) => this._open(event));
        document.addEventListener("click", () => this._close());
        document.addEventListener("scroll", () => this._close(), true);
        window.addEventListener("blur", () => this._close());
        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape") this._close();
        });
    }

    _buildItems() {
        const items = [
            { label: "Duplicar", hint: "Ctrl+D", icon: "duplicate", action: () => duplicateSelected(this.engine) },
            { label: "Excluir", hint: "Del", icon: "trash", action: () => deleteSelected(this.engine) },
            null,
            { label: "Trazer para frente", icon: "layer-front", action: () => this._reorder("front") },
            { label: "Enviar para trás", icon: "layer-back", action: () => this._reorder("back") },
            null,
            { label: "Bloquear/desbloquear", icon: "lock", action: () => this._toggle("locked") },
            { label: "Ocultar/exibir", icon: "eye", action: () => this._toggle("visible") },
        ];

        this.menu.innerHTML = "";
        items.forEach((item) => {
            if (!item) {
                const divider = document.createElement("span");
                divider.className = "menu-divider";
                this.menu.appendChild(divider);
                return;
            }
            const button = document.createElement("button");
            button.className = "menu-item";
            button.innerHTML = `<span class="menu-item__icon" data-icon="${item.icon}"></span><span class="menu-item__label">${item.label}</span>${item.hint ? `<span class="menu-item__hint">${item.hint}</span>` : ""}`;
            button.addEventListener("click", () => {
                item.action();
                this._close();
            });
            this.menu.appendChild(button);
        });
        applyIcons(this.menu);
    }

    _open(event) {
        event.preventDefault();
        const { camera, scene, selectionManager } = this.engine;
        const rect = this.engine.canvasArea.getBoundingClientRect();
        const worldPoint = camera.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
        const hit = scene.getObjectAtPoint(worldPoint);

        if (hit) {
            if (!selectionManager.isSelected(hit)) selectionManager.select(hit);
        } else {
            selectionManager.clear();
        }

        if (selectionManager.getSelected().length === 0) return;

        this.menu.style.left = `${event.clientX}px`;
        this.menu.style.top = `${event.clientY}px`;
        this.menu.hidden = false;
    }

    _close() {
        this.menu.hidden = true;
    }

    _reorder(direction) {
        const { scene, selectionManager, renderer, historyManager } = this.engine;
        const selected = selectionManager.getSelected();
        if (selected.length === 0) return;

        const zIndexes = scene.objects.map((o) => o.zIndex);
        let next = direction === "front" ? Math.max(...zIndexes) + 1 : Math.min(...zIndexes) - 1 - selected.length;
        [...selected]
            .sort((a, b) => a.zIndex - b.zIndex)
            .forEach((el) => {
                el.zIndex = next;
                next += 1;
            });

        renderer.markDirty();
        historyManager?.pushSnapshot();
    }

    /** Alterna um campo booleano (locked/visible) em todos os selecionados, usando o estado do primeiro como referência. */
    _toggle(key) {
        const { selectionManager, renderer, historyManager } = this.engine;
        const selected = selectionManager.getSelected();
        if (selected.length === 0) return;

        const next = !selected[0][key];
        selected.forEach((el) => (el[key] = next));

        renderer.markDirty();
        historyManager?.pushSnapshot();
    }
}
