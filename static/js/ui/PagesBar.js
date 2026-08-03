import { applyIcons } from "./icons.js";

/**
 * Barra de páginas na base do canvas (estilo abas de planilha / draw.io):
 * clicar troca de página, duplo clique no nome renomeia, "+" adiciona
 * uma página em branco. O "x" de excluir só aparece quando há mais de
 * uma página (a última não pode ser removida).
 */
export class PagesBar {
    constructor({ pageManager, historyManager, eventBus }) {
        this.pageManager = pageManager;
        this.historyManager = historyManager;
        this.tabsEl = document.querySelector("[data-pages-tabs]");

        document.querySelector('[data-action="add-page"]').addEventListener("click", () => {
            this.pageManager.addPage();
            this._commit();
        });

        eventBus.on("pages:change", () => this._render());
        this._render();
    }

    _commit() {
        this.historyManager?.pushSnapshot();
    }

    _render() {
        this.tabsEl.innerHTML = "";
        this.pageManager.pages.forEach((page) => this.tabsEl.appendChild(this._buildTab(page)));
        applyIcons(this.tabsEl);
    }

    _buildTab(page) {
        const tab = document.createElement("div");
        tab.className = "pages-bar__tab";
        tab.classList.toggle("pages-bar__tab--active", page.id === this.pageManager.activePageId);
        tab.addEventListener("click", () => this.pageManager.switchTo(page.id));

        const name = document.createElement("span");
        name.className = "pages-bar__tab-name";
        name.textContent = page.name;
        name.title = "Duplo clique para renomear";
        name.addEventListener("dblclick", (event) => {
            event.stopPropagation();
            const next = window.prompt("Nome da página:", page.name);
            if (!next) return;
            this.pageManager.renamePage(page.id, next);
            this._commit();
        });
        tab.appendChild(name);

        if (this.pageManager.pages.length > 1) {
            const closeBtn = document.createElement("button");
            closeBtn.type = "button";
            closeBtn.className = "pages-bar__tab-close";
            closeBtn.dataset.icon = "close";
            closeBtn.title = "Excluir página";
            closeBtn.addEventListener("click", (event) => {
                event.stopPropagation();
                if (!window.confirm(`Excluir "${page.name}" e todo o seu conteúdo?`)) return;
                this.pageManager.removePage(page.id);
                this._commit();
            });
            tab.appendChild(closeBtn);
        }

        return tab;
    }
}
