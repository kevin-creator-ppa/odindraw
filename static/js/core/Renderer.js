import { mod } from "../utils/geometry.js";
import { animationState } from "../elements/animationState.js";
import { computeLineJumps, lineJumpsState } from "../elements/lineJumps.js";
import { LINE_TYPES } from "../elements/typeGroups.js";

export const BASE_GRID_SPACING = 24;
const MIN_SCREEN_SPACING = 8;
const MAX_SCREEN_SPACING = 64;
export const DEFAULT_PAGE_SIZE = { width: 850, height: 1100 }; // Carta (letter), em unidades de mundo

export const RULER_SIZE = 18; // px, largura/altura das réguas (igual ao offset do canto no CSS)
const RULER_MIN_STEP_PX = 50; // espaçamento mínimo em tela entre marcas maiores, pra não amontoar números
const RULER_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000];

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
    constructor({ container, staticCanvas, interactiveCanvas, camera, scene, rulerTopCanvas, rulerLeftCanvas, rulerCorner }) {
        this.container = container;
        this.staticCanvas = staticCanvas;
        this.interactiveCanvas = interactiveCanvas;
        this.camera = camera;
        this.scene = scene;
        this.rulerTopCanvas = rulerTopCanvas ?? null;
        this.rulerLeftCanvas = rulerLeftCanvas ?? null;
        this.rulerCorner = rulerCorner ?? null;
        this.rulerTopCtx = this.rulerTopCanvas?.getContext("2d") ?? null;
        this.rulerLeftCtx = this.rulerLeftCanvas?.getContext("2d") ?? null;

        this.staticCtx = staticCanvas.getContext("2d");
        this.interactiveCtx = interactiveCanvas.getContext("2d");

        this.gridEnabled = true;
        this.rulersEnabled = false;
        this.pageSize = { ...DEFAULT_PAGE_SIZE };
        this.width = 0;
        this.height = 0;
        this.dpr = window.devicePixelRatio || 1;
        this._dirty = true;
        this._hasAnimatedStroke = false;
        this._gridDotColor = "#c9c9d1";
        this._borderColor = "#c9c9d1";
        this._rulerBg = "#ffffff";
        this._rulerTickColor = "#6b6b76";

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

    setRulersEnabled(enabled) {
        this.rulersEnabled = enabled;
        if (this.rulerTopCanvas) this.rulerTopCanvas.hidden = !enabled;
        if (this.rulerLeftCanvas) this.rulerLeftCanvas.hidden = !enabled;
        if (this.rulerCorner) this.rulerCorner.hidden = !enabled;
        if (enabled) this.resize();
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

        if (this.rulersEnabled && this.rulerTopCanvas && this.rulerLeftCanvas) {
            const topW = Math.max(1, width - RULER_SIZE);
            const leftH = Math.max(1, height - RULER_SIZE);
            this.rulerTopCanvas.width = Math.max(1, Math.round(topW * this.dpr));
            this.rulerTopCanvas.height = Math.max(1, Math.round(RULER_SIZE * this.dpr));
            this.rulerTopCanvas.style.width = `${topW}px`;
            this.rulerTopCanvas.style.height = `${RULER_SIZE}px`;

            this.rulerLeftCanvas.width = Math.max(1, Math.round(RULER_SIZE * this.dpr));
            this.rulerLeftCanvas.height = Math.max(1, Math.round(leftH * this.dpr));
            this.rulerLeftCanvas.style.width = `${RULER_SIZE}px`;
            this.rulerLeftCanvas.style.height = `${leftH}px`;
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

    /**
     * `hasAnimatedStroke` e as cores lidas do CSS só são recalculadas
     * quando algo mudou de verdade (dirty) — não a cada frame. Sem isso,
     * um único conector com traço "animado" forçava um scan de todos os
     * objetos + duas chamadas de getComputedStyle a 60fps pra sempre,
     * mesmo com o resto do diagrama parado.
     */
    _tick() {
        if (this._dirty) {
            this._hasAnimatedStroke = this.scene.objects.some((el) => el.style?.strokeStyle === "animated");
            this._refreshCachedColors();
        }

        if (this._hasAnimatedStroke) {
            animationState.phase = (animationState.phase + 0.4) % 13;
        }

        if (this._dirty || this._hasAnimatedStroke) {
            this._renderStatic();
            this._dirty = false;
        }
        requestAnimationFrame(this._tick);
    }

    _refreshCachedColors() {
        const style = getComputedStyle(this.container);
        this._gridDotColor = style.getPropertyValue("--grid-dot").trim() || "#c9c9d1";
        this._borderColor = style.getPropertyValue("--border-color").trim() || "#c9c9d1";
        this._rulerBg = style.getPropertyValue("--bg-panel").trim() || "#ffffff";
        this._rulerTickColor = style.getPropertyValue("--text-secondary").trim() || "#6b6b76";
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

        if (this.rulersEnabled) {
            this._drawRulers();
        }
    }

    /** Escolhe o menor passo "redondo" (1/2/5 × potência de 10) cujo espaçamento em tela não fique apertado demais pros números. */
    _rulerStep(zoom) {
        for (const step of RULER_STEPS) {
            if (step * zoom >= RULER_MIN_STEP_PX) return step;
        }
        return RULER_STEPS[RULER_STEPS.length - 1];
    }

    /** Réguas horizontais/verticais em unidades de mundo (estilo draw.io/Illustrator) — cada canvas usa seu próprio sistema de coordenadas local, deslocado de RULER_SIZE em relação à área principal. */
    _drawRulers() {
        const { zoom, offsetX, offsetY } = this.camera;
        const step = this._rulerStep(zoom);
        const spacingPx = step * zoom;

        if (this.rulerTopCtx && this.rulerTopCanvas) {
            const ctx = this.rulerTopCtx;
            const w = this.rulerTopCanvas.width / this.dpr;
            ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            ctx.clearRect(0, 0, w, RULER_SIZE);
            ctx.fillStyle = this._rulerBg;
            ctx.fillRect(0, 0, w, RULER_SIZE);
            ctx.strokeStyle = this._rulerTickColor;
            ctx.fillStyle = this._rulerTickColor;
            ctx.font = "9px sans-serif";
            ctx.textBaseline = "top";
            ctx.beginPath();
            const firstWorldX = Math.floor(-offsetX / spacingPx) * step;
            for (let worldX = firstWorldX; worldX * zoom + offsetX < w + RULER_SIZE + spacingPx; worldX += step) {
                const x = worldX * zoom + offsetX - RULER_SIZE;
                if (x < -spacingPx) continue;
                ctx.moveTo(x, RULER_SIZE - 7);
                ctx.lineTo(x, RULER_SIZE);
                ctx.fillText(String(Math.round(worldX)), x + 2, 1);
            }
            ctx.stroke();
        }

        if (this.rulerLeftCtx && this.rulerLeftCanvas) {
            const ctx = this.rulerLeftCtx;
            const h = this.rulerLeftCanvas.height / this.dpr;
            ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            ctx.clearRect(0, 0, RULER_SIZE, h);
            ctx.fillStyle = this._rulerBg;
            ctx.fillRect(0, 0, RULER_SIZE, h);
            ctx.strokeStyle = this._rulerTickColor;
            ctx.fillStyle = this._rulerTickColor;
            ctx.font = "9px sans-serif";
            ctx.textBaseline = "top";
            ctx.beginPath();
            const firstWorldY = Math.floor(-offsetY / spacingPx) * step;
            for (let worldY = firstWorldY; worldY * zoom + offsetY < h + RULER_SIZE + spacingPx; worldY += step) {
                const y = worldY * zoom + offsetY - RULER_SIZE;
                if (y < -spacingPx) continue;
                ctx.moveTo(RULER_SIZE - 7, y);
                ctx.lineTo(RULER_SIZE, y);
                ctx.save();
                ctx.translate(1, y + 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(String(Math.round(worldY)), 0, 0);
                ctx.restore();
            }
            ctx.stroke();
        }
    }

    /** Moldura tracejada mostrando os limites da página (referência pra impressão/exportação) — não recorta nem afeta o desenho, é só visual. */
    _drawPageBoundary(ctx) {
        const topLeft = this.camera.worldToScreen(0, 0);
        const bottomRight = this.camera.worldToScreen(this.pageSize.width, this.pageSize.height);

        ctx.save();
        ctx.strokeStyle = this._borderColor;
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

        ctx.fillStyle = this._gridDotColor;
        for (let x = startX; x < this.width + spacing; x += spacing) {
            for (let y = startY; y < this.height + spacing; y += spacing) {
                ctx.beginPath();
                ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
