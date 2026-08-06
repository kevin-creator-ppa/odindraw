/**
 * Estilo padrão para novos elementos (como o "Definir como padrão" do
 * draw.io): quando o usuário fixa o estilo de uma forma selecionada,
 * toda forma nova desenhada a partir daí nasce com essas mesmas
 * propriedades. Persiste em localStorage pra sobreviver a reload;
 * `overrides: null` = usa o padrão de fábrica de cada Element
 * (defaultStyle() em Element.js).
 */
const STORAGE_KEY = "odindraw:default-style";
const FIELDS = ["fill", "stroke", "strokeWidth", "strokeStyle", "opacity", "shadow", "fill2", "fillPattern"];

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export const defaultStyleState = { overrides: load() };

export function setDefaultStyleFromElement(element) {
    const overrides = {};
    FIELDS.forEach((key) => {
        if (element.style[key] !== undefined) overrides[key] = element.style[key];
    });
    defaultStyleState.overrides = overrides;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

/** Aplica o estilo padrão salvo (se houver) num Element recém-criado, antes de entrar na Scene. */
export function applyDefaultStyle(element) {
    if (!defaultStyleState.overrides || !element.style) return element;
    Object.assign(element.style, defaultStyleState.overrides);
    return element;
}
