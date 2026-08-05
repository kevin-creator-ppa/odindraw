/**
 * Estado global do estilo "desenho à mão" (sketch, estilo rough.js/
 * Excalidraw): um toggle único (menu principal) que troca o traço
 * preciso de sempre por um levemente "tremido" — duas passadas com
 * pequenas curvas/deslocamentos aleatórios em vez de uma linha reta
 * perfeita.
 *
 * Cobre as formas mais comuns (retângulo, elipse, losango, triângulo,
 * linha/seta reta) — hexágono, cilindro, nuvem, tabela, ícones da
 * biblioteca e rotas ortogonais/curvas/com waypoints continuam com o
 * traço preciso: portar cada uma pra sketch exigiria bem mais código
 * pra um ganho cosmético que não afeta a maioria dos diagramas
 * técnicos (rede/fluxograma).
 *
 * É puramente visual — containsPoint()/geometria de seleção nunca leem
 * `sketchState`, só o render().
 */
export const sketchState = { enabled: false };

/** Hash simples e determinístico do id do elemento — a mesma forma sempre tem a mesma "mão trêmula" entre re-renders (senão pareceria animado). */
export function seedFromId(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) || 1;
}

function seededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

const JITTER = 1.4;

/** Traço "à mão" entre dois pontos: duas passadas levemente deslocadas/curvas em vez de uma reta perfeita. */
export function sketchyLine(ctx, x1, y1, x2, y2, seed = 1) {
    const rand = seededRandom(seed);
    for (let pass = 0; pass < 2; pass++) {
        const midX = (x1 + x2) / 2 + (rand() - 0.5) * JITTER * 3;
        const midY = (y1 + y2) / 2 + (rand() - 0.5) * JITTER * 3;
        ctx.beginPath();
        ctx.moveTo(x1 + (rand() - 0.5) * JITTER, y1 + (rand() - 0.5) * JITTER);
        ctx.quadraticCurveTo(midX, midY, x2 + (rand() - 0.5) * JITTER, y2 + (rand() - 0.5) * JITTER);
        ctx.stroke();
    }
}

/** Retângulo "à mão": 4 lados como sketchyLine, com uma pequena folga nos cantos (efeito clássico de traço manual que não fecha perfeitinho). */
export function sketchyRect(ctx, x, y, w, h, seed = 1) {
    const o = 2.5;
    sketchyLine(ctx, x - o * 0.4, y, x + w, y, seed + 1);
    sketchyLine(ctx, x + w, y - o * 0.4, x + w, y + h, seed + 2);
    sketchyLine(ctx, x + w + o * 0.4, y + h, x, y + h, seed + 3);
    sketchyLine(ctx, x, y + h + o * 0.4, x, y, seed + 4);
}

/** Elipse "à mão": aproxima por segmentos curtos com leve variação de raio ponto a ponto. */
export function sketchyEllipse(ctx, x, y, w, h, seed = 1) {
    const rand = seededRandom(seed);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    const steps = 28;

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const jitter = (rand() - 0.5) * JITTER * 1.5;
        const px = cx + Math.cos(t) * (rx + jitter);
        const py = cy + Math.sin(t) * (ry + jitter);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
}

/** Polígono "à mão" (losango/triângulo...): cada lado vira um sketchyLine. */
export function sketchyPolygon(ctx, points, seed = 1) {
    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        sketchyLine(ctx, a.x, a.y, b.x, b.y, seed + i * 5);
    }
}
