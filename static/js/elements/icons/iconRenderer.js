/** Interpreta os comandos declarativos de icons/iconDefinitions.js — mesma fonte para canvas e SVG. */

function drawCommand(ctx, cmd) {
    switch (cmd.type) {
        case "rect":
            if (cmd.fill) ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);
            else ctx.strokeRect(cmd.x, cmd.y, cmd.w, cmd.h);
            return;
        case "circle":
            ctx.beginPath();
            ctx.arc(cmd.cx, cmd.cy, cmd.r, 0, Math.PI * 2);
            cmd.fill ? ctx.fill() : ctx.stroke();
            return;
        case "line":
            ctx.beginPath();
            ctx.moveTo(cmd.x1, cmd.y1);
            ctx.lineTo(cmd.x2, cmd.y2);
            ctx.stroke();
            return;
        case "polygon":
            ctx.beginPath();
            cmd.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
            ctx.closePath();
            cmd.fill ? ctx.fill() : ctx.stroke();
            return;
        case "path": {
            const path = new Path2D(cmd.d);
            cmd.fill ? ctx.fill(path) : ctx.stroke(path);
            return;
        }
        default:
            return;
    }
}

/** Desenha um ícone (lista de comandos, viewBox `viewBox`x`viewBox`) escalado para caber em (x,y,width,height). */
export function drawIconOnCanvas(ctx, commands, x, y, width, height, color, viewBox = 100) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(width / viewBox, height / viewBox);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    commands.forEach((cmd) => drawCommand(ctx, cmd));
    ctx.restore();
}

function commandToSvg(cmd) {
    switch (cmd.type) {
        case "rect":
            return `<rect x="${cmd.x}" y="${cmd.y}" width="${cmd.w}" height="${cmd.h}"${cmd.fill ? "" : ' fill="none"'} />`;
        case "circle":
            return `<circle cx="${cmd.cx}" cy="${cmd.cy}" r="${cmd.r}"${cmd.fill ? "" : ' fill="none"'} />`;
        case "line":
            return `<line x1="${cmd.x1}" y1="${cmd.y1}" x2="${cmd.x2}" y2="${cmd.y2}" fill="none" />`;
        case "polygon":
            return `<polygon points="${cmd.points.map((p) => p.join(",")).join(" ")}"${cmd.fill ? "" : ' fill="none"'} />`;
        case "path":
            return `<path d="${cmd.d}"${cmd.fill ? "" : ' fill="none"'} />`;
        default:
            return "";
    }
}

/** Equivalente SVG de drawIconOnCanvas: um `<g>` posicionado/escalado contendo os comandos. */
export function iconToSvgMarkup(commands, x, y, width, height, color, viewBox = 100) {
    const scaleX = width / viewBox;
    const scaleY = height / viewBox;
    const body = commands.map(commandToSvg).join("");
    return `<g transform="translate(${x} ${y}) scale(${scaleX} ${scaleY})" stroke="${color}" fill="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
}
