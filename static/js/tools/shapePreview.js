/** Helpers de desenho do preview (canvas interativo) usados pelas ferramentas de forma. */

const PREVIEW_COLOR = "#6965db";

function withPreviewStyle(ctx, draw) {
    ctx.save();
    ctx.strokeStyle = PREVIEW_COLOR;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    draw();
    ctx.restore();
}

export function worldRectToScreen(camera, start, end) {
    const a = camera.worldToScreen(start.x, start.y);
    const b = camera.worldToScreen(end.x, end.y);
    return {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(b.x - a.x),
        height: Math.abs(b.y - a.y),
    };
}

export function drawRectPreview(ctx, rect) {
    withPreviewStyle(ctx, () => ctx.strokeRect(rect.x, rect.y, rect.width, rect.height));
}

export function drawEllipsePreview(ctx, rect) {
    withPreviewStyle(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width / 2, rect.height / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
    });
}

function drawArrowhead(ctx, from, to) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size = 10;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

export function drawLinePreview(ctx, a, b, { arrowEnd = false } = {}) {
    withPreviewStyle(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (arrowEnd) drawArrowhead(ctx, a, b);
    });
}

export function drawOrthogonalPreview(ctx, a, b) {
    withPreviewStyle(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    });
}

/** Restringe o ponto final a formar um quadrado/círculo (lados iguais) a partir do início. */
export function squareConstrain(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    return {
        x: start.x + Math.sign(dx || 1) * side,
        y: start.y + Math.sign(dy || 1) * side,
    };
}
