import { Rectangle } from "./Rectangle.js";
import { Ellipse } from "./Ellipse.js";
import { Diamond } from "./Diamond.js";
import { Triangle } from "./Triangle.js";
import { Hexagon } from "./Hexagon.js";
import { Cylinder } from "./Cylinder.js";
import { Cloud } from "./Cloud.js";
import { Line } from "./Line.js";
import { Arrow } from "./Arrow.js";
import { OrthogonalLine } from "./OrthogonalLine.js";
import { Text } from "./Text.js";
import { Freehand } from "./Freehand.js";
import { Connector } from "./Connector.js";
import { Component } from "./Component.js";
import { Table } from "./Table.js";

const CONSTRUCTORS = {
    rectangle: Rectangle,
    ellipse: Ellipse,
    diamond: Diamond,
    triangle: Triangle,
    hexagon: Hexagon,
    cylinder: Cylinder,
    cloud: Cloud,
    line: Line,
    arrow: Arrow,
    "orthogonal-line": OrthogonalLine,
    text: Text,
    freehand: Freehand,
    connector: Connector,
    component: Component,
    table: Table,
};

/**
 * Reconstrói um Element a partir dos dados serializados (JSON salvo),
 * preservando identidade (id, zIndex, locked, visible, groupId) — vital
 * para que Connectors continuem resolvendo startObjectId/endObjectId
 * corretamente depois de recarregar um diagrama.
 */
export function elementFromJSON(data) {
    const ElementClass = CONSTRUCTORS[data.type];
    if (!ElementClass) return null;

    const element = new ElementClass(data);
    element.id = data.id;
    element.zIndex = data.zIndex ?? 0;
    element.locked = data.locked ?? false;
    element.visible = data.visible ?? true;
    element.groupId = data.groupId ?? null;
    element.layerId = data.layerId ?? null;
    return element;
}
