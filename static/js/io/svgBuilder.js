const EXPORT_PADDING = 40;
const EMPTY_SCENE_BOUNDS = { x: 0, y: 0, width: 800, height: 600 };

/** Bounding box (mundo) de um conjunto de elementos, com um retângulo padrão se a lista estiver vazia. */
export function computeElementsBounds(elements, scene) {
    if (elements.length === 0) return { ...EMPTY_SCENE_BOUNDS };

    elements.forEach((el) => el.beforeHitTest(scene));

    const left = Math.min(...elements.map((el) => el.x));
    const top = Math.min(...elements.map((el) => el.y));
    const right = Math.max(...elements.map((el) => el.x + el.width));
    const bottom = Math.max(...elements.map((el) => el.y + el.height));

    return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Bounding box (mundo) de todos os elementos visíveis (elemento + camada), com um retângulo padrão para cena vazia. */
export function computeSceneBounds(scene) {
    return computeElementsBounds(
        scene.objects.filter((el) => scene.isElementVisible(el)),
        scene
    );
}

/** Área de exportação (bounds + padding) e o deslocamento para trazê-la à origem (0,0). */
export function computeExportFrame(scene) {
    const bounds = computeSceneBounds(scene);
    return {
        width: Math.ceil(bounds.width + EXPORT_PADDING * 2),
        height: Math.ceil(bounds.height + EXPORT_PADDING * 2),
        offsetX: -(bounds.x - EXPORT_PADDING),
        offsetY: -(bounds.y - EXPORT_PADDING),
    };
}

/** Monta o SVG completo do diagrama (fundo branco + todos os elementos visíveis, ordenados por camada). */
export function buildSvgString(scene) {
    const frame = computeExportFrame(scene);
    const sorted = [...scene.objects].filter((el) => scene.isElementVisible(el)).sort((a, b) => scene.stackCompare(a, b));
    const body = sorted.map((el) => el.toSVG()).join("\n");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}">
<rect width="${frame.width}" height="${frame.height}" fill="#ffffff" />
<g transform="translate(${frame.offsetX} ${frame.offsetY})">
${body}
</g>
</svg>`;
}
