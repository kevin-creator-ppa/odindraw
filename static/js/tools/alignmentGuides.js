const SNAP_TOLERANCE_PX = 6;

export const GUIDE_COLOR = "#e64980";

/**
 * Compara as bordas e o centro do bbox candidato (posição que o elemento
 * arrastado assumiria) contra os de todos os outros objetos visíveis,
 * dentro de uma tolerância em pixels de tela (convertida pro mundo via
 * zoom). Eixos X e Y são resolvidos independentemente — cada um usa o
 * melhor match (menor distância) encontrado, se houver.
 */
export function computeAlignmentSnap({ bounds, candidates, zoom }) {
    const tolerance = SNAP_TOLERANCE_PX / zoom;
    const targetsX = [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width];
    const targetsY = [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height];

    let bestX = null;
    let bestY = null;

    candidates.forEach((other) => {
        const ob = other.getBounds();
        const otherXs = [ob.x, ob.x + ob.width / 2, ob.x + ob.width];
        const otherYs = [ob.y, ob.y + ob.height / 2, ob.y + ob.height];

        targetsX.forEach((tx) => {
            otherXs.forEach((ox) => {
                const delta = ox - tx;
                if (Math.abs(delta) <= tolerance && (!bestX || Math.abs(delta) < Math.abs(bestX.delta))) {
                    bestX = {
                        delta,
                        position: ox,
                        from: Math.min(bounds.y, ob.y),
                        to: Math.max(bounds.y + bounds.height, ob.y + ob.height),
                    };
                }
            });
        });

        targetsY.forEach((ty) => {
            otherYs.forEach((oy) => {
                const delta = oy - ty;
                if (Math.abs(delta) <= tolerance && (!bestY || Math.abs(delta) < Math.abs(bestY.delta))) {
                    bestY = {
                        delta,
                        position: oy,
                        from: Math.min(bounds.x, ob.x),
                        to: Math.max(bounds.x + bounds.width, ob.x + ob.width),
                    };
                }
            });
        });
    });

    const guides = [];
    if (bestX) guides.push({ type: "v", position: bestX.position, from: bestX.from, to: bestX.to });
    if (bestY) guides.push({ type: "h", position: bestY.position, from: bestY.from, to: bestY.to });

    return {
        dx: bestX ? bestX.delta : 0,
        dy: bestY ? bestY.delta : 0,
        guides,
    };
}
