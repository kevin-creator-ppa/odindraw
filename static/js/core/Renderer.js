import { mod } from "../utils/geometry.js";
import { animationState } from "../elements/animationState.js";
import { computeLineJumps, lineJumpsState } from "../elements/lineJumps.js";
import { LINE_TYPES } from "../elements/typeGroups.js";

export const BASE_GRID_SPACING = 24;
const MIN_SCREEN_SPACING = 8;
const MAX_SCREEN_SPACING = 64;
export const DEFAULT_PAGE_SIZE = { width: 850, height: 1100 }; // Carta (letter), em unidades de mundo

/**
 * Desenha a cena em duas camadas de canvas:
 *  - staticCanvas: grid + elementos do diagrama. Só é redesenhada quando
 *    algo muda (dirty flag), nunca a cada frame.
 *  - interactiveCanvas: seleção, alças, preview de desenho. Reservada
 *    para as próximas etapas (ainda não desenha nada).
 *
 * Separar as duas evita redesenhar milhares de elementos a cada movimento
 * de mouse durante uma interação.
 */
export class Renderer {
    constructor({ container, staticCanvas, interactiveCanvas, camera, scene }) {
        this.container = container;
        this.staticCanvas = staticCanvas;
        this.interactiveCanvas = interactiveCanvas;
        this.camera = camera;
        this.scene = scene;

        this.staticCtx = staticCanvas.getContext("2d");
        this.interactiveCtx = interactiveCanvas.getContext("2d");

        this.gridEnabled = true;
        this.pageSize = { ...DEFAULT_PAGE_SIZE };
        this.width = 0;
        this.height = 0;
        this.dpr = window.devicePixelRatio || 1;
        this._dirty = true;

        this._resizeObserver = new ResizeObserver(() => this.resize());
        this._resizeObserver.observe(container);
        this.resize();

        this._tick = this._tick.bind(this);
        requestAnimationFrame(this._tick);
    }

    markDirty() {
        this._dirty = true;
    }

    setGridEnabled(enabled) {
        this.gridEnabled = enabled;
        this.markDirty();
    }

    setPageSize(size) {
        this.pageSize = size;
        this.markDirty();
    }

    resize() {
        const { width, height } = this.container.getBoundingClientRect();
        this.width = width;
        this.height = height;
        this.dpr = window.devicePixelRatio || 1;

        for (const canvas of [this.staticCanvas, this.interactiveCanvas]) {
            canvas.width = Math.max(1, Math.round(width * this.dpr));
            canvas.height = Math.max(1, Math.round(height * this.dpr));
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        }
        this.markDirty();
        this.clearInteractive();
    }

    /** Limpa o canvas interativo (usado pelas ferramentas para redesenhar o preview a cada movimento). */
    clearInteractive() {
        const ctx = this.interactiveCtx;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);
    }

    _tick() {
        const hasAnimatedStroke = this.scene.objects.some((el) => el.style?.strokeStyle === "animated");
        if (hasAnimatedStroke) {
            animationState.phase = (animationState.phase + 0.4) % 13;
        }

        if (this._dirty || hasAnimatedStroke) {
            this._renderStatic();
            this._dirty = false;
        }
        requestAnimationFrame(this._tick);
    }

    _renderStatic() {
        const ctx = this.staticCtx;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);

        this._drawPageBoundary(ctx);
        if (this.gridEnabled) {
            this._drawGrid(ctx);
        }

        const viewport = this.camera.getViewportBounds(this.width, this.height);
        const visible = this.scene
            .getVisibleObjects(viewport)
            .filter((el) => this.scene.isElementVisible(el))
            .sort((a, b) => this.scene.stackCompare(a, b));

        let lineJumps = new Map();
        if (lineJumpsState.enabled) {
            const lines = visible.filter((el) => LINE_TYPES.has(el.type));
            lines.forEach((el) => el.beforeHitTest(this.scene));
            lineJumps = computeLineJumps(lines);
        }

        for (const element of visible) {
            element.render(ctx, this.camera, this.scene, lineJumps.get(element) ?? []);
        }
    }

    /** Moldura tracejada mostrando os limites da página (referência pra impressão/exportação) — não recorta nem afeta o desenho, é só visual. */
    _drawPageBoundary(ctx) {
        const topLeft = this.camera.worldToScreen(0, 0);
        const bottomRight = this.camera.worldToScreen(this.pageSize.width, this.pageSize.height);

        ctx.save();
        ctx.strokeStyle = getComputedStyle(this.container).getPropertyValue("--border-color").trim() || "#c9c9d1";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
        ctx.restore();
    }

    _drawGrid(ctx) {
        const { zoom, offsetX, offsetY } = this.camera;

        let worldSpacing = BASE_GRID_SPACING;
        while (worldSpacing * zoom < MIN_SCREEN_SPACING) worldSpacing *= 2;
        while (worldSpacing * zoom > MAX_SCREEN_SPACING) worldSpacing /= 2;
        const spacing = worldSpacing * zoom;

        const startX = mod(offsetX, spacing);
        const startY = mod(offsetY, spacing);
        const dotRadius = Math.min(1.4, 0.75 + zoom * 0.25);

        ctx.fillStyle = getComputedStyle(this.container).getPropertyValue("--grid-dot").trim() || "#c9c9d1";
        for (let x = startX; x < this.width + spacing; x += spacing) {
            for (let y = startY; y < this.height + spacing; y += spacing) {
                ctx.beginPath();
                ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
