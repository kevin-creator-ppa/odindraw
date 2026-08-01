"""Biblioteca de componentes (estênceis): serve o catálogo estático de data/library/."""

import json
import os

from flask import Blueprint, current_app, jsonify

library_bp = Blueprint("library", __name__, url_prefix="/api/library")


@library_bp.route("/components", methods=["GET"])
def get_components():
    path = os.path.join(current_app.config["LIBRARY_DIR"], "components.json")
    if not os.path.isfile(path):
        return jsonify({"categories": []})

    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return jsonify(data)
