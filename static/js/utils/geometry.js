/** Utilitários geométricos compartilhados. */

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/** Módulo sempre positivo (diferente do operador `%` do JS para números negativos). */
export function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
}

/** Menor distância entre `point` e o segmento de reta a-b (todos em coordenadas de mundo). */
export function distanceToSegment(point, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);

    const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq, 0, 1);
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return Math.hypot(point.x - projX, point.y - projY);
}
