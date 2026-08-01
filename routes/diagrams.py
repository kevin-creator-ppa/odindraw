"""CRUD de diagramas (persistidos como JSON em data/diagrams/)."""

from flask import Blueprint, current_app, jsonify, request

from services import diagram_service

diagrams_bp = Blueprint("diagrams", __name__, url_prefix="/api/diagrams")


@diagrams_bp.route("", methods=["GET"])
def list_diagrams():
    diagrams = diagram_service.list_diagrams(current_app.config["DIAGRAMS_DIR"])
    return jsonify(diagrams)


@diagrams_bp.route("", methods=["POST"])
def create_diagram():
    data = request.get_json(force=True)
    saved = diagram_service.create_diagram(current_app.config["DIAGRAMS_DIR"], data)
    return jsonify(saved), 201


@diagrams_bp.route("/<diagram_id>", methods=["GET"])
def get_diagram(diagram_id):
    data = diagram_service.load_diagram(current_app.config["DIAGRAMS_DIR"], diagram_id)
    if data is None:
        return jsonify({"error": "Diagrama não encontrado"}), 404
    return jsonify(data)


@diagrams_bp.route("/<diagram_id>", methods=["PUT"])
def update_diagram(diagram_id):
    data = request.get_json(force=True)
    saved = diagram_service.update_diagram(current_app.config["DIAGRAMS_DIR"], diagram_id, data)
    return jsonify(saved)


@diagrams_bp.route("/<diagram_id>", methods=["DELETE"])
def delete_diagram(diagram_id):
    deleted = diagram_service.delete_diagram(current_app.config["DIAGRAMS_DIR"], diagram_id)
    if not deleted:
        return jsonify({"error": "Diagrama não encontrado"}), 404
    return "", 204
