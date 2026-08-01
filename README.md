# OdinDraw

Editor de diagramas web (redes, fluxogramas, arquiteturas, desenho livre), inspirado no Excalidraw e no draw.io.

Backend em Flask (Python 3.13+), frontend em JavaScript vanilla (módulos ES6, sem build step) e renderização em HTML5 Canvas.

## Status

Projeto em desenvolvimento incremental. Etapa atual: **2 — estrutura inicial do Flask** (shell da UI, sem canvas funcional ainda).

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
```

## Executar

```bash
python app.py
```

Acesse `http://localhost:5000`.

## Estrutura do projeto

```
app.py             # ponto de entrada (app factory)
config.py          # configurações por ambiente
models/            # modelos de dados (diagramas, elementos, conexões)
routes/            # blueprints Flask
services/          # regras de negócio (persistência, exportação)
utils/             # utilitários do backend
data/
├── diagrams/      # diagramas salvos em JSON
└── library/       # biblioteca de componentes (redes, fluxograma, formas)
static/
├── css/           # estilos (tema claro/escuro)
├── js/            # frontend vanilla (core, elements, tools, managers, ui, io)
├── icons/
└── images/
templates/
└── index.html     # shell da aplicação
```
