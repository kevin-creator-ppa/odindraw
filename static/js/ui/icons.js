/**
 * Ícones vetoriais da interface (24x24, `stroke="currentColor"`) — substituem
 * os glifos Unicode usados até a Etapa 10, que renderizavam de forma
 * inconsistente/"pixelada" dependendo da fonte do sistema. `currentColor`
 * significa que herdam a cor do texto do botão automaticamente (funciona
 * nos dois temas sem variante extra).
 *
 * Uso: `<button data-icon="save">` — applyIcons() injeta o SVG no load.
 */
const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

function svg(inner, { filled = false } = {}) {
    const attrs = filled ? 'fill="currentColor" stroke="none"' : STROKE;
    return `<svg viewBox="0 0 24 24" ${attrs} xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

export const ICONS = {
    // Ferramentas
    select: svg('<path d="M5 3l4 17 2-7 7-2z"/>', { filled: true }),
    pan: svg(
        '<path d="M12 2L9 5M12 2l3 3M12 2v7M12 22l-3-3M12 22l3-3M12 22v-7M2 12l3-3M2 12l3 3M2 12h7M22 12l-3-3M22 12l3 3M22 12h-7"/>'
    ),
    rectangle: svg('<rect x="4" y="6" width="16" height="12" rx="1.5"/>'),
    square: svg('<rect x="6" y="6" width="12" height="12" rx="1.5"/>'),
    circle: svg('<circle cx="12" cy="12" r="8"/>'),
    ellipse: svg('<ellipse cx="12" cy="12" rx="9" ry="6"/>'),
    line: svg('<line x1="5" y1="19" x2="19" y2="5"/>'),
    arrow: svg('<path d="M4 20L20 4M20 4h-7M20 4v7"/>'),
    "orthogonal-line": svg('<path d="M5 19h7V5h7"/>'),
    text: svg('<path d="M5 6h14M12 6v13M9 19h6"/>'),
    freehand: svg('<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/><path d="M14 7l3 3"/>'),
    eraser: svg('<path d="M15 3l6 6-9.5 9.5H6L3 15z"/><path d="M8.5 20.5H21"/><path d="M9 9l6 6"/>'),

    // Topbar / menu
    menu: svg('<path d="M3 6h18M3 12h18M3 18h18"/>'),
    "file-plus": svg('<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M13 3v6h6"/><path d="M12 12v6M9 15h6"/>'),
    "folder-open": svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v1H6a2 2 0 0 0-2 1.8L3 18V7z"/><path d="M3.5 11h16l-2 8H5.5z"/>'),
    save: svg('<path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h8V3"/><path d="M7 13h10v7H7z"/>'),
    image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M4 17l5-5 3 3 4-4 4 4"/>'),
    "file-text": svg('<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M13 3v6h6"/><path d="M8 13h8M8 17h5"/>'),
    undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    redo: svg('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>'),
    "zoom-in": svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M10.5 8v5M8 10.5h5"/><path d="M21 21l-4.35-4.35"/>'),
    "zoom-out": svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M8 10.5h5"/><path d="M21 21l-4.35-4.35"/>'),
    "zoom-fit": svg('<path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"/>'),
    grid: svg('<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'),
    sun: svg(
        '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8"/>'
    ),
    moon: svg('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>'),
    library: svg('<rect x="3" y="3" width="8" height="8" rx="1.5"/><circle cx="16.5" cy="7" r="4"/><path d="M4 21l5-9 5 9z"/>'),
    "panel-right": svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>'),
    close: svg('<path d="M5 5l14 14M19 5L5 19"/>'),
    search: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M21 21l-4.35-4.35"/>'),

    // Painel de propriedades
    "layer-back": svg('<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M12 7v6M9 10l3 3 3-3"/><path d="M8 17h8"/>'),
    "layer-backward": svg('<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M12 9v6M9 12l3 3 3-3"/>'),
    "layer-forward": svg('<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M12 15V9M9 12l3-3 3 3"/>'),
    "layer-front": svg('<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M12 17v-6M9 14l3-3 3 3"/><path d="M8 7h8"/>'),
    duplicate: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
    trash: svg(
        '<path d="M4 7h16"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/><path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18 7"/><path d="M10 11v6M14 11v6"/>'
    ),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="1.8"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    unlock: svg('<rect x="5" y="11" width="14" height="9" rx="1.8"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>'),
    eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'),
    "eye-off": svg(
        '<path d="M3 3l18 18"/><path d="M10.6 5.2A10.6 10.6 0 0 1 22 12s-1 2-3 3.8M6.6 6.6C4 8.3 2 12 2 12s3.5 7 10 7c1.5 0 2.8-.3 4-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'
    ),
    "dash-motion": svg('<path d="M3 12h3M10 12h3M17 12h3"/>'),
};

/** Injeta o SVG correspondente em todo elemento `[data-icon]` da página. */
export function applyIcons(root = document) {
    root.querySelectorAll("[data-icon]").forEach((el) => {
        const icon = ICONS[el.dataset.icon];
        if (icon) el.innerHTML = icon;
    });
}
