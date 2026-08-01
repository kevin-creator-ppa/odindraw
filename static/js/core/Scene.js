/**
 * Fonte única de verdade do diagrama: elementos e seleção atual. O
 * Renderer lê `objects` para desenhar; as ferramentas e o
 * SelectionManager mutam a cena através dos métodos abaixo.
 *
 * Conectores (Etapa 6) são só mais um `type` dentro de `objects` — não
 * um array `connections` separado. Eles reaproveitam 100% do pipeline
 * de render/seleção/arraste/exclusão já existente; a separação em
 * "objects" vs "connections" do JSON exportado (Etapa 7) é feita na
 * serialização, filtrando por `type`, não na estrutura em memória.
 */
export class Scene {
    constructor() {
        this.objects = [];
        this.selection = new Set();
        this._nextZIndex = 0;
    }

    addObject(element) {
        element.zIndex = this._nextZIndex++;
        this.objects.push(element);
        return element;
    }

    /** Reinsere um elemento já reconstruído (Etapa 7 — abrir diagrama), preservando seu zIndex original. */
    restoreObject(element) {
        this.objects.push(element);
        this._nextZIndex = Math.max(this._nextZIndex, (element.zIndex ?? 0) + 1);
        return element;
    }

    clear() {
        this.objects = [];
        this.selection.clear();
        this._nextZIndex = 0;
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

    /** Elemento de maior zIndex cujo bounding box contém o ponto (coordenadas de mundo). */
    getObjectAtPoint(point) {
        const sorted = [...this.objects].sort((a, b) => b.zIndex - a.zIndex);
        return sorted.find((el) => {
            if (!el.visible) return false;
            el.beforeHitTest(this);
            return el.containsPoint(point);
        }) ?? null;
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
