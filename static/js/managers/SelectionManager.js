/**
 * Fonte única de verdade da seleção atual (Scene.selection), com API de
 * alto nível para as ferramentas e para o painel de propriedades.
 *
 * `Scene.selection` já é um Set desde o início — os métodos abaixo cobrem
 * tanto o caso de um único elemento (clique simples) quanto múltiplos
 * (shift-click, marquee).
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

    /** Substitui a seleção pelo conjunto informado (usado pela marquee/rubber-band). */
    selectMultiple(elements) {
        this.scene.selection.clear();
        elements.forEach((el) => this.scene.selection.add(el));
        this._emit();
    }

    /** Adiciona ao conjunto atual sem limpar (usado por marquee com Shift pressionado). */
    addMultiple(elements) {
        elements.forEach((el) => this.scene.selection.add(el));
        this._emit();
    }

    /** Shift-click num elemento: entra ou sai da seleção sem afetar o resto. */
    toggle(element) {
        if (this.scene.selection.has(element)) {
            this.scene.selection.delete(element);
        } else {
            this.scene.selection.add(element);
        }
        this._emit();
    }

    isSelected(element) {
        return this.scene.selection.has(element);
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
