/**
 * Classe base de uma ferramenta do editor. Cada ferramenta concreta
 * (seleção, formas, texto, borracha...) sobrescreve só os hooks de ciclo
 * de vida que precisa; os demais permanecem no-op.
 *
 * `context` (passado pelo ToolManager) expõe { camera, scene, eventBus, renderer }.
 * `point` nos hooks de ponteiro é sempre a posição em coordenadas de mundo.
 */
export class Tool {
    constructor(name, { cursor = "default" } = {}) {
        this.name = name;
        this.cursor = cursor;
    }

    onActivate(context) {}

    onDeactivate(context) {}

    onPointerDown(context, point, event) {}

    onPointerMove(context, point, event) {}

    onPointerUp(context, point, event) {}
}
