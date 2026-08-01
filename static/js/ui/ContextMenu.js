import { duplicateSelected, deleteSelected, groupSelected, ungroupSelected } from "../managers/objectActions.js";
import { clipboard, copySelection, pasteClipboard } from "../managers/clipboard.js";
import { applyIcons } from "./icons.js";

/**
 * Menu de contexto (botão direito) no canvas:
 *  - Num objeto: seleciona-o (o grupo inteiro, se pertencer a um) e mostra
 *    duplicar/copiar/excluir/agrupar/camada/bloqueio/visibilidade.
 *  - Em área vazia: limpa a seleção e mostra colar/selecionar tudo.
 */
export class ContextMenu {
    constructor(engine) {
        this.engine = engine;
        this.menu = document.querySelector("[data-context-menu]");

        engine.canvasArea.addEventListener("contextmenu", (event) => this._open(event));
        document.addEventListener("click", () => this._close());
        document.addEventListener("scroll", () => this._close(), true);
        window.addEventListener("blur", () => this._close());
        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape") this._close();
        });
    }

    _open(event) {
        event.preventDefault();
        const { camera, scene, selectionManager } = this.engine;
        const rect = this.engine.canvasArea.getBoundingClientRect();
        const worldPoint = camera.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
        const hit = scene.getObjectAtPoint(worldPoint);

        let items;
        if (hit) {
            const groupMembers = hit.groupId ? scene.objects.filter((el) => el.groupId === hit.groupId) : [hit];
            if (!groupMembers.every((el) => selectionManager.isSelected(el))) selectionManager.selectMultiple(groupMembers);
            items = this._objectItems();
        } else {
            selectionManager.clear();
            items = this._emptyItems();
        }

        this._renderItems(items);
        this.menu.style.left = `${event.clientX}px`;
        this.menu.style.top = `${event.clientY}px`;
        this.menu.hidden = false;
    }

    _objectItems() {
        return [
            { label: "Duplicar", hint: "Ctrl+D", icon: "duplicate", action: () => duplicateSelected(this.engine) },
            { label: "Copiar", hint: "Ctrl+C", icon: "duplicate", action: () => copySelection(this.engine.selectionManager) },
            { label: "Excluir", hint: "Del", icon: "trash", action: () => deleteSelected(this.engine) },
            null,
            { label: "Agrupar", hint: "Ctrl+G", icon: "group", action: () => groupSelected(this.engine) },
            { label: "Desagrupar", hint: "Ctrl+Shift+G", icon: "ungroup", action: () => ungroupSelected(this.engine) },
            null,
            { label: "Trazer para frente", icon: "layer-front", action: () => this._reorder("front") },
            { label: "Enviar para trás", icon: "layer-back", action: () => this._reorder("back") },
            null,
            { label: "Bloquear/desbloquear", icon: "lock", action: () => this._toggle("locked") },
            { label: "Ocultar/exibir", icon: "eye", action: () => this._toggle("visible") },
        ];
    }

    _emptyItems() {
        return [
            {
                label: "Colar",
                hint: "Ctrl+V",
                icon: "duplicate",
                action: () => pasteClipboard(this.engine),
                disabled: clipboard.items.length === 0,
            },
            {
                label: "Selecionar tudo",
                hint: "Ctrl+A",
                icon: "select",
                action: () => this.engine.selectionManager.selectMultiple(this.engine.scene.objects.slice()),
                disabled: this.engine.scene.objects.length === 0,
            },
        ];
    }

    _renderItems(items) {
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
            button.disabled = Boolean(item.disabled);
            button.innerHTML = `<span class="menu-item__icon" data-icon="${item.icon}"></span><span class="menu-item__label">${item.label}</span>${item.hint ? `<span class="menu-item__hint">${item.hint}</span>` : ""}`;
            if (!item.disabled) {
                button.addEventListener("click", () => {
                    item.action();
                    this._close();
                });
            }
            this.menu.appendChild(button);
        });
        applyIcons(this.menu);
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
