"""Persistência de diagramas: cada um é um arquivo JSON em data/diagrams/."""

import json
import os
import uuid
from datetime import datetime, timezone


def _diagram_path(diagrams_dir, diagram_id):
    return os.path.join(diagrams_dir, f"{diagram_id}.json")


def _now():
    return datetime.now(timezone.utc).isoformat()


def list_diagrams(diagrams_dir):
    """Metadados (id, nome, atualizado em) de todos os diagramas, mais recentes primeiro."""
    diagrams = []
    for filename in os.listdir(diagrams_dir):
        if not filename.endswith(".json"):
            continue
        with open(os.path.join(diagrams_dir, filename), encoding="utf-8") as f:
            data = json.load(f)
        metadata = data.get("metadata", {})
        diagrams.append(
            {
                "id": os.path.splitext(filename)[0],
                "name": metadata.get("name", "Sem título"),
                "updated_at": metadata.get("updated_at"),
            }
        )
    diagrams.sort(key=lambda d: d.get("updated_at") or "", reverse=True)
    return diagrams


def load_diagram(diagrams_dir, diagram_id):
    path = _diagram_path(diagrams_dir, diagram_id)
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    data["id"] = diagram_id
    return data


def create_diagram(diagrams_dir, data):
    diagram_id = uuid.uuid4().hex
    now = _now()
    data.setdefault("metadata", {})
    data["metadata"]["created_at"] = now
    data["metadata"]["updated_at"] = now
    _write(diagrams_dir, diagram_id, data)
    data["id"] = diagram_id
    return data


def update_diagram(diagrams_dir, diagram_id, data):
    existing = load_diagram(diagrams_dir, diagram_id)
    created_at = existing["metadata"].get("created_at") if existing else _now()
    data.setdefault("metadata", {})
    data["metadata"]["created_at"] = created_at
    data["metadata"]["updated_at"] = _now()
    _write(diagrams_dir, diagram_id, data)
    data["id"] = diagram_id
    return data


def delete_diagram(diagrams_dir, diagram_id):
    path = _diagram_path(diagrams_dir, diagram_id)
    if not os.path.isfile(path):
        return False
    os.remove(path)
    return True


def _write(diagrams_dir, diagram_id, data):
    with open(_diagram_path(diagrams_dir, diagram_id), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
