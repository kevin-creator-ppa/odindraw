/**
 * "Pincel de formatação" (Ctrl+Alt+C / Ctrl+Alt+V, como no draw.io): copia
 * cor/traço/fonte/setas/rota de UM elemento e aplica em outros, sem mexer
 * em posição/tamanho/conteúdo.
 */

function textHostOf(element) {
    if (element.type === "text") return element;
    return element.textLabel ?? null;
}

/** Captura o "estilo" de `element`: style bruto (fill/stroke/...), fonte/cor de texto (se houver) e setas/rota (se for linha). */
export function extractStyle(element) {
    const textHost = textHostOf(element);
    return {
        style: { ...element.style },
        text: textHost ? { font: textHost.font, fontSize: textHost.fontSize, bold: textHost.bold, italic: textHost.italic, underline: textHost.underline, align: textHost.align } : null,
        textColor: element.type === "text" ? element.style.fill : (element.textLabel?.color ?? null),
        startArrowType: element.startArrowType,
        endArrowType: element.endArrowType,
        routeType: element.routeType,
    };
}

/** Aplica um estilo capturado por extractStyle() em `element`, ignorando campos que não fazem sentido pro tipo dele. */
export function applyStyle(element, captured) {
    Object.assign(element.style, captured.style);

    const textHost = textHostOf(element);
    if (textHost && captured.text) Object.assign(textHost, captured.text);

    if (captured.textColor !== null) {
        if (element.type === "text") element.style.fill = captured.textColor;
        else if (element.textLabel) element.textLabel.color = captured.textColor;
    }

    if (captured.startArrowType !== undefined && element.startArrowType !== undefined) {
        element.startArrowType = captured.startArrowType;
    }
    if (captured.endArrowType !== undefined && element.endArrowType !== undefined) {
        element.endArrowType = captured.endArrowType;
    }
    if (captured.routeType !== undefined && element.routeType !== undefined) {
        element.routeType = captured.routeType;
    }
}
