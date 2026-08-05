/**
 * Pulo de linha (estilo draw.io): quando duas linhas/conectores se
 * cruzam, a de zIndex menor (desenhada primeiro, "por baixo") ganha um
 * pequeno arco no ponto de cruzamento, pra ficar visualmente claro
 * quem passa por cima de quem. Puramente cosmético — não muda
 * containsPoint()/hit-test, só o traçado do render().
 *
 * Aproxima rota "curva" sem waypoint pela reta entre os pontos, só
 * pra fins de cálculo de cruzamento (mesma simplificação já usada em
 * routeContainsPoint) — o arco em si nunca é desenhado numa curva de
 * verdade, só em trechos retos/ortogonais/com waypoints.
 */

export const lineJumpsState = { enabled: true };

const JUMP_RADIUS = 6;

/** Pontos (mundo) da rota completa de um elemento tipo linha, pra fins de cruzamento. */
function routePoints(element) {
    const start = element.type === "connector" ? element._resolvedStart : { x: element.x1, y: element.y1 };
    const end = element.type === "connector" ? element._resolvedEnd : { x: element.x2, y: element.y2 };
    if (!start || !end) return [];
    if (element.waypoints.length > 0) return [start, ...element.waypoints, end];
    if (element.routeType === "orthogonal") return [start, { x: end.x, y: start.y }, end];
    return [start, end];
}

/** Ponto de interseção entre os segmentos p1-p2 e p3-p4 (mundo), ou null se não se cruzarem dentro dos dois. */
function segmentIntersection(p1, p2, p3, p4) {
    const d1x = p2.x - p1.x;
    const d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x;
    const d2y = p4.y - p3.y;
    const denom = d1x * d2y - d1y * d2x;
    if (Math.abs(denom) < 1e-9) return null;

    const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
    const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
    if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) return null;
    return { x: p1.x + t * d1x, y: p1.y + t * d1y };
}

/**
 * Pra cada par de elementos em `lines`, acha os cruzamentos e associa
 * cada um à linha de zIndex menor (a "de baixo"), guardando também o
 * índice do segmento em que caiu — usado por drawSegmentWithJumps pra
 * saber exatamente onde inserir o arco.
 *
 * Retorna um Map: elemento → array de { x, y, segmentIndex }.
 */
export function computeLineJumps(lines) {
    const jumpsByElement = new Map();
    const pointsCache = new Map();
    const getPoints = (el) => {
        if (!pointsCache.has(el)) pointsCache.set(el, routePoints(el));
        return pointsCache.get(el);
    };

    for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
            const a = lines[i];
            const b = lines[j];
            if (a.zIndex === b.zIndex) continue;
            const under = a.zIndex < b.zIndex ? a : b;
            const pointsA = getPoints(a);
            const pointsB = getPoints(b);

            for (let si = 0; si < pointsA.length - 1; si++) {
                for (let sj = 0; sj < pointsB.length - 1; sj++) {
                    const hit = segmentIntersection(pointsA[si], pointsA[si + 1], pointsB[sj], pointsB[sj + 1]);
                    if (!hit) continue;
                    const segmentIndex = under === a ? si : sj;
                    if (!jumpsByElement.has(under)) jumpsByElement.set(under, []);
                    jumpsByElement.get(under).push({ ...hit, segmentIndex });
                }
            }
        }
    }
    return jumpsByElement;
}

/** Desenha o segmento p1→p2 (já em coordenadas de tela) como `ctx.lineTo`, saltando por cima de cada jump com um arco pequeno. `jumps` já filtrados pra este segmento específico. */
export function lineToWithJumps(ctx, p1, p2, jumps) {
    if (jumps.length === 0) {
        ctx.lineTo(p2.x, p2.y);
        return;
    }

    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (segLen < 1e-6) {
        ctx.lineTo(p2.x, p2.y);
        return;
    }

    const dx = (p2.x - p1.x) / segLen;
    const dy = (p2.y - p1.y) / segLen;
    const sorted = jumps
        .map((j) => ({ ...j, dist: (j.x - p1.x) * dx + (j.y - p1.y) * dy }))
        .filter((j) => j.dist > JUMP_RADIUS && j.dist < segLen - JUMP_RADIUS)
        .sort((a, b) => a.dist - b.dist);

    sorted.forEach((jump) => {
        const beforeDist = jump.dist - JUMP_RADIUS;
        const afterDist = jump.dist + JUMP_RADIUS;
        const beforePt = { x: p1.x + dx * beforeDist, y: p1.y + dy * beforeDist };
        const afterPt = { x: p1.x + dx * afterDist, y: p1.y + dy * afterDist };
        const nx = -dy;
        const ny = dx;
        const arcPeak = { x: jump.x + nx * JUMP_RADIUS, y: jump.y + ny * JUMP_RADIUS };

        ctx.lineTo(beforePt.x, beforePt.y);
        ctx.quadraticCurveTo(arcPeak.x, arcPeak.y, afterPt.x, afterPt.y);
    });
    ctx.lineTo(p2.x, p2.y);
}
