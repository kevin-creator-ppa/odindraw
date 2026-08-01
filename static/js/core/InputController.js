const ZOOM_WHEEL_SENSITIVITY = 0.0015;
const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Traduz eventos de mouse/teclado em movimentos de câmera (zoom/pan).
 *
 * Regras de navegação:
 *  - Ctrl/Cmd + scroll: zoom centrado no cursor.
 *  - Scroll simples: pan (como no Excalidraw/draw.io).
 *  - Segurar espaço + arrastar, botão do meio do mouse, ou ferramenta
 *    "Mão" ativa: pan por arraste.
 *
 * A seleção de ferramenta de desenho em si (retângulo, texto, etc.) fica
 * para a Etapa 4 — aqui só existe o estado mínimo `activeTool` para
 * diferenciar "selecionar" de "navegar" (pan).
 */
export class InputController {
    constructor({ element, camera, renderer, eventBus }) {
        this.element = element;
        this.camera = camera;
        this.renderer = renderer;
        this.eventBus = eventBus;

        this.activeTool = "select";
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

    setActiveTool(tool) {
        this.activeTool = tool;
        this._updateCursor();
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
        const wantsPan = this._spacePressed || this.activeTool === "pan" || event.button === 1;
        if (!wantsPan) return;

        event.preventDefault();
        this._isPanning = true;
        this._lastX = event.clientX;
        this._lastY = event.clientY;
        this.element.classList.add("is-panning");
        this.element.setPointerCapture?.(event.pointerId);
    }

    _onPointerMove(event) {
        if (!this._isPanning) return;

        const dx = event.clientX - this._lastX;
        const dy = event.clientY - this._lastY;
        this._lastX = event.clientX;
        this._lastY = event.clientY;

        this.camera.pan(dx, dy);
        this.renderer.markDirty();
        this.eventBus.emit("camera:change");
    }

    _onPointerUp() {
        this._isPanning = false;
        this.element.classList.remove("is-panning");
    }

    _onKeyDown(event) {
        if (event.code !== "Space" || EDITABLE_TAGS.has(event.target.tagName)) return;
        if (!this._spacePressed) {
            event.preventDefault();
            this._spacePressed = true;
            this._updateCursor();
        }
    }

    _onKeyUp(event) {
        if (event.code !== "Space") return;
        this._spacePressed = false;
        this._isPanning = false;
        this.element.classList.remove("is-panning");
        this._updateCursor();
    }

    _updateCursor() {
        const wantsPanCursor = this._spacePressed || this.activeTool === "pan";
        this.element.classList.toggle("cursor-pan", wantsPanCursor);
    }
}
