/**
 * Preenchimento em hachura/cross-hatch (estilo Excalidraw) — traços
 * diagonais em vez de cor sólida lisa. Gera um `CanvasPattern` pequeno
 * (8x8) com as linhas e repete; cacheado por cor+variante já que o
 * mesmo padrão costuma ser reusado por muitos elementos com a mesma
 * cor de traço.
 */
const patternCache = new Map();

function buildPattern(ctx, color, crossHatch) {
    const key = `${color}|${crossHatch}`;
    if (patternCache.has(key)) return patternCache.get(key);

    const size = 8;
    const tile = document.createElement("canvas");
    tile.width = size;
    tile.height = size;
    const tileCtx = tile.getContext("2d");
    tileCtx.strokeStyle = color;
    tileCtx.lineWidth = 1.2;
    tileCtx.lineCap = "square";

    tileCtx.beginPath();
    tileCtx.moveTo(-1, size + 1);
    tileCtx.lineTo(size + 1, -1);
    if (crossHatch) {
        tileCtx.moveTo(-1, -1);
        tileCtx.lineTo(size + 1, size + 1);
    }
    tileCtx.stroke();

    const pattern = ctx.createPattern(tile, "repeat");
    patternCache.set(key, pattern);
    return pattern;
}

/** `ctx.fillStyle` pra usar dado o `style` do elemento — cor sólida se fillPattern for "solid" (ou ausente), padrão de hachura/cross-hatch caso contrário. */
export function resolveFillStyle(ctx, style, resolvedColor) {
    if (style.fillPattern === "hachure") return buildPattern(ctx, resolvedColor, false);
    if (style.fillPattern === "cross-hatch") return buildPattern(ctx, resolvedColor, true);
    return resolvedColor;
}
