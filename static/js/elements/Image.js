import { Element } from "./Element.js";

/**
 * Imagem embutida no diagrama: `src` é um data URI (base64), guardado
 * inteiro no JSON do diagrama — não há armazenamento de arquivos à
 * parte no backend, então a imagem viaja junto do resto (mais simples,
 * ao custo de diagramas com imagens grandes pesarem mais).
 *
 * O carregamento é assíncrono (`Image.onload`); enquanto não termina,
 * desenha só um retângulo tracejado no lugar. Ao terminar, dispara
 * `odindraw:image-loaded` no document — ver app.js, que escuta esse
 * evento uma vez e marca o Renderer sujo pra redesenhar.
 */
export class ImageElement extends Element {
    constructor({ src, ...props } = {}) {
        super("image", props);
        this.src = src;
        this._img = null;
        if (src) this._load();
    }

    _load() {
        const img = new Image();
        img.onload = () => {
            this._img = img;
            document.dispatchEvent(new CustomEvent("odindraw:image-loaded"));
        };
        img.src = this.src;
    }

    drawShape(ctx, x, y, width, height) {
        if (this._img) {
            ctx.drawImage(this._img, x, y, width, height);
            return;
        }
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x, y, width, height);
        ctx.restore();
    }

    toSVG() {
        return `<image x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" href="${this.src}" opacity="${this.style.opacity}"${this.svgTransform()} preserveAspectRatio="none" />`;
    }

    serialize() {
        return { ...super.serialize(), src: this.src };
    }

    /** Reaproveita a imagem já carregada (mesma fonte) em vez de recarregar do zero. */
    clone() {
        const copy = super.clone();
        copy._img = this._img;
        return copy;
    }
}
