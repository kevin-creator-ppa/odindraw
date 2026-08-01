import { Tool } from "./Tool.js";

/**
 * Base para ferramentas que desenham uma forma por arraste (retângulo,
 * elipse, linha, seta...): captura o ponto inicial no pointerdown,
 * delega o preview a cada pointermove, e ao soltar emite
 * `tool:shape-drawn` com o tipo e os pontos em coordenadas de mundo —
 * consumido pela Etapa 5 para criar o Element real na Scene.
 */
export class DrawShapeTool extends Tool {
    constructor(name, shapeType, options = {}) {
        super(name, { cursor: "crosshair", ...options });
        this.shapeType = shapeType;
        this._start = null;
    }

    onPointerDown(context, point) {
        this._start = point;
    }

    onPointerMove(context, point, event) {
        if (!this._start) return;
        const end = this.constrainEnd(this._start, point, event);
        context.renderer.clearInteractive();
        this.drawPreview(context, this._start, end);
    }

    onPointerUp(context, point, event) {
        if (!this._start) return;
        const end = this.constrainEnd(this._start, point, event);
        context.renderer.clearInteractive();
        context.eventBus.emit("tool:shape-drawn", { type: this.shapeType, start: this._start, end });
        this._start = null;
    }

    onDeactivate(context) {
        this._start = null;
        context.renderer.clearInteractive();
    }

    /** Sobrescrito por ferramentas que restringem a proporção (quadrado, círculo). */
    constrainEnd(start, end) {
        return end;
    }

    /** Sobrescrito por cada subclasse: desenha o preview (pontos em coordenadas de mundo). */
    drawPreview(context, startWorld, endWorld) {}
}
