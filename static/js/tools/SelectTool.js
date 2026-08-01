import { Tool } from "./Tool.js";

/**
 * Ferramenta padrão. A seleção de elementos (clique, marquee, alças de
 * redimensionar/rotacionar) chega na Etapa 5, quando existem objetos
 * reais na Scene; por ora só define o cursor padrão do editor.
 */
export class SelectTool extends Tool {
    constructor() {
        super("select", { cursor: "default" });
    }
}
