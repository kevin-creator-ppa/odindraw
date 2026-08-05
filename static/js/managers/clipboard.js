import { nextGroupId, remapContainerIds } from "./objectActions.js";

/** Clipboard de elementos em memória, compartilhado entre o atalho Ctrl+C/Ctrl+V e o menu de contexto (área vazia). */
export const clipboard = { items: [] };

/** Clona a seleção já remapeando containerId entre si (senão um filho apontaria pro container ORIGINAL, não pro clone guardado no clipboard — ver pasteClipboard). */
export function copySelection(selectionManager) {
    const selected = selectionManager.getSelected();
    if (selected.length === 0) return;

    const idMap = new Map();
    const clones = selected.map((el) => {
        const clone = el.clone();
        idMap.set(el.id, clone.id);
        return clone;
    });
    remapContainerIds(clones, idMap);
    clipboard.items = clones;
}

/** Cola os itens copiados deslocados (+20,+20) — cada colagem seguinte desloca a partir da anterior, não sempre do original (como a maioria dos editores). Remapeia groupId/containerId pra não fundir colagens no grupo/container original. */
export function pasteClipboard({ scene, selectionManager, renderer, historyManager }) {
    if (clipboard.items.length === 0) return;

    const groupIdMap = new Map();
    const idMap = new Map();
    const pasted = clipboard.items.map((el) => {
        const copy = el.clone();
        copy.translate(20, 20);
        idMap.set(el.id, copy.id);
        if (copy.groupId) {
            if (!groupIdMap.has(copy.groupId)) groupIdMap.set(copy.groupId, nextGroupId());
            copy.groupId = groupIdMap.get(copy.groupId);
        }
        return copy;
    });
    remapContainerIds(pasted, idMap);
    pasted.forEach((copy) => scene.addObject(copy));
    clipboard.items = pasted;

    selectionManager.selectMultiple(pasted);
    renderer.markDirty();
    historyManager?.pushSnapshot();
}
