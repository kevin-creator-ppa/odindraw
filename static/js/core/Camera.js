import { clamp } from "../utils/geometry.js";

/**
 * Estado do viewport do canvas infinito: zoom + deslocamento (pan), e a
 * conversão entre coordenadas de tela (px do canvas) e coordenadas de
 * mundo (espaço do diagrama, independente de zoom/pan).
 */
export class Camera {
    constructor({ minZoom = 0.1, maxZoom = 8 } = {}) {
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.minZoom = minZoom;
        this.maxZoom = maxZoom;
    }

    screenToWorld(x, y) {
        return {
            x: (x - this.offsetX) / this.zoom,
            y: (y - this.offsetY) / this.zoom,
        };
    }

    worldToScreen(x, y) {
        return {
            x: x * this.zoom + this.offsetX,
            y: y * this.zoom + this.offsetY,
        };
    }

    pan(dx, dy) {
        this.offsetX += dx;
        this.offsetY += dy;
    }

    /** Aplica um fator de zoom mantendo o ponto de tela (screenX, screenY) fixo sob o cursor. */
    zoomAt(screenX, screenY, factor) {
        const newZoom = clamp(this.zoom * factor, this.minZoom, this.maxZoom);
        if (newZoom === this.zoom) return;

        const worldPoint = this.screenToWorld(screenX, screenY);
        this.zoom = newZoom;
        this.offsetX = screenX - worldPoint.x * this.zoom;
        this.offsetY = screenY - worldPoint.y * this.zoom;
    }

    /** Define o zoom mantendo fixo o centro da tela (usado pelos botões +/-). */
    setZoom(zoom, viewportWidth, viewportHeight) {
        this.zoomAt(viewportWidth / 2, viewportHeight / 2, zoom / this.zoom);
    }

    reset() {
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    /** Retângulo do viewport em coordenadas de mundo — usado para culling. */
    getViewportBounds(screenWidth, screenHeight) {
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(screenWidth, screenHeight);
        return {
            x: topLeft.x,
            y: topLeft.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y,
        };
    }
}
