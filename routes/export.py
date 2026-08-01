"""Exportação para formatos que exigem processamento no servidor (PDF)."""

import io

from flask import Blueprint, request, send_file
from reportlab.graphics import renderPDF
from svglib.svglib import svg2rlg

export_bp = Blueprint("export", __name__, url_prefix="/api/export")


@export_bp.route("/pdf", methods=["POST"])
def export_pdf():
    """Recebe o SVG do diagrama (corpo bruto da requisição) e devolve um PDF equivalente."""
    svg_data = request.get_data(as_text=True)
    if not svg_data.strip():
        return {"error": "SVG vazio"}, 400

    drawing = svg2rlg(io.BytesIO(svg_data.encode("utf-8")))

    pdf_buffer = io.BytesIO()
    renderPDF.drawToFile(drawing, pdf_buffer)
    pdf_buffer.seek(0)

    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="diagrama.pdf",
    )
