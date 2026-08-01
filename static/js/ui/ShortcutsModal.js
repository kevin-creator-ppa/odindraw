const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

const SHORTCUTS = [
    ["Selecionar", "V"],
    ["Mão / pan", "H"],
    ["Retângulo", "R"],
    ["Elipse", "O"],
    ["Losango", "D"],
    ["Linha", "L"],
    ["Seta", "A"],
    ["Texto", "T"],
    ["Desenho livre", "P"],
    ["Borracha", "E"],
    ["Limpar seleção / voltar a selecionar", "Esc"],
    ["Selecionar tudo", "Ctrl+A"],
    ["Duplicar", "Ctrl+D"],
    ["Excluir", "Del"],
    ["Copiar / colar", "Ctrl+C / Ctrl+V"],
    ["Copiar / colar estilo", "Ctrl+Alt+C / Ctrl+Alt+V"],
    ["Agrupar / desagrupar", "Ctrl+G / Ctrl+Shift+G"],
    ["Mover 1px (Shift = grade)", "Setas"],
    ["Desfazer / refazer", "Ctrl+Z / Ctrl+Y"],
    ["Salvar / abrir / novo", "Ctrl+S / Ctrl+O / Ctrl+N"],
    ["Pan pela tela", "Espaço + arrastar"],
    ["Zoom", "Ctrl + scroll"],
    ["Editar texto / rótulo", "Duplo clique"],
    ["Menu de contexto", "Botão direito"],
    ["Esta ajuda", "?"],
];

/** Painel de referência de atalhos — tecla "?" (ou o botão de ajuda na topbar) abre, Escape/backdrop/botão fecha. */
export class ShortcutsModal {
    constructor() {
        this.modal = document.querySelector("[data-shortcuts-modal]");
        this._render();

        document.querySelector("[data-shortcuts-backdrop]").addEventListener("click", () => this.close());
        document.querySelector('[data-action="close-shortcuts"]').addEventListener("click", () => this.close());
        document.querySelector('[data-action="show-shortcuts"]').addEventListener("click", () => this.open());

        window.addEventListener("keydown", (event) => {
            if (EDITABLE_TAGS.has(event.target.tagName)) return;
            if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
                event.preventDefault();
                this.open();
            } else if (event.key === "Escape" && !this.modal.hidden) {
                this.close();
            }
        });
    }

    _render() {
        const body = document.querySelector("[data-shortcuts-body]");
        body.innerHTML = SHORTCUTS.map(
            ([label, keys]) => `<div class="shortcut-row"><span>${label}</span><kbd>${keys}</kbd></div>`
        ).join("");
    }

    open() {
        this.modal.hidden = false;
    }

    close() {
        this.modal.hidden = true;
    }
}
