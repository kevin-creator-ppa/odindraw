import { Tool } from "./Tool.js";
import { LINE_TYPES, RESIZABLE_TYPES } from "../elements/typeGroups.js";
import { computeAlignmentSnap, GUIDE_COLOR } from "./alignmentGuides.js";
import { naturalBendPoint } from "../elements/routeGeometry.js";

const OVERLAY_COLOR = "#6965db";
const HANDLE_OFFSET = 20;
const ROTATE_HANDLE_OFFSET = 30;
const HANDLE_RADIUS = 5;
const HANDLE_HIT_RADIUS = 9;
const MIN_RESIZE_SIZE = 10;
const ARROW_CLICK_THRESHOLD = 4; // px de tela: abaixo disso, soltar a seta conta como "clique" (duplica), não arraste (conecta)
const DUPLICATE_GAP = 60; // espaço (mundo) entre a forma original e a cópia criada por clique na seta

/**
 * Ferramenta padrão: clique seleciona o elemento sob o cursor (o de
 * maior zIndex), arrastar move o elemento selecionado — encaixando na
 * grade quando ela está visível. Objetos bloqueados são selecionáveis
 * (para poder desbloquear) mas não arrastáveis.
 *
 * Alças no único elemento selecionado (todas cientes da rotação atual):
 *  - Linha/seta/ortogonal/conector: 2 alças redondas nas pontas —
 *    arrastar reshape aquele extremo (num Connector, solta sobre outro
 *    objeto religa; solta em área vazia desanexa); alças quadradas em
 *    cada waypoint existente — arrastar reposiciona, soltar sem arrastar
 *    remove o waypoint; e um ponto translúcido no meio de cada segmento
 *    (inclusive quando não há waypoint nenhum ainda) — arrastar cria um
 *    waypoint novo ali, estilo draw.io.
 *  - Formas com área (retângulo, elipse, texto, traço livre,
 *    componente...): alças redondas nas bordas (N/E/S/W) — arrastar
 *    cria um Connector saindo dali; alças quadradas nos cantos (só em
 *    retângulo/elipse/componente) — arrastar redimensiona; alça acima
 *    do topo, ligada por uma linha pontilhada — arrastar rotaciona.
 *
 * Seleção múltipla: shift-click alterna um objeto dentro/fora da seleção;
 * arrastar a partir de área vazia abre uma marquee (rubber-band) que
 * seleciona tudo cujo bbox intercepte o retângulo ao soltar. Arrastar
 * qualquer objeto de uma seleção múltipla move o grupo inteiro mantendo
 * as posições relativas. Durante o arraste (single ou grupo), guias de
 * alinhamento comparam o bbox candidato contra os demais objetos e têm
 * prioridade sobre o snap de grade quando encontram um match.
 */
export class SelectTool extends Tool {
    constructor() {
        super("select", { cursor: "default" });
        this._dragTargets = null;
        this._dragPrimary = null;
        this._dragOriginPointer = null;
        this._moved = false;
        this._arrowDrag = null;
        this._pointDrag = null;
        this._resizeDrag = null;
        this._rotateDrag = null;
        this._waypointDrag = null;
        this._marquee = null;
        this._activeGuides = null;
        this._unsubscribeCamera = null;
        this._hoverTarget = null;
    }

    onActivate(context) {
        this._unsubscribeCamera = context.eventBus.on("camera:change", () => this._redrawOverlay(context));
        this._redrawOverlay(context);
    }

    onDeactivate(context) {
        this._unsubscribeCamera?.();
        this._unsubscribeCamera = null;
        this._dragTargets = null;
        this._dragPrimary = null;
        this._arrowDrag = null;
        this._pointDrag = null;
        this._resizeDrag = null;
        this._rotateDrag = null;
        this._waypointDrag = null;
        this._marquee = null;
        this._activeGuides = null;
        this._hoverTarget = null;
        context.renderer.clearInteractive();
    }

    onPointerDown(context, point, event) {
        if (event?.ctrlKey || event?.metaKey) {
            const hit = context.scene.getObjectAtPoint(point);
            if (hit?.link) {
                const internalPage = /^page:(.+)$/.exec(hit.link);
                if (internalPage) {
                    context.pageManager?.switchTo(internalPage[1]);
                } else {
                    window.open(hit.link, "_blank", "noopener");
                }
                return;
            }
        }

        const single = this._singleSelection(context);
        if (single && !context.scene.isElementLocked(single)) {
            const screenPoint = context.camera.worldToScreen(point.x, point.y);

            if (LINE_TYPES.has(single.type)) {
                const endpoint = this._hitTestPointHandle(context, single, screenPoint);
                if (endpoint) {
                    this._pointDrag = { element: single, kind: endpoint.kind };
                    return;
                }

                const waypointHit = this._hitTestWaypointHandle(context, single, screenPoint);
                if (waypointHit) {
                    this._waypointDrag = { element: single, index: waypointHit.index, isNew: false, moved: false };
                    return;
                }

                const addHit = this._hitTestAddWaypointHandle(context, single, screenPoint);
                if (addHit) {
                    single.waypoints = [
                        ...single.waypoints.slice(0, addHit.insertIndex),
                        addHit.worldPoint,
                        ...single.waypoints.slice(addHit.insertIndex),
                    ];
                    this._waypointDrag = { element: single, index: addHit.insertIndex, isNew: true, moved: false };
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
                    this._startArrowDrag(context, single, handle, screenPoint);
                    return;
                }
            }
        }

        // Hover numa forma diferente da selecionada (ou sem nada selecionado): as setas
        // direcionais também funcionam aqui — é o que dá pra "sair desenhando" sem
        // precisar clicar na forma primeiro (estilo draw.io).
        if (this._hoverTarget && this._hoverTarget !== single && !context.scene.isElementLocked(this._hoverTarget)) {
            const screenPoint = context.camera.worldToScreen(point.x, point.y);
            const handle = this._hitTestBoxHandle(context, this._hoverTarget, screenPoint);
            if (handle) {
                this._startArrowDrag(context, this._hoverTarget, handle, screenPoint);
                return;
            }
        }

        const shiftKey = Boolean(event?.shiftKey);
        const target = context.scene.getObjectAtPoint(point);
        const groupMembers = this._groupMembers(context, target);

        if (target) {
            if (shiftKey) {
                const next = new Set(context.selectionManager.getSelected());
                const anySelected = groupMembers.some((el) => next.has(el));
                groupMembers.forEach((el) => (anySelected ? next.delete(el) : next.add(el)));
                context.selectionManager.selectMultiple([...next]);
            } else if (!groupMembers.every((el) => context.selectionManager.isSelected(el))) {
                context.selectionManager.selectMultiple(groupMembers);
            }

            const selected = context.selectionManager.getSelected();
            const dragSet = new Set(selected);
            selected.forEach((el) => {
                if (el.type !== "container") return;
                context.scene.objects.filter((o) => o.containerId === el.id).forEach((child) => dragSet.add(child));
            });
            this._dragTargets = [...dragSet]
                .filter((el) => !context.scene.isElementLocked(el))
                .map((el) => ({ element: el, originXY: { x: el.x, y: el.y } }));
            this._dragPrimary =
                this._dragTargets.find((entry) => entry.element === target) ?? this._dragTargets[0] ?? null;
            this._dragOriginPointer = point;
            this._marquee = null;
        } else {
            if (!shiftKey) context.selectionManager.clear();
            this._dragTargets = null;
            this._dragPrimary = null;
            this._marquee = { origin: point, current: point, additive: shiftKey };
        }

        this._moved = false;
        this._activeGuides = null;
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

        if (this._arrowDrag) {
            const screenPoint = context.camera.worldToScreen(point.x, point.y);
            const dist = Math.hypot(screenPoint.x - this._arrowDrag.originScreen.x, screenPoint.y - this._arrowDrag.originScreen.y);
            if (dist > ARROW_CLICK_THRESHOLD) this._arrowDrag.moved = true;
            this._redrawOverlay(context);
            this._drawPreviewLine(context, this._arrowDrag.fromWorldPoint, point);
            return;
        }

        if (this._waypointDrag) {
            const { element, index } = this._waypointDrag;
            const snapped = this._snapToGrid(context, point);
            const prev = element.waypoints[index];
            if (!prev || prev.x !== snapped.x || prev.y !== snapped.y) this._waypointDrag.moved = true;
            element.waypoints[index] = snapped;
            context.renderer.markDirty();
            this._redrawOverlay(context);
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

        if (this._marquee) {
            this._marquee.current = point;
            this._redrawOverlay(context);
            this._drawMarquee(context, this._marqueeRect());
            return;
        }

        if (!this._dragPrimary) {
            this._updateHoverTarget(context, point);
            return;
        }

        const rawTargetX = this._dragPrimary.originXY.x + (point.x - this._dragOriginPointer.x);
        const rawTargetY = this._dragPrimary.originXY.y + (point.y - this._dragOriginPointer.y);

        const primaryElement = this._dragPrimary.element;
        const primaryBounds = primaryElement.getBounds();
        const candidateBounds = {
            x: primaryBounds.x + (rawTargetX - primaryElement.x),
            y: primaryBounds.y + (rawTargetY - primaryElement.y),
            width: primaryBounds.width,
            height: primaryBounds.height,
        };

        const draggedSet = new Set(this._dragTargets.map((entry) => entry.element));
        const candidates = context.scene.objects.filter(
            (el) => context.scene.isElementVisible(el) && !draggedSet.has(el)
        );
        const snap = computeAlignmentSnap({ bounds: candidateBounds, candidates, zoom: context.camera.zoom });

        let targetX = rawTargetX;
        let targetY = rawTargetY;

        if (snap.dx !== 0) {
            targetX += snap.dx;
        } else if (context.renderer.gridEnabled) {
            const spacing = context.renderer.gridSpacing;
            targetX = Math.round(targetX / spacing) * spacing;
        }

        if (snap.dy !== 0) {
            targetY += snap.dy;
        } else if (context.renderer.gridEnabled) {
            const spacing = context.renderer.gridSpacing;
            targetY = Math.round(targetY / spacing) * spacing;
        }

        const deltaX = targetX - this._dragPrimary.originXY.x;
        const deltaY = targetY - this._dragPrimary.originXY.y;

        this._dragTargets.forEach(({ element, originXY }) => {
            const newX = originXY.x + deltaX;
            const newY = originXY.y + deltaY;
            element.translate(newX - element.x, newY - element.y);
        });

        this._activeGuides = snap.guides;
        this._moved = true;
        context.renderer.markDirty();
        this._redrawOverlay(context);
        this._drawAlignmentGuides(context, this._activeGuides);
    }

    onPointerUp(context, point) {
        if (this._pointDrag) {
            const { element, kind } = this._pointDrag;
            if (element.type === "connector") {
                const hit = context.scene.getObjectAtPoint(point);
                const otherEndObjectId = kind === "start" ? element.endObjectId : element.startObjectId;
                const validHit = hit && hit !== element && hit.id !== otherEndObjectId ? hit : null;

                const anchor = validHit ? this._hitTestAnchorPoint(context, validHit, context.camera.worldToScreen(point.x, point.y)) : null;

                if (kind === "start") {
                    element.startObjectId = validHit ? validHit.id : null;
                    element.startAnchor = anchor;
                    if (!validHit) element.startPoint = this._snapToGrid(context, point);
                } else {
                    element.endObjectId = validHit ? validHit.id : null;
                    element.endAnchor = anchor;
                    if (!validHit) element.endPoint = this._snapToGrid(context, point);
                }
            }
            context.renderer.markDirty();
            context.historyManager?.pushSnapshot();
            this._pointDrag = null;
            this._redrawOverlay(context);
            return;
        }

        if (this._arrowDrag) {
            const { fromElement, fromWorldPoint, fromAnchor, moved } = this._arrowDrag;

            if (!moved) {
                // Clique sem arrastar: duplica a forma na direção apontada, já conectada (estilo draw.io).
                this._duplicateInDirection(context, fromElement, fromAnchor);
            } else {
                const targetElement = context.scene.getObjectAtPoint(point);
                const endObjectId = targetElement && targetElement !== fromElement ? targetElement.id : null;
                const endAnchor = endObjectId
                    ? this._hitTestAnchorPoint(context, targetElement, context.camera.worldToScreen(point.x, point.y))
                    : null;

                context.eventBus.emit("tool:connector-drawn", {
                    startObjectId: fromElement.id,
                    startPoint: fromWorldPoint,
                    endObjectId,
                    endPoint: point,
                    startAnchor: fromAnchor,
                    endAnchor,
                });
            }

            this._arrowDrag = null;
            this._redrawOverlay(context);
            return;
        }

        if (this._waypointDrag) {
            const { element, index, isNew, moved } = this._waypointDrag;
            if (!isNew && !moved) element.waypoints.splice(index, 1);
            context.renderer.markDirty();
            context.historyManager?.pushSnapshot();
            this._waypointDrag = null;
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

        if (this._marquee) {
            const rect = this._marqueeRect();
            const direct = context.scene.objects.filter((el) => this._intersects(rect, el.getBounds()));
            const hits = new Set(direct);
            direct.forEach((el) => this._groupMembers(context, el).forEach((member) => hits.add(member)));
            const hitList = [...hits];
            if (hitList.length > 0) {
                if (this._marquee.additive) {
                    context.selectionManager.addMultiple(hitList);
                } else {
                    context.selectionManager.selectMultiple(hitList);
                }
            }
            this._marquee = null;
            this._redrawOverlay(context);
            return;
        }

        if (this._dragTargets && this._moved) {
            this._updateContainerMembership(context);
            context.historyManager?.pushSnapshot();
        }
        this._dragTargets = null;
        this._dragPrimary = null;
        this._dragOriginPointer = null;
        this._moved = false;
        this._activeGuides = null;
        this._redrawOverlay(context);
    }

    _startArrowDrag(context, element, handle, screenPoint) {
        this._arrowDrag = {
            fromElement: element,
            fromWorldPoint: handle.worldPoint,
            fromAnchor: handle.anchor,
            originScreen: screenPoint,
            moved: false,
        };
    }

    /** Atualiza qual forma está em hover (pra mostrar as setas direcionais nela mesmo sem estar selecionada) — só redesenha quando muda de verdade, pra não redesenhar a cada pixel de movimento do mouse. */
    _updateHoverTarget(context, point) {
        const hit = context.scene.getObjectAtPoint(point);
        const candidate = hit && !LINE_TYPES.has(hit.type) && !context.scene.isElementLocked(hit) ? hit : null;
        if (candidate !== this._hoverTarget) {
            this._hoverTarget = candidate;
            this._redrawOverlay(context);
        }
    }

    /**
     * Clique (sem arrastar) numa seta direcional: cria uma cópia de
     * `fromElement` do outro lado do vão, já ligada por um Connector —
     * o atalho de "desenhar fluxograma rápido" do draw.io. O Connector
     * em si nasce via o mesmo evento que o arraste-pra-conectar usa
     * (tool:connector-drawn), então reaproveita toda a lógica/undo já
     * existente — só a seleção final é sobrescrita pra cair na cópia
     * nova, não no conector, pra dar pra editar/renomear na hora.
     */
    _duplicateInDirection(context, fromElement, anchor) {
        const clone = fromElement.clone();
        const rawX = anchor.fx === 0.5 ? 0 : anchor.fx === 1 ? 1 : -1;
        const rawY = anchor.fy === 0.5 ? 0 : anchor.fy === 1 ? 1 : -1;
        clone.x = fromElement.x + rawX * (fromElement.width + DUPLICATE_GAP);
        clone.y = fromElement.y + rawY * (fromElement.height + DUPLICATE_GAP);
        clone.containerId = fromElement.containerId;
        context.scene.addObject(clone);

        const oppositeAnchor = { fx: 1 - anchor.fx, fy: 1 - anchor.fy };
        const fromBounds = fromElement.getBounds();
        const cloneBounds = clone.getBounds();

        context.eventBus.emit("tool:connector-drawn", {
            startObjectId: fromElement.id,
            startPoint: { x: fromBounds.x + anchor.fx * fromBounds.width, y: fromBounds.y + anchor.fy * fromBounds.height },
            endObjectId: clone.id,
            endPoint: { x: cloneBounds.x + oppositeAnchor.fx * cloneBounds.width, y: cloneBounds.y + oppositeAnchor.fy * cloneBounds.height },
            startAnchor: anchor,
            endAnchor: oppositeAnchor,
        });

        context.selectionManager.select(clone);
        context.renderer.markDirty();
    }

    /**
     * Depois de um arraste, reavalia em qual container (se algum) cada
     * elemento DIRETAMENTE selecionado pelo usuário ficou — não os
     * filhos que vieram "de brinde" por pertencerem a um container
     * arrastado junto, esses continuam com o mesmo pai de sempre. Um
     * elemento entra num container quando seu centro é solto dentro do
     * corpo dele (abaixo do cabeçalho).
     */
    _updateContainerMembership(context) {
        const containers = context.scene.objects.filter((o) => o.type === "container");
        if (containers.length === 0) return;

        context.selectionManager.getSelected().forEach((el) => {
            if (el.type === "container") return;
            const cx = el.x + el.width / 2;
            const cy = el.y + el.height / 2;
            const host = containers.find(
                (c) =>
                    c !== el &&
                    cx >= c.x &&
                    cx <= c.x + c.width &&
                    cy >= c.y + c._headerHeight(c.height) &&
                    cy <= c.y + c.height
            );
            el.containerId = host ? host.id : null;
        });
    }

    /** Retângulo normalizado (largura/altura sempre positivas) do arraste de marquee atual. */
    _marqueeRect() {
        const { origin, current } = this._marquee;
        return {
            x: Math.min(origin.x, current.x),
            y: Math.min(origin.y, current.y),
            width: Math.abs(current.x - origin.x),
            height: Math.abs(current.y - origin.y),
        };
    }

    _intersects(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }

    _drawMarquee(context, rect) {
        const ctx = context.renderer.interactiveCtx;
        const a = context.camera.worldToScreen(rect.x, rect.y);
        const b = context.camera.worldToScreen(rect.x + rect.width, rect.y + rect.height);
        ctx.save();
        ctx.fillStyle = "rgba(105, 101, 219, 0.12)";
        ctx.strokeStyle = OVERLAY_COLOR;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.restore();
    }

    /** Linhas-guia rosa (distintas do roxo das alças) marcando onde o elemento arrastado alinhou com outro. */
    _drawAlignmentGuides(context, guides) {
        if (!guides || guides.length === 0) return;
        const ctx = context.renderer.interactiveCtx;
        const margin = 20 / context.camera.zoom;
        ctx.save();
        ctx.strokeStyle = GUIDE_COLOR;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        guides.forEach((guide) => {
            const from = guide.from - margin;
            const to = guide.to + margin;
            const a =
                guide.type === "v"
                    ? context.camera.worldToScreen(guide.position, from)
                    : context.camera.worldToScreen(from, guide.position);
            const b =
                guide.type === "v"
                    ? context.camera.worldToScreen(guide.position, to)
                    : context.camera.worldToScreen(to, guide.position);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        });
        ctx.restore();
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
        const spacing = context.renderer.gridSpacing;
        return {
            x: Math.round(point.x / spacing) * spacing,
            y: Math.round(point.y / spacing) * spacing,
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

    /** Elemento(s) que um clique em `target` deve afetar: o grupo inteiro se ele pertencer a um, senão só ele mesmo (lista vazia se target for null). */
    _groupMembers(context, target) {
        if (!target) return [];
        if (!target.groupId) return [target];
        return context.scene.objects.filter((el) => el.groupId === target.groupId);
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

    /** Posições (mundo) onde arrastar cria um waypoint novo: o meio de cada segmento já existente (start→wp1→...→end), ou o meio/cotovelo "natural" da rota quando ainda não há waypoint nenhum. */
    _addHandlePositions(context, element) {
        const [startEp, endEp] = this._getEditableEndpoints(context, element);
        const start = startEp.worldPoint;
        const end = endEp.worldPoint;

        if (element.waypoints.length === 0) {
            return [{ insertIndex: 0, worldPoint: naturalBendPoint(start, end, element.routeType) }];
        }

        const points = [start, ...element.waypoints, end];
        const positions = [];
        for (let i = 0; i < points.length - 1; i++) {
            positions.push({
                insertIndex: i,
                worldPoint: { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 },
            });
        }
        return positions;
    }

    _hitTestWaypointHandle(context, element, screenPoint) {
        for (let i = 0; i < element.waypoints.length; i++) {
            const s = context.camera.worldToScreen(element.waypoints[i].x, element.waypoints[i].y);
            if (Math.hypot(screenPoint.x - s.x, screenPoint.y - s.y) <= HANDLE_HIT_RADIUS) return { index: i };
        }
        return null;
    }

    _hitTestAddWaypointHandle(context, element, screenPoint) {
        return this._addHandlePositions(context, element)
            .map(({ insertIndex, worldPoint }) => ({
                insertIndex,
                worldPoint: this._snapToGrid(context, worldPoint),
                screen: context.camera.worldToScreen(worldPoint.x, worldPoint.y),
            }))
            .find((h) => Math.hypot(screenPoint.x - h.screen.x, screenPoint.y - h.screen.y) <= HANDLE_HIT_RADIUS) ?? null;
    }

    /**
     * 8 pontos ao redor do bbox — 4 bordas + 4 cantos, com offset pra
     * fora — arrastar cria um Connector. Cada um carrega seu `anchor`
     * (fração do bbox, 0-1) — quando um Connector nasce ou é reconectado
     * bem em cima de um desses pontos (de origem ou de destino), ele
     * gruda ali fixo, em vez de deslizar dinamicamente pela borda mais
     * próxima do outro extremo (ver Connector.resolveEndpoints).
     */
    _getBoxHandlePositions(context, element) {
        const b = element.getBounds();
        const halfW = b.width / 2;
        const halfH = b.height / 2;
        const offset = HANDLE_OFFSET / context.camera.zoom;
        const points = [
            { lx: 0, ly: -halfH - offset, anchor: { fx: 0.5, fy: 0 } }, // N
            { lx: halfW + offset, ly: -halfH - offset, anchor: { fx: 1, fy: 0 } }, // NE
            { lx: halfW + offset, ly: 0, anchor: { fx: 1, fy: 0.5 } }, // E
            { lx: halfW + offset, ly: halfH + offset, anchor: { fx: 1, fy: 1 } }, // SE
            { lx: 0, ly: halfH + offset, anchor: { fx: 0.5, fy: 1 } }, // S
            { lx: -halfW - offset, ly: halfH + offset, anchor: { fx: 0, fy: 1 } }, // SW
            { lx: -halfW - offset, ly: 0, anchor: { fx: 0, fy: 0.5 } }, // W
            { lx: -halfW - offset, ly: -halfH - offset, anchor: { fx: 0, fy: 0 } }, // NW
        ];
        return points.map((p) => ({ ...this._localToScreen(context, element, p.lx, p.ly), anchor: p.anchor }));
    }

    _hitTestBoxHandle(context, element, screenPoint) {
        return this._getBoxHandlePositions(context, element).find(
            (h) => Math.hypot(screenPoint.x - h.x, screenPoint.y - h.y) <= HANDLE_HIT_RADIUS
        );
    }

    /**
     * Como _getBoxHandlePositions, mas nos pontos de verdade da borda (sem
     * o offset pra fora usado só pro desenho da alça) — usado pra detectar
     * se um Connector foi solto bem em cima de um ponto de conexão de
     * outra forma (a própria forma precisa estar "embaixo" do cursor pro
     * scene.getObjectAtPoint achá-la primeiro; ver onPointerUp).
     */
    _hitTestAnchorPoint(context, element, screenPoint) {
        const b = element.getBounds();
        const anchors = [
            { fx: 0.5, fy: 0 },
            { fx: 1, fy: 0 },
            { fx: 1, fy: 0.5 },
            { fx: 1, fy: 1 },
            { fx: 0.5, fy: 1 },
            { fx: 0, fy: 1 },
            { fx: 0, fy: 0.5 },
            { fx: 0, fy: 0 },
        ];
        return (
            anchors.find((anchor) => {
                const world = { x: b.x + anchor.fx * b.width, y: b.y + anchor.fy * b.height };
                const s = context.camera.worldToScreen(world.x, world.y);
                return Math.hypot(screenPoint.x - s.x, screenPoint.y - s.y) <= HANDLE_HIT_RADIUS;
            }) ?? null
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
        const single = this._singleSelection(context);

        if (selected.length > 0) {
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

            if (single && isLineShaped) {
                const screenPoints = this._getEditableEndpoints(context, single).map((ep) =>
                    context.camera.worldToScreen(ep.worldPoint.x, ep.worldPoint.y)
                );
                this._drawCircleHandles(context, screenPoints);

                const waypointScreen = single.waypoints.map((p) => context.camera.worldToScreen(p.x, p.y));
                this._drawSquareHandles(context, waypointScreen);

                const addScreen = this._addHandlePositions(context, single).map(({ worldPoint }) =>
                    context.camera.worldToScreen(worldPoint.x, worldPoint.y)
                );
                this._drawAddHandles(context, addScreen);
            } else if (single) {
                this._drawArrowHandles(context, this._getBoxHandlePositions(context, single));
                if (RESIZABLE_TYPES.has(single.type)) {
                    this._drawSquareHandles(context, this._getCornerHandlePositions(context, single));
                }
                this._drawRotateHandle(context, single);
            }
        }

        // Setas direcionais também em hover, numa forma diferente da selecionada (ou sem nada selecionado) — estilo draw.io.
        if (this._hoverTarget && this._hoverTarget !== single) {
            this._drawArrowHandles(context, this._getBoxHandlePositions(context, this._hoverTarget));
        }
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

    /** Pontos translúcidos (menores que as alças de verdade) marcando onde arrastar cria um waypoint novo. */
    _drawAddHandles(context, points) {
        const ctx = context.renderer.interactiveCtx;
        ctx.save();
        ctx.fillStyle = OVERLAY_COLOR;
        ctx.globalAlpha = 0.35;
        ctx.setLineDash([]);
        points.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, HANDLE_RADIUS * 0.7, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    /** Setas direcionais nas 4 bordas (N/E/S/W) — arrastar conecta, clicar sem arrastar duplica na direção. `points` vêm de _getBoxHandlePositions, cada um já com `.anchor`. */
    _drawArrowHandles(context, points) {
        const ctx = context.renderer.interactiveCtx;
        ctx.save();
        ctx.fillStyle = OVERLAY_COLOR;
        ctx.globalAlpha = 0.9;
        ctx.setLineDash([]);
        points.forEach((p) => {
            const { dx, dy } = this._arrowDirectionVector(p.anchor);
            this._drawArrowGlyph(ctx, p.x, p.y, dx, dy);
        });
        ctx.restore();
    }

    /** Vetor unitário (inclusive diagonal) a partir da fração fx/fy do anchor — 0.5 é "sem componente nesse eixo", 0/1 é "componente pra lá/pra cá". */
    _arrowDirectionVector(anchor) {
        const rawX = anchor.fx === 0.5 ? 0 : anchor.fx === 1 ? 1 : -1;
        const rawY = anchor.fy === 0.5 ? 0 : anchor.fy === 1 ? 1 : -1;
        const len = Math.hypot(rawX, rawY) || 1;
        return { dx: rawX / len, dy: rawY / len };
    }

    /** Triângulo apontando pra fora, centrado em (x,y), na direção (dx,dy) — mesmo visual do draw.io. */
    _drawArrowGlyph(ctx, x, y, dx, dy) {
        const len = 9;
        const width = 6.5;
        const nx = -dy;
        const ny = dx;
        const tipX = x + dx * len;
        const tipY = y + dy * len;
        const baseX = x - dx * len * 0.5;
        const baseY = y - dy * len * 0.5;

        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(baseX + nx * width, baseY + ny * width);
        ctx.lineTo(baseX - nx * width, baseY - ny * width);
        ctx.closePath();
        ctx.fill();
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
