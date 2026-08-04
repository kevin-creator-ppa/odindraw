import { resolveInkColor } from "../ui/theme.js";
import { downloadBlob } from "./download.js";
import { LINE_TYPES } from "../elements/typeGroups.js";

/**
 * Exporta o diagrama pro formato .drawio (XML mxGraph), abrível no
 * draw.io de verdade. Só exportação (não lê .drawio de volta) — o
 * objetivo é tirar o diagrama daqui pra usar em outro lugar, não
 * substituir o formato JSON nativo (usado por salvar/abrir).
 *
 * Exporta só a página atual (mesmo escopo de exportar PNG/SVG/PDF).
 * Mapeia cada tipo de Element pro estilo mxCell mais parecido; formas
 * sem equivalente direto (ícones da biblioteca, tabelas) viram uma
 * aproximação razoável (retângulo com o rótulo, grade de retângulos),
 * não uma cópia pixel-a-pixel.
 */

const ARROW_MAP = {
    none: "none",
    open: "open",
    classic: "classic",
    diamond: "diamond",
    diamondOpen: "diamondThin",
    circle: "oval",
    circleOpen: "oval",
    square: "box",
    squareOpen: "box",
};

function escapeXml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

function fontStyleBits({ bold, italic, underline }) {
    return (bold ? 1 : 0) + (italic ? 2 : 0) + (underline ? 4 : 0);
}

/** Trecho de estilo comum a qualquer vértice: cor/traço/opacidade/espelhamento/rotação. */
function baseStyle(el) {
    const stroke = resolveInkColor(el.style.stroke);
    const fill = el.style.fill === "transparent" ? "none" : resolveInkColor(el.style.fill);
    const dash = el.style.strokeStyle === "dotted" ? "dashed=1;dashPattern=1 2;" : el.style.strokeStyle !== "solid" ? "dashed=1;" : "";
    const flip = `${el.flipX ? "flipH=1;" : ""}${el.flipY ? "flipV=1;" : ""}`;
    const rotation = el.rotation ? `rotation=${el.rotation};` : "";
    return `fillColor=${fill};strokeColor=${stroke};strokeWidth=${el.style.strokeWidth};opacity=${Math.round(el.style.opacity * 100)};${dash}${flip}${rotation}`;
}

/** Estilo de fonte (tamanho/cor/negrito-itálico-sublinhado/alinhamento) de um Text ou textLabel embutido. */
function labelFontStyle(host) {
    if (!host) return "";
    return `fontSize=${host.fontSize};fontColor=${resolveInkColor(host.color)};fontStyle=${fontStyleBits(host)};align=${host.align};verticalAlign=middle;`;
}

const SHAPE_STYLE = {
    rectangle: () => "rounded=0;whiteSpace=wrap;html=1;",
    ellipse: () => "ellipse;whiteSpace=wrap;html=1;",
    diamond: () => "rhombus;whiteSpace=wrap;html=1;",
    triangle: () => "triangle;whiteSpace=wrap;html=1;",
    hexagon: () => "shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;",
    cylinder: () => "shape=cylinder3;whiteSpace=wrap;html=1;",
    cloud: () => "ellipse;shape=cloud;whiteSpace=wrap;html=1;",
    component: () => "rounded=1;whiteSpace=wrap;html=1;",
    comment: () => "shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;",
};

function vertexXml(id, value, style, x, y, width, height) {
    return `<mxCell id="${id}" value="${escapeXml(value)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" /></mxCell>`;
}

/** Vértice "comum" (formas geométricas, ícones da biblioteca, notas) — texto vem do textLabel, do content (Text) ou do label (Component). */
function shapeCell(el) {
    const style = (SHAPE_STYLE[el.type] ?? SHAPE_STYLE.rectangle)() + baseStyle(el);
    const host = el.type === "text" ? el : el.textLabel;
    const value = el.type === "text" ? el.content : el.type === "component" ? el.label : host?.text;
    const fullStyle = el.type === "text" ? `text;html=1;strokeColor=none;fillColor=none;${labelFontStyle(host)}` : style + labelFontStyle(host);
    return vertexXml(el.id, value ?? "", fullStyle, Math.round(el.x), Math.round(el.y), Math.round(el.width), Math.round(el.height));
}

/** Tabela: sem suporte nativo ao formato de tabela do draw.io — vira uma grade de retângulos independentes, um por célula. */
function tableCells(table) {
    const { w, h } = table.cellSize();
    const stroke = resolveInkColor(table.style.stroke);
    const cells = [];
    for (let r = 0; r < table.rows; r++) {
        for (let c = 0; c < table.cols; c++) {
            const style = `rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=${stroke};strokeWidth=${table.style.strokeWidth};`;
            cells.push(
                vertexXml(
                    `${table.id}_${r}_${c}`,
                    table.cells[r]?.[c] ?? "",
                    style,
                    Math.round(table.x + c * w),
                    Math.round(table.y + r * h),
                    Math.round(w),
                    Math.round(h)
                )
            );
        }
    }
    return cells.join("\n");
}

/** Traço livre: sem forma própria no mxGraph — vira uma edge solta (sem seta) passando por todos os pontos. */
function freehandCell(el) {
    const stroke = resolveInkColor(el.style.stroke);
    const [first, ...rest] = el.points;
    const last = rest.pop();
    const waypoints = rest.map((p) => `<mxPoint x="${Math.round(p.x)}" y="${Math.round(p.y)}" />`).join("");
    return `<mxCell id="${el.id}" value="" style="endArrow=none;startArrow=none;html=1;strokeColor=${stroke};strokeWidth=${el.style.strokeWidth};curved=0;rounded=0;" edge="1" parent="1">
        <mxGeometry relative="1" as="geometry">
            <mxPoint x="${Math.round(first.x)}" y="${Math.round(first.y)}" as="sourcePoint" />
            <mxPoint x="${Math.round(last.x)}" y="${Math.round(last.y)}" as="targetPoint" />
            ${waypoints ? `<Array as="points">${waypoints}</Array>` : ""}
        </mxGeometry>
    </mxCell>`;
}

/** Linha/seta/ortogonal/conector: edge do mxGraph, ligada por id (source/target) quando o Connector estiver preso a um objeto. */
function edgeCell(el) {
    const isConnector = el.type === "connector";
    const start = isConnector ? el._resolvedStart ?? el.startPoint : { x: el.x1, y: el.y1 };
    const end = isConnector ? el._resolvedEnd ?? el.endPoint : { x: el.x2, y: el.y2 };
    const stroke = resolveInkColor(el.style.stroke);
    const dash = el.style.strokeStyle === "dotted" ? "dashed=1;dashPattern=1 2;" : el.style.strokeStyle !== "solid" ? "dashed=1;" : "";
    const routeStyle = el.routeType === "orthogonal" ? "edgeStyle=orthogonalEdgeStyle;" : el.routeType === "curved" ? "curved=1;" : "";
    const style = `html=1;strokeColor=${stroke};strokeWidth=${el.style.strokeWidth};${dash}${routeStyle}startArrow=${ARROW_MAP[el.startArrowType] ?? "none"};endArrow=${ARROW_MAP[el.endArrowType] ?? "none"};`;

    const sourceAttr = isConnector && el.startObjectId ? ` source="${el.startObjectId}"` : "";
    const targetAttr = isConnector && el.endObjectId ? ` target="${el.endObjectId}"` : "";
    const waypoints = el.waypoints.map((p) => `<mxPoint x="${Math.round(p.x)}" y="${Math.round(p.y)}" />`).join("");

    return `<mxCell id="${el.id}" value="" style="${style}" edge="1" parent="1"${sourceAttr}${targetAttr}>
        <mxGeometry relative="1" as="geometry">
            <mxPoint x="${Math.round(start.x)}" y="${Math.round(start.y)}" as="sourcePoint" />
            <mxPoint x="${Math.round(end.x)}" y="${Math.round(end.y)}" as="targetPoint" />
            ${waypoints ? `<Array as="points">${waypoints}</Array>` : ""}
        </mxGeometry>
    </mxCell>`;
}

function cellFor(el) {
    if (el.type === "table") return tableCells(el);
    if (el.type === "freehand") return freehandCell(el);
    if (LINE_TYPES.has(el.type)) return edgeCell(el);
    return shapeCell(el);
}

export function buildDrawioXml(scene, diagramName = "Sem título") {
    const visible = scene.objects
        .filter((el) => scene.isElementVisible(el))
        .sort((a, b) => scene.stackCompare(a, b));
    visible.forEach((el) => el.beforeHitTest(scene));

    const body = visible.map(cellFor).join("\n");

    return `<mxfile host="OdinDraw">
  <diagram name="${escapeXml(diagramName)}">
    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${body}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

export function exportDrawio(scene, diagramName, filename = "diagrama.drawio") {
    const xml = buildDrawioXml(scene, diagramName);
    downloadBlob(new Blob([xml], { type: "application/xml" }), filename);
}
