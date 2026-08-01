/**
 * Bootstrap da aplicação.
 *
 * Etapa 5 — objetos: as ferramentas de forma/texto/desenho livre agora
 * criam Elements reais na Scene (em vez de só mostrar preview), que o
 * Renderer desenha e a SelectTool permite selecionar/mover/editar via
 * painel de propriedades. Conectores "inteligentes" (que recalculam
 * rota ao mover objetos) ficam para a Etapa 6.
 */

import { EventBus } from "./core/EventBus.js";
import { Scene } from "./core/Scene.js";
import { Camera } from "./core/Camera.js";
import { Renderer } from "./core/Renderer.js";
import { InputController } from "./core/InputController.js";
import { ToolManager } from "./managers/ToolManager.js";
import { SelectionManager } from "./managers/SelectionManager.js";
import { PropertiesPanel } from "./ui/PropertiesPanel.js";
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
import { Rectangle } from "./elements/Rectangle.js";
import { Ellipse } from "./elements/Ellipse.js";
import { Line } from "./elements/Line.js";
import { Arrow } from "./elements/Arrow.js";
import { OrthogonalLine } from "./elements/OrthogonalLine.js";
import { Text } from "./elements/Text.js";
import { Freehand } from "./elements/Freehand.js";

const THEME_STORAGE_KEY = "odindraw:theme";
const ZOOM_STEP = 1.2;
const MIN_DRAG_DISTANCE = 4;
const DEFAULT_SHAPE_WIDTH = 100;
const DEFAULT_SHAPE_HEIGHT = 80;

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
    const selectionManager = new SelectionManager({ scene, eventBus });

    const toolManager = new ToolManager({
        canvasArea,
        camera,
        scene,
        eventBus,
        renderer,
        selectionManager,
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

    return { canvasArea, eventBus, scene, camera, renderer, toolManager, selectionManager, input };
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
        // Ajuste real à bounding box dos objetos fica para um refinamento futuro; por ora volta ao padrão.
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

/** Normaliza start/end de um arraste em bounding box; cliques sem arrastar geram uma forma de tamanho padrão. */
function normalizeShapeBounds(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dx) < MIN_DRAG_DISTANCE && Math.abs(dy) < MIN_DRAG_DISTANCE) {
        return { x: start.x, y: start.y, width: DEFAULT_SHAPE_WIDTH, height: DEFAULT_SHAPE_HEIGHT };
    }
    return {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(dx),
        height: Math.abs(dy),
    };
}

/** Idem para ferramentas baseadas em dois pontos (linha/seta/ortogonal). */
function normalizeLinePoints(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dx) < MIN_DRAG_DISTANCE && Math.abs(dy) < MIN_DRAG_DISTANCE) {
        return { x1: start.x, y1: start.y, x2: start.x + DEFAULT_SHAPE_WIDTH, y2: start.y };
    }
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

/** Consome os eventos emitidos pelas ferramentas e materializa Elements reais na Scene. */
function initElementCreation({ scene, eventBus, renderer, selectionManager, toolManager }) {
    const focusSelectTool = (element) => {
        selectionManager.select(element);
        toolManager.setActiveTool("select");
    };

    const addAndSelect = (element) => {
        scene.addObject(element);
        renderer.markDirty();
        focusSelectTool(element);
    };

    eventBus.on("tool:shape-drawn", ({ type, start, end }) => {
        switch (type) {
            case "rectangle":
            case "square":
                addAndSelect(new Rectangle(normalizeShapeBounds(start, end)));
                break;
            case "ellipse":
            case "circle":
                addAndSelect(new Ellipse(normalizeShapeBounds(start, end)));
                break;
            case "line":
                addAndSelect(new Line(normalizeLinePoints(start, end)));
                break;
            case "arrow":
                addAndSelect(new Arrow(normalizeLinePoints(start, end)));
                break;
            case "orthogonal-line":
                addAndSelect(new OrthogonalLine(normalizeLinePoints(start, end)));
                break;
        }
    });

    eventBus.on("tool:text-placed", ({ point }) => {
        addAndSelect(new Text({ x: point.x, y: point.y }));
    });

    eventBus.on("tool:freehand-drawn", ({ points }) => {
        if (points.length < 2) return;
        addAndSelect(new Freehand({ points }));
    });

    eventBus.on("tool:erase-drag", ({ point }) => {
        const hit = scene.getObjectAtPoint(point);
        if (!hit) return;
        scene.removeObject(hit);
        selectionManager.remove(hit);
        renderer.markDirty();
    });
}

/** Atalhos globais de objeto: Delete/Backspace remove, Ctrl/Cmd+D duplica. */
function initObjectShortcuts({ scene, selectionManager, renderer }) {
    const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

    window.addEventListener("keydown", (event) => {
        if (EDITABLE_TAGS.has(event.target.tagName)) return;

        if (event.key === "Delete" || event.key === "Backspace") {
            const selected = selectionManager.getSingle();
            if (!selected) return;
            event.preventDefault();
            scene.removeObject(selected);
            selectionManager.clear();
            renderer.markDirty();
            renderer.clearInteractive();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
            const selected = selectionManager.getSingle();
            if (!selected) return;
            event.preventDefault();
            const clone = selected.clone();
            clone.translate(20, 20);
            scene.addObject(clone);
            selectionManager.select(clone);
            renderer.markDirty();
        }
    });
}

function init() {
    const engine = initCanvasEngine();

    initTheme(() => engine.renderer.markDirty());
    initExportMenu();
    initZoomControls(engine);
    initGridToggle(engine.renderer);
    initToolSelection(engine.toolManager);
    initElementCreation(engine);
    initObjectShortcuts(engine);
    new PropertiesPanel(engine);

    // Hook de depuração (console do browser): inspecionar scene/camera/renderer em runtime.
    window.__odindraw = engine;
}

document.addEventListener("DOMContentLoaded", init);
