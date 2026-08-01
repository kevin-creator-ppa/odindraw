/**
 * Pictogramas originais (não reproduzem ícones de nenhum produto ou
 * marca específicos — incluindo os "de fabricante" abaixo, que usam a
 * mesma base geométrica genérica do roteador com um selo distintivo,
 * não logos) em viewBox 0-100, feitos só de primitivas simples
 * (rect/circle/line/polygon/path) — interpretadas por iconRenderer.js
 * tanto no canvas quanto no SVG exportado.
 */

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
    database: [
        { type: "path", d: "M 15 25 A 35 10 0 0 0 85 25 A 35 10 0 0 0 15 25" },
        { type: "line", x1: 15, y1: 25, x2: 15, y2: 75 },
        { type: "line", x1: 85, y1: 25, x2: 85, y2: 75 },
        { type: "path", d: "M 15 75 A 35 10 0 0 0 85 75" },
    ],
    connector: [{ type: "circle", cx: 50, cy: 50, r: 38 }],

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
