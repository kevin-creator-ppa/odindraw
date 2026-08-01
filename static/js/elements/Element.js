import { animationState } from "./animationState.js";

let idCounter = 0;

function nextId(prefix) {
    idCounter += 1;
    return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

const DEFAULT_STYLE = {
    fill: "transparent",
    stroke: "#1e1e1e",
    strokeWidth: 2,
    strokeStyle: "solid",
    opacity: 1,
};

/**
 * Base de todo objeto desenhável do diagrama. Concentra o contrato que o
 * Renderer, o SelectTool e a exportação (Etapa 8) esperam de um elemento:
 * render(ctx, camera), containsPoint(worldPoint), toSVG() e serialize().
 */
export class Element {
    constructor(type, { x, y, width, height, rotation = 0, style = {} }) {
        this.id = nextId(type);
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.rotation = rotation;
        this.zIndex = null;
        this.locked = false;
        this.visible = true;
        this.groupId = null;
        this.style = { ...DEFAULT_STYLE, ...style };
    }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    translate(dx, dy) {
        this.x += dx;
        this.y += dy;
    }

    /** Hook opcional chamado pela Scene antes do hit-test; usado por elementos que dependem de outros (Connector). */
    beforeHitTest(scene) {}

    /** Ponto de mundo está dentro do bounding box, desfazendo a rotação em torno do centro. */
    containsPoint(point) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const rad = (-this.rotation * Math.PI) / 180;
        const dx = point.x - cx;
        const dy = point.y - cy;
        const localX = cx + (dx * Math.cos(rad) - dy * Math.sin(rad));
        const localY = cy + (dx * Math.sin(rad) + dy * Math.cos(rad));
        return localX >= this.x && localX <= this.x + this.width && localY >= this.y && localY <= this.y + this.height;
    }

    applyStyle(ctx) {
        ctx.globalAlpha = this.style.opacity;
        ctx.fillStyle = this.style.fill;
        ctx.strokeStyle = this.style.stroke;
        ctx.lineWidth = this.style.strokeWidth;

        if (this.style.strokeStyle === "dashed") {
            ctx.setLineDash([8, 5]);
            ctx.lineDashOffset = 0;
        } else if (this.style.strokeStyle === "dotted") {
            ctx.setLineDash([2, 4]);
            ctx.lineDashOffset = 0;
        } else if (this.style.strokeStyle === "animated") {
            ctx.setLineDash([8, 5]);
            ctx.lineDashOffset = -animationState.phase;
        } else {
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
        }
    }

    /** Atributo SVG `stroke-dasharray` correspondente ao strokeStyle — usado pelo toSVG() das subclasses (animação não é exportada, vira tracejado estático). */
    svgDashArray() {
        if (this.style.strokeStyle === "dashed" || this.style.strokeStyle === "animated") return ' stroke-dasharray="8,5"';
        if (this.style.strokeStyle === "dotted") return ' stroke-dasharray="2,4"';
        return "";
    }

    /** Aplica a transformação de tela (posição + rotação) e delega o desenho local à subclasse. */
    render(ctx, camera) {
        const topLeft = camera.worldToScreen(this.x, this.y);
        const w = this.width * camera.zoom;
        const h = this.height * camera.zoom;

        ctx.save();
        this.applyStyle(ctx);
        ctx.translate(topLeft.x + w / 2, topLeft.y + h / 2);
        ctx.rotate((this.rotation * Math.PI) / 180);
        this.drawShape(ctx, -w / 2, -h / 2, w, h);
        ctx.restore();
    }

    /** Sobrescrito por cada subclasse: desenha no espaço local (origem no centro do bounding box). */
    drawShape(ctx, x, y, width, height) {}

    toSVG() {
        return "";
    }

    serialize() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            rotation: this.rotation,
            zIndex: this.zIndex,
            locked: this.locked,
            visible: this.visible,
            groupId: this.groupId,
            style: { ...this.style },
        };
    }

    /** Cópia independente (novo id e novo objeto de estilo) usada pela duplicação (Ctrl+D). */
    clone() {
        const copy = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        copy.id = nextId(this.type);
        copy.style = { ...this.style };
        return copy;
    }
}
