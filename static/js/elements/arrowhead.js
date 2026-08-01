/**
 * Marcadores de ponta de linha/seta (Line/Arrow/OrthogonalLine/Connector),
 * canvas e SVG. `from`/`to` são pontos adjacentes ao longo da rota — `to`
 * é a ponta onde o marcador é desenhado, `from` só define o ângulo.
 */
const MARKER_SIZE = 12;

export const MARKER_TYPES = [
    { value: "none", label: "Nenhuma" },
    { value: "open", label: "Aberta" },
    { value: "classic", label: "Clássica" },
    { value: "diamond", label: "Losango" },
    { value: "diamondOpen", label: "Losango vazado" },
    { value: "circle", label: "Círculo" },
    { value: "circleOpen", label: "Círculo vazado" },
    { value: "square", label: "Quadrado" },
    { value: "squareOpen", label: "Quadrado vazado" },
];

function angleOf(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Ponto local (x = distância atrás da ponta ao longo da rota, y = deslocamento perpendicular) convertido pro mundo/tela. */
function localToWorld(local, to, backAngle) {
    return {
        x: to.x + local.x * Math.cos(backAngle) - local.y * Math.sin(backAngle),
        y: to.y + local.x * Math.sin(backAngle) + local.y * Math.cos(backAngle),
    };
}

function diamondGeometry(to, backAngle, size, filled) {
    const len = size * 1.3;
    const hw = size * 0.45;
    return {
        kind: "polygon",
        filled,
        points: [
            { x: 0, y: 0 },
            { x: len / 2, y: -hw },
            { x: len, y: 0 },
            { x: len / 2, y: hw },
        ].map((p) => localToWorld(p, to, backAngle)),
    };
}

function squareGeometry(to, backAngle, size, filled) {
    const len = size;
    const hw = size * 0.4;
    return {
        kind: "polygon",
        filled,
        points: [
            { x: 0, y: -hw },
            { x: 0, y: hw },
            { x: len, y: hw },
            { x: len, y: -hw },
        ].map((p) => localToWorld(p, to, backAngle)),
    };
}

function circleGeometry(to, backAngle, size, filled) {
    const radius = size * 0.35;
    return { kind: "circle", filled, center: localToWorld({ x: radius, y: 0 }, to, backAngle), radius };
}

const BUILDERS = {
    open: (to, backAngle, size) => ({
        kind: "lines",
        segments: [
            [to, localToWorld({ x: size, y: 0 }, to, backAngle - Math.PI / 6)],
            [to, localToWorld({ x: size, y: 0 }, to, backAngle + Math.PI / 6)],
        ],
    }),
    classic: (to, backAngle, size) => ({
        kind: "polygon",
        filled: true,
        points: [
            to,
            localToWorld({ x: size, y: 0 }, to, backAngle - Math.PI / 6),
            localToWorld({ x: size, y: 0 }, to, backAngle + Math.PI / 6),
        ],
    }),
    diamond: (to, backAngle, size) => diamondGeometry(to, backAngle, size, true),
    diamondOpen: (to, backAngle, size) => diamondGeometry(to, backAngle, size, false),
    square: (to, backAngle, size) => squareGeometry(to, backAngle, size, true),
    squareOpen: (to, backAngle, size) => squareGeometry(to, backAngle, size, false),
    circle: (to, backAngle, size) => circleGeometry(to, backAngle, size, true),
    circleOpen: (to, backAngle, size) => circleGeometry(to, backAngle, size, false),
};

function markerGeometry(type, from, to, size) {
    const builder = BUILDERS[type];
    if (!type || type === "none" || !builder) return { kind: "none" };
    return builder(to, angleOf(from, to) + Math.PI, size);
}

/** Desenha o marcador no canvas — preenchidos usam a cor de traço atual (ctx.strokeStyle), não o fill do elemento. */
export function drawMarker(ctx, type, from, to, size = MARKER_SIZE) {
    const geo = markerGeometry(type, from, to, size);
    if (geo.kind === "none") return;

    if (geo.kind === "lines") {
        geo.segments.forEach(([a, b]) => {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        });
        return;
    }

    ctx.beginPath();
    if (geo.kind === "polygon") {
        geo.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
    } else {
        ctx.arc(geo.center.x, geo.center.y, geo.radius, 0, Math.PI * 2);
    }
    if (geo.filled) {
        ctx.save();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        ctx.restore();
    }
    ctx.stroke();
}

/** Equivalente SVG — `strokeColor` é necessário pros marcadores preenchidos (o grupo pai usa fill="none"). */
export function markerSvg(type, from, to, strokeColor, size = MARKER_SIZE) {
    const geo = markerGeometry(type, from, to, size);
    if (geo.kind === "none") return "";

    if (geo.kind === "lines") {
        return geo.segments.map(([a, b]) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`).join("");
    }

    const fill = geo.filled ? strokeColor : "none";
    if (geo.kind === "polygon") {
        const points = geo.points.map((p) => `${p.x},${p.y}`).join(" ");
        return `<polygon points="${points}" fill="${fill}" />`;
    }
    return `<circle cx="${geo.center.x}" cy="${geo.center.y}" r="${geo.radius}" fill="${fill}" />`;
}
