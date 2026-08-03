import { elementFromJSON } from "../elements/elementFactory.js";

/**
 * Captura/aplica o estado de uma página (Scene + Camera + grade do
 * Renderer) num objeto plano — mesmo formato usado tanto pelo SaveLoad
 * (persistência no backend) quanto pelo PageManager (trocar de página
 * sem round-trip de rede, e pelo HistoryManager, que guarda um
 * snapshot de todas as páginas a cada ação).
 */
export function captureSceneState({ scene, camera, renderer }) {
    const objects = scene.objects.filter((el) => el.type !== "connector").map((el) => el.serialize());
    const connections = scene.objects.filter((el) => el.type === "connector").map((el) => el.serialize());

    return {
        canvas: {
            zoom: camera.zoom,
            offset_x: camera.offsetX,
            offset_y: camera.offsetY,
            grid_enabled: renderer.gridEnabled,
        },
        layers: scene.layers.map((l) => ({ ...l })),
        active_layer_id: scene.activeLayerId,
        objects,
        connections,
    };
}

export function applySceneState({ scene, camera, renderer }, data = {}) {
    scene.clear();
    if (Array.isArray(data.layers) && data.layers.length > 0) {
        scene.layers = data.layers.map((l) => ({ ...l }));
        scene.activeLayerId = scene.layers.some((l) => l.id === data.active_layer_id)
            ? data.active_layer_id
            : scene.layers[0].id;
    }
    [...(data.objects ?? []), ...(data.connections ?? [])].forEach((raw) => {
        const element = elementFromJSON(raw);
        if (element) scene.restoreObject(element);
    });

    camera.zoom = data.canvas?.zoom ?? 1;
    camera.offsetX = data.canvas?.offset_x ?? 0;
    camera.offsetY = data.canvas?.offset_y ?? 0;
    renderer.setGridEnabled(data.canvas?.grid_enabled ?? true);
}
