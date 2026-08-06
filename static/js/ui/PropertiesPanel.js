import { duplicateSelected, deleteSelected } from "../managers/objectActions.js";
import {
    alignLeft,
    alignRight,
    alignCenterH,
    alignTop,
    alignBottom,
    alignMiddleV,
    distributeHorizontal,
    distributeVertical,
} from "../managers/alignActions.js";
import { LINE_TYPES, RESIZABLE_TYPES } from "../elements/typeGroups.js";
import { resolveInkColor } from "./theme.js";
import { MARKER_TYPES } from "../elements/arrowhead.js";
import { setDefaultStyleFromElement } from "../elements/defaultStyleState.js";

/**
 * Liga os controles da sidebar direita à seleção atual: lê o estado do
 * primeiro elemento selecionado quando a seleção muda e escreve de
 * volta em TODOS os selecionados a cada edição (edição em lote). Sem
 * seleção, os controles ficam desabilitados.
 *
 * Painel organizado em 3 abas, como o draw.io: Estilo (cor/traço/setas/
 * rota), Texto (fonte/estilo/alinhamento — só relevante pra type
 * "text") e Organizar (tamanho/rotação/camada/ações).
 *
 * Edições "ao vivo" (arrastar um slider) atualizam o desenho a cada
 * evento `input`, mas só entram no histórico de desfazer quando o
 * usuário termina o gesto (`change`) — senão cada pixel de um arraste
 * de opacidade viraria um passo de undo.
 */
export class PropertiesPanel {
    constructor({ scene, selectionManager, renderer, eventBus, historyManager, pageManager }) {
        this.scene = scene;
        this.selectionManager = selectionManager;
        this.renderer = renderer;
        this.historyManager = historyManager;
        this.pageManager = pageManager;
        this._current = null;
        this._selection = [];

        this.fill = document.querySelector('[data-prop="fill"]');
        this.stroke = document.querySelector('[data-prop="stroke"]');
        this.strokeWidthGroup = document.querySelector('[data-prop="stroke-width"]');
        this.strokeStyleGroup = document.querySelector('[data-prop="stroke-style"]');
        this.fillPatternGroup = document.querySelector('[data-prop="fill-pattern"]');
        this.opacity = document.querySelector('[data-prop="opacity"]');
        this.rotation = document.querySelector('[data-prop="rotation"]');
        this.width = document.querySelector('[data-prop="width"]');
        this.height = document.querySelector('[data-prop="height"]');
        this.textColor = document.querySelector('[data-prop="text-color"]');
        this.fontFamily = document.querySelector('[data-prop="font-family"]');
        this.fontSize = document.querySelector('[data-prop="font-size"]');
        this.boldBtn = document.querySelector('[data-prop="bold"]');
        this.italicBtn = document.querySelector('[data-prop="italic"]');
        this.underlineBtn = document.querySelector('[data-prop="underline"]');
        this.alignButtons = document.querySelectorAll('[data-prop="align"]');
        this.routeType = document.querySelector('[data-prop="route-type"]');
        this.startArrowType = document.querySelector('[data-prop="start-arrow-type"]');
        this.endArrowType = document.querySelector('[data-prop="end-arrow-type"]');
        this._populateMarkerOptions(this.startArrowType);
        this._populateMarkerOptions(this.endArrowType);
        this.flipHBtn = document.querySelector('[data-prop="flip-h"]');
        this.flipVBtn = document.querySelector('[data-prop="flip-v"]');
        this.roundedBtn = document.querySelector('[data-prop="rounded"]');
        this.shadowBtn = document.querySelector('[data-prop="shadow"]');
        this.fill2 = document.querySelector('[data-prop="fill2"]');
        this.gradientBtn = document.querySelector('[data-action="toggle-gradient"]');
        this.link = document.querySelector('[data-prop="link"]');
        this.linkPageSelect = document.querySelector("[data-link-page-select]");
        this.lockBtn = document.querySelector('[data-action="toggle-lock"]');
        this.visibleBtn = document.querySelector('[data-action="toggle-visible"]');
        this.setDefaultStyleBtn = document.querySelector('[data-action="set-default-style"]');

        this.inputs = [
            this.fill,
            this.stroke,
            this.opacity,
            this.rotation,
            this.width,
            this.height,
            this.textColor,
            this.fontFamily,
            this.fontSize,
            this.boldBtn,
            this.italicBtn,
            this.underlineBtn,
            this.routeType,
            this.startArrowType,
            this.endArrowType,
            this.flipHBtn,
            this.flipVBtn,
            this.roundedBtn,
            this.shadowBtn,
            this.fill2,
            this.gradientBtn,
            this.link,
            this.linkPageSelect,
            this.lockBtn,
            this.visibleBtn,
            this.setDefaultStyleBtn,
            ...this.alignButtons,
            ...this.strokeWidthGroup.querySelectorAll("button"),
            ...this.strokeStyleGroup.querySelectorAll("button"),
            ...this.fillPatternGroup.querySelectorAll("button"),
            ...document.querySelectorAll(
                '[data-action="send-back"], [data-action="send-backward"], [data-action="bring-forward"], [data-action="bring-front"], [data-action="duplicate-selected"], [data-action="delete-selected"], [data-action="add-row"], [data-action="remove-row"], [data-action="add-column"], [data-action="remove-column"], [data-action="align-left"], [data-action="align-center-h"], [data-action="align-right"], [data-action="align-top"], [data-action="align-middle-v"], [data-action="align-bottom"], [data-action="distribute-h"], [data-action="distribute-v"]'
            ),
        ];

        this._textOnlyRows = document.querySelectorAll("[data-text-only]");
        this._lineOnlyRows = document.querySelectorAll("[data-line-only]");
        this._hiddenForLineRows = document.querySelectorAll("[data-hide-for-line]");
        this._resizableOnlyRows = document.querySelectorAll("[data-resizable-only]");
        this._tableOnlyRows = document.querySelectorAll("[data-table-only]");
        this._multiOnlyRows = document.querySelectorAll("[data-multi-only]");
        this._roundedOnlyRows = document.querySelectorAll("[data-rounded-only]");
        this._textEmptyHint = document.querySelector("[data-text-empty-hint]");

        this._bindTabs();
        this._bind();
        eventBus.on("selection:change", (selected) => this._onSelectionChange(selected));
        eventBus.on("pages:change", () => this._populateLinkPageOptions());
        this._populateLinkPageOptions();
        this._setEnabled(false);
    }

    /** Opções do "vincular a uma página" no campo de link — refeitas sempre que páginas mudam (add/remove/rename). */
    _populateLinkPageOptions() {
        if (!this.linkPageSelect || !this.pageManager) return;
        const currentValue = this.linkPageSelect.value;
        this.linkPageSelect.innerHTML = '<option value="">Ou vincular a uma página…</option>';
        this.pageManager.pages.forEach((page) => {
            const option = document.createElement("option");
            option.value = page.id;
            option.textContent = page.name;
            this.linkPageSelect.appendChild(option);
        });
        if (this.pageManager.pages.some((p) => p.id === currentValue)) {
            this.linkPageSelect.value = currentValue;
        }
    }

    _populateMarkerOptions(select) {
        MARKER_TYPES.forEach(({ value, label }) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        });
    }

    _bindTabs() {
        const buttons = document.querySelectorAll("[data-tab]");
        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                buttons.forEach((b) => b.classList.toggle("tabs__btn--active", b === button));
                document.querySelectorAll("[data-tab-panel]").forEach((panel) => {
                    panel.hidden = panel.dataset.tabPanel !== button.dataset.tab;
                });
            });
        });
    }

    _bind() {
        this._bindSwatches("stroke", this.stroke, (el, value) => (el.style.stroke = value));
        this._bindSwatches("fill", this.fill, (el, value) => (el.style.fill = value));
        this._bindSegmented(this.strokeWidthGroup, (el, value) => (el.style.strokeWidth = Number(value)));
        this._bindSegmented(this.strokeStyleGroup, (el, value) => (el.style.strokeStyle = value));
        this._bindSegmented(this.fillPatternGroup, (el, value) => (el.style.fillPattern = value));

        this.stroke.addEventListener("input", () => this._apply((el) => (el.style.stroke = this.stroke.value)));
        this.stroke.addEventListener("change", () => this._commit());
        this.fill.addEventListener("input", () => this._apply((el) => (el.style.fill = this.fill.value)));
        this.fill.addEventListener("change", () => this._commit());

        this.opacity.addEventListener("input", () =>
            this._apply((el) => (el.style.opacity = Number(this.opacity.value) / 100))
        );
        this.opacity.addEventListener("change", () => this._commit());
        this.rotation.addEventListener("input", () => this._apply((el) => (el.rotation = Number(this.rotation.value))));
        this.rotation.addEventListener("change", () => this._commit());

        this.width.addEventListener("change", () => {
            this._apply((el) => {
                if (!RESIZABLE_TYPES.has(el.type)) return;
                el.width = Math.max(10, Number(this.width.value) || el.width);
            });
            this._commit();
        });
        this.height.addEventListener("change", () => {
            this._apply((el) => {
                if (!RESIZABLE_TYPES.has(el.type)) return;
                el.height = Math.max(10, Number(this.height.value) || el.height);
            });
            this._commit();
        });

        this._bindSwatches("text-color", this.textColor, (el, value) => this._setTextColor(el, value));
        this.textColor.addEventListener("input", () => this._apply((el) => this._setTextColor(el, this.textColor.value)));
        this.textColor.addEventListener("change", () => this._commit());

        this.fontFamily.addEventListener("change", () => {
            this._applyText((host) => {
                host.font = this.fontFamily.value;
                host.autoSize?.();
            });
            this._commit();
        });
        this.fontSize.addEventListener("input", () =>
            this._applyText((host) => {
                host.fontSize = Number(this.fontSize.value);
                host.autoSize?.();
            })
        );
        this.fontSize.addEventListener("change", () => this._commit());

        this._bindTextBooleanToggle(this.boldBtn, "bold");
        this._bindTextBooleanToggle(this.italicBtn, "italic");
        this._bindTextBooleanToggle(this.underlineBtn, "underline");

        this.startArrowType.addEventListener("change", () => {
            this._apply((el) => {
                if (el.startArrowType !== undefined) el.startArrowType = this.startArrowType.value;
            });
            this._commit();
        });
        this.endArrowType.addEventListener("change", () => {
            this._apply((el) => {
                if (el.endArrowType !== undefined) el.endArrowType = this.endArrowType.value;
            });
            this._commit();
        });

        this._bindBooleanToggle(this.flipHBtn, "flipX");
        this._bindBooleanToggle(this.flipVBtn, "flipY");
        this._bindBooleanToggle(this.roundedBtn, "rounded");
        this._bindStyleBooleanToggle(this.shadowBtn, "shadow");

        this.gradientBtn.addEventListener("click", () => {
            const enabling = !this._current?.style.fill2;
            this._apply((el) => (el.style.fill2 = enabling ? this.fill2.value : null));
            this.gradientBtn.classList.toggle("segmented__active", enabling);
            this._commit();
        });
        this.fill2.addEventListener("input", () =>
            this._apply((el) => {
                if (el.style.fill2) el.style.fill2 = this.fill2.value;
            })
        );
        this.fill2.addEventListener("change", () => this._commit());

        this.link.addEventListener("change", () => {
            this._apply((el) => (el.link = this.link.value.trim() || null));
            this._commit();
            this._syncLinkPageSelect(this.link.value);
        });

        this.linkPageSelect?.addEventListener("change", () => {
            const pageId = this.linkPageSelect.value;
            const value = pageId ? `page:${pageId}` : "";
            this.link.value = value;
            this._apply((el) => (el.link = value || null));
            this._commit();
        });

        this.alignButtons.forEach((button) => {
            button.addEventListener("click", () => {
                this._applyText((host) => {
                    host.align = button.dataset.value;
                });
                this.alignButtons.forEach((b) => b.classList.toggle("segmented__active", b === button));
                this._commit();
            });
        });

        this.routeType.addEventListener("change", () => {
            this._apply((el) => {
                if (el.routeType !== undefined) el.routeType = this.routeType.value;
            });
            this._commit();
        });

        document.querySelector('[data-action="send-back"]').addEventListener("click", () => this._reorderAbsolute(-1));
        document.querySelector('[data-action="bring-front"]').addEventListener("click", () => this._reorderAbsolute(1));
        document
            .querySelector('[data-action="send-backward"]')
            .addEventListener("click", () => this._reorderRelative(-1));
        document
            .querySelector('[data-action="bring-forward"]')
            .addEventListener("click", () => this._reorderRelative(1));

        document.querySelector('[data-action="align-left"]').addEventListener("click", () => this._applyAlign(alignLeft));
        document.querySelector('[data-action="align-center-h"]').addEventListener("click", () => this._applyAlign(alignCenterH));
        document.querySelector('[data-action="align-right"]').addEventListener("click", () => this._applyAlign(alignRight));
        document.querySelector('[data-action="align-top"]').addEventListener("click", () => this._applyAlign(alignTop));
        document.querySelector('[data-action="align-middle-v"]').addEventListener("click", () => this._applyAlign(alignMiddleV));
        document.querySelector('[data-action="align-bottom"]').addEventListener("click", () => this._applyAlign(alignBottom));
        document.querySelector('[data-action="distribute-h"]').addEventListener("click", () => this._applyAlign(distributeHorizontal));
        document.querySelector('[data-action="distribute-v"]').addEventListener("click", () => this._applyAlign(distributeVertical));

        document.querySelector('[data-action="add-row"]').addEventListener("click", () => this._applyTable((t) => t.addRow()));
        document
            .querySelector('[data-action="remove-row"]')
            .addEventListener("click", () => this._applyTable((t) => t.removeRow()));
        document
            .querySelector('[data-action="add-column"]')
            .addEventListener("click", () => this._applyTable((t) => t.addColumn()));
        document
            .querySelector('[data-action="remove-column"]')
            .addEventListener("click", () => this._applyTable((t) => t.removeColumn()));

        document.querySelector('[data-action="duplicate-selected"]').addEventListener("click", () => {
            duplicateSelected({
                scene: this.scene,
                selectionManager: this.selectionManager,
                renderer: this.renderer,
                historyManager: this.historyManager,
            });
        });
        document.querySelector('[data-action="delete-selected"]').addEventListener("click", () => {
            deleteSelected({
                scene: this.scene,
                selectionManager: this.selectionManager,
                renderer: this.renderer,
                historyManager: this.historyManager,
            });
        });

        this.lockBtn.addEventListener("click", () => {
            if (this._selection.length === 0) return;
            const nextLocked = !this._current.locked;
            this._selection.forEach((el) => (el.locked = nextLocked));
            this._syncToggleButtons();
            this._commit();
        });
        this.visibleBtn.addEventListener("click", () => {
            if (this._selection.length === 0) return;
            const nextVisible = !this._current.visible;
            this._selection.forEach((el) => (el.visible = nextVisible));
            this._syncToggleButtons();
            this.renderer.markDirty();
            this._commit();
        });

        this.setDefaultStyleBtn.addEventListener("click", () => {
            if (!this._current) return;
            setDefaultStyleFromElement(this._current);
        });
    }

    /** Botão independente (não exclusivo) que alterna um campo booleano do elemento (ex.: flipX/flipY). */
    _bindBooleanToggle(button, key) {
        button.addEventListener("click", () => {
            this._apply((el) => {
                if (el[key] === undefined) return;
                el[key] = !el[key];
                el.autoSize?.();
            });
            button.classList.toggle("segmented__active", Boolean(this._current?.[key]));
            this._commit();
        });
    }

    /** Como _bindBooleanToggle, mas o campo mora em style (ex.: shadow) — style sempre existe, então não precisa do guard de "undefined". */
    _bindStyleBooleanToggle(button, key) {
        button.addEventListener("click", () => {
            this._apply((el) => (el.style[key] = !el.style[key]));
            button.classList.toggle("segmented__active", Boolean(this._current?.style[key]));
            this._commit();
        });
    }

    /** Mesmo padrão, mas aplicado ao "host" de texto (o próprio Text, ou o textLabel de uma forma — ver _textHost). */
    _bindTextBooleanToggle(button, key) {
        button.addEventListener("click", () => {
            this._applyText((host) => {
                host[key] = !host[key];
                host.autoSize?.();
            });
            const host = this._textHost(this._current);
            button.classList.toggle("segmented__active", Boolean(host?.[key]));
            this._commit();
        });
    }

    /** Objeto que guarda font/fontSize/bold/italic/underline/align pro elemento: o próprio Text, ou o textLabel de uma forma (Rectangle/Ellipse). null se não aplicável (linhas, formas sem rótulo). */
    _textHost(element) {
        if (!element) return null;
        if (element.type === "text") return element;
        return element.textLabel ?? null;
    }

    /** Como _apply, mas a mutação recebe o "host" de texto de cada selecionado (pula quem não tem um). */
    _applyText(mutate) {
        if (this._selection.length === 0) return;
        this._selection.forEach((el) => {
            const host = this._textHost(el);
            if (host) mutate(host);
        });
        this.renderer.markDirty();
    }

    /** Cor da tinta do texto: style.fill pro Text, textLabel.color pra forma com rótulo. */
    _setTextColor(element, value) {
        if (element.type === "text") element.style.fill = value;
        else if (element.textLabel) element.textLabel.color = value;
    }

    _getTextColor(element) {
        if (!element) return null;
        if (element.type === "text") return element.style.fill;
        return element.textLabel?.color ?? null;
    }

    /** Valor pro <input type=color>: hex direto, resolve o sentinela "auto" pro tema atual, ou usa o fallback (ex.: "transparent" não é um hex válido). */
    _colorInputValue(raw, fallbackHex) {
        if (!raw) return fallbackHex;
        if (raw.startsWith("#")) return raw;
        if (raw === "auto") return resolveInkColor(raw);
        return fallbackHex;
    }

    /** Swatches de cor rápida: cada clique escreve no input[type=color] correspondente e emite 'input'. */
    _bindSwatches(name, colorInput, applyFn) {
        const container = document.querySelector(`[data-swatches="${name}"]`);
        container.querySelectorAll(".swatch:not(.swatch--custom)").forEach((swatch) => {
            swatch.addEventListener("click", () => {
                const value = swatch.dataset.swatchValue;
                if (value !== "transparent") colorInput.value = value;
                this._apply((el) => applyFn(el, value));
                this._syncSwatchActive(container, value);
                this._commit();
            });
        });
    }

    _syncSwatchActive(container, value) {
        container.querySelectorAll(".swatch").forEach((swatch) => {
            const isCustom = swatch.classList.contains("swatch--custom");
            swatch.classList.toggle("swatch--selected", !isCustom && swatch.dataset.swatchValue === value);
        });
    }

    /** Segmented button (espessura / tipo de linha): clique aplica data-value e marca ativo. */
    _bindSegmented(group, applyFn) {
        group.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                this._apply((el) => applyFn(el, button.dataset.value));
                this._syncSegmentedActive(group, button.dataset.value);
                this._commit();
            });
        });
    }

    _syncSegmentedActive(group, value) {
        group.querySelectorAll("button").forEach((button) => {
            button.classList.toggle("segmented__active", button.dataset.value === value);
        });
    }

    _syncToggleButtons() {
        if (!this._current) return;
        this.lockBtn.classList.toggle("segmented__active", this._current.locked);
        this.visibleBtn.classList.toggle("segmented__active", !this._current.visible);
    }

    /** Aplica uma função de alinhamento/distribuição (managers/alignActions.js) à seleção inteira e commita. */
    _applyAlign(fn) {
        if (this._selection.length < 2) return;
        fn(this._selection);
        this.renderer.markDirty();
        this._commit();
    }

    /** Como _apply(), mas só afeta os selecionados do tipo "table" (mutate recebe a Table) e já commita — usado pelos botões de linha/coluna. */
    _applyTable(mutate) {
        if (this._selection.length === 0) return;
        this._selection.forEach((el) => {
            if (el.type === "table") mutate(el);
        });
        this.renderer.markDirty();
        this._commit();
    }

    /** Aplica a mutação em TODOS os elementos selecionados (edição em lote). */
    _apply(mutate) {
        if (this._selection.length === 0) return;
        this._selection.forEach((el) => mutate(el));
        this.renderer.markDirty();
    }

    _commit() {
        this.historyManager?.pushSnapshot();
    }

    _onSelectionChange(selected) {
        this._selection = selected;
        this._current = selected[0] ?? null;
        this._setEnabled(selected.length > 0);
        this._toggleTypeSpecificRows(this._current, selected.length);
        if (!this._current) return;

        const element = this._current;
        this.fill.value = this._colorInputValue(element.style.fill, "#ffffff");
        this.stroke.value = this._colorInputValue(element.style.stroke, "#1e1e1e");
        this.opacity.value = Math.round(element.style.opacity * 100);
        this.rotation.value = element.rotation;
        this.width.value = Math.round(element.width);
        this.height.value = Math.round(element.height);
        this.routeType.value = element.routeType ?? "straight";

        this._syncSwatchActive(document.querySelector('[data-swatches="stroke"]'), element.style.stroke);
        this._syncSwatchActive(document.querySelector('[data-swatches="fill"]'), element.style.fill);
        this._syncSegmentedActive(this.strokeWidthGroup, String(element.style.strokeWidth));
        this._syncSegmentedActive(this.strokeStyleGroup, element.style.strokeStyle);
        this._syncSegmentedActive(this.fillPatternGroup, element.style.fillPattern ?? "solid");
        this._syncToggleButtons();

        const textHost = this._textHost(element);
        const textColor = this._getTextColor(element);
        this.textColor.value = this._colorInputValue(textColor, "#1e1e1e");
        this._syncSwatchActive(document.querySelector('[data-swatches="text-color"]'), textColor);
        this.fontFamily.value = textHost?.font ?? "Inter";
        this.fontSize.value = textHost?.fontSize ?? 14;
        this.boldBtn.classList.toggle("segmented__active", Boolean(textHost?.bold));
        this.italicBtn.classList.toggle("segmented__active", Boolean(textHost?.italic));
        this.underlineBtn.classList.toggle("segmented__active", Boolean(textHost?.underline));
        this.alignButtons.forEach((b) => b.classList.toggle("segmented__active", b.dataset.value === textHost?.align));

        this.startArrowType.value = element.startArrowType ?? "none";
        this.endArrowType.value = element.endArrowType ?? "none";

        this.flipHBtn.classList.toggle("segmented__active", Boolean(element.flipX));
        this.flipVBtn.classList.toggle("segmented__active", Boolean(element.flipY));
        this.roundedBtn.classList.toggle("segmented__active", Boolean(element.rounded));
        this.shadowBtn.classList.toggle("segmented__active", Boolean(element.style.shadow));
        this.gradientBtn.classList.toggle("segmented__active", Boolean(element.style.fill2));
        this.fill2.value = element.style.fill2 || "#ffffff";
        this.link.value = element.link ?? "";
        this._syncLinkPageSelect(this.link.value);
    }

    /** Se o link atual for `page:<id>`, seleciona essa página no dropdown; senão (URL externa ou vazio), volta ao "Ou vincular a uma página…". */
    _syncLinkPageSelect(linkValue) {
        if (!this.linkPageSelect) return;
        const match = /^page:(.+)$/.exec(linkValue ?? "");
        this.linkPageSelect.value = match ? match[1] : "";
    }

    _toggleTypeSpecificRows(element, selectionCount) {
        const isText = Boolean(this._textHost(element));
        const isLine = LINE_TYPES.has(element?.type);
        const isResizable = selectionCount === 1 && RESIZABLE_TYPES.has(element?.type);
        const isTable = element?.type === "table";
        this._textOnlyRows.forEach((row) => (row.hidden = !isText));
        this._lineOnlyRows.forEach((row) => (row.hidden = !isLine));
        this._hiddenForLineRows.forEach((row) => (row.hidden = isLine));
        this._resizableOnlyRows.forEach((row) => (row.hidden = !isResizable));
        this._tableOnlyRows.forEach((row) => (row.hidden = !isTable));
        this._multiOnlyRows.forEach((row) => (row.hidden = selectionCount < 2));
        this._roundedOnlyRows.forEach((row) => (row.hidden = element?.type !== "rectangle"));
        this._textEmptyHint.hidden = !element || isText;
    }

    _setEnabled(enabled) {
        this.inputs.forEach((input) => (input.disabled = !enabled));
    }

    _reorderAbsolute(direction) {
        if (this._selection.length === 0) return;
        const zIndexes = this.scene.objects.map((o) => o.zIndex);
        let next = direction > 0 ? Math.max(...zIndexes) + 1 : Math.min(...zIndexes) - 1 - this._selection.length;
        const ordered = [...this._selection].sort((a, b) => a.zIndex - b.zIndex);
        ordered.forEach((el) => {
            el.zIndex = next;
            next += 1;
        });
        this.renderer.markDirty();
        this._commit();
    }

    /** Troca de posição com o vizinho imediato (avançar/recuar uma camada), aplicado a cada selecionado. */
    _reorderRelative(direction) {
        if (this._selection.length === 0) return;
        this._selection.forEach((element) => {
            const sorted = [...this.scene.objects].sort((a, b) => a.zIndex - b.zIndex);
            const index = sorted.indexOf(element);
            const swapIndex = index + direction;
            if (swapIndex < 0 || swapIndex >= sorted.length) return;

            const other = sorted[swapIndex];
            [element.zIndex, other.zIndex] = [other.zIndex, element.zIndex];
        });
        this.renderer.markDirty();
        this._commit();
    }
}
