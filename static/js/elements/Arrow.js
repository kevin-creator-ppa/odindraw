import { Line } from "./Line.js";

function drawArrowhead(ctx, from, to) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const size = 12;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

export class Arrow extends Line {
    constructor(props) {
        super({ ...props, type: "arrow" });
    }

    drawPath(ctx, a, b) {
        super.drawPath(ctx, a, b);
        drawArrowhead(ctx, a, b);
    }

    toSVG() {
        const angle = Math.atan2(this.y2 - this.y1, this.x2 - this.x1);
        const size = 12;
        const p1 = { x: this.x2 - size * Math.cos(angle - Math.PI / 6), y: this.y2 - size * Math.sin(angle - Math.PI / 6) };
        const p2 = { x: this.x2 - size * Math.cos(angle + Math.PI / 6), y: this.y2 - size * Math.sin(angle + Math.PI / 6) };
        return `<g stroke="${this.style.stroke}" stroke-width="${this.style.strokeWidth}" opacity="${this.style.opacity}">
            <line x1="${this.x1}" y1="${this.y1}" x2="${this.x2}" y2="${this.y2}" />
            <line x1="${this.x2}" y1="${this.y2}" x2="${p1.x}" y2="${p1.y}" />
            <line x1="${this.x2}" y1="${this.y2}" x2="${p2.x}" y2="${p2.y}" />
        </g>`;
    }
}
