/**
 * Estado global do estilo "desenho à mão" (sketch, estilo rough.js/
 * Excalidraw): um toggle (menu principal) que troca o traço preciso de
 * sempre por um "tremido" — várias passadas com pequenas curvas/
 * deslocamentos aleatórios em vez de uma linha reta perfeita — e um
 * nível de capricho (sloppiness), igual o Excalidraw:
 *  - architect: quase reto, só uma leve imperfeição.
 *  - artist: o padrão, tremido moderado (era o único nível antes).
 *  - cartoonist: bem rabiscado, várias passadas bem deslocadas.
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
export const sketchState = { enabled: false, level: "artist" };

const LEVELS = {
    architect: { jitter: 0.6, passes: 1 },
    artist: { jitter: 1.4, passes: 2 },
    cartoonist: { jitter: 2.6, passes: 3 },
};

function currentLevel() {
    return LEVELS[sketchState.level] ?? LEVELS.artist;
}

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

/** Traço "à mão" entre dois pontos: N passadas (conforme o nível) levemente deslocadas/curvas em vez de uma reta perfeita. */
export function sketchyLine(ctx, x1, y1, x2, y2, seed = 1) {
    const { jitter, passes } = currentLevel();
    const rand = seededRandom(seed);
    for (let pass = 0; pass < passes; pass++) {
        const midX = (x1 + x2) / 2 + (rand() - 0.5) * jitter * 3;
        const midY = (y1 + y2) / 2 + (rand() - 0.5) * jitter * 3;
        ctx.beginPath();
        ctx.moveTo(x1 + (rand() - 0.5) * jitter, y1 + (rand() - 0.5) * jitter);
        ctx.quadraticCurveTo(midX, midY, x2 + (rand() - 0.5) * jitter, y2 + (rand() - 0.5) * jitter);
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
    const { jitter } = currentLevel();
    const rand = seededRandom(seed);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    const steps = 28;

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const j = (rand() - 0.5) * jitter * 1.5;
        const px = cx + Math.cos(t) * (rx + j);
        const py = cy + Math.sin(t) * (ry + j);
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
