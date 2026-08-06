import { computeExportFrame } from "./svgBuilder.js";
import { downloadBlob } from "./download.js";

/** Câmera "de exportação": zoom 1, deslocada para trazer o bounding box da cena à origem. */
function exportCamera(frame) {
    return {
        zoom: 1,
        offsetX: frame.offsetX,
        offsetY: frame.offsetY,
        worldToScreen(x, y) {
            return { x: x + this.offsetX, y: y + this.offsetY };
        },
    };
}

function renderSceneToCanvas(scene) {
    const frame = computeExportFrame(scene);
    const scale = window.devicePixelRatio || 1;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(frame.width * scale);
    canvas.height = Math.round(frame.height * scale);

    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, frame.width, frame.height);

    const camera = exportCamera(frame);
    const sorted = [...scene.objects].filter((el) => scene.isElementVisible(el)).sort((a, b) => scene.stackCompare(a, b));
    sorted.forEach((element) => element.render(ctx, camera, scene));

    return canvas;
}

export function exportPng(scene, filename = "diagrama.png") {
    const canvas = renderSceneToCanvas(scene);
    canvas.toBlob((blob) => downloadBlob(blob, filename), "image/png");
}

/** Copia o diagrama pra área de transferência como PNG (Ctrl+Alt+C, como o draw.io) — cola direto no Slack/Word/etc. */
export function copyPngToClipboard(scene) {
    const canvas = renderSceneToCanvas(scene);
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("Falha ao gerar a imagem"));
                return;
            }
            navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]).then(resolve, reject);
        }, "image/png");
    });
}
