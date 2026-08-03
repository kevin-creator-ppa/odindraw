/**
 * Fonte única de verdade do diagrama: elementos, camadas e seleção
 * atual. O Renderer lê `objects` para desenhar; as ferramentas e o
 * SelectionManager mutam a cena através dos métodos abaixo.
 *
 * Conectores (Etapa 6) são só mais um `type` dentro de `objects` — não
 * um array `connections` separado. Eles reaproveitam 100% do pipeline
 * de render/seleção/arraste/exclusão já existente; a separação em
 * "objects" vs "connections" do JSON exportado (Etapa 7) é feita na
 * serialização, filtrando por `type`, não na estrutura em memória.
 *
 * Camadas (estilo draw.io): cada elemento pertence a uma camada
 * (`layerId`). A ordem de `layers` define a ordem de empilhamento entre
 * camadas (a última é a de cima); dentro de uma mesma camada, quem
 * manda é o `zIndex` de sempre. Ocultar/bloquear uma camada afeta todos
 * os elementos nela, combinado (OR) com o `visible`/`locked` individual
 * de cada um.
 */
export class Scene {
    constructor() {
        this.objects = [];
        this.selection = new Set();
        this._nextZIndex = 0;
        this._layerCounter = 0;
        this.layers = [];
        this.activeLayerId = null;
        this.addLayer("Camada 1");
    }

    addObject(element) {
        element.zIndex = this._nextZIndex++;
        if (!element.layerId) element.layerId = this.activeLayerId;
        this.objects.push(element);
        return element;
    }

    /** Reinsere um elemento já reconstruído (Etapa 7 — abrir diagrama / undo), preservando seu zIndex original. */
    restoreObject(element) {
        if (!element.layerId || !this.layers.some((l) => l.id === element.layerId)) {
            element.layerId = this.layers[0].id;
        }
        this.objects.push(element);
        this._nextZIndex = Math.max(this._nextZIndex, (element.zIndex ?? 0) + 1);
        return element;
    }

    clear() {
        this.objects = [];
        this.selection.clear();
        this._nextZIndex = 0;
        this._layerCounter = 0;
        this.layers = [];
        this.activeLayerId = null;
        this.addLayer("Camada 1");
    }

    removeObject(element) {
        this.objects = this.objects.filter((o) => o !== element);
        this.selection.delete(element);
        this._detachConnectors(element);
    }

    /** Conectores ligados ao elemento removido ficam soltos na última posição resolvida, em vez de quebrar. */
    _detachConnectors(removed) {
        this.objects.forEach((el) => {
            if (el.type !== "connector") return;
            if (el.startObjectId === removed.id) {
                el.startObjectId = null;
                el.startPoint = el._resolvedStart ?? el.startPoint;
            }
            if (el.endObjectId === removed.id) {
                el.endObjectId = null;
                el.endPoint = el._resolvedEnd ?? el.endPoint;
            }
        });
    }

    // --- Camadas -----------------------------------------------------

    addLayer(name) {
        this._layerCounter += 1;
        const layer = {
            id: `layer_${Date.now().toString(36)}${this._layerCounter.toString(36)}`,
            name: name ?? `Camada ${this.layers.length + 1}`,
            visible: true,
            locked: false,
        };
        this.layers.push(layer);
        this.activeLayerId = layer.id;
        return layer;
    }

    /** Remove a camada e todo o seu conteúdo. Recusa remover a última camada restante. */
    removeLayer(id) {
        if (this.layers.length <= 1) return false;
        const index = this.layers.findIndex((l) => l.id === id);
        if (index === -1) return false;

        this.objects.filter((el) => el.layerId === id).forEach((el) => this.removeObject(el));
        this.layers.splice(index, 1);
        if (this.activeLayerId === id) {
            this.activeLayerId = this.layers[Math.max(0, index - 1)].id;
        }
        return true;
    }

    renameLayer(id, name) {
        const layer = this.layers.find((l) => l.id === id);
        if (layer && name.trim()) layer.name = name.trim();
    }

    setLayerVisible(id, visible) {
        const layer = this.layers.find((l) => l.id === id);
        if (layer) layer.visible = visible;
    }

    setLayerLocked(id, locked) {
        const layer = this.layers.find((l) => l.id === id);
        if (layer) layer.locked = locked;
    }

    /** Move a camada uma posição para cima (+1, mais perto do topo da pilha) ou para baixo (-1) na ordem de empilhamento. */
    moveLayer(id, direction) {
        const index = this.layers.findIndex((l) => l.id === id);
        const target = index + direction;
        if (index === -1 || target < 0 || target >= this.layers.length) return;
        [this.layers[index], this.layers[target]] = [this.layers[target], this.layers[index]];
    }

    getLayer(id) {
        return this.layers.find((l) => l.id === id) ?? this.layers[0];
    }

    layerIndex(id) {
        const index = this.layers.findIndex((l) => l.id === id);
        return index === -1 ? 0 : index;
    }

    /** Ordem de empilhamento combinada: primeiro por camada (posição em `layers`), depois por zIndex dentro dela. */
    stackCompare(a, b) {
        const layerDiff = this.layerIndex(a.layerId) - this.layerIndex(b.layerId);
        return layerDiff !== 0 ? layerDiff : a.zIndex - b.zIndex;
    }

    isElementVisible(el) {
        return el.visible && this.getLayer(el.layerId).visible;
    }

    isElementLocked(el) {
        return el.locked || this.getLayer(el.layerId).locked;
    }

    // --- Consultas -----------------------------------------------------

    /** Elemento de maior ordem de empilhamento cujo bounding box contém o ponto (coordenadas de mundo). */
    getObjectAtPoint(point) {
        const sorted = [...this.objects].sort((a, b) => this.stackCompare(a, b));
        for (let i = sorted.length - 1; i >= 0; i--) {
            const el = sorted[i];
            if (!this.isElementVisible(el)) continue;
            el.beforeHitTest(this);
            if (el.containsPoint(point)) return el;
        }
        return null;
    }

    /** Elementos cujo bounding box intercepta o retângulo do viewport (coordenadas de mundo). */
    getVisibleObjects(viewportRect) {
        return this.objects.filter((obj) => this._intersects(obj, viewportRect));
    }

    _intersects(obj, rect) {
        return !(
            obj.x + obj.width < rect.x ||
            obj.x > rect.x + rect.width ||
            obj.y + obj.height < rect.y ||
            obj.y > rect.y + rect.height
        );
    }
}
