"""Ponto de entrada da aplicação Flask (padrão app factory)."""

import os

from flask import Flask

from config import config_by_name


def create_app(config_name=None):
    """Cria e configura a instância da aplicação Flask.

    O padrão factory permite múltiplas configurações (dev/prod) e
    registrar blueprints adicionais (auth, websocket, API) no futuro
    sem alterar o ponto de entrada.
    """
    config_name = config_name or os.environ.get("FLASK_ENV", "default")
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    os.makedirs(app.config["DIAGRAMS_DIR"], exist_ok=True)
    os.makedirs(app.config["LIBRARY_DIR"], exist_ok=True)

    from routes.main import main_bp
    from routes.diagrams import diagrams_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(diagrams_bp)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=app.config["DEBUG"])
