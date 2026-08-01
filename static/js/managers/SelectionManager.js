/**
 * Fonte única de verdade da seleção atual (Scene.selection), com API de
 * alto nível para as ferramentas e para o painel de propriedades.
 *
 * Só suporta um elemento selecionado por vez nesta etapa; marquee e
 * seleção múltipla ficam para um refinamento posterior.
 */
export class SelectionManager {
    constructor({ scene, eventBus }) {
        this.scene = scene;
        this.eventBus = eventBus;
    }

    select(element) {
        this.scene.selection.clear();
        if (element) this.scene.selection.add(element);
        this._emit();
    }

    clear() {
        this.scene.selection.clear();
        this._emit();
    }

    remove(element) {
        this.scene.selection.delete(element);
        this._emit();
    }

    getSelected() {
        return Array.from(this.scene.selection);
    }

    getSingle() {
        return this.getSelected()[0] ?? null;
    }

    _emit() {
        this.eventBus.emit("selection:change", this.getSelected());
    }
}
