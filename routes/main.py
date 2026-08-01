"""Rotas de páginas principais (shell da aplicação)."""

from flask import Blueprint, render_template

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    """Serve o shell da SPA: top bar, sidebars e canvas."""
    return render_template("index.html")
