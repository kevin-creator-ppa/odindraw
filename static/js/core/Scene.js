/**
 * Fonte única de verdade do diagrama: elementos, conexões e seleção
 * atual. O Renderer lê `objects` para desenhar; as ferramentas e o
 * SelectionManager mutam a cena através dos métodos abaixo.
 */
export class Scene {
    constructor() {
        this.objects = [];
        this.connections = [];
        this.selection = new Set();
        this._nextZIndex = 0;
    }

    addObject(element) {
        element.zIndex = this._nextZIndex++;
        this.objects.push(element);
        return element;
    }

    removeObject(element) {
        this.objects = this.objects.filter((o) => o !== element);
        this.selection.delete(element);
    }

    /** Elemento de maior zIndex cujo bounding box contém o ponto (coordenadas de mundo). */
    getObjectAtPoint(point) {
        const sorted = [...this.objects].sort((a, b) => b.zIndex - a.zIndex);
        return sorted.find((el) => el.visible && el.containsPoint(point)) ?? null;
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
