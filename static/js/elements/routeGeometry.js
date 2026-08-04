import { distanceToSegment } from "../utils/geometry.js";

/**
 * Geometria de rota (reta/ortogonal/curva) entre dois pontos, compartilhada
 * por Line (e subclasses) e Connector — os dois únicos elementos cuja
 * forma depende de um `routeType`.
 *
 * Todas as funções aceitam uma lista `waypoints` opcional (pontos
 * intermediários pelos quais a rota deve passar, arrastados pelo usuário
 * via as alças quadradas do SelectTool — ver `_waypointDrag`). Quando há
 * qualquer waypoint, eles têm prioridade sobre o `routeType`: a rota vira
 * segmentos retos ligando start → waypoints[] → end — exceto o caso de
 * exatamente 1 waypoint com `routeType === "curved"`, que mantém a curva
 * quadrática suave de sempre (compatibilidade com o "bend" único de antes
 * desta etapa). Sem waypoints, o comportamento é o de sempre: reta, cotovelo
 * ortogonal, ou curva bezier entre os dois pontos.
 */

export function drawRoutePath(ctx, a, b, routeType, waypoints = []) {
    ctx.beginPath();
    if (waypoints.length === 1 && routeType === "curved") {
        const bend = waypoints[0];
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(bend.x, bend.y, b.x, b.y);
    } else if (waypoints.length > 0) {
        ctx.moveTo(a.x, a.y);
        waypoints.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.lineTo(b.x, b.y);
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
 * com waypoints) a direção real no bico é a do último trecho, não a linha
 * reta entre os dois extremos.
 */
export function routeNearPoint(a, b, routeType, which, waypoints = []) {
    if (waypoints.length > 0) {
        return which === "start" ? waypoints[0] : waypoints[waypoints.length - 1];
    }
    if (routeType === "orthogonal") return { x: b.x, y: a.y };
    if (routeType === "curved") {
        const midX = (a.x + b.x) / 2;
        return { x: midX, y: which === "start" ? a.y : b.y };
    }
    return which === "start" ? b : a;
}

export function routeContainsPoint(point, start, end, routeType, tolerance, waypoints = []) {
    if (waypoints.length > 0) {
        const points = [start, ...waypoints, end];
        for (let i = 0; i < points.length - 1; i++) {
            if (distanceToSegment(point, points[i], points[i + 1]) <= tolerance) return true;
        }
        return false;
    }
    if (routeType === "orthogonal") {
        const corner = { x: end.x, y: start.y };
        return Math.min(distanceToSegment(point, start, corner), distanceToSegment(point, corner, end)) <= tolerance;
    }
    // Curva aproximada pela reta entre os pontos — suficiente para clique/seleção.
    return distanceToSegment(point, start, end) <= tolerance;
}

export function routeSvgPath(start, end, routeType, waypoints = []) {
    if (waypoints.length === 1 && routeType === "curved") {
        const bend = waypoints[0];
        return `M ${start.x} ${start.y} Q ${bend.x} ${bend.y}, ${end.x} ${end.y}`;
    }
    if (waypoints.length > 0) {
        const rest = waypoints.map((p) => `L ${p.x} ${p.y}`).join(" ");
        return `M ${start.x} ${start.y} ${rest} L ${end.x} ${end.y}`;
    }
    if (routeType === "orthogonal") return `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`;
    if (routeType === "curved") {
        const midX = (start.x + end.x) / 2;
        return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
    }
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

/** Ponto "natural" pro primeiro waypoint quando ainda não há nenhum — meio do segmento (ou o cotovelo, na rota ortogonal). */
export function naturalBendPoint(a, b, routeType) {
    if (routeType === "orthogonal") return { x: b.x, y: a.y };
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Ponto a 50% do comprimento total da rota (poligonal start→waypoints→end, ou o cotovelo ortogonal) — usado pra posicionar o rótulo embutido da linha/conector. Curva sem waypoint é aproximada pela reta, só pra fins de posicionamento. */
export function routeMidpoint(start, end, routeType, waypoints = []) {
    let points;
    if (waypoints.length > 0) points = [start, ...waypoints, end];
    else if (routeType === "orthogonal") points = [start, { x: end.x, y: start.y }, end];
    else points = [start, end];

    const segmentLengths = [];
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
        segmentLengths.push(len);
        total += len;
    }

    let remaining = total / 2;
    for (let i = 0; i < segmentLengths.length; i++) {
        if (remaining <= segmentLengths[i] || i === segmentLengths.length - 1) {
            const t = segmentLengths[i] > 0 ? remaining / segmentLengths[i] : 0;
            return {
                x: points[i].x + (points[i + 1].x - points[i].x) * t,
                y: points[i].y + (points[i + 1].y - points[i].y) * t,
            };
        }
        remaining -= segmentLengths[i];
    }
    return points[0];
}
