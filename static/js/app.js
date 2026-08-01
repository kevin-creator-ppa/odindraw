/**
 * Bootstrap da aplicação.
 *
 * Nesta etapa (2 — estrutura inicial do Flask) só existe o "chrome" da UI:
 * tema claro/escuro e o menu de exportação. Ferramentas, canvas e demais
 * módulos (core/, elements/, tools/, managers/, ui/, io/) entram nas
 * próximas etapas.
 */

const THEME_STORAGE_KEY = "odindraw:theme";

function initTheme() {
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

function init() {
    initTheme();
    initExportMenu();
}

document.addEventListener("DOMContentLoaded", init);
