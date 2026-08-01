import { buildSvgString } from "./svgBuilder.js";
import { downloadBlob } from "./download.js";

export async function exportPdf(scene, filename = "diagrama.pdf") {
    const svg = buildSvgString(scene);

    const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "image/svg+xml" },
        body: svg,
    });
    if (!response.ok) throw new Error("Falha ao exportar PDF.");

    const blob = await response.blob();
    downloadBlob(blob, filename);
}
