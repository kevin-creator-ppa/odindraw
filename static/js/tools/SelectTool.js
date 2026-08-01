import { Tool } from "./Tool.js";
import { BASE_GRID_SPACING } from "../core/Renderer.js";

const OVERLAY_COLOR = "#6965db";
const OVERLAY_PADDING = 4;

/**
 * Ferramenta padrão: clique seleciona o elemento sob o cursor (o de
 * maior zIndex), arrastar move o elemento selecionado — encaixando na
 * grade quando ela está visível. Objetos bloqueados são selecionáveis
 * (para poder desbloquear) mas não arrastáveis. Redimensionar e
 * rotacionar pelo mouse, e seleção múltipla, ficam para um refinamento
 * posterior.
 */
export class SelectTool extends Tool {
    constructor() {
        super("select", { cursor: "default" });
        this._dragTarget = null;
        this._dragOriginPointer = null;
        this._dragOriginXY = null;
        this._moved = false;
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

        this._dragTarget = target && !target.locked ? target : null;
        this._dragOriginPointer = point;
        this._dragOriginXY = target ? { x: target.x, y: target.y } : null;
        this._moved = false;
        this._redrawOverlay(context);
    }

    onPointerMove(context, point) {
        if (!this._dragTarget) return;

        let targetX = this._dragOriginXY.x + (point.x - this._dragOriginPointer.x);
        let targetY = this._dragOriginXY.y + (point.y - this._dragOriginPointer.y);

        if (context.renderer.gridEnabled) {
            targetX = Math.round(targetX / BASE_GRID_SPACING) * BASE_GRID_SPACING;
            targetY = Math.round(targetY / BASE_GRID_SPACING) * BASE_GRID_SPACING;
        }

        this._dragTarget.translate(targetX - this._dragTarget.x, targetY - this._dragTarget.y);
        this._moved = true;
        context.renderer.markDirty();
        this._redrawOverlay(context);
    }

    onPointerUp(context) {
        if (this._dragTarget && this._moved) {
            context.historyManager?.pushSnapshot();
        }
        this._dragTarget = null;
        this._dragOriginPointer = null;
        this._dragOriginXY = null;
        this._moved = false;
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
