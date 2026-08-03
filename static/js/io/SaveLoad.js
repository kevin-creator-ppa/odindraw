import { elementFromJSON } from "../elements/elementFactory.js";

/**
 * Serializa a Scene/Camera para o formato JSON persistido pelo backend
 * (routes/diagrams.py) e reconstrói o estado ao carregar. Conectores
 * (type: "connector") são separados em `connections` na exportação —
 * na memória eles continuam vivendo junto dos outros em scene.objects.
 */
export class SaveLoad {
    constructor({ scene, camera, renderer, eventBus }) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.eventBus = eventBus;
        this.currentId = null;
        this.diagramName = "Sem título";
    }

    serialize(name) {
        const objects = this.scene.objects.filter((el) => el.type !== "connector").map((el) => el.serialize());
        const connections = this.scene.objects.filter((el) => el.type === "connector").map((el) => el.serialize());

        return {
            version: "1.0",
            metadata: { name: name ?? this.diagramName },
            canvas: {
                zoom: this.camera.zoom,
                offset_x: this.camera.offsetX,
                offset_y: this.camera.offsetY,
                grid_enabled: this.renderer.gridEnabled,
            },
            layers: this.scene.layers.map((l) => ({ ...l })),
            active_layer_id: this.scene.activeLayerId,
            objects,
            connections,
        };
    }

    async save(name) {
        const payload = this.serialize(name);
        const url = this.currentId ? `/api/diagrams/${this.currentId}` : "/api/diagrams";
        const method = this.currentId ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Falha ao salvar o diagrama.");

        const saved = await response.json();
        this.currentId = saved.id;
        this.diagramName = saved.metadata?.name ?? this.diagramName;
        return saved;
    }

    async loadList() {
        const response = await fetch("/api/diagrams");
        if (!response.ok) throw new Error("Falha ao listar diagramas.");
        return response.json();
    }

    async load(id) {
        const response = await fetch(`/api/diagrams/${id}`);
        if (!response.ok) throw new Error("Falha ao carregar o diagrama.");
        const data = await response.json();
        this._applyData(data);
        this.currentId = id;
    }

    newDiagram() {
        this.scene.clear();
        this.camera.reset();
        this.currentId = null;
        this.diagramName = "Sem título";
        this._refresh();
    }

    _applyData(data) {
        this.scene.clear();
        if (Array.isArray(data.layers) && data.layers.length > 0) {
            this.scene.layers = data.layers.map((l) => ({ ...l }));
            this.scene.activeLayerId = this.scene.layers.some((l) => l.id === data.active_layer_id)
                ? data.active_layer_id
                : this.scene.layers[0].id;
        }
        [...(data.objects ?? []), ...(data.connections ?? [])].forEach((raw) => {
            const element = elementFromJSON(raw);
            if (element) this.scene.restoreObject(element);
        });

        this.camera.zoom = data.canvas?.zoom ?? 1;
        this.camera.offsetX = data.canvas?.offset_x ?? 0;
        this.camera.offsetY = data.canvas?.offset_y ?? 0;
        this.renderer.setGridEnabled(data.canvas?.grid_enabled ?? true);
        this.diagramName = data.metadata?.name ?? "Sem título";

        this._refresh();
    }

    _refresh() {
        this.renderer.markDirty();
        this.eventBus.emit("camera:change");
        this.eventBus.emit("selection:change", []);
        this.eventBus.emit("diagram:change", { name: this.diagramName });
        this.eventBus.emit("layers:change");
    }
}
