import { ICONS } from "../elements/icons/iconDefinitions.js";
import { iconToSvgMarkup } from "../elements/icons/iconRenderer.js";
import { Component } from "../elements/Component.js";

const FAVORITES_KEY = "odindraw:library-favorites";
const DEFAULT_SIZE = 90;
const DND_MIME = "application/x-odindraw-component";

/**
 * Painel flutuante da biblioteca de componentes: busca, favoritos
 * (persistidos em localStorage) e colocação no canvas por clique ou
 * arrastar-e-soltar (drag-and-drop nativo do navegador).
 */
export class LibraryPanel {
    constructor({ scene, camera, renderer, selectionManager, toolManager, historyManager }) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.selectionManager = selectionManager;
        this.toolManager = toolManager;
        this.historyManager = historyManager;

        this.panel = document.querySelector("[data-library-panel]");
        this.body = document.querySelector("[data-library-body]");
        this.search = document.querySelector("[data-library-search]");
        this.canvasArea = document.querySelector("[data-canvas-area]");

        this.favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]"));
        this.categories = [];

        this._bindToggle();
        this._bindSearch();
        this._bindDrop();
        this._load();
    }

    async _load() {
        try {
            const response = await fetch("/api/library/components");
            const data = await response.json();
            this.categories = data.categories ?? [];
            this._render("");
        } catch (error) {
            this.body.innerHTML = '<p class="dropdown__empty">Erro ao carregar biblioteca</p>';
            console.error(error);
        }
    }

    _bindToggle() {
        document.querySelector('[data-action="toggle-library"]').addEventListener("click", () => {
            this.panel.hidden = !this.panel.hidden;
        });
        document.querySelector('[data-action="close-library"]').addEventListener("click", () => {
            this.panel.hidden = true;
        });
    }

    _bindSearch() {
        this.search.addEventListener("input", () => this._render(this.search.value.trim().toLowerCase()));
    }

    _bindDrop() {
        this.canvasArea.addEventListener("dragover", (event) => {
            if (!event.dataTransfer.types.includes(DND_MIME)) return;
            event.preventDefault();
        });

        this.canvasArea.addEventListener("drop", (event) => {
            const componentId = event.dataTransfer.getData(DND_MIME);
            if (!componentId) return;
            event.preventDefault();

            const item = this._findItem(componentId);
            if (!item) return;

            const rect = this.canvasArea.getBoundingClientRect();
            const worldPoint = this.camera.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
            this._createComponent(item, worldPoint);
        });
    }

    _findItem(id) {
        return this.categories.flatMap((category) => category.items).find((item) => item.id === id);
    }

    _render(filterText) {
        this.body.innerHTML = "";

        const favoriteItems = this.categories.flatMap((c) => c.items).filter((item) => this.favorites.has(item.id));
        if (favoriteItems.length > 0 && !filterText) {
            this.body.appendChild(this._buildSection("Favoritos", favoriteItems));
        }

        this.categories.forEach((category) => {
            const items = category.items.filter((item) => !filterText || item.name.toLowerCase().includes(filterText));
            if (items.length === 0) return;
            this.body.appendChild(this._buildSection(category.name, items));
        });

        if (this.body.children.length === 0) {
            this.body.innerHTML = '<p class="dropdown__empty">Nenhum componente encontrado</p>';
        }
    }

    _buildSection(title, items) {
        const section = document.createElement("div");
        section.className = "library-category";

        const heading = document.createElement("h3");
        heading.className = "library-category__title";
        heading.textContent = title;
        section.appendChild(heading);

        const grid = document.createElement("div");
        grid.className = "library-grid";
        items.forEach((item) => grid.appendChild(this._buildItem(item)));
        section.appendChild(grid);

        return section;
    }

    _buildItem(item) {
        const button = document.createElement("button");
        button.className = "library-item";
        button.type = "button";
        button.draggable = true;
        button.title = item.name;

        const iconWrapper = document.createElement("div");
        iconWrapper.className = "library-item__icon";
        iconWrapper.innerHTML = this._iconPreviewSvg(item.id);

        const label = document.createElement("span");
        label.className = "library-item__label";
        label.textContent = item.name;

        const favButton = document.createElement("button");
        favButton.className = "library-item__fav";
        favButton.type = "button";
        favButton.title = "Favoritar";
        favButton.textContent = this.favorites.has(item.id) ? "★" : "☆";
        favButton.addEventListener("click", (event) => {
            event.stopPropagation();
            this._toggleFavorite(item.id);
        });

        button.append(iconWrapper, label, favButton);
        button.addEventListener("click", () => this._placeAtViewportCenter(item));
        button.addEventListener("dragstart", (event) => {
            event.dataTransfer.setData(DND_MIME, item.id);
            event.dataTransfer.effectAllowed = "copy";
        });

        return button;
    }

    _iconPreviewSvg(componentType) {
        const commands = ICONS[componentType] ?? [];
        return `<svg viewBox="0 0 32 32">${iconToSvgMarkup(commands, 3, 3, 26, 26, "currentColor", 100)}</svg>`;
    }

    _toggleFavorite(id) {
        if (this.favorites.has(id)) this.favorites.delete(id);
        else this.favorites.add(id);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...this.favorites]));
        this._render(this.search.value.trim().toLowerCase());
    }

    _placeAtViewportCenter(item) {
        const worldCenter = this.camera.screenToWorld(this.renderer.width / 2, this.renderer.height / 2);
        this._createComponent(item, worldCenter);
    }

    _createComponent(item, worldPoint) {
        const component = new Component({
            componentType: item.id,
            label: item.name,
            x: worldPoint.x - DEFAULT_SIZE / 2,
            y: worldPoint.y - DEFAULT_SIZE / 2,
            width: DEFAULT_SIZE,
            height: DEFAULT_SIZE,
        });
        this.scene.addObject(component);
        this.renderer.markDirty();
        this.selectionManager.select(component);
        this.toolManager.setActiveTool("select");
        this.historyManager?.pushSnapshot();
    }
}
