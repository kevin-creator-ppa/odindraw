import { DrawShapeTool } from "./DrawShapeTool.js";

/**
 * Base para ferramentas de linha que "grudam" em um objeto quando o
 * início ou o fim do arraste cai sobre ele — o evento carrega
 * startObjectId/endObjectId para que a criação do elemento (Etapa 6)
 * monte um Conector real em vez de uma linha solta.
 */
export class ConnectableLineTool extends DrawShapeTool {
    buildPayload(context, start, end) {
        const payload = super.buildPayload(context, start, end);
        const startElement = context.scene.getObjectAtPoint(start);
        const endElement = context.scene.getObjectAtPoint(end);

        if (startElement) payload.startObjectId = startElement.id;
        if (endElement && endElement !== startElement) payload.endObjectId = endElement.id;

        return payload;
    }
}
