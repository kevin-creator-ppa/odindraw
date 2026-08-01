import { Tool } from "./Tool.js";

/**
 * Ferramenta de texto: no clique, marca o ponto de inserção. A criação
 * do Element de texto com edição inline fica para a Etapa 5.
 */
export class TextTool extends Tool {
    constructor() {
        super("text", { cursor: "text" });
    }

    onPointerDown(context, point) {
        context.eventBus.emit("tool:text-placed", { point });
    }
}
