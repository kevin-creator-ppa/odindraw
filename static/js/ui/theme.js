/** Cor de traço/texto sensata pro tema atual — usada como padrão de novos elementos (senão nascem invisíveis no escuro). */
export function defaultInkColor() {
    const theme = document.documentElement.getAttribute("data-theme");
    return theme === "dark" ? "#e9e9ec" : "#1e1e1e";
}

/** Sentinela: cor "segue o tema atual" em vez de um hex congelado — permite recolorir ao trocar de tema. */
export const AUTO_INK = "auto";

/** Resolve o sentinela AUTO_INK pra cor real do tema atual; qualquer outro valor (hex, "transparent") passa direto. */
export function resolveInkColor(value) {
    return value === AUTO_INK ? defaultInkColor() : value;
}
