import { Tool } from "./Tool.js";

/**
 * Borracha: nesta etapa ainda não existem elementos para apagar (isso
 * chega na Etapa 5, com a Scene populada). Por ora só define o cursor
 * e emite `tool:erase-drag` enquanto o botão é arrastado, pronto para
 * a lógica real de remoção se conectar depois.
 */
export class EraserTool extends Tool {
    constructor() {
        super("eraser", { cursor: "cell" });
    }

    onPointerMove(context, point, event) {
        if (event.buttons !== 1) return;
        context.eventBus.emit("tool:erase-drag", { point });
    }
}
