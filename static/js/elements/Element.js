import { animationState } from "./animationState.js";
import { AUTO_INK, resolveInkColor } from "../ui/theme.js";

let idCounter = 0;

function nextId(prefix) {
    idCounter += 1;
    return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

/** Novo objeto a cada chamada (não uma constante congelada) — stroke "auto" segue o tema até o usuário escolher uma cor explícita. */
function defaultStyle() {
    return {
        fill: "transparent",
        stroke: AUTO_INK,
        strokeWidth: 2,
        strokeStyle: "solid",
        opacity: 1,
        shadow: false,
    };
}

/**
 * Base de todo objeto desenhável do diagrama. Concentra o contrato que o
 * Renderer, o SelectTool e a exportação (Etapa 8) esperam de um elemento:
 * render(ctx, camera), containsPoint(worldPoint), toSVG() e serialize().
 */
export class Element {
    constructor(type, { x, y, width, height, rotation = 0, flipX = false, flipY = false, style = {} }) {
        this.id = nextId(type);
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.rotation = rotation;
        this.flipX = flipX;
        this.flipY = flipY;
        this.zIndex = null;
        this.locked = false;
        this.visible = true;
        this.groupId = null;
        this.layerId = null;
        this.style = { ...defaultStyle(), ...style };
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

    /** Cor de traço resolvida (sentinela "auto" → cor do tema atual) — usada pelo toSVG() das subclasses fora do caminho de render via canvas. */
    resolvedStroke() {
        return resolveInkColor(this.style.stroke);
    }

    /** Idem para o preenchimento — só importa de fato pra Text, cujo "fill" é a cor da tinta, não um preenchimento de forma. */
    resolvedFill() {
        return resolveInkColor(this.style.fill);
    }

    applyStyle(ctx) {
        ctx.globalAlpha = this.style.opacity;
        ctx.fillStyle = this.resolvedFill();
        ctx.strokeStyle = this.resolvedStroke();
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

    /** Aplica a transformação de tela (posição + rotação + espelhamento) e delega o desenho local à subclasse. */
    render(ctx, camera) {
        const topLeft = camera.worldToScreen(this.x, this.y);
        const w = this.width * camera.zoom;
        const h = this.height * camera.zoom;

        ctx.save();
        this.applyStyle(ctx);
        if (this.style.shadow) {
            ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
            ctx.shadowBlur = 8 * camera.zoom;
            ctx.shadowOffsetX = 3 * camera.zoom;
            ctx.shadowOffsetY = 3 * camera.zoom;
        }
        ctx.translate(topLeft.x + w / 2, topLeft.y + h / 2);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.scale(this.flipX ? -1 : 1, this.flipY ? -1 : 1);
        this.drawShape(ctx, -w / 2, -h / 2, w, h);
        ctx.restore();
    }

    /** Sobrescrito por cada subclasse: desenha no espaço local (origem no centro do bounding box). */
    drawShape(ctx, x, y, width, height) {}

    /** Atributo `transform` do SVG combinando rotação e espelhamento em torno do centro do bbox — usado pelo toSVG() das subclasses. */
    svgTransform() {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const sx = this.flipX ? -1 : 1;
        const sy = this.flipY ? -1 : 1;
        if (!this.rotation && sx === 1 && sy === 1) return "";
        return ` transform="translate(${cx} ${cy}) rotate(${this.rotation}) scale(${sx} ${sy}) translate(${-cx} ${-cy})"`;
    }

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
            flipX: this.flipX,
            flipY: this.flipY,
            zIndex: this.zIndex,
            locked: this.locked,
            visible: this.visible,
            groupId: this.groupId,
            layerId: this.layerId,
            style: { ...this.style },
            ...(this.textLabel ? { textLabel: { ...this.textLabel } } : {}),
        };
    }

    /** Cópia independente (novo id, novo objeto de estilo e de textLabel se houver) usada pela duplicação (Ctrl+D). */
    clone() {
        const copy = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        copy.id = nextId(this.type);
        copy.style = { ...this.style };
        if (this.textLabel) copy.textLabel = { ...this.textLabel };
        return copy;
    }
}
