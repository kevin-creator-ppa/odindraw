/** Ações de objeto reutilizadas tanto por atalhos de teclado quanto por botões da UI (painel, menu de contexto). */

let groupIdCounter = 0;

/** Novo id de grupo — string simples, só precisa ser única dentro da sessão. */
export function nextGroupId() {
    groupIdCounter += 1;
    return `group_${Date.now().toString(36)}${groupIdCounter.toString(36)}`;
}

/** Remapeia groupId em clones: mantém membros do mesmo grupo original juntos, mas com um id novo (senão os clones se fundiriam ao grupo original ao clicar). */
function remapGroupIds(elements) {
    const map = new Map();
    elements.forEach((el) => {
        if (!el.groupId) return;
        if (!map.has(el.groupId)) map.set(el.groupId, nextGroupId());
        el.groupId = map.get(el.groupId);
    });
    return elements;
}

export function duplicateSelected({ scene, selectionManager, renderer, historyManager }) {
    const selected = selectionManager.getSelected();
    if (selected.length === 0) return;

    const clones = selected.map((el) => {
        const clone = el.clone();
        clone.translate(20, 20);
        scene.addObject(clone);
        return clone;
    });
    remapGroupIds(clones);
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

/** Agrupa os selecionados (2+) sob um groupId novo — clicar em qualquer um passa a selecionar todos (ver SelectTool). */
export function groupSelected({ selectionManager, renderer, historyManager }) {
    const selected = selectionManager.getSelected();
    if (selected.length < 2) return;

    const groupId = nextGroupId();
    selected.forEach((el) => (el.groupId = groupId));
    renderer.markDirty();
    historyManager?.pushSnapshot();
}

/** Remove o groupId dos selecionados, dissolvendo qualquer grupo do qual façam parte. */
export function ungroupSelected({ selectionManager, renderer, historyManager }) {
    const selected = selectionManager.getSelected();
    if (selected.length === 0) return;

    selected.forEach((el) => (el.groupId = null));
    renderer.markDirty();
    historyManager?.pushSnapshot();
}
