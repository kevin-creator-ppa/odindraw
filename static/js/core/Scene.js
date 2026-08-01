/**
 * Fonte única de verdade do diagrama: elementos, conexões e seleção atual.
 *
 * Nesta etapa (3 — canvas) a Scene ainda não guarda elementos reais (isso
 * chega nas Etapas 4/5 com as ferramentas e classes de Element). Ela já
 * existe agora para que o Renderer tenha um contrato estável de onde ler
 * "o que desenhar" e para onde evoluir o culling por viewport.
 */
export class Scene {
    constructor() {
        this.objects = [];
        this.connections = [];
        this.selection = new Set();
    }

    /** Elementos cujo bounding box intercepta o retângulo do viewport (em coordenadas de mundo). */
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
