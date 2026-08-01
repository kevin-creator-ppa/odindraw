/** Cor de traço/texto sensata pro tema atual — usada como padrão de novos elementos (senão nascem invisíveis no escuro). */
export function defaultInkColor() {
    const theme = document.documentElement.getAttribute("data-theme");
    return theme === "dark" ? "#e9e9ec" : "#1e1e1e";
}
