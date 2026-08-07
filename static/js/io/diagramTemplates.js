import { Rectangle } from "../elements/Rectangle.js";
import { Diamond } from "../elements/Diamond.js";
import { Ellipse } from "../elements/Ellipse.js";
import { Connector } from "../elements/Connector.js";

/** Retângulo/losango/elipse com rótulo, pronto pra entrar na cena de um modelo inicial. */
function shape(ElementClass, { x, y, width, height, text, extra = {} }) {
    return new ElementClass({ x, y, width, height, textLabel: { text }, ...extra });
}

/** Conector "de verdade" (startObjectId/endObjectId) entre dois elementos já posicionados — desliza com eles se forem movidos depois. */
function connect(from, to, { label = "", routeType = "straight" } = {}) {
    const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    return new Connector({
        startObjectId: from.id,
        endObjectId: to.id,
        startPoint: fromCenter,
        endPoint: toCenter,
        routeType,
        endArrow: true,
        textLabel: label ? { text: label } : undefined,
    });
}

/** Fluxograma básico: início → processo → decisão → (sim) fim / (não) alternativa → fim. */
function flowchartTemplate() {
    const start = shape(Rectangle, { x: 300, y: 40, width: 140, height: 50, text: "Início", extra: { rounded: true } });
    const process = shape(Rectangle, { x: 300, y: 140, width: 140, height: 50, text: "Processo" });
    const decision = shape(Diamond, { x: 290, y: 230, width: 160, height: 90, text: "Decisão?" });
    const alt = shape(Rectangle, { x: 520, y: 250, width: 160, height: 50, text: "Ação alternativa" });
    const end = shape(Rectangle, { x: 300, y: 400, width: 140, height: 50, text: "Fim", extra: { rounded: true } });

    const objects = [start, process, decision, alt, end];
    const connections = [
        connect(start, process),
        connect(process, decision),
        connect(decision, end, { label: "Sim" }),
        connect(decision, alt, { label: "Não" }),
        connect(alt, end),
    ];
    return [...objects, ...connections];
}

/** Organograma simples: um cargo no topo, três abaixo. */
function orgChartTemplate() {
    const ceo = shape(Rectangle, { x: 340, y: 40, width: 160, height: 55, text: "Diretoria" });
    const a = shape(Rectangle, { x: 140, y: 180, width: 150, height: 55, text: "Time A" });
    const b = shape(Rectangle, { x: 340, y: 180, width: 150, height: 55, text: "Time B" });
    const c = shape(Rectangle, { x: 540, y: 180, width: 150, height: 55, text: "Time C" });

    return [ceo, a, b, c, connect(ceo, a), connect(ceo, b), connect(ceo, c)];
}

/** Mapa mental: ideia central + quatro ramos, conectores curvos sem seta (visual mais orgânico). */
function mindMapTemplate() {
    const center = shape(Ellipse, { x: 340, y: 220, width: 180, height: 90, text: "Ideia central" });
    const branches = [
        shape(Rectangle, { x: 100, y: 60, width: 150, height: 50, text: "Ramo 1" }),
        shape(Rectangle, { x: 560, y: 60, width: 150, height: 50, text: "Ramo 2" }),
        shape(Rectangle, { x: 100, y: 380, width: 150, height: 50, text: "Ramo 3" }),
        shape(Rectangle, { x: 560, y: 380, width: 150, height: 50, text: "Ramo 4" }),
    ];
    const connections = branches.map((branch) => connect(center, branch, { routeType: "curved" }));
    connections.forEach((c) => (c.endArrowType = "none"));
    return [center, ...branches, ...connections];
}

export const DIAGRAM_TEMPLATES = [
    { id: "flowchart", label: "Fluxograma básico", build: flowchartTemplate },
    { id: "orgchart", label: "Organograma", build: orgChartTemplate },
    { id: "mindmap", label: "Mapa mental", build: mindMapTemplate },
];
