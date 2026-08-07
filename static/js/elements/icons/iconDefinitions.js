/**
 * Pictogramas originais (não reproduzem ícones de nenhum produto ou
 * marca específicos — incluindo os "de fabricante" abaixo, que usam a
 * mesma base geométrica genérica do roteador com um selo distintivo,
 * não logos) em viewBox 0-100, feitos só de primitivas simples
 * (rect/circle/line/polygon/path) — interpretadas por iconRenderer.js
 * tanto no canvas quanto no SVG exportado.
 */

const DATABASE_CYLINDER = [
    { type: "path", d: "M 15 25 A 35 10 0 0 0 85 25 A 35 10 0 0 0 15 25" },
    { type: "line", x1: 15, y1: 25, x2: 15, y2: 75 },
    { type: "line", x1: 85, y1: 25, x2: 85, y2: 75 },
    { type: "path", d: "M 15 75 A 35 10 0 0 0 85 75" },
];

const OVAL_OUTLINE = [{ type: "path", d: "M 10 50 A 40 25 0 0 1 90 50 A 40 25 0 0 1 10 50 Z" }];

const ROUTER_BASE = [
    { type: "rect", x: 10, y: 35, w: 80, h: 30 },
    { type: "path", d: "M 30 50 L 70 50 M 63 43 L 70 50 L 63 57" },
    { type: "path", d: "M 30 35 L 30 20 M 23 27 L 30 20 L 37 27" },
    { type: "path", d: "M 70 35 L 70 20 M 63 27 L 70 20 L 77 27" },
];

export const ICONS = {
    // Redes
    router: ROUTER_BASE,
    switch: [
        { type: "rect", x: 6, y: 32, w: 88, h: 36 },
        { type: "line", x1: 14, y1: 44, x2: 86, y2: 44 },
        { type: "rect", x: 12, y: 56, w: 8, h: 8, fill: true },
        { type: "rect", x: 26, y: 56, w: 8, h: 8, fill: true },
        { type: "rect", x: 40, y: 56, w: 8, h: 8, fill: true },
        { type: "rect", x: 54, y: 56, w: 8, h: 8, fill: true },
        { type: "rect", x: 68, y: 56, w: 8, h: 8, fill: true },
        { type: "rect", x: 80, y: 56, w: 8, h: 8, fill: true },
    ],
    // Roteadores "de fabricante": mesma base genérica + um selo geométrico distinto (não é logo de marca nenhuma).
    mikrotik: [...ROUTER_BASE, { type: "circle", cx: 82, cy: 22, r: 7, fill: true }],
    juniper: [...ROUTER_BASE, { type: "polygon", points: [[82, 14], [90, 22], [82, 30], [74, 22]], fill: true }],
    huawei: [...ROUTER_BASE, { type: "polygon", points: [[82, 14], [90, 28], [74, 28]], fill: true }],
    olt: [
        { type: "rect", x: 6, y: 28, w: 88, h: 34 },
        { type: "rect", x: 12, y: 36, w: 9, h: 9 },
        { type: "rect", x: 24, y: 36, w: 9, h: 9 },
        { type: "rect", x: 36, y: 36, w: 9, h: 9 },
        { type: "rect", x: 48, y: 36, w: 9, h: 9 },
        { type: "rect", x: 60, y: 36, w: 9, h: 9 },
        { type: "rect", x: 72, y: 36, w: 9, h: 9 },
        { type: "line", x1: 12, y1: 54, x2: 88, y2: 54 },
        { type: "polygon", points: [[46, 62], [54, 62], [50, 70]], fill: true },
        { type: "line", x1: 50, y1: 70, x2: 50, y2: 82 },
    ],
    onu: [
        { type: "rect", x: 18, y: 30, w: 64, h: 34 },
        { type: "circle", cx: 30, cy: 47, r: 4 },
        { type: "rect", x: 44, y: 43, w: 10, h: 8 },
        { type: "rect", x: 60, y: 43, w: 10, h: 8 },
        { type: "path", d: "M30 30 L30 18 M26 22 L30 18 L34 22" },
    ],
    "rack-bayface": [
        { type: "rect", x: 5, y: 40, w: 90, h: 20 },
        { type: "rect", x: 10, y: 45, w: 6, h: 6 },
        { type: "rect", x: 19, y: 45, w: 6, h: 6 },
        { type: "rect", x: 28, y: 45, w: 6, h: 6 },
        { type: "rect", x: 37, y: 45, w: 6, h: 6 },
        { type: "rect", x: 46, y: 45, w: 6, h: 6 },
        { type: "rect", x: 55, y: 45, w: 6, h: 6 },
        { type: "rect", x: 64, y: 45, w: 6, h: 6 },
        { type: "rect", x: 73, y: 45, w: 6, h: 6 },
        { type: "rect", x: 82, y: 45, w: 6, h: 6 },
    ],
    modem: [
        { type: "rect", x: 15, y: 35, w: 70, h: 28 },
        { type: "circle", cx: 27, cy: 49, r: 3, fill: true },
        { type: "circle", cx: 38, cy: 49, r: 3, fill: true },
        { type: "circle", cx: 49, cy: 49, r: 3, fill: true },
        { type: "path", d: "M70 35 Q76 24 85 20" },
    ],
    ups: [
        { type: "rect", x: 28, y: 12, w: 44, h: 76 },
        { type: "polygon", points: [[52, 26], [40, 54], [50, 54], [44, 76], [62, 44], [51, 44]], fill: true },
    ],
    firewall: [
        { type: "rect", x: 10, y: 10, w: 80, h: 80 },
        { type: "line", x1: 10, y1: 30, x2: 90, y2: 30 },
        { type: "line", x1: 10, y1: 50, x2: 90, y2: 50 },
        { type: "line", x1: 10, y1: 70, x2: 90, y2: 70 },
        { type: "line", x1: 30, y1: 10, x2: 30, y2: 30 },
        { type: "line", x1: 70, y1: 30, x2: 70, y2: 50 },
        { type: "line", x1: 30, y1: 50, x2: 30, y2: 70 },
        { type: "line", x1: 70, y1: 70, x2: 70, y2: 90 },
        { type: "line", x1: 50, y1: 10, x2: 50, y2: 30 },
        { type: "line", x1: 50, y1: 50, x2: 50, y2: 70 },
    ],
    firewall: [
        { type: "rect", x: 10, y: 10, w: 80, h: 80 },
        { type: "line", x1: 10, y1: 30, x2: 90, y2: 30 },
        { type: "line", x1: 10, y1: 50, x2: 90, y2: 50 },
        { type: "line", x1: 10, y1: 70, x2: 90, y2: 70 },
        { type: "line", x1: 30, y1: 10, x2: 30, y2: 30 },
        { type: "line", x1: 70, y1: 30, x2: 70, y2: 50 },
        { type: "line", x1: 30, y1: 50, x2: 30, y2: 70 },
        { type: "line", x1: 70, y1: 70, x2: 70, y2: 90 },
        { type: "line", x1: 50, y1: 10, x2: 50, y2: 30 },
        { type: "line", x1: 50, y1: 50, x2: 50, y2: 70 },
    ],
    server: [
        { type: "rect", x: 25, y: 8, w: 50, h: 84 },
        { type: "line", x1: 25, y1: 32, x2: 75, y2: 32 },
        { type: "line", x1: 25, y1: 56, x2: 75, y2: 56 },
        { type: "circle", cx: 66, cy: 20, r: 3, fill: true },
        { type: "circle", cx: 66, cy: 44, r: 3, fill: true },
        { type: "circle", cx: 66, cy: 68, r: 3, fill: true },
    ],
    rack: [
        { type: "rect", x: 20, y: 6, w: 60, h: 88 },
        { type: "line", x1: 20, y1: 22, x2: 80, y2: 22 },
        { type: "line", x1: 20, y1: 38, x2: 80, y2: 38 },
        { type: "line", x1: 20, y1: 54, x2: 80, y2: 54 },
        { type: "line", x1: 20, y1: 70, x2: 80, y2: 70 },
        { type: "line", x1: 20, y1: 86, x2: 80, y2: 86 },
    ],
    "ap-wifi": [
        { type: "rect", x: 35, y: 75, w: 30, h: 10 },
        { type: "circle", cx: 50, cy: 75, r: 4, fill: true },
        { type: "path", d: "M 30 55 A 28 28 0 0 1 70 55" },
        { type: "path", d: "M 20 40 A 42 42 0 0 1 80 40" },
    ],
    computer: [
        { type: "rect", x: 10, y: 15, w: 80, h: 50 },
        { type: "line", x1: 40, y1: 65, x2: 40, y2: 78 },
        { type: "line", x1: 60, y1: 65, x2: 60, y2: 78 },
        { type: "line", x1: 25, y1: 82, x2: 75, y2: 82 },
    ],
    notebook: [
        { type: "rect", x: 20, y: 15, w: 60, h: 45 },
        { type: "polygon", points: [[10, 68], [90, 68], [80, 80], [20, 80]] },
    ],
    printer: [
        { type: "rect", x: 20, y: 35, w: 60, h: 35 },
        { type: "rect", x: 30, y: 12, w: 40, h: 25 },
        { type: "rect", x: 30, y: 62, w: 40, h: 26 },
        { type: "circle", cx: 70, cy: 45, r: 3, fill: true },
    ],
    internet: [
        { type: "circle", cx: 50, cy: 50, r: 40 },
        { type: "line", x1: 10, y1: 50, x2: 90, y2: 50 },
        { type: "line", x1: 50, y1: 10, x2: 50, y2: 90 },
        { type: "path", d: "M 18 30 Q 50 45 82 30" },
        { type: "path", d: "M 18 70 Q 50 55 82 70" },
    ],
    cloud: [
        {
            type: "path",
            d: "M 25 65 A 15 15 0 0 1 25 35 A 20 20 0 0 1 63 25 A 17 17 0 0 1 80 42 A 14 14 0 0 1 78 65 Z",
        },
    ],
    datacenter: [
        { type: "rect", x: 10, y: 40, w: 20, h: 50 },
        { type: "rect", x: 34, y: 25, w: 20, h: 65 },
        { type: "rect", x: 58, y: 45, w: 20, h: 45 },
        { type: "line", x1: 10, y1: 40, x2: 20, y2: 15 },
        { type: "line", x1: 20, y1: 15, x2: 78, y2: 15 },
        { type: "line", x1: 78, y1: 15, x2: 78, y2: 45 },
    ],

    // Fluxograma
    process: [{ type: "rect", x: 10, y: 20, w: 80, h: 60 }],
    decision: [{ type: "polygon", points: [[50, 10], [90, 50], [50, 90], [10, 50]] }],
    "input-output": [{ type: "polygon", points: [[25, 20], [95, 20], [75, 80], [5, 80]] }],
    document: [{ type: "path", d: "M 10 15 L 90 15 L 90 75 Q 70 85 50 75 Q 30 65 10 75 Z" }],
    database: DATABASE_CYLINDER,
    connector: [{ type: "circle", cx: 50, cy: 50, r: 38 }],

    // UML
    "uml-class": [
        { type: "rect", x: 15, y: 10, w: 70, h: 80 },
        { type: "line", x1: 15, y1: 34, x2: 85, y2: 34 },
        { type: "line", x1: 15, y1: 58, x2: 85, y2: 58 },
    ],
    "uml-actor": [
        { type: "circle", cx: 50, cy: 20, r: 10 },
        { type: "line", x1: 50, y1: 30, x2: 50, y2: 65 },
        { type: "line", x1: 25, y1: 42, x2: 75, y2: 42 },
        { type: "line", x1: 50, y1: 65, x2: 30, y2: 90 },
        { type: "line", x1: 50, y1: 65, x2: 70, y2: 90 },
    ],
    "uml-interface": [
        { type: "circle", cx: 50, cy: 55, r: 28 },
        { type: "line", x1: 50, y1: 12, x2: 50, y2: 27 },
    ],
    "uml-usecase": OVAL_OUTLINE,
    "uml-note": [
        { type: "path", d: "M 15 10 L 70 10 L 85 25 L 85 90 L 15 90 Z" },
        { type: "path", d: "M 70 10 L 70 25 L 85 25" },
        { type: "line", x1: 25, y1: 45, x2: 75, y2: 45 },
        { type: "line", x1: 25, y1: 60, x2: 75, y2: 60 },
    ],

    // Entidade-Relacionamento
    "er-entity": [
        { type: "rect", x: 10, y: 25, w: 80, h: 50 },
        { type: "line", x1: 10, y1: 42, x2: 90, y2: 42 },
    ],
    "er-attribute": OVAL_OUTLINE,
    "er-relationship": [{ type: "polygon", points: [[50, 10], [90, 50], [50, 90], [10, 50]] }],

    // Nuvem (pictogramas genéricos, sem logo de nenhum provedor específico)
    "cloud-compute": [
        { type: "rect", x: 25, y: 25, w: 50, h: 50 },
        { type: "rect", x: 40, y: 40, w: 20, h: 20 },
        { type: "line", x1: 25, y1: 15, x2: 25, y2: 25 },
        { type: "line", x1: 45, y1: 15, x2: 45, y2: 25 },
        { type: "line", x1: 55, y1: 15, x2: 55, y2: 25 },
        { type: "line", x1: 75, y1: 15, x2: 75, y2: 25 },
        { type: "line", x1: 25, y1: 75, x2: 25, y2: 85 },
        { type: "line", x1: 45, y1: 75, x2: 45, y2: 85 },
        { type: "line", x1: 55, y1: 75, x2: 55, y2: 85 },
        { type: "line", x1: 75, y1: 75, x2: 75, y2: 85 },
        { type: "line", x1: 15, y1: 25, x2: 25, y2: 25 },
        { type: "line", x1: 15, y1: 45, x2: 25, y2: 45 },
        { type: "line", x1: 15, y1: 55, x2: 25, y2: 55 },
        { type: "line", x1: 15, y1: 75, x2: 25, y2: 75 },
        { type: "line", x1: 75, y1: 25, x2: 85, y2: 25 },
        { type: "line", x1: 75, y1: 45, x2: 85, y2: 45 },
        { type: "line", x1: 75, y1: 55, x2: 85, y2: 55 },
        { type: "line", x1: 75, y1: 75, x2: 85, y2: 75 },
    ],
    "cloud-storage": [
        { type: "line", x1: 15, y1: 12, x2: 85, y2: 12 },
        { type: "path", d: "M 20 20 L 80 20 L 72 85 L 28 85 Z" },
    ],
    "cloud-database": DATABASE_CYLINDER,
    "cloud-lb": [
        { type: "circle", cx: 50, cy: 18, r: 9 },
        { type: "line", x1: 50, y1: 27, x2: 50, y2: 50 },
        { type: "line", x1: 20, y1: 50, x2: 80, y2: 50 },
        { type: "line", x1: 20, y1: 50, x2: 20, y2: 68 },
        { type: "line", x1: 50, y1: 50, x2: 50, y2: 68 },
        { type: "line", x1: 80, y1: 50, x2: 80, y2: 68 },
        { type: "rect", x: 12, y: 68, w: 16, h: 16 },
        { type: "rect", x: 42, y: 68, w: 16, h: 16 },
        { type: "rect", x: 72, y: 68, w: 16, h: 16 },
    ],
    "cloud-function": [{ type: "path", d: "M 55 8 L 25 55 L 45 55 L 40 92 L 78 42 L 55 42 Z", fill: true }],
    "cloud-queue": [
        { type: "rect", x: 10, y: 20, w: 26, h: 20 },
        { type: "rect", x: 37, y: 20, w: 26, h: 20 },
        { type: "rect", x: 64, y: 20, w: 26, h: 20 },
        { type: "path", d: "M 10 55 L 90 55 M 78 47 L 90 55 L 78 63" },
    ],

    // "AWS"/"Azure" (genérico) — pictogramas originais só nomeados pelo tipo de
    // serviço (computação/armazenamento/banco/função/fila/balanceador), sem
    // reproduzir os ícones oficiais de nenhum provedor — mesmo princípio dos
    // roteadores "de fabricante" acima.
    "aws-ec2": [
        { type: "rect", x: 20, y: 25, w: 60, h: 50 },
        { type: "line", x1: 8, y1: 35, x2: 20, y2: 35 },
        { type: "line", x1: 8, y1: 50, x2: 20, y2: 50 },
        { type: "line", x1: 8, y1: 65, x2: 20, y2: 65 },
        { type: "line", x1: 80, y1: 35, x2: 92, y2: 35 },
        { type: "line", x1: 80, y1: 50, x2: 92, y2: 50 },
        { type: "line", x1: 80, y1: 65, x2: 92, y2: 65 },
    ],
    "aws-s3": [
        { type: "path", d: "M 25 25 L 75 25 L 68 88 L 32 88 Z" },
        { type: "path", d: "M 35 25 Q 50 6 65 25" },
    ],
    "aws-rds": DATABASE_CYLINDER,
    "aws-lambda": [{ type: "path", d: "M 30 12 L 50 50 L 30 88 M 45 40 L 72 88" }],
    "aws-sqs": [
        { type: "rect", x: 12, y: 25, w: 76, h: 50 },
        { type: "path", d: "M 12 25 L 50 55 L 88 25" },
    ],
    "aws-elb": [
        { type: "polygon", points: [[20, 18], [80, 18], [50, 58]] },
        { type: "line", x1: 50, y1: 58, x2: 50, y2: 82 },
        { type: "line", x1: 28, y1: 82, x2: 72, y2: 82 },
    ],
    "azure-vm": [
        { type: "rect", x: 14, y: 18, w: 72, h: 46 },
        { type: "line", x1: 40, y1: 64, x2: 40, y2: 80 },
        { type: "line", x1: 60, y1: 64, x2: 60, y2: 80 },
        { type: "line", x1: 28, y1: 80, x2: 72, y2: 80 },
    ],
    "azure-blob": [
        {
            type: "path",
            d: "M 50 8 C 32 38 20 58 20 72 C 20 87 34 93 50 93 C 66 93 80 87 80 72 C 80 58 68 38 50 8 Z",
        },
    ],
    "azure-sql": [
        { type: "rect", x: 14, y: 18, w: 72, h: 64 },
        { type: "line", x1: 14, y1: 40, x2: 86, y2: 40 },
        { type: "line", x1: 14, y1: 62, x2: 86, y2: 62 },
        { type: "line", x1: 50, y1: 18, x2: 50, y2: 82 },
    ],
    "azure-functions": [{ type: "path", d: "M 60 8 L 35 50 L 52 50 L 45 92 L 75 45 L 58 45 Z", fill: true }],
    "azure-servicebus": [
        { type: "rect", x: 10, y: 40, w: 62, h: 20 },
        { type: "path", d: "M 68 30 L 90 50 L 68 70" },
    ],
    "azure-lb": [
        { type: "circle", cx: 50, cy: 18, r: 10 },
        { type: "line", x1: 50, y1: 28, x2: 50, y2: 50 },
        { type: "line", x1: 25, y1: 50, x2: 75, y2: 50 },
        { type: "line", x1: 25, y1: 50, x2: 25, y2: 85 },
        { type: "line", x1: 75, y1: 50, x2: 75, y2: 85 },
    ],

    // BPMN
    "bpmn-start": [{ type: "circle", cx: 50, cy: 50, r: 35 }],
    "bpmn-end": [
        { type: "circle", cx: 50, cy: 50, r: 35 },
        { type: "circle", cx: 50, cy: 50, r: 28 },
    ],
    "bpmn-intermediate": [
        { type: "circle", cx: 50, cy: 50, r: 35 },
        { type: "circle", cx: 50, cy: 50, r: 29 },
    ],
    "bpmn-task": [{ type: "rect", x: 8, y: 22, w: 84, h: 56 }],
    "bpmn-gateway-exclusive": [
        { type: "polygon", points: [[50, 5], [95, 50], [50, 95], [5, 50]] },
        { type: "line", x1: 36, y1: 36, x2: 64, y2: 64 },
        { type: "line", x1: 64, y1: 36, x2: 36, y2: 64 },
    ],
    "bpmn-gateway-parallel": [
        { type: "polygon", points: [[50, 5], [95, 50], [50, 95], [5, 50]] },
        { type: "line", x1: 50, y1: 32, x2: 50, y2: 68 },
        { type: "line", x1: 32, y1: 50, x2: 68, y2: 50 },
    ],
    "bpmn-pool": [
        { type: "rect", x: 5, y: 15, w: 90, h: 70 },
        { type: "line", x1: 25, y1: 15, x2: 25, y2: 85 },
    ],

    // Wireframe / mockup
    "mockup-button": [
        { type: "rect", x: 15, y: 35, w: 70, h: 30 },
        { type: "line", x1: 30, y1: 50, x2: 70, y2: 50 },
    ],
    "mockup-input": [
        { type: "rect", x: 10, y: 40, w: 80, h: 22 },
        { type: "line", x1: 18, y1: 51, x2: 55, y2: 51 },
    ],
    "mockup-browser": [
        { type: "rect", x: 5, y: 15, w: 90, h: 70 },
        { type: "line", x1: 5, y1: 32, x2: 95, y2: 32 },
        { type: "circle", cx: 15, cy: 23, r: 3, fill: true },
        { type: "circle", cx: 25, cy: 23, r: 3, fill: true },
        { type: "circle", cx: 35, cy: 23, r: 3, fill: true },
    ],
    "mockup-checkbox": [
        { type: "rect", x: 15, y: 15, w: 30, h: 30 },
        { type: "path", d: "M 21 30 L 28 38 L 40 20" },
        { type: "line", x1: 55, y1: 30, x2: 90, y2: 30 },
    ],
    "mockup-progress": [
        { type: "rect", x: 5, y: 42, w: 90, h: 16 },
        { type: "rect", x: 5, y: 42, w: 55, h: 16, fill: true },
    ],

    // Formas
    rectangle: [{ type: "rect", x: 10, y: 20, w: 80, h: 60 }],
    square: [{ type: "rect", x: 15, y: 15, w: 70, h: 70 }],
    diamond: [{ type: "polygon", points: [[50, 8], [92, 50], [50, 92], [8, 50]] }],
    hexagon: [{ type: "polygon", points: [[50, 8], [86, 29], [86, 71], [50, 92], [14, 71], [14, 29]] }],
    // Mjölnir — martelo de Thor, um aceno ao nome do projeto (OdinDraw). Silhueta original e genérica.
    triangle: [
        { type: "polygon", points: [[10, 12], [90, 12], [80, 40], [20, 40]] },
        { type: "line", x1: 18, y1: 26, x2: 82, y2: 26 },
        { type: "rect", x: 42, y: 40, w: 16, h: 40 },
        { type: "circle", cx: 50, cy: 86, r: 7 },
    ],
    pentagon: [{ type: "polygon", points: [[50, 8], [90, 37], [75, 84], [25, 84], [10, 37]] }],
    star: [
        {
            type: "polygon",
            points: [
                [50, 5], [61, 35], [93, 36], [67, 56], [76, 86],
                [50, 68], [24, 86], [33, 56], [7, 36], [39, 35],
            ],
        },
    ],
};
