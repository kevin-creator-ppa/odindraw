import { DIAGRAM_TEMPLATES } from "../io/diagramTemplates.js";

/**
 * Liga os botões Novo/Abrir/Salvar da topbar ao SaveLoad: monta o
 * dropdown "Abrir" sob demanda (busca a lista no backend a cada clique),
 * o dropdown "Novo a partir de um modelo" (fluxograma/organograma/mapa
 * mental prontos, ver io/diagramTemplates.js) e mostra o nome do
 * diagrama atual.
 */
export class FileMenu {
    constructor({ saveLoad, eventBus, scene, renderer, historyManager }) {
        this.saveLoad = saveLoad;
        this.scene = scene;
        this.renderer = renderer;
        this.historyManager = historyManager;
        this.nameEl = document.querySelector("[data-diagram-name]");
        this.openDropdown = document.querySelector('[data-dropdown="open-diagram"]');
        this.openMenu = document.querySelector("[data-open-diagram-menu]");
        this.templateDropdown = document.querySelector('[data-dropdown="new-from-template"]');
        this.templateMenu = document.querySelector("[data-template-menu]");

        document.querySelector('[data-action="new"]').addEventListener("click", () => this._new());
        document.querySelector('[data-action="save"]').addEventListener("click", () => this._save());
        document.querySelector('[data-action="open"]').addEventListener("click", (event) => this._toggleOpenMenu(event));
        document
            .querySelector('[data-action="toggle-template-menu"]')
            .addEventListener("click", (event) => this._toggleTemplateMenu(event));

        eventBus.on("diagram:change", ({ name }) => this._setName(name));
        this._setName(saveLoad.diagramName);
    }

    /** Considera tanto a página ativa (cena em memória) quanto as demais páginas já capturadas. */
    _hasContent() {
        const { scene, pageManager } = this.saveLoad;
        if (scene.objects.length > 0) return true;
        return pageManager.pages.some(
            (page) => (page.data?.objects?.length ?? 0) > 0 || (page.data?.connections?.length ?? 0) > 0
        );
    }

    async _new() {
        if (this._hasContent()) {
            const confirmed = window.confirm("Descartar o diagrama atual e começar um novo?");
            if (!confirmed) return;
        }
        this.saveLoad.newDiagram();
    }

    async _save() {
        const name = this.saveLoad.currentId ? undefined : window.prompt("Nome do diagrama:", "Meu diagrama");
        if (name === null) return; // cancelado

        this._flash("Salvando…");
        try {
            await this.saveLoad.save(name ?? undefined);
            this._flash("Salvo!");
        } catch (error) {
            this._flash("Erro ao salvar");
            console.error(error);
        }
    }

    _toggleTemplateMenu(event) {
        event.stopPropagation();
        const willOpen = !this.templateDropdown.classList.contains("dropdown--open");
        this.templateDropdown.classList.toggle("dropdown--open", willOpen);
        if (!willOpen) return;

        this.templateMenu.innerHTML = "";
        DIAGRAM_TEMPLATES.forEach((template) => {
            const item = document.createElement("button");
            item.className = "dropdown__item";
            item.textContent = template.label;
            item.addEventListener("click", () => this._newFromTemplate(template));
            this.templateMenu.appendChild(item);
        });
    }

    _newFromTemplate(template) {
        this.templateDropdown.classList.remove("dropdown--open");
        if (this._hasContent()) {
            const confirmed = window.confirm("Descartar o diagrama atual e começar a partir deste modelo?");
            if (!confirmed) return;
        }
        this.saveLoad.newDiagram();
        template.build().forEach((element) => this.scene.addObject(element));
        this.renderer.markDirty();
        this.historyManager?.pushSnapshot();
    }

    async _toggleOpenMenu(event) {
        event.stopPropagation();
        const willOpen = !this.openDropdown.classList.contains("dropdown--open");
        this.openDropdown.classList.toggle("dropdown--open", willOpen);
        if (!willOpen) return;

        this.openMenu.innerHTML = '<p class="dropdown__empty">Carregando…</p>';
        try {
            const diagrams = await this.saveLoad.loadList();
            this._renderList(diagrams);
        } catch (error) {
            this.openMenu.innerHTML = '<p class="dropdown__empty">Erro ao listar diagramas</p>';
            console.error(error);
        }
    }

    _renderList(diagrams) {
        if (diagrams.length === 0) {
            this.openMenu.innerHTML = '<p class="dropdown__empty">Nenhum diagrama salvo</p>';
            return;
        }

        this.openMenu.innerHTML = "";
        diagrams.forEach((diagram) => {
            const item = document.createElement("button");
            item.className = "dropdown__item dropdown__item--diagram";

            const nameSpan = document.createElement("span");
            nameSpan.textContent = diagram.name;
            const dateSpan = document.createElement("span");
            dateSpan.className = "dropdown__item-date";
            dateSpan.textContent = this._formatDate(diagram.updated_at);

            item.append(nameSpan, dateSpan);
            item.addEventListener("click", () => this._open(diagram.id));
            this.openMenu.appendChild(item);
        });
    }

    async _open(id) {
        this.openDropdown.classList.remove("dropdown--open");
        try {
            await this.saveLoad.load(id);
        } catch (error) {
            window.alert("Não foi possível abrir esse diagrama.");
            console.error(error);
        }
    }

    _formatDate(isoString) {
        if (!isoString) return "";
        return new Date(isoString).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    }

    _setName(name) {
        this.nameEl.textContent = name;
    }

    _flash(text) {
        const previous = this.saveLoad.diagramName;
        this.nameEl.textContent = text;
        setTimeout(() => {
            this.nameEl.textContent = this.saveLoad.diagramName ?? previous;
        }, 1200);
    }
}
