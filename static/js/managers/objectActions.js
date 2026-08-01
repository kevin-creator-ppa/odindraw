/** Ações de objeto reutilizadas tanto por atalhos de teclado quanto por botões da UI. */

export function duplicateSelected({ scene, selectionManager, renderer, historyManager }) {
    const selected = selectionManager.getSelected();
    if (selected.length === 0) return;

    const clones = selected.map((el) => {
        const clone = el.clone();
        clone.translate(20, 20);
        scene.addObject(clone);
        return clone;
    });
    selectionManager.selectMultiple(clones);
    renderer.markDirty();
    historyManager?.pushSnapshot();
}

export function deleteSelected({ scene, selectionManager, renderer, historyManager }) {
    const selected = selectionManager.getSelected();
    if (selected.length === 0) return;

    selected.forEach((el) => scene.removeObject(el));
    selectionManager.clear();
    renderer.markDirty();
    renderer.clearInteractive();
    historyManager?.pushSnapshot();
}
