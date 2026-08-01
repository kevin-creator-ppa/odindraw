import { Tool } from "./Tool.js";
import { BASE_GRID_SPACING } from "../core/Renderer.js";

const OVERLAY_COLOR = "#6965db";
const HANDLE_OFFSET = 14;
const ROTATE_HANDLE_OFFSET = 30;
const HANDLE_RADIUS = 5;
const HANDLE_HIT_RADIUS = 9;
const MIN_RESIZE_SIZE = 10;
const LINE_TYPES = new Set(["line", "arrow", "orthogonal-line", "connector"]);
const RESIZABLE_TYPES = new Set(["rectangle", "ellipse", "component"]);

/**
 * Ferramenta padrão: clique seleciona o elemento sob o cursor (o de
 * maior zIndex), arrastar move o elemento selecionado — encaixando na
 * grade quando ela está visível. Objetos bloqueados são selecionáveis
 * (para poder desbloquear) mas não arrastáveis.
 *
 * Alças no único elemento selecionado (todas cientes da rotação atual):
 *  - Linha/seta/ortogonal/conector: 2 alças nas pontas — arrastar
 *    reshape aquele extremo (num Connector, solta sobre outro objeto
 *    religa; solta em área vazia desanexa).
 *  - Formas com área (retângulo, elipse, texto, traço livre,
 *    componente...): alças redondas nas bordas (N/E/S/W) — arrastar
 *    cria um Connector saindo dali; alças quadradas nos cantos (só em
 *    retângulo/elipse/componente) — arrastar redimensiona; alça acima
 *    do topo, ligada por uma linha pontilhada — arrastar rotaciona.
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
        this._resizeDrag = null;
        this._rotateDrag = null;
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
        this._resizeDrag = null;
        this._rotateDrag = null;
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
                if (this._hitTestRotateHandle(context, single, screenPoint)) {
                    this._rotateDrag = { element: single };
                    return;
                }

                if (RESIZABLE_TYPES.has(single.type)) {
                    const corner = this._hitTestCornerHandle(context, single, screenPoint);
                    if (corner) {
                        this._resizeDrag = {
                            element: single,
                            corner: corner.corner,
                            startBounds: single.getBounds(),
                            startRotation: single.rotation,
                        };
                        return;
                    }
                }

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

        if (this._resizeDrag) {
            this._applyResize(context, point);
            return;
        }

        if (this._rotateDrag) {
            this._applyRotate(context, point);
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

        if (this._resizeDrag) {
            context.historyManager?.pushSnapshot();
            this._resizeDrag = null;
            return;
        }

        if (this._rotateDrag) {
            context.historyManager?.pushSnapshot();
            this._rotateDrag = null;
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

    /** Redimensiona mantendo o canto oposto fixo, trabalhando no referencial local (não-rotacionado) do elemento. */
    _applyResize(context, point) {
        const { element, corner, startBounds, startRotation } = this._resizeDrag;
        const center0 = { x: startBounds.x + startBounds.width / 2, y: startBounds.y + startBounds.height / 2 };
        const halfW0 = startBounds.width / 2;
        const halfH0 = startBounds.height / 2;
        const oppositeLocal = {
            nw: { x: halfW0, y: halfH0 },
            ne: { x: -halfW0, y: halfH0 },
            se: { x: -halfW0, y: -halfH0 },
            sw: { x: halfW0, y: -halfH0 },
        }[corner];

        const snapped = this._snapToGrid(context, point);
        const localP = this._rotatePoint(snapped.x - center0.x, snapped.y - center0.y, -startRotation);

        const newLocalCenter = { x: (localP.x + oppositeLocal.x) / 2, y: (localP.y + oppositeLocal.y) / 2 };
        const newWidth = Math.max(MIN_RESIZE_SIZE, Math.abs(localP.x - oppositeLocal.x));
        const newHeight = Math.max(MIN_RESIZE_SIZE, Math.abs(localP.y - oppositeLocal.y));
        const centerOffset = this._rotatePoint(newLocalCenter.x, newLocalCenter.y, startRotation);

        element.x = center0.x + centerOffset.x - newWidth / 2;
        element.y = center0.y + centerOffset.y - newHeight / 2;
        element.width = newWidth;
        element.height = newHeight;

        context.renderer.markDirty();
        this._redrawOverlay(context);
    }

    _applyRotate(context, point) {
        const { element } = this._rotateDrag;
        const b = element.getBounds();
        const center = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        const centerScreen = context.camera.worldToScreen(center.x, center.y);
        const pointScreen = context.camera.worldToScreen(point.x, point.y);
        const angleDeg = (Math.atan2(pointScreen.y - centerScreen.y, pointScreen.x - centerScreen.x) * 180) / Math.PI;

        element.rotation = Math.round(angleDeg + 90);
        context.renderer.markDirty();
        this._redrawOverlay(context);
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

    _rotatePoint(x, y, degrees) {
        const rad = (degrees * Math.PI) / 180;
        return { x: x * Math.cos(rad) - y * Math.sin(rad), y: x * Math.sin(rad) + y * Math.cos(rad) };
    }

    /** Converte um deslocamento local (mundo, relativo ao centro do bbox) em ponto de tela, respeitando a rotação atual. */
    _localToScreen(context, element, localX, localY) {
        const b = element.getBounds();
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const rotated = this._rotatePoint(localX, localY, element.rotation);
        const worldPoint = { x: cx + rotated.x, y: cy + rotated.y };
        return { ...context.camera.worldToScreen(worldPoint.x, worldPoint.y), worldPoint };
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

    /** Pontos médios das 4 bordas do bbox (com offset pra fora) — arrastar cria um Connector. */
    _getBoxHandlePositions(context, element) {
        const b = element.getBounds();
        const halfW = b.width / 2;
        const halfH = b.height / 2;
        const offset = HANDLE_OFFSET / context.camera.zoom;
        return [
            this._localToScreen(context, element, 0, -halfH - offset),
            this._localToScreen(context, element, halfW + offset, 0),
            this._localToScreen(context, element, 0, halfH + offset),
            this._localToScreen(context, element, -halfW - offset, 0),
        ];
    }

    _hitTestBoxHandle(context, element, screenPoint) {
        return this._getBoxHandlePositions(context, element).find(
            (h) => Math.hypot(screenPoint.x - h.x, screenPoint.y - h.y) <= HANDLE_HIT_RADIUS
        );
    }

    /** Os 4 cantos do bbox — arrastar redimensiona (canto oposto fica fixo). */
    _getCornerHandlePositions(context, element) {
        const b = element.getBounds();
        const halfW = b.width / 2;
        const halfH = b.height / 2;
        return [
            { ...this._localToScreen(context, element, -halfW, -halfH), corner: "nw" },
            { ...this._localToScreen(context, element, halfW, -halfH), corner: "ne" },
            { ...this._localToScreen(context, element, halfW, halfH), corner: "se" },
            { ...this._localToScreen(context, element, -halfW, halfH), corner: "sw" },
        ];
    }

    _hitTestCornerHandle(context, element, screenPoint) {
        return this._getCornerHandlePositions(context, element).find(
            (h) => Math.hypot(screenPoint.x - h.x, screenPoint.y - h.y) <= HANDLE_HIT_RADIUS
        );
    }

    _getRotateHandlePosition(context, element) {
        const b = element.getBounds();
        const offset = ROTATE_HANDLE_OFFSET / context.camera.zoom;
        return this._localToScreen(context, element, 0, -b.height / 2 - offset);
    }

    _hitTestRotateHandle(context, element, screenPoint) {
        const h = this._getRotateHandlePosition(context, element);
        return Math.hypot(screenPoint.x - h.x, screenPoint.y - h.y) <= HANDLE_HIT_RADIUS ? h : null;
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
            selected.forEach((element) => this._drawRotatedOutline(context, element));
            ctx.restore();
        }

        if (!single) return;

        if (isLineShaped) {
            const screenPoints = this._getEditableEndpoints(context, single).map((ep) =>
                context.camera.worldToScreen(ep.worldPoint.x, ep.worldPoint.y)
            );
            this._drawCircleHandles(context, screenPoints);
            return;
        }

        this._drawCircleHandles(context, this._getBoxHandlePositions(context, single));
        if (RESIZABLE_TYPES.has(single.type)) {
            this._drawSquareHandles(context, this._getCornerHandlePositions(context, single));
        }
        this._drawRotateHandle(context, single);
    }

    /** Contorno tracejado do bbox, desenhado como polígono rotacionado (acompanha a rotação do elemento). */
    _drawRotatedOutline(context, element) {
        const b = element.getBounds();
        const halfW = b.width / 2;
        const halfH = b.height / 2;
        const pad = 4 / context.camera.zoom;
        const corners = [
            this._localToScreen(context, element, -halfW - pad, -halfH - pad),
            this._localToScreen(context, element, halfW + pad, -halfH - pad),
            this._localToScreen(context, element, halfW + pad, halfH + pad),
            this._localToScreen(context, element, -halfW - pad, halfH + pad),
        ];
        const ctx = context.renderer.interactiveCtx;
        ctx.beginPath();
        corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.stroke();
    }

    _drawRotateHandle(context, element) {
        const b = element.getBounds();
        const topCenter = this._localToScreen(context, element, 0, -b.height / 2);
        const handle = this._getRotateHandlePosition(context, element);
        const ctx = context.renderer.interactiveCtx;

        ctx.save();
        ctx.strokeStyle = OVERLAY_COLOR;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(topCenter.x, topCenter.y);
        ctx.lineTo(handle.x, handle.y);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(handle.x, handle.y, HANDLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
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

    _drawSquareHandles(context, points) {
        const ctx = context.renderer.interactiveCtx;
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = OVERLAY_COLOR;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        points.forEach((p) => {
            ctx.fillRect(p.x - HANDLE_RADIUS, p.y - HANDLE_RADIUS, HANDLE_RADIUS * 2, HANDLE_RADIUS * 2);
            ctx.strokeRect(p.x - HANDLE_RADIUS, p.y - HANDLE_RADIUS, HANDLE_RADIUS * 2, HANDLE_RADIUS * 2);
        });
        ctx.restore();
    }
}
