/**
 * Bootstrap da aplicação.
 *
 * Etapa 4 — sistema de ferramentas: cada ferramenta da sidebar esquerda
 * vira uma instância de Tool, gerenciada pelo ToolManager e acionável
 * por clique ou atalho de teclado. As ferramentas de desenho já mostram
 * preview no canvas interativo; a criação de Elements reais na Scene
 * fica para a Etapa 5.
 */

import { EventBus } from "./core/EventBus.js";
import { Scene } from "./core/Scene.js";
import { Camera } from "./core/Camera.js";
import { Renderer } from "./core/Renderer.js";
import { InputController } from "./core/InputController.js";
import { ToolManager } from "./managers/ToolManager.js";
import { SelectTool } from "./tools/SelectTool.js";
import { PanTool } from "./tools/PanTool.js";
import { RectangleTool } from "./tools/RectangleTool.js";
import { SquareTool } from "./tools/SquareTool.js";
import { EllipseTool } from "./tools/EllipseTool.js";
import { CircleTool } from "./tools/CircleTool.js";
import { LineTool } from "./tools/LineTool.js";
import { ArrowTool } from "./tools/ArrowTool.js";
import { OrthogonalLineTool } from "./tools/OrthogonalLineTool.js";
import { TextTool } from "./tools/TextTool.js";
import { FreehandTool } from "./tools/FreehandTool.js";
import { EraserTool } from "./tools/EraserTool.js";

const THEME_STORAGE_KEY = "odindraw:theme";
const ZOOM_STEP = 1.2;

function initTheme(onChange) {
    const root = document.documentElement;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
        root.setAttribute("data-theme", stored);
    }

    document.querySelector('[data-action="toggle-theme"]').addEventListener("click", () => {
        const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
        const next = current === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        localStorage.setItem(THEME_STORAGE_KEY, next);
        onChange?.();
    });
}

function initExportMenu() {
    const dropdown = document.querySelector('[data-dropdown="export"]');
    const toggle = dropdown.querySelector('[data-action="export-menu"]');

    toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        dropdown.classList.toggle("dropdown--open");
    });

    document.addEventListener("click", () => {
        dropdown.classList.remove("dropdown--open");
    });
}

function initCanvasEngine() {
    const canvasArea = document.querySelector("[data-canvas-area]");
    const staticCanvas = document.getElementById("static-canvas");
    const interactiveCanvas = document.getElementById("interactive-canvas");

    const eventBus = new EventBus();
    const scene = new Scene();
    const camera = new Camera();
    const renderer = new Renderer({ container: canvasArea, staticCanvas, interactiveCanvas, camera, scene });

    const toolManager = new ToolManager({
        canvasArea,
        camera,
        scene,
        eventBus,
        renderer,
        tools: [
            new SelectTool(),
            new PanTool(),
            new RectangleTool(),
            new SquareTool(),
            new EllipseTool(),
            new CircleTool(),
            new LineTool(),
            new ArrowTool(),
            new OrthogonalLineTool(),
            new TextTool(),
            new FreehandTool(),
            new EraserTool(),
        ],
    });

    const input = new InputController({ element: canvasArea, camera, renderer, eventBus, toolManager });

    return { canvasArea, eventBus, scene, camera, renderer, toolManager, input };
}

function initZoomControls({ camera, renderer, eventBus }) {
    const zoomLevelEl = document.querySelector("[data-zoom-level]");

    const updateZoomLabel = () => {
        zoomLevelEl.textContent = `${Math.round(camera.zoom * 100)}%`;
    };

    document.querySelector('[data-action="zoom-in"]').addEventListener("click", () => {
        camera.setZoom(camera.zoom * ZOOM_STEP, renderer.width, renderer.height);
        renderer.markDirty();
        eventBus.emit("camera:change");
    });

    document.querySelector('[data-action="zoom-out"]').addEventListener("click", () => {
        camera.setZoom(camera.zoom / ZOOM_STEP, renderer.width, renderer.height);
        renderer.markDirty();
        eventBus.emit("camera:change");
    });

    document.querySelector('[data-action="zoom-fit"]').addEventListener("click", () => {
        // Sem elementos na cena ainda (Etapa 5): "ajustar à tela" volta ao zoom padrão.
        camera.reset();
        renderer.markDirty();
        eventBus.emit("camera:change");
    });

    eventBus.on("camera:change", updateZoomLabel);
    updateZoomLabel();
}

function initGridToggle(renderer) {
    const button = document.querySelector('[data-action="toggle-grid"]');
    button.addEventListener("click", () => {
        const enabled = button.getAttribute("data-active") !== "true";
        button.setAttribute("data-active", String(enabled));
        renderer.setGridEnabled(enabled);
    });
}

function initToolSelection(toolManager) {
    const buttons = Array.from(document.querySelectorAll(".tool[data-tool]"));

    const setActiveButton = (name) => {
        buttons.forEach((button) => button.classList.toggle("tool--active", button.dataset.tool === name));
    };

    buttons.forEach((button) => {
        button.addEventListener("click", () => toolManager.setActiveTool(button.dataset.tool));
    });

    toolManager.eventBus.on("tool:change", ({ name }) => setActiveButton(name));
    setActiveButton(toolManager.getActiveTool().name);
}

function init() {
    const engine = initCanvasEngine();

    initTheme(() => engine.renderer.markDirty());
    initExportMenu();
    initZoomControls(engine);
    initGridToggle(engine.renderer);
    initToolSelection(engine.toolManager);
}

document.addEventListener("DOMContentLoaded", init);
