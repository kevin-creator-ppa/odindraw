import { buildSvgString } from "../io/svgBuilder.js";
import { scenePreviewFromPageData } from "../io/scenePreview.js";
import { applyIcons } from "./icons.js";

/** Modo apresentação: overlay em tela cheia cicla pelas páginas do documento (setas/clique, Esc pra sair). */
export class PresentationMode {
    constructor({ pageManager }) {
        this.pageManager = pageManager;
        this.overlay = null;

        document.querySelector('[data-action="present"]').addEventListener("click", () => this.start());
    }

    start() {
        this.pageManager.captureActivePage();
        this.pages = this.pageManager.pages;
        if (this.pages.length === 0) return;
        this.index = Math.max(0, this.pages.findIndex((p) => p.id === this.pageManager.activePageId));
        this._buildOverlay();
        this._render();
    }

    _buildOverlay() {
        this.overlay = document.createElement("div");
        this.overlay.className = "presentation-overlay";
        this.overlay.innerHTML = `
            <button class="presentation-overlay__close" data-icon="close" title="Fechar (Esc)"></button>
            <button class="presentation-overlay__nav presentation-overlay__nav--prev" data-icon="chevron-left" title="Anterior"></button>
            <div class="presentation-overlay__stage"></div>
            <button class="presentation-overlay__nav presentation-overlay__nav--next" data-icon="chevron-right" title="Próxima"></button>
            <span class="presentation-overlay__counter"></span>
        `;
        document.body.appendChild(this.overlay);

        this.stage = this.overlay.querySelector(".presentation-overlay__stage");
        this.counter = this.overlay.querySelector(".presentation-overlay__counter");

        this.overlay.querySelector(".presentation-overlay__close").addEventListener("click", () => this.stop());
        this.overlay.querySelector(".presentation-overlay__nav--prev").addEventListener("click", () => this._go(-1));
        this.overlay.querySelector(".presentation-overlay__nav--next").addEventListener("click", () => this._go(1));

        this._onKeyDown = (event) => {
            if (event.key === "Escape") this.stop();
            else if (event.key === "ArrowRight") this._go(1);
            else if (event.key === "ArrowLeft") this._go(-1);
        };
        window.addEventListener("keydown", this._onKeyDown);

        applyIcons(this.overlay);
    }

    _go(direction) {
        this.index = (this.index + direction + this.pages.length) % this.pages.length;
        this._render();
    }

    _render() {
        const page = this.pages[this.index];
        const scene = scenePreviewFromPageData(page.data);
        this.stage.innerHTML =
            scene.objects.length > 0
                ? buildSvgString(scene)
                : '<p class="presentation-overlay__empty">Página em branco</p>';
        this.counter.textContent = `${page.name} — ${this.index + 1} / ${this.pages.length}`;
    }

    stop() {
        window.removeEventListener("keydown", this._onKeyDown);
        this.overlay?.remove();
        this.overlay = null;
    }
}
