import { elementFromJSON } from "../elements/elementFactory.js";

/**
 * Undo/redo por snapshot: cada ação relevante (criar, mover, duplicar,
 * excluir, editar propriedade) empilha uma cópia serializada da Scene
 * inteira. Simples e robusto o bastante para o volume de objetos de um
 * diagrama; um histórico por comandos (delta) fica para se algum dia a
 * performance com milhares de objetos exigir.
 *
 * Histórico é só desta sessão (não persiste entre reloads) e é
 * resetado sempre que um diagrama novo é aberto/carregado.
 */
export class HistoryManager {
    constructor({ scene, renderer, selectionManager, eventBus }) {
        this.scene = scene;
        this.renderer = renderer;
        this.selectionManager = selectionManager;
        this.eventBus = eventBus;

        this._undoStack = [this._snapshot()];
        this._redoStack = [];

        eventBus.on("diagram:change", () => this.reset());
    }

    pushSnapshot() {
        this._undoStack.push(this._snapshot());
        this._redoStack = [];
        this._emitState();
    }

    reset() {
        this._undoStack = [this._snapshot()];
        this._redoStack = [];
        this._emitState();
    }

    undo() {
        if (this._undoStack.length <= 1) return;
        this._redoStack.push(this._undoStack.pop());
        this._restore(this._undoStack[this._undoStack.length - 1]);
        this._emitState();
    }

    redo() {
        if (this._redoStack.length === 0) return;
        const next = this._redoStack.pop();
        this._undoStack.push(next);
        this._restore(next);
        this._emitState();
    }

    _snapshot() {
        return this.scene.objects.map((el) => el.serialize());
    }

    _restore(snapshot) {
        this.scene.clear();
        snapshot.forEach((raw) => {
            const element = elementFromJSON(raw);
            if (element) this.scene.restoreObject(element);
        });

        this.renderer.markDirty();
        this.renderer.clearInteractive();
        this.eventBus.emit("selection:change", []);
    }

    getState() {
        return { canUndo: this._undoStack.length > 1, canRedo: this._redoStack.length > 0 };
    }

    _emitState() {
        this.eventBus.emit("history:change", this.getState());
    }
}
