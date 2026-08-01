/** Desenho de ponta de seta reutilizado por Line (e subclasses) e Connector. */
const ARROW_SIZE = 12;

function wings(from, to, size = ARROW_SIZE) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    return [
        { x: to.x - size * Math.cos(angle - Math.PI / 6), y: to.y - size * Math.sin(angle - Math.PI / 6) },
        { x: to.x - size * Math.cos(angle + Math.PI / 6), y: to.y - size * Math.sin(angle + Math.PI / 6) },
    ];
}

/** Desenha a seta no canvas: `to` é a ponta, `from` define o ângulo (ponto anterior na rota). */
export function drawArrowhead(ctx, from, to, size = ARROW_SIZE) {
    const [wing1, wing2] = wings(from, to, size);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(wing1.x, wing1.y);
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(wing2.x, wing2.y);
    ctx.stroke();
}

/** Equivalente SVG: duas strings `<line>` das "asas" da seta. */
export function arrowheadSvgLines(from, to, size = ARROW_SIZE) {
    const [wing1, wing2] = wings(from, to, size);
    return [
        `<line x1="${to.x}" y1="${to.y}" x2="${wing1.x}" y2="${wing1.y}" />`,
        `<line x1="${to.x}" y1="${to.y}" x2="${wing2.x}" y2="${wing2.y}" />`,
    ];
}
