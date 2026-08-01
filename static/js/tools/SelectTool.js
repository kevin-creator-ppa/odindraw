import { Tool } from "./Tool.js";
import { BASE_GRID_SPACING } from "../core/Renderer.js";

const OVERLAY_COLOR = "#6965db";
const OVERLAY_PADDING = 4;
const HANDLE_OFFSET = 14;
const HANDLE_RADIUS = 5;
const HANDLE_HIT_RADIUS = 9;

/**
 * Ferramenta padrão: clique seleciona o elemento sob o cursor (o de
 * maior zIndex), arrastar move o elemento selecionado — encaixando na
 * grade quando ela está visível. Objetos bloqueados são selecionáveis
 * (para poder desbloquear) mas não arrastáveis.
 *
 * Quando há um único elemento (não conector) selecionado, 4 alças
 * aparecem nas extremidades (N/E/S/W); arrastar a partir de uma delas
 * cria um Connector saindo dali — solto se soltar em área vazia, ou
 * ligado se soltar sobre outro objeto (como o "hover arrows" do
 * draw.io). Redimensionar/rotacionar pelo mouse e seleção múltipla
 * ficam para um refinamento posterior.
 */
export class SelectTool extends Tool {
    constructor() {
        super("select", { cursor: "default" });
        this._dragTarget = null;
        this._dragOriginPointer = null;
        this._dragOriginXY = null;
        this._moved = false;
        this._connectorDrag = null;
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
        this._connectorDrag = null;
        context.renderer.clearInteractive();
    }

    onPointerDown(context, point) {
        const single = this._singleConnectableSelection(context);
        if (single) {
            const screenPoint = context.camera.worldToScreen(point.x, point.y);
            const handle = this._hitTestHandle(context, single, screenPoint);
            if (handle) {
                this._connectorDrag = { fromElement: single, fromWorldPoint: handle.worldPoint };
                return;
            }
        }

        const target = context.scene.getObjectAtPoint(point);
        context.selectionManager.select(target);

        this._dragTarget = target && !target.locked ? target : null;
        this._dragOriginPointer = point;
        this._dragOriginXY = target ? { x: target.x, y: target.y } : null;
        this._moved = false;
        this._redrawOverlay(context);
    }

    onPointerMove(context, point) {
        if (this._connectorDrag) {
            this._redrawOverlay(context);
            const a = context.camera.worldToScreen(this._connectorDrag.fromWorldPoint.x, this._connectorDrag.fromWorldPoint.y);
            const b = context.camera.worldToScreen(point.x, point.y);
            const ctx = context.renderer.interactiveCtx;
            ctx.save();
            ctx.strokeStyle = OVERLAY_COLOR;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.restore();
            return;
        }

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

    onPointerUp(context, point) {
        if (this._connectorDrag) {
            const { fromElement, fromWorldPoint } = this._connectorDrag;
            const targetElement = context.scene.getObjectAtPoint(point);
            const endObjectId = targetElement && targetElement !== fromElement ? targetElement.id : null;

            context.eventBus.emit("tool:connector-drawn", {
                startObjectId: fromElement.id,
                startPoint: fromWorldPoint,
                endObjectId,
                endPoint: point,
            });

            this._connectorDrag = null;
            this._redrawOverlay(context);
            return;
        }

        if (this._dragTarget && this._moved) {
            context.historyManager?.pushSnapshot();
        }
        this._dragTarget = null;
        this._dragOriginPointer = null;
        this._dragOriginXY = null;
        this._moved = false;
    }

    _singleConnectableSelection(context) {
        const selected = context.selectionManager.getSelected();
        if (selected.length !== 1) return null;
        const [element] = selected;
        return element.type !== "connector" ? element : null;
    }

    /** Pontos médios das 4 bordas do bbox, em coordenadas de tela (com offset pra fora) e de mundo. */
    _getHandlePositions(context, element) {
        const b = element.getBounds();
        const topLeft = context.camera.worldToScreen(b.x, b.y);
        const w = b.width * context.camera.zoom;
        const h = b.height * context.camera.zoom;

        return [
            { x: topLeft.x + w / 2, y: topLeft.y - HANDLE_OFFSET, worldPoint: { x: b.x + b.width / 2, y: b.y } },
            { x: topLeft.x + w + HANDLE_OFFSET, y: topLeft.y + h / 2, worldPoint: { x: b.x + b.width, y: b.y + b.height / 2 } },
            { x: topLeft.x + w / 2, y: topLeft.y + h + HANDLE_OFFSET, worldPoint: { x: b.x + b.width / 2, y: b.y + b.height } },
            { x: topLeft.x - HANDLE_OFFSET, y: topLeft.y + h / 2, worldPoint: { x: b.x, y: b.y + b.height / 2 } },
        ];
    }

    _hitTestHandle(context, element, screenPoint) {
        return this._getHandlePositions(context, element).find(
            (h) => Math.hypot(screenPoint.x - h.x, screenPoint.y - h.y) <= HANDLE_HIT_RADIUS
        );
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

        const single = this._singleConnectableSelection(context);
        if (single) this._drawHandles(context, single);
    }

    _drawHandles(context, element) {
        const ctx = context.renderer.interactiveCtx;
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = OVERLAY_COLOR;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);

        this._getHandlePositions(context, element).forEach((h) => {
            ctx.beginPath();
            ctx.arc(h.x, h.y, HANDLE_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
        ctx.restore();
    }
}
