import { nextGroupId } from "./objectActions.js";

/** Clipboard de elementos em memória, compartilhado entre o atalho Ctrl+C/Ctrl+V e o menu de contexto (área vazia). */
export const clipboard = { items: [] };

export function copySelection(selectionManager) {
    const selected = selectionManager.getSelected();
    if (selected.length === 0) return;
    clipboard.items = selected.map((el) => el.clone());
}

/** Cola os itens copiados deslocados (+20,+20) — cada colagem seguinte desloca a partir da anterior, não sempre do original (como a maioria dos editores). Remapeia groupId pra não fundir colagens no grupo original. */
export function pasteClipboard({ scene, selectionManager, renderer, historyManager }) {
    if (clipboard.items.length === 0) return;

    const groupIdMap = new Map();
    clipboard.items = clipboard.items.map((el) => {
        const copy = el.clone();
        copy.translate(20, 20);
        if (copy.groupId) {
            if (!groupIdMap.has(copy.groupId)) groupIdMap.set(copy.groupId, nextGroupId());
            copy.groupId = groupIdMap.get(copy.groupId);
        }
        scene.addObject(copy);
        return copy;
    });

    selectionManager.selectMultiple(clipboard.items);
    renderer.markDirty();
    historyManager?.pushSnapshot();
}
