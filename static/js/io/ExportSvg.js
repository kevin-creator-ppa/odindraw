import { buildSvgString } from "./svgBuilder.js";
import { downloadBlob } from "./download.js";

export function exportSvg(scene, filename = "diagrama.svg") {
    const svg = buildSvgString(scene);
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), filename);
}
