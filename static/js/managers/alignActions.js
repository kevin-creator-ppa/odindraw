/** Alinhar/distribuir seleção (estilo draw.io) — opera nos bounding boxes via translate(), então funciona igual pra qualquer tipo de Element (forma, linha, tabela...). */

function bounds(el) {
    return el.getBounds();
}

/** Bounding box (mundo) que envolve toda a seleção — referência pra onde cada alinhamento leva os elementos. */
function unionBounds(elements) {
    const boxes = elements.map(bounds);
    return {
        x: Math.min(...boxes.map((b) => b.x)),
        y: Math.min(...boxes.map((b) => b.y)),
        right: Math.max(...boxes.map((b) => b.x + b.width)),
        bottom: Math.max(...boxes.map((b) => b.y + b.height)),
    };
}

export function alignLeft(elements) {
    if (elements.length < 2) return;
    const u = unionBounds(elements);
    elements.forEach((el) => el.translate(u.x - bounds(el).x, 0));
}

export function alignRight(elements) {
    if (elements.length < 2) return;
    const u = unionBounds(elements);
    elements.forEach((el) => {
        const b = bounds(el);
        el.translate(u.right - (b.x + b.width), 0);
    });
}

export function alignCenterH(elements) {
    if (elements.length < 2) return;
    const u = unionBounds(elements);
    const centerX = (u.x + u.right) / 2;
    elements.forEach((el) => {
        const b = bounds(el);
        el.translate(centerX - (b.x + b.width / 2), 0);
    });
}

export function alignTop(elements) {
    if (elements.length < 2) return;
    const u = unionBounds(elements);
    elements.forEach((el) => el.translate(0, u.y - bounds(el).y));
}

export function alignBottom(elements) {
    if (elements.length < 2) return;
    const u = unionBounds(elements);
    elements.forEach((el) => {
        const b = bounds(el);
        el.translate(0, u.bottom - (b.y + b.height));
    });
}

export function alignMiddleV(elements) {
    if (elements.length < 2) return;
    const u = unionBounds(elements);
    const centerY = (u.y + u.bottom) / 2;
    elements.forEach((el) => {
        const b = bounds(el);
        el.translate(0, centerY - (b.y + b.height / 2));
    });
}

/** Espaça uniformemente (bordas com gaps iguais) entre o mais à esquerda e o mais à direita; estes dois não se movem. */
export function distributeHorizontal(elements) {
    if (elements.length < 3) return;
    const sorted = [...elements].sort((a, b) => bounds(a).x - bounds(b).x);
    const first = bounds(sorted[0]);
    const last = bounds(sorted[sorted.length - 1]);
    const totalWidth = sorted.reduce((sum, el) => sum + bounds(el).width, 0);
    const gap = (last.x + last.width - first.x - totalWidth) / (sorted.length - 1);

    let cursor = first.x;
    sorted.forEach((el) => {
        const b = bounds(el);
        el.translate(cursor - b.x, 0);
        cursor += b.width + gap;
    });
}

export function distributeVertical(elements) {
    if (elements.length < 3) return;
    const sorted = [...elements].sort((a, b) => bounds(a).y - bounds(b).y);
    const first = bounds(sorted[0]);
    const last = bounds(sorted[sorted.length - 1]);
    const totalHeight = sorted.reduce((sum, el) => sum + bounds(el).height, 0);
    const gap = (last.y + last.height - first.y - totalHeight) / (sorted.length - 1);

    let cursor = first.y;
    sorted.forEach((el) => {
        const b = bounds(el);
        el.translate(cursor - b.y, 0);
        cursor += b.height + gap;
    });
}
