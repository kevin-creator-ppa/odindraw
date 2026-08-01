import { Tool } from "./Tool.js";

const OVERLAY_COLOR = "#6965db";
const OVERLAY_PADDING = 4;

/**
 * Ferramenta padrão: clique seleciona o elemento sob o cursor (o de
 * maior zIndex), arrastar move o elemento selecionado. Redimensionar,
 * rotacionar pelo mouse e seleção múltipla ficam para um refinamento
 * posterior — por enquanto a seleção mostra só o contorno.
 */
export class SelectTool extends Tool {
    constructor() {
        super("select", { cursor: "default" });
        this._dragTarget = null;
        this._lastPoint = null;
        this._unsubscribeCamera = null;
    }

    onActivate(context) {
        this._unsubscribeCamera = context.eventBus.on("camera:change", () => this._redrawOverlay(context));
        this._redrawOverlay(context);
    }

    onDeactivate(context) {
        this._unsubscribeCamera?.();
        this._unsubscribeCamera = null;
        this._dragTarget = null;
        context.renderer.clearInteractive();
    }

    onPointerDown(context, point) {
        const target = context.scene.getObjectAtPoint(point);
        context.selectionManager.select(target);
        this._dragTarget = target;
        this._lastPoint = point;
        this._redrawOverlay(context);
    }

    onPointerMove(context, point) {
        if (!this._dragTarget) return;
        this._dragTarget.translate(point.x - this._lastPoint.x, point.y - this._lastPoint.y);
        this._lastPoint = point;
        context.renderer.markDirty();
        this._redrawOverlay(context);
    }

    onPointerUp() {
        this._dragTarget = null;
        this._lastPoint = null;
    }

    _redrawOverlay(context) {
        context.renderer.clearInteractive();
        const selected = context.selectionManager.getSelected();
        if (selected.length === 0) return;

        const ctx = context.renderer.interactiveCtx;
        ctx.save();
        ctx.strokeStyle = OVERLAY_COLOR;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);

        selected.forEach((element) => {
            const bounds = element.getBounds();
            const topLeft = context.camera.worldToScreen(bounds.x, bounds.y);
            const w = bounds.width * context.camera.zoom;
            const h = bounds.height * context.camera.zoom;
            ctx.strokeRect(
                topLeft.x - OVERLAY_PADDING,
                topLeft.y - OVERLAY_PADDING,
                w + OVERLAY_PADDING * 2,
                h + OVERLAY_PADDING * 2
            );
        });

        ctx.restore();
    }
}
