import { Tool } from "./Tool.js";
import { BASE_GRID_SPACING } from "../core/Renderer.js";

const OVERLAY_COLOR = "#6965db";
const OVERLAY_PADDING = 4;
const HANDLE_OFFSET = 14;
const HANDLE_RADIUS = 5;
const HANDLE_HIT_RADIUS = 9;
const LINE_TYPES = new Set(["line", "arrow", "orthogonal-line", "connector"]);

/**
 * Ferramenta padrão: clique seleciona o elemento sob o cursor (o de
 * maior zIndex), arrastar move o elemento selecionado — encaixando na
 * grade quando ela está visível. Objetos bloqueados são selecionáveis
 * (para poder desbloquear) mas não arrastáveis.
 *
 * Duas alças diferentes aparecem conforme o tipo do único elemento
 * selecionado:
 *  - Formas com área (retângulo, elipse, texto, componente...): 4 alças
 *    nas bordas (N/E/S/W) — arrastar uma delas cria um Connector saindo
 *    dali, ligado se soltar sobre outro objeto.
 *  - Linha/seta/ortogonal/conector: 2 alças nas pontas — arrastar uma
 *    reposiciona aquele extremo (reshape). Num Connector, soltar sobre
 *    outro objeto religa a ponta a ele; soltar em área vazia solta a
 *    ponta (fica livre naquele ponto).
 */
export class SelectTool extends Tool {
    constructor() {
        super("select", { cursor: "default" });
        this._dragTarget = null;
        this._dragOriginPointer = null;
        this._dragOriginXY = null;
        this._moved = false;
        this._connectorDrag = null;
        this._pointDrag = null;
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
        this._pointDrag = null;
        context.renderer.clearInteractive();
    }

    onPointerDown(context, point) {
        const single = this._singleSelection(context);
        if (single && !single.locked) {
            const screenPoint = context.camera.worldToScreen(point.x, point.y);

            if (LINE_TYPES.has(single.type)) {
                const endpoint = this._hitTestPointHandle(context, single, screenPoint);
                if (endpoint) {
                    this._pointDrag = { element: single, kind: endpoint.kind };
                    return;
                }
            } else {
                const handle = this._hitTestBoxHandle(context, single, screenPoint);
                if (handle) {
                    this._connectorDrag = { fromElement: single, fromWorldPoint: handle.worldPoint };
                    return;
                }
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
        if (this._pointDrag) {
            const { element, kind } = this._pointDrag;
            const snapped = this._snapToGrid(context, point);

            if (element.type === "connector") {
                this._redrawOverlay(context);
                this._drawPreviewLine(context, this._connectorEndpointFor(element, kind === "start" ? "end" : "start"), point);
            } else {
                element.setEndpoint(kind, snapped);
                context.renderer.markDirty();
                this._redrawOverlay(context);
            }
            return;
        }

        if (this._connectorDrag) {
            this._redrawOverlay(context);
            this._drawPreviewLine(context, this._connectorDrag.fromWorldPoint, point);
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
        if (this._pointDrag) {
            const { element, kind } = this._pointDrag;
            if (element.type === "connector") {
                const hit = context.scene.getObjectAtPoint(point);
                const otherEndObjectId = kind === "start" ? element.endObjectId : element.startObjectId;
                const validHit = hit && hit !== element && hit.id !== otherEndObjectId ? hit : null;

                if (kind === "start") {
                    element.startObjectId = validHit ? validHit.id : null;
                    if (!validHit) element.startPoint = this._snapToGrid(context, point);
                } else {
                    element.endObjectId = validHit ? validHit.id : null;
                    if (!validHit) element.endPoint = this._snapToGrid(context, point);
                }
            }
            context.renderer.markDirty();
            context.historyManager?.pushSnapshot();
            this._pointDrag = null;
            this._redrawOverlay(context);
            return;
        }

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

    _snapToGrid(context, point) {
        if (!context.renderer.gridEnabled) return point;
        return {
            x: Math.round(point.x / BASE_GRID_SPACING) * BASE_GRID_SPACING,
            y: Math.round(point.y / BASE_GRID_SPACING) * BASE_GRID_SPACING,
        };
    }

    _connectorEndpointFor(connector, kind) {
        return kind === "start" ? connector._resolvedStart : connector._resolvedEnd;
    }

    _drawPreviewLine(context, fromWorld, toWorld) {
        const a = context.camera.worldToScreen(fromWorld.x, fromWorld.y);
        const b = context.camera.worldToScreen(toWorld.x, toWorld.y);
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
    }

    _singleSelection(context) {
        const selected = context.selectionManager.getSelected();
        return selected.length === 1 ? selected[0] : null;
    }

    /** Pontas editáveis (mundo) de um elemento tipo linha/conector. */
    _getEditableEndpoints(context, element) {
        if (element.type === "connector") {
            element.beforeHitTest(context.scene);
            return [
                { worldPoint: element._resolvedStart, kind: "start" },
                { worldPoint: element._resolvedEnd, kind: "end" },
            ];
        }
        return [
            { worldPoint: { x: element.x1, y: element.y1 }, kind: "start" },
            { worldPoint: { x: element.x2, y: element.y2 }, kind: "end" },
        ];
    }

    _hitTestPointHandle(context, element, screenPoint) {
        return this._getEditableEndpoints(context, element).find((ep) => {
            const s = context.camera.worldToScreen(ep.worldPoint.x, ep.worldPoint.y);
            return Math.hypot(screenPoint.x - s.x, screenPoint.y - s.y) <= HANDLE_HIT_RADIUS;
        });
    }

    /** Pontos médios das 4 bordas do bbox, em coordenadas de tela (com offset pra fora) e de mundo. */
    _getBoxHandlePositions(context, element) {
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

    _hitTestBoxHandle(context, element, screenPoint) {
        return this._getBoxHandlePositions(context, element).find(
            (h) => Math.hypot(screenPoint.x - h.x, screenPoint.y - h.y) <= HANDLE_HIT_RADIUS
        );
    }

    _redrawOverlay(context) {
        context.renderer.clearInteractive();
        const selected = context.selectionManager.getSelected();
        if (selected.length === 0) return;

        const single = this._singleSelection(context);
        const isLineShaped = single && LINE_TYPES.has(single.type);

        if (!isLineShaped) {
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

        if (!single) return;
        if (isLineShaped) {
            const screenPoints = this._getEditableEndpoints(context, single).map((ep) =>
                context.camera.worldToScreen(ep.worldPoint.x, ep.worldPoint.y)
            );
            this._drawCircleHandles(context, screenPoints);
        } else {
            this._drawCircleHandles(context, this._getBoxHandlePositions(context, single));
        }
    }

    /** `points` já em coordenadas de tela (screen), com pelo menos {x, y}. */
    _drawCircleHandles(context, points) {
        const ctx = context.renderer.interactiveCtx;
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = OVERLAY_COLOR;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);

        points.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
        ctx.restore();
    }
}
