"""Configurações da aplicação Flask por ambiente."""

import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DIAGRAMS_DIR = os.path.join(DATA_DIR, "diagrams")
LIBRARY_DIR = os.path.join(DATA_DIR, "library")


class Config:
    """Configuração base, compartilhada por todos os ambientes."""

    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    JSON_SORT_KEYS = False
    DATA_DIR = DATA_DIR
    DIAGRAMS_DIR = DIAGRAMS_DIR
    LIBRARY_DIR = LIBRARY_DIR
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB (limite de upload/importação)


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
