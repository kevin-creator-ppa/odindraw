import { captureSceneState, applySceneState } from "../io/sceneSerializer.js";
import { DEFAULT_PAGE_SIZE } from "../core/Renderer.js";

let pageCounter = 0;

function nextPageId() {
    pageCounter += 1;
    return `page_${Date.now().toString(36)}${pageCounter.toString(36)}`;
}

/**
 * Dono das páginas do documento (múltiplas páginas, estilo draw.io):
 * cada página guarda seu próprio snapshot de cena+câmera+grade (mesmo
 * formato de io/sceneSerializer.js usado pelo SaveLoad). Trocar de
 * página grava o estado atual na página que está saindo
 * (`captureActivePage`) e aplica o snapshot da que está entrando — sem
 * round-trip de rede.
 *
 * O histórico de desfazer (HistoryManager) guarda um snapshot de TODAS
 * as páginas a cada ação, então adicionar/remover/renomear página e
 * trocar de página também são desfazíveis — sem precisar de uma pilha
 * de undo por página.
 */
export class PageManager {
    constructor({ scene, camera, renderer, eventBus }) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.eventBus = eventBus;
        this.pages = [];
        this.activePageId = null;
        this.reset();
    }

    captureActivePage() {
        const page = this.pages.find((p) => p.id === this.activePageId);
        if (page) page.data = captureSceneState({ scene: this.scene, camera: this.camera, renderer: this.renderer });
    }

    applyPage(page) {
        applySceneState({ scene: this.scene, camera: this.camera, renderer: this.renderer }, page.data ?? {});
        this.activePageId = page.id;
    }

    addPage(name) {
        this.captureActivePage();
        const page = { id: nextPageId(), name: name ?? `Página ${this.pages.length + 1}`, data: null };
        this.pages.push(page);
        this.applyPage(page);
        this._notify();
        return page;
    }

    /** Recusa remover a última página restante. */
    removePage(id) {
        if (this.pages.length <= 1) return false;
        const index = this.pages.findIndex((p) => p.id === id);
        if (index === -1) return false;

        const wasActive = this.activePageId === id;
        this.pages.splice(index, 1);
        if (wasActive) this.applyPage(this.pages[Math.max(0, index - 1)]);
        this._notify();
        return true;
    }

    renamePage(id, name) {
        const page = this.pages.find((p) => p.id === id);
        if (page && name.trim()) page.name = name.trim();
        this._notify();
    }

    switchTo(id) {
        if (id === this.activePageId) return;
        const page = this.pages.find((p) => p.id === id);
        if (!page) return;
        this.captureActivePage();
        this.applyPage(page);
        this._notify();
    }

    /** Reseta pra um documento novo, em branco, de uma página só. */
    reset() {
        this.scene.clear();
        this.camera.reset();
        this.renderer.setGridEnabled(true);
        this.renderer.setPageSize({ ...DEFAULT_PAGE_SIZE });
        const page = { id: nextPageId(), name: "Página 1", data: null };
        this.pages = [page];
        this.activePageId = page.id;
        this.captureActivePage();
        this._notify();
    }

    /** Carrega páginas vindas do backend (abrir diagrama) ou reconstruídas de um diagrama salvo antes desta etapa. */
    loadPages(pagesData, activePageId) {
        this.pages = pagesData.map((p) => ({
            id: p.id ?? nextPageId(),
            name: p.name ?? "Página",
            data: {
                canvas: p.canvas,
                layers: p.layers,
                active_layer_id: p.active_layer_id,
                objects: p.objects,
                connections: p.connections,
            },
        }));
        const target = this.pages.find((p) => p.id === activePageId) ?? this.pages[0];
        this.applyPage(target);
        this._notify();
    }

    _notify() {
        this.renderer.markDirty();
        this.eventBus.emit("camera:change");
        this.eventBus.emit("selection:change", []);
        this.eventBus.emit("layers:change");
        this.eventBus.emit("pages:change");
    }
}
