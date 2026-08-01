const ZOOM_WHEEL_SENSITIVITY = 0.0015;
const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Traduz eventos de mouse/teclado em navegação de câmera (zoom/pan) e,
 * quando não se trata de navegação, encaminha o ponteiro (em coordenadas
 * de mundo) para a ferramenta ativa via ToolManager.
 *
 * Regras de navegação:
 *  - Ctrl/Cmd + scroll: zoom centrado no cursor.
 *  - Scroll simples: pan (como no Excalidraw/draw.io).
 *  - Segurar espaço ou botão do meio do mouse: pan por arraste,
 *    disponível independente da ferramenta selecionada.
 */
export class InputController {
    constructor({ element, camera, renderer, eventBus, toolManager }) {
        this.element = element;
        this.camera = camera;
        this.renderer = renderer;
        this.eventBus = eventBus;
        this.toolManager = toolManager;

        this._isPanning = false;
        this._spacePressed = false;
        this._lastX = 0;
        this._lastY = 0;

        this._onWheel = this._onWheel.bind(this);
        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);

        this.element.addEventListener("wheel", this._onWheel, { passive: false });
        this.element.addEventListener("pointerdown", this._onPointerDown);
        window.addEventListener("pointermove", this._onPointerMove);
        window.addEventListener("pointerup", this._onPointerUp);
        window.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("keyup", this._onKeyUp);
    }

    _toWorld(event) {
        const rect = this.element.getBoundingClientRect();
        return this.camera.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
    }

    _onWheel(event) {
        event.preventDefault();
        const rect = this.element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (event.ctrlKey || event.metaKey) {
            const factor = Math.exp(-event.deltaY * ZOOM_WHEEL_SENSITIVITY);
            this.camera.zoomAt(x, y, factor);
            this.eventBus.emit("camera:change");
        } else {
            this.camera.pan(-event.deltaX, -event.deltaY);
        }
        this.renderer.markDirty();
    }

    _onPointerDown(event) {
        const wantsUniversalPan = this._spacePressed || event.button === 1;
        if (wantsUniversalPan) {
            event.preventDefault();
            this._startPan(event);
            return;
        }
        if (event.button !== 0) return;
        this.toolManager.handlePointerDown(this._toWorld(event), event);
    }

    _onPointerMove(event) {
        if (this._isPanning) {
            const dx = event.clientX - this._lastX;
            const dy = event.clientY - this._lastY;
            this._lastX = event.clientX;
            this._lastY = event.clientY;
            this.camera.pan(dx, dy);
            this.renderer.markDirty();
            this.eventBus.emit("camera:change");
            return;
        }
        this.toolManager.handlePointerMove(this._toWorld(event), event);
    }

    _onPointerUp(event) {
        if (this._isPanning) {
            this._endPan();
            return;
        }
        this.toolManager.handlePointerUp(this._toWorld(event), event);
    }

    _startPan(event) {
        this._isPanning = true;
        this._lastX = event.clientX;
        this._lastY = event.clientY;
        this.element.style.cursor = "grabbing";
        this.element.setPointerCapture?.(event.pointerId);
    }

    _endPan() {
        this._isPanning = false;
        this.element.style.cursor = this._spacePressed ? "grab" : this.toolManager.getActiveTool().cursor;
    }

    _onKeyDown(event) {
        if (event.code !== "Space" || EDITABLE_TAGS.has(event.target.tagName)) return;
        if (!this._spacePressed) {
            event.preventDefault();
            this._spacePressed = true;
            if (!this._isPanning) this.element.style.cursor = "grab";
        }
    }

    _onKeyUp(event) {
        if (event.code !== "Space") return;
        this._spacePressed = false;
        if (this._isPanning) {
            this._endPan();
        } else {
            this.element.style.cursor = this.toolManager.getActiveTool().cursor;
        }
    }
}
