import { computeSceneBounds } from "../io/svgBuilder.js";

const PADDING = 10;

/**
 * Substitui o placeholder da Etapa 3 por um minimapa de verdade: desenha
 * um retângulo simplificado por objeto e o contorno do viewport atual;
 * clicar/arrastar nele navega a câmera principal para aquele ponto.
 */
export class Minimap {
    constructor({ scene, camera, renderer, eventBus }) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.eventBus = eventBus;

        this.container = document.querySelector("[data-minimap]");
        this.container.innerHTML = "";
        this.canvas = document.createElement("canvas");
        this.canvas.className = "minimap__canvas";
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");

        this._transform = null;
        this._dragging = false;

        this._resize();
        window.addEventListener("resize", () => this._resize());

        this.container.addEventListener("pointerdown", (event) => {
            this._dragging = true;
            this._navigate(event);
        });
        window.addEventListener("pointermove", (event) => {
            if (this._dragging) this._navigate(event);
        });
        window.addEventListener("pointerup", () => {
            this._dragging = false;
        });

        eventBus.on("camera:change", () => this._draw());
        this._loop();
    }

    _resize() {
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
        this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._cssWidth = rect.width;
        this._cssHeight = rect.height;
    }

    _loop() {
        this._draw();
        requestAnimationFrame(() => this._loop());
    }

    _draw() {
        const ctx = this.ctx;
        const w = this._cssWidth;
        const h = this._cssHeight;
        if (!w || !h) return;
        ctx.clearRect(0, 0, w, h);

        const objectsBounds = this.scene.objects.length > 0 ? computeSceneBounds(this.scene) : null;
        const viewportBounds = this.camera.getViewportBounds(this.renderer.width, this.renderer.height);
        const combined = objectsBounds ? this._union(objectsBounds, viewportBounds) : viewportBounds;

        const scale = Math.min(
            (w - PADDING * 2) / Math.max(combined.width, 1),
            (h - PADDING * 2) / Math.max(combined.height, 1)
        );
        const offsetX = (w - combined.width * scale) / 2 - combined.x * scale;
        const offsetY = (h - combined.height * scale) / 2 - combined.y * scale;

        this._transform = { scale, offsetX, offsetY };

        ctx.fillStyle = getComputedStyle(this.container).getPropertyValue("--border-color") || "#ccc";
        this.scene.objects.forEach((el) => {
            if (!this.scene.isElementVisible(el)) return;
            const b = el.getBounds();
            ctx.fillRect(
                b.x * scale + offsetX,
                b.y * scale + offsetY,
                Math.max(b.width * scale, 1.5),
                Math.max(b.height * scale, 1.5)
            );
        });

        ctx.strokeStyle = getComputedStyle(this.container).getPropertyValue("--accent") || "#6965db";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
            viewportBounds.x * scale + offsetX,
            viewportBounds.y * scale + offsetY,
            viewportBounds.width * scale,
            viewportBounds.height * scale
        );
    }

    _union(a, b) {
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const right = Math.max(a.x + a.width, b.x + b.width);
        const bottom = Math.max(a.y + a.height, b.y + b.height);
        return { x, y, width: right - x, height: bottom - y };
    }

    _navigate(event) {
        if (!this._transform) return;
        const rect = this.container.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;

        const worldX = (localX - this._transform.offsetX) / this._transform.scale;
        const worldY = (localY - this._transform.offsetY) / this._transform.scale;

        this.camera.offsetX = this.renderer.width / 2 - worldX * this.camera.zoom;
        this.camera.offsetY = this.renderer.height / 2 - worldY * this.camera.zoom;

        this.renderer.markDirty();
        this.eventBus.emit("camera:change");
    }
}
