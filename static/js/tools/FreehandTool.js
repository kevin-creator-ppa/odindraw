import { Tool } from "./Tool.js";

const PREVIEW_COLOR = "#6965db";

/**
 * Desenho livre: acumula pontos enquanto o botão está pressionado e
 * desenha o traço no canvas interativo. A persistência como Element
 * (Etapa 5) consome os pontos emitidos em `tool:freehand-drawn`.
 */
export class FreehandTool extends Tool {
    constructor() {
        super("freehand", { cursor: "crosshair" });
        this._points = [];
    }

    onPointerDown(context, point) {
        this._points = [point];
    }

    onPointerMove(context, point) {
        if (this._points.length === 0) return;
        this._points.push(point);
        context.renderer.clearInteractive();
        this._drawPath(context);
    }

    onPointerUp(context) {
        if (this._points.length === 0) return;
        context.renderer.clearInteractive();
        context.eventBus.emit("tool:freehand-drawn", { points: this._points });
        this._points = [];
    }

    onDeactivate(context) {
        this._points = [];
        context.renderer.clearInteractive();
    }

    _drawPath(context) {
        const ctx = context.renderer.interactiveCtx;
        const screenPoints = this._points.map((p) => context.camera.worldToScreen(p.x, p.y));

        ctx.save();
        ctx.strokeStyle = PREVIEW_COLOR;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        screenPoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        ctx.restore();
    }
}
