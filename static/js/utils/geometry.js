/** Utilitários geométricos compartilhados. */

export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/** Módulo sempre positivo (diferente do operador `%` do JS para números negativos). */
export function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
}
