import { Scene } from "../core/Scene.js";
import { elementFromJSON } from "../elements/elementFactory.js";

/**
 * Reconstrói uma Scene "descartável" a partir do `data` já serializado
 * de uma página (mesmo formato do salvar/carregar) — usada sempre que
 * é preciso olhar o conteúdo de uma página que não é a ativa, sem
 * tocar a Scene de edição de verdade (modo apresentação, exportar
 * todas as páginas de uma vez).
 */
export function scenePreviewFromPageData(data) {
    const scene = new Scene();
    if (Array.isArray(data?.layers) && data.layers.length > 0) {
        scene.layers = data.layers.map((l) => ({ ...l }));
        scene.activeLayerId = scene.layers.some((l) => l.id === data.active_layer_id) ? data.active_layer_id : scene.layers[0].id;
    }
    [...(data?.objects ?? []), ...(data?.connections ?? [])].forEach((raw) => {
        const element = elementFromJSON(raw);
        if (element) scene.restoreObject(element);
    });
    return scene;
}
