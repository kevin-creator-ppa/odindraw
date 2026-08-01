/** Ações de objeto reutilizadas tanto por atalhos de teclado quanto por botões da UI. */

export function duplicateSelected({ scene, selectionManager, renderer }) {
    const selected = selectionManager.getSingle();
    if (!selected) return;

    const clone = selected.clone();
    clone.translate(20, 20);
    scene.addObject(clone);
    selectionManager.select(clone);
    renderer.markDirty();
}

export function deleteSelected({ scene, selectionManager, renderer }) {
    const selected = selectionManager.getSingle();
    if (!selected) return;

    scene.removeObject(selected);
    selectionManager.clear();
    renderer.markDirty();
    renderer.clearInteractive();
}
