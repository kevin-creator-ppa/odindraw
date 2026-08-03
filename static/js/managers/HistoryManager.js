/**
 * Undo/redo por snapshot: cada ação relevante (criar, mover, duplicar,
 * excluir, editar propriedade, mexer em camada/página) empilha uma
 * cópia serializada de TODAS as páginas do documento. Simples e robusto
 * o bastante para o volume de objetos de um diagrama; um histórico por
 * comandos (delta) fica para se algum dia a performance com milhares de
 * objetos exigir.
 *
 * Guardar todas as páginas (não só a ativa) é o que permite desfazer
 * também adicionar/remover/renomear página e trocar de página — sem
 * precisar de uma pilha de undo separada por página. Na prática o custo
 * é baixo: só a página ativa é re-serializada a cada snapshot (as
 * demais só carregam a referência do `data` já serializado da última
 * vez que estiveram ativas).
 *
 * Histórico é só desta sessão (não persiste entre reloads) e é
 * resetado sempre que um diagrama novo é aberto/carregado.
 */
export class HistoryManager {
    constructor({ pageManager, renderer, selectionManager, eventBus }) {
        this.pageManager = pageManager;
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
        this.pageManager.captureActivePage();
        return {
            pages: this.pageManager.pages.map((p) => ({ id: p.id, name: p.name, data: p.data })),
            activePageId: this.pageManager.activePageId,
        };
    }

    _restore(snapshot) {
        this.pageManager.pages = snapshot.pages.map((p) => ({ id: p.id, name: p.name, data: p.data }));
        const target = this.pageManager.pages.find((p) => p.id === snapshot.activePageId) ?? this.pageManager.pages[0];
        this.pageManager.applyPage(target);

        this.renderer.markDirty();
        this.renderer.clearInteractive();
        this.eventBus.emit("selection:change", []);
        this.eventBus.emit("layers:change");
        this.eventBus.emit("pages:change");
    }

    getState() {
        return { canUndo: this._undoStack.length > 1, canRedo: this._redoStack.length > 0 };
    }

    _emitState() {
        this.eventBus.emit("history:change", this.getState());
    }
}
