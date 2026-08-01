import { distanceToSegment } from "../utils/geometry.js";

/**
 * Geometria de rota (reta/ortogonal/curva) entre dois pontos, compartilhada
 * por Line (e subclasses) e Connector — os dois únicos elementos cuja
 * forma depende de um `routeType`.
 *
 * Todas as funções aceitam um `bend` opcional (ponto pelo qual a rota deve
 * passar, arrastado pelo usuário via a alça central do SelectTool — ver
 * `_bendDrag`). Quando presente, ele tem prioridade sobre o `routeType`:
 * a rota vira duas retas passando por `bend` (ou uma curva quadrática, se
 * `routeType === "curved"`) — permite mudar a trajetória sem mexer nas
 * pontas (que continuam presas ao que estiverem conectadas).
 */

export function drawRoutePath(ctx, a, b, routeType, bend = null) {
    ctx.beginPath();
    if (bend) {
        ctx.moveTo(a.x, a.y);
        if (routeType === "curved") {
            ctx.quadraticCurveTo(bend.x, bend.y, b.x, b.y);
        } else {
            ctx.lineTo(bend.x, bend.y);
            ctx.lineTo(b.x, b.y);
        }
    } else if (routeType === "orthogonal") {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, a.y);
        ctx.lineTo(b.x, b.y);
    } else if (routeType === "curved") {
        const midX = (a.x + b.x) / 2;
        ctx.moveTo(a.x, a.y);
        ctx.bezierCurveTo(midX, a.y, midX, b.y, b.x, b.y);
    } else {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
}

/**
 * Ponto adjacente ao início/fim ao longo da rota (não o outro extremo) —
 * usado só para calcular o ângulo da seta: em rotas ortogonais/curvas (ou
 * com bend) a direção real no bico é a do último trecho, não a linha reta
 * entre os dois extremos.
 */
export function routeNearPoint(a, b, routeType, which, bend = null) {
    if (bend) return bend;
    if (routeType === "orthogonal") return { x: b.x, y: a.y };
    if (routeType === "curved") {
        const midX = (a.x + b.x) / 2;
        return { x: midX, y: which === "start" ? a.y : b.y };
    }
    return which === "start" ? b : a;
}

export function routeContainsPoint(point, start, end, routeType, tolerance, bend = null) {
    if (bend) {
        return Math.min(distanceToSegment(point, start, bend), distanceToSegment(point, bend, end)) <= tolerance;
    }
    if (routeType === "orthogonal") {
        const corner = { x: end.x, y: start.y };
        return Math.min(distanceToSegment(point, start, corner), distanceToSegment(point, corner, end)) <= tolerance;
    }
    // Curva aproximada pela reta entre os pontos — suficiente para clique/seleção.
    return distanceToSegment(point, start, end) <= tolerance;
}

export function routeSvgPath(start, end, routeType, bend = null) {
    if (bend) {
        if (routeType === "curved") return `M ${start.x} ${start.y} Q ${bend.x} ${bend.y}, ${end.x} ${end.y}`;
        return `M ${start.x} ${start.y} L ${bend.x} ${bend.y} L ${end.x} ${end.y}`;
    }
    if (routeType === "orthogonal") return `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`;
    if (routeType === "curved") {
        const midX = (start.x + end.x) / 2;
        return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
    }
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

/** Ponto "natural" pra alça de bend quando ainda não há um bend customizado — meio do segmento (ou o cotovelo, na rota ortogonal). */
export function naturalBendPoint(a, b, routeType) {
    if (routeType === "orthogonal") return { x: b.x, y: a.y };
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
