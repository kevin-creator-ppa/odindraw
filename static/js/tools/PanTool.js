import { Tool } from "./Tool.js";

/**
 * Ferramenta "Mão": arrastar com o botão principal navega o canvas.
 * O pan universal (segurar espaço / botão do meio) já é tratado pelo
 * InputController independente da ferramenta ativa; esta classe cobre
 * o caso de a ferramenta Mão estar selecionada e o usuário arrastar
 * normalmente.
 */
export class PanTool extends Tool {
    constructor() {
        super("pan", { cursor: "grab" });
        this._dragging = false;
        this._last = null;
    }

    onPointerDown(context, point, event) {
        this._dragging = true;
        this._last = { x: event.clientX, y: event.clientY };
    }

    onPointerMove(context, point, event) {
        if (!this._dragging) return;
        const dx = event.clientX - this._last.x;
        const dy = event.clientY - this._last.y;
        this._last = { x: event.clientX, y: event.clientY };
        context.camera.pan(dx, dy);
        context.renderer.markDirty();
        context.eventBus.emit("camera:change");
    }

    onPointerUp() {
        this._dragging = false;
    }

    onDeactivate() {
        this._dragging = false;
    }
}
