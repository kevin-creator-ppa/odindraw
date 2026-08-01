const SHORTCUT_TO_TOOL = {
    v: "select",
    h: "pan",
    r: "rectangle",
    o: "ellipse",
    l: "line",
    a: "arrow",
    t: "text",
    p: "freehand",
    e: "eraser",
};

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Dono da ferramenta ativa. Registra as instâncias de Tool, decide qual
 * está ativa, encaminha eventos de ponteiro/teclado para ela e mantém o
 * cursor do canvas coerente com a ferramenta selecionada.
 */
export class ToolManager {
    constructor({ canvasArea, camera, scene, eventBus, renderer, selectionManager, historyManager, tools }) {
        this.canvasArea = canvasArea;
        this.eventBus = eventBus;
        this._context = { camera, scene, eventBus, renderer, selectionManager, historyManager };
        this._tools = new Map(tools.map((tool) => [tool.name, tool]));
        this._activeTool = null;

        window.addEventListener("keydown", (event) => this._onKeyDown(event));

        this.setActiveTool("select");
    }

    getActiveTool() {
        return this._activeTool;
    }

    setActiveTool(name) {
        const tool = this._tools.get(name);
        if (!tool || tool === this._activeTool) return;

        this._activeTool?.onDeactivate(this._context);
        this._activeTool = tool;
        this._activeTool.onActivate(this._context);
        this.canvasArea.style.cursor = tool.cursor;

        this.eventBus.emit("tool:change", { name: tool.name });
    }

    handlePointerDown(point, event) {
        this._activeTool?.onPointerDown(this._context, point, event);
    }

    handlePointerMove(point, event) {
        this._activeTool?.onPointerMove(this._context, point, event);
    }

    handlePointerUp(point, event) {
        this._activeTool?.onPointerUp(this._context, point, event);
    }

    _onKeyDown(event) {
        if (EDITABLE_TAGS.has(event.target.tagName)) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;

        const toolName = SHORTCUT_TO_TOOL[event.key.toLowerCase()];
        if (toolName) this.setActiveTool(toolName);
    }
}
