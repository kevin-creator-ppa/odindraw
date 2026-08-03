/**
 * Bootstrap da aplicação.
 *
 * Etapa 10 — refinamentos: undo/redo (HistoryManager), minimapa
 * funcional, "ajustar à tela" calculando o bounding box de verdade,
 * snap em grade ao arrastar, e bloquear/ocultar objeto.
 */

import { EventBus } from "./core/EventBus.js";
import { Scene } from "./core/Scene.js";
import { Camera } from "./core/Camera.js";
import { Renderer, BASE_GRID_SPACING } from "./core/Renderer.js";
import { InputController } from "./core/InputController.js";
import { ToolManager } from "./managers/ToolManager.js";
import { SelectionManager } from "./managers/SelectionManager.js";
import { HistoryManager } from "./managers/HistoryManager.js";
import { PageManager } from "./managers/PageManager.js";
import { duplicateSelected, deleteSelected, groupSelected, ungroupSelected } from "./managers/objectActions.js";
import { PropertiesPanel } from "./ui/PropertiesPanel.js";
import { FileMenu } from "./ui/FileMenu.js";
import { LibraryPanel } from "./ui/LibraryPanel.js";
import { LayersPanel } from "./ui/LayersPanel.js";
import { PagesBar } from "./ui/PagesBar.js";
import { Minimap } from "./ui/Minimap.js";
import { ContextMenu } from "./ui/ContextMenu.js";
import { ShortcutsModal } from "./ui/ShortcutsModal.js";
import { TextEditor } from "./ui/TextEditor.js";
import { SaveLoad } from "./io/SaveLoad.js";
import { exportPng } from "./io/ExportPng.js";
import { exportSvg } from "./io/ExportSvg.js";
import { exportPdf } from "./io/ExportPdf.js";
import { computeSceneBounds, computeElementsBounds } from "./io/svgBuilder.js";
import { extractStyle, applyStyle } from "./managers/styleClipboard.js";
import { copySelection, pasteClipboard } from "./managers/clipboard.js";
import { clamp } from "./utils/geometry.js";
import { applyIcons } from "./ui/icons.js";
import { SelectTool } from "./tools/SelectTool.js";
import { PanTool } from "./tools/PanTool.js";
import { RectangleTool } from "./tools/RectangleTool.js";
import { SquareTool } from "./tools/SquareTool.js";
import { EllipseTool } from "./tools/EllipseTool.js";
import { CircleTool } from "./tools/CircleTool.js";
import { DiamondTool } from "./tools/DiamondTool.js";
import { TriangleTool } from "./tools/TriangleTool.js";
import { HexagonTool } from "./tools/HexagonTool.js";
import { CylinderTool } from "./tools/CylinderTool.js";
import { CloudTool } from "./tools/CloudTool.js";
import { LineTool } from "./tools/LineTool.js";
import { ArrowTool } from "./tools/ArrowTool.js";
import { OrthogonalLineTool } from "./tools/OrthogonalLineTool.js";
import { TextTool } from "./tools/TextTool.js";
import { FreehandTool } from "./tools/FreehandTool.js";
import { EraserTool } from "./tools/EraserTool.js";
import { Rectangle } from "./elements/Rectangle.js";
import { Ellipse } from "./elements/Ellipse.js";
import { Diamond } from "./elements/Diamond.js";
import { Triangle } from "./elements/Triangle.js";
import { Hexagon } from "./elements/Hexagon.js";
import { Cylinder } from "./elements/Cylinder.js";
import { Cloud } from "./elements/Cloud.js";
import { Line } from "./elements/Line.js";
import { Arrow } from "./elements/Arrow.js";
import { OrthogonalLine } from "./elements/OrthogonalLine.js";
import { Text } from "./elements/Text.js";
import { Freehand } from "./elements/Freehand.js";
import { Connector } from "./elements/Connector.js";

const THEME_STORAGE_KEY = "odindraw:theme";
const ZOOM_STEP = 1.2;
const MIN_DRAG_DISTANCE = 4;
const DEFAULT_SHAPE_WIDTH = 100;
const DEFAULT_SHAPE_HEIGHT = 80;

function initTheme(onChange) {
    const root = document.documentElement;
    const lightBtn = document.querySelector('[data-action="set-theme-light"]');
    const darkBtn = document.querySelector('[data-action="set-theme-dark"]');

    const syncButtons = () => {
        const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
        lightBtn.classList.toggle("segmented__active", current === "light");
        darkBtn.classList.toggle("segmented__active", current === "dark");
    };

    const setTheme = (theme) => {
        root.setAttribute("data-theme", theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        syncButtons();
        onChange?.();
    };

    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) root.setAttribute("data-theme", stored);
    syncButtons();

    lightBtn.addEventListener("click", () => setTheme("light"));
    darkBtn.addEventListener("click", () => setTheme("dark"));
}

/** Menu hambúrguer principal (Novo/Abrir/Salvar/Exportar/Tema) — mesmo padrão de toggle dos outros dropdowns. */
function initMainMenu() {
    const dropdown = document.querySelector('[data-dropdown="main-menu"]');
    const toggle = document.querySelector('[data-action="main-menu"]');

    toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        dropdown.classList.toggle("dropdown--open");
    });
}

/** Recolhe/expande o painel de propriedades (sidebar direita). */
function initPropertiesPanelToggle() {
    const button = document.querySelector('[data-action="toggle-properties-panel"]');
    button.addEventListener("click", () => {
        const collapsed = document.querySelector(".app").classList.toggle("app--properties-collapsed");
        button.setAttribute("data-active", String(!collapsed));
    });
}

/** Liga os 3 itens do dropdown Exportar; avisa se não há nada desenhado ainda. */
function initExportActions({ scene }) {
    const guardEmptyScene = () => {
        if (scene.objects.length === 0) {
            window.alert("Não há nada para exportar ainda.");
            return true;
        }
        return false;
    };

    document.querySelector('[data-action="export-png"]').addEventListener("click", () => {
        if (guardEmptyScene()) return;
        exportPng(scene);
    });

    document.querySelector('[data-action="export-svg"]').addEventListener("click", () => {
        if (guardEmptyScene()) return;
        exportSvg(scene);
    });

    document.querySelector('[data-action="export-pdf"]').addEventListener("click", async () => {
        if (guardEmptyScene()) return;
        try {
            await exportPdf(scene);
        } catch (error) {
            window.alert("Não foi possível exportar o PDF.");
            console.error(error);
        }
    });
}

/** Fecha qualquer dropdown aberto (exportar, abrir diagrama) ao clicar fora dele. */
function initDropdownAutoClose() {
    document.addEventListener("click", () => {
        document.querySelectorAll(".dropdown--open").forEach((el) => el.classList.remove("dropdown--open"));
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
    const pageManager = new PageManager({ scene, camera, renderer, eventBus });
    const historyManager = new HistoryManager({ pageManager, renderer, selectionManager, eventBus });

    const toolManager = new ToolManager({
        canvasArea,
        camera,
        scene,
        eventBus,
        renderer,
        selectionManager,
        historyManager,
        tools: [
            new SelectTool(),
            new PanTool(),
            new RectangleTool(),
            new SquareTool(),
            new EllipseTool(),
            new CircleTool(),
            new DiamondTool(),
            new TriangleTool(),
            new HexagonTool(),
            new CylinderTool(),
            new CloudTool(),
            new LineTool(),
            new ArrowTool(),
            new OrthogonalLineTool(),
            new TextTool(),
            new FreehandTool(),
            new EraserTool(),
        ],
    });

    const input = new InputController({ element: canvasArea, camera, renderer, eventBus, toolManager });
    const saveLoad = new SaveLoad({ scene, pageManager, eventBus });
    const textEditor = new TextEditor({ canvasArea, camera, renderer, eventBus, historyManager, scene, selectionManager });

    return {
        canvasArea,
        eventBus,
        scene,
        camera,
        renderer,
        toolManager,
        selectionManager,
        historyManager,
        pageManager,
        input,
        saveLoad,
        textEditor,
    };
}

const ZOOM_FIT_PADDING = 60;

/** Centraliza a câmera em `bounds`, com zoom máximo que caiba na tela (respeitando o padding e os limites de zoom). */
function fitCameraToBounds(camera, renderer, bounds) {
    const scaleX = (renderer.width - ZOOM_FIT_PADDING * 2) / Math.max(bounds.width, 1);
    const scaleY = (renderer.height - ZOOM_FIT_PADDING * 2) / Math.max(bounds.height, 1);
    camera.zoom = clamp(Math.min(scaleX, scaleY), camera.minZoom, camera.maxZoom);

    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    camera.offsetX = renderer.width / 2 - centerX * camera.zoom;
    camera.offsetY = renderer.height / 2 - centerY * camera.zoom;
}

function initZoomControls({ scene, camera, renderer, eventBus, selectionManager }) {
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

    /** Com seleção ativa, ajusta só a ela; senão, ajusta a cena inteira (comportamento de sempre). */
    document.querySelector('[data-action="zoom-fit"]').addEventListener("click", () => {
        const selected = selectionManager.getSelected();
        if (scene.objects.length === 0) {
            camera.reset();
        } else if (selected.length > 0) {
            fitCameraToBounds(camera, renderer, computeElementsBounds(selected, scene));
        } else {
            fitCameraToBounds(camera, renderer, computeSceneBounds(scene));
        }
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

/**
 * Se o arraste começou ou terminou sobre um objeto, cria um Connector
 * (que segue os objetos ligados); senão, cria a linha/seta/ortogonal
 * solta de sempre (Etapa 5).
 */
function createLineOrConnector({ start, end, startObjectId, endObjectId, routeType, startArrow = false, endArrow = false }) {
    const points = normalizeLinePoints(start, end);

    if (!startObjectId && !endObjectId) {
        if (routeType === "orthogonal") return new OrthogonalLine(points);
        if (endArrow || startArrow) return new Arrow(points);
        return new Line(points);
    }

    return new Connector({
        startObjectId,
        endObjectId,
        startPoint: { x: points.x1, y: points.y1 },
        endPoint: { x: points.x2, y: points.y2 },
        routeType,
        startArrow,
        endArrow,
    });
}

/** Consome os eventos emitidos pelas ferramentas e materializa Elements reais na Scene. */
function initElementCreation({ scene, eventBus, renderer, selectionManager, toolManager, historyManager, textEditor }) {
    const focusSelectTool = (element) => {
        selectionManager.select(element);
        toolManager.setActiveTool("select");
    };

    const addAndSelect = (element) => {
        scene.addObject(element);
        renderer.markDirty();
        focusSelectTool(element);
        historyManager?.pushSnapshot();
    };

    eventBus.on("tool:shape-drawn", ({ type, start, end, startObjectId, endObjectId }) => {
        switch (type) {
            case "rectangle":
            case "square":
                addAndSelect(new Rectangle(normalizeShapeBounds(start, end)));
                break;
            case "ellipse":
            case "circle":
                addAndSelect(new Ellipse(normalizeShapeBounds(start, end)));
                break;
            case "diamond":
                addAndSelect(new Diamond(normalizeShapeBounds(start, end)));
                break;
            case "triangle":
                addAndSelect(new Triangle(normalizeShapeBounds(start, end)));
                break;
            case "hexagon":
                addAndSelect(new Hexagon(normalizeShapeBounds(start, end)));
                break;
            case "cylinder":
                addAndSelect(new Cylinder(normalizeShapeBounds(start, end)));
                break;
            case "cloud":
                addAndSelect(new Cloud(normalizeShapeBounds(start, end)));
                break;
            case "line":
                addAndSelect(
                    createLineOrConnector({ start, end, startObjectId, endObjectId, routeType: "straight" })
                );
                break;
            case "arrow":
                addAndSelect(
                    createLineOrConnector({
                        start,
                        end,
                        startObjectId,
                        endObjectId,
                        routeType: "straight",
                        endArrow: true,
                    })
                );
                break;
            case "orthogonal-line":
                addAndSelect(
                    createLineOrConnector({ start, end, startObjectId, endObjectId, routeType: "orthogonal" })
                );
                break;
        }
    });

    eventBus.on("tool:text-placed", ({ point }) => {
        const element = new Text({ x: point.x, y: point.y });
        scene.addObject(element);
        renderer.markDirty();
        focusSelectTool(element);
        textEditor.open(element, { isNew: true });
    });

    eventBus.on("tool:freehand-drawn", ({ points }) => {
        if (points.length < 2) return;
        addAndSelect(new Freehand({ points }));
    });

    // Arraste a partir de uma alça do item selecionado (SelectTool) — ver "connector-drag" no SelectTool.
    eventBus.on("tool:connector-drawn", ({ startObjectId, startPoint, endObjectId, endPoint }) => {
        addAndSelect(
            new Connector({ startObjectId, endObjectId, startPoint, endPoint, routeType: "straight", endArrow: true })
        );
    });

    eventBus.on("tool:erase-drag", ({ point }) => {
        const hit = scene.getObjectAtPoint(point);
        if (!hit) return;
        scene.removeObject(hit);
        selectionManager.remove(hit);
        renderer.markDirty();
        historyManager?.pushSnapshot();
    });
}

/** Duplo clique num Text existente, ou numa forma com rótulo embutido (Rectangle/Ellipse), abre o editor inline. */
function initTextEditing({ canvasArea, camera, scene, toolManager, textEditor }) {
    canvasArea.addEventListener("dblclick", (event) => {
        const rect = canvasArea.getBoundingClientRect();
        const worldPoint = camera.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
        const hit = scene.getObjectAtPoint(worldPoint);
        if (!hit || scene.isElementLocked(hit)) return;
        if (hit.type !== "text" && !hit.textLabel) return;

        toolManager.setActiveTool("select");
        textEditor.open(hit, { isNew: false });
    });
}

/**
 * Atalhos globais de objeto/seleção: Delete/Backspace remove, Ctrl/Cmd+D
 * duplica (mesma lógica dos botões de Ação do painel), Ctrl/Cmd+A
 * seleciona tudo, Escape limpa a seleção (ou volta pra ferramenta de
 * seleção, se já não houver nada selecionado).
 */
function initObjectShortcuts(engine) {
    const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

    window.addEventListener("keydown", (event) => {
        if (EDITABLE_TAGS.has(event.target.tagName)) return;

        if (event.key === "Delete" || event.key === "Backspace") {
            if (engine.selectionManager.getSelected().length === 0) return;
            event.preventDefault();
            deleteSelected(engine);
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
            if (engine.selectionManager.getSelected().length === 0) return;
            event.preventDefault();
            duplicateSelected(engine);
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
            if (engine.scene.objects.length === 0) return;
            event.preventDefault();
            engine.selectionManager.selectMultiple(engine.scene.objects.slice());
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "g") {
            event.preventDefault();
            if (event.shiftKey) {
                ungroupSelected(engine);
            } else {
                groupSelected(engine);
            }
            return;
        }

        if (event.key === "Escape") {
            if (engine.selectionManager.getSelected().length > 0) {
                engine.selectionManager.clear();
            } else if (engine.toolManager.getActiveTool().name !== "select") {
                engine.toolManager.setActiveTool("select");
            }
        }
    });
}

const NUDGE_STEP = 1;
const NUDGE_KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

/** Setas do teclado movem a seleção (1px, ou um passo de grade com Shift). Um único snapshot de histórico por sequência de teclas seguradas, não um por keydown. */
function initNudgeShortcuts(engine) {
    const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
    let nudged = false;

    window.addEventListener("keydown", (event) => {
        if (EDITABLE_TAGS.has(event.target.tagName)) return;
        const delta = NUDGE_KEYS[event.key];
        if (!delta) return;

        const selected = engine.selectionManager.getSelected().filter((el) => !engine.scene.isElementLocked(el));
        if (selected.length === 0) return;
        event.preventDefault();

        const step = event.shiftKey ? BASE_GRID_SPACING : NUDGE_STEP;
        selected.forEach((el) => el.translate(delta[0] * step, delta[1] * step));
        engine.renderer.markDirty();
        nudged = true;
    });

    window.addEventListener("keyup", (event) => {
        if (!NUDGE_KEYS[event.key] || !nudged) return;
        nudged = false;
        engine.historyManager?.pushSnapshot();
    });
}

/** Ctrl/Cmd+C copia a seleção; Ctrl/Cmd+V cola (ver managers/clipboard.js — compartilhado com o menu de contexto). */
function initClipboardShortcuts(engine) {
    const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

    window.addEventListener("keydown", (event) => {
        if (EDITABLE_TAGS.has(event.target.tagName)) return;
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
        const key = event.key.toLowerCase();

        if (key === "c") {
            copySelection(engine.selectionManager);
            return;
        }
        if (key === "v") {
            event.preventDefault();
            pasteClipboard(engine);
        }
    });
}

/** Ctrl/Cmd+Alt+C copia o estilo (cor/traço/fonte/setas) do elemento selecionado; Ctrl/Cmd+Alt+V aplica em todos os selecionados. */
function initFormatPainterShortcuts(engine) {
    const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
    let copiedStyle = null;

    window.addEventListener("keydown", (event) => {
        if (EDITABLE_TAGS.has(event.target.tagName)) return;
        if (!(event.ctrlKey || event.metaKey) || !event.altKey) return;
        const key = event.key.toLowerCase();

        if (key === "c") {
            const [element] = engine.selectionManager.getSelected();
            if (!element) return;
            copiedStyle = extractStyle(element);
            return;
        }

        if (key === "v") {
            if (!copiedStyle) return;
            const selected = engine.selectionManager.getSelected();
            if (selected.length === 0) return;
            event.preventDefault();
            selected.forEach((el) => applyStyle(el, copiedStyle));
            engine.renderer.markDirty();
            engine.historyManager?.pushSnapshot();
        }
    });
}

/** Liga os botões Desfazer/Refazer da topbar (inertes desde a Etapa 2) e Ctrl+Z / Ctrl+Y (ou Ctrl+Shift+Z). */
function initHistoryControls({ eventBus, historyManager }) {
    const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
    const undoBtn = document.querySelector('[data-action="undo"]');
    const redoBtn = document.querySelector('[data-action="redo"]');

    undoBtn.addEventListener("click", () => historyManager.undo());
    redoBtn.addEventListener("click", () => historyManager.redo());

    const applyState = ({ canUndo, canRedo }) => {
        undoBtn.disabled = !canUndo;
        redoBtn.disabled = !canRedo;
    };
    eventBus.on("history:change", applyState);
    applyState(historyManager.getState());

    window.addEventListener("keydown", (event) => {
        if (EDITABLE_TAGS.has(event.target.tagName)) return;
        if (!(event.ctrlKey || event.metaKey)) return;
        if (event.key.toLowerCase() !== "z" && event.key.toLowerCase() !== "y") return;

        event.preventDefault();
        const isRedo = event.key.toLowerCase() === "y" || (event.key.toLowerCase() === "z" && event.shiftKey);
        isRedo ? historyManager.redo() : historyManager.undo();
    });
}

/** Duplicar/excluir rápidos na barra flutuante inferior — mesma lógica dos botões da aba Organizar, desabilitados sem seleção. */
function initBottomToolbarActions(engine) {
    const duplicateBtn = document.querySelector('[data-action="quick-duplicate"]');
    const deleteBtn = document.querySelector('[data-action="quick-delete"]');

    duplicateBtn.addEventListener("click", () => duplicateSelected(engine));
    deleteBtn.addEventListener("click", () => deleteSelected(engine));

    const syncEnabled = (selected) => {
        duplicateBtn.disabled = selected.length === 0;
        deleteBtn.disabled = selected.length === 0;
    };
    engine.eventBus.on("selection:change", syncEnabled);
    syncEnabled(engine.selectionManager.getSelected());
}

/** Ctrl+N novo, Ctrl+O abrir, Ctrl+S salvar — os cliques nos botões já cobrem o mesmo fluxo. */
function initFileShortcuts({ eventBus }) {
    const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

    window.addEventListener("keydown", (event) => {
        if (EDITABLE_TAGS.has(event.target.tagName)) return;
        if (!(event.ctrlKey || event.metaKey)) return;

        const key = event.key.toLowerCase();
        if (key === "n") {
            event.preventDefault();
            document.querySelector('[data-action="new"]').click();
        } else if (key === "o") {
            event.preventDefault();
            document.querySelector('[data-action="open"]').click();
        } else if (key === "s") {
            event.preventDefault();
            document.querySelector('[data-action="save"]').click();
        }
    });
}

function init() {
    applyIcons();

    const engine = initCanvasEngine();

    initTheme(() => engine.renderer.markDirty());
    initMainMenu();
    initExportActions(engine);
    initDropdownAutoClose();
    initPropertiesPanelToggle();
    initZoomControls(engine);
    initGridToggle(engine.renderer);
    initToolSelection(engine.toolManager);
    initElementCreation(engine);
    initTextEditing(engine);
    initObjectShortcuts(engine);
    initNudgeShortcuts(engine);
    initClipboardShortcuts(engine);
    initFormatPainterShortcuts(engine);
    initFileShortcuts(engine);
    initHistoryControls(engine);
    initBottomToolbarActions(engine);
    new PropertiesPanel(engine);
    new FileMenu(engine);
    new LibraryPanel(engine);
    new LayersPanel(engine);
    new PagesBar(engine);
    new Minimap(engine);
    new ContextMenu(engine);
    new ShortcutsModal();

    // Hook de depuração (console do browser): inspecionar scene/camera/renderer em runtime.
    window.__odindraw = engine;
}

document.addEventListener("DOMContentLoaded", init);
