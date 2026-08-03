/**
 * Serializa o documento (todas as páginas do PageManager) para o
 * formato JSON persistido pelo backend (routes/diagrams.py) e
 * reconstrói o estado ao carregar. Diagramas salvos antes das páginas
 * (versão 1.0, uma cena só no topo do JSON) continuam abrindo
 * normalmente — viram um documento de página única.
 */
export class SaveLoad {
    constructor({ scene, pageManager, eventBus }) {
        this.scene = scene;
        this.pageManager = pageManager;
        this.eventBus = eventBus;
        this.currentId = null;
        this.diagramName = "Sem título";
    }

    serialize(name) {
        this.pageManager.captureActivePage();
        return {
            version: "1.1",
            metadata: { name: name ?? this.diagramName },
            pages: this.pageManager.pages.map((p) => ({ id: p.id, name: p.name, ...p.data })),
            active_page_id: this.pageManager.activePageId,
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
        this.pageManager.reset();
        this.currentId = null;
        this.diagramName = "Sem título";
        this._refresh();
    }

    _applyData(data) {
        if (Array.isArray(data.pages) && data.pages.length > 0) {
            this.pageManager.loadPages(data.pages, data.active_page_id);
        } else {
            // Diagrama salvo antes das páginas (versão 1.0): vira um documento de página única.
            this.pageManager.loadPages(
                [
                    {
                        id: "page_1",
                        name: "Página 1",
                        canvas: data.canvas,
                        layers: data.layers,
                        active_layer_id: data.active_layer_id,
                        objects: data.objects,
                        connections: data.connections,
                    },
                ],
                "page_1"
            );
        }
        this.diagramName = data.metadata?.name ?? "Sem título";
        this._refresh();
    }

    _refresh() {
        this.eventBus.emit("diagram:change", { name: this.diagramName });
    }
}
