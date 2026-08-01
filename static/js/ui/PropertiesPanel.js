import { duplicateSelected, deleteSelected } from "../managers/objectActions.js";
import { LINE_TYPES, RESIZABLE_TYPES } from "../elements/typeGroups.js";

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
    constructor({ scene, selectionManager, renderer, eventBus, historyManager }) {
        this.scene = scene;
        this.selectionManager = selectionManager;
        this.renderer = renderer;
        this.historyManager = historyManager;
        this._current = null;
        this._selection = [];

        this.fill = document.querySelector('[data-prop="fill"]');
        this.stroke = document.querySelector('[data-prop="stroke"]');
        this.strokeWidthGroup = document.querySelector('[data-prop="stroke-width"]');
        this.strokeStyleGroup = document.querySelector('[data-prop="stroke-style"]');
        this.opacity = document.querySelector('[data-prop="opacity"]');
        this.rotation = document.querySelector('[data-prop="rotation"]');
        this.width = document.querySelector('[data-prop="width"]');
        this.height = document.querySelector('[data-prop="height"]');
        this.fontFamily = document.querySelector('[data-prop="font-family"]');
        this.fontSize = document.querySelector('[data-prop="font-size"]');
        this.boldBtn = document.querySelector('[data-prop="bold"]');
        this.italicBtn = document.querySelector('[data-prop="italic"]');
        this.underlineBtn = document.querySelector('[data-prop="underline"]');
        this.alignButtons = document.querySelectorAll('[data-prop="align"]');
        this.routeType = document.querySelector('[data-prop="route-type"]');
        this.startArrowBtn = document.querySelector('[data-prop="start-arrow"]');
        this.endArrowBtn = document.querySelector('[data-prop="end-arrow"]');
        this.lockBtn = document.querySelector('[data-action="toggle-lock"]');
        this.visibleBtn = document.querySelector('[data-action="toggle-visible"]');

        this.inputs = [
            this.fill,
            this.stroke,
            this.opacity,
            this.rotation,
            this.width,
            this.height,
            this.fontFamily,
            this.fontSize,
            this.boldBtn,
            this.italicBtn,
            this.underlineBtn,
            this.routeType,
            this.startArrowBtn,
            this.endArrowBtn,
            this.lockBtn,
            this.visibleBtn,
            ...this.alignButtons,
            ...this.strokeWidthGroup.querySelectorAll("button"),
            ...this.strokeStyleGroup.querySelectorAll("button"),
            ...document.querySelectorAll(
                '[data-action="send-back"], [data-action="send-backward"], [data-action="bring-forward"], [data-action="bring-front"], [data-action="duplicate-selected"], [data-action="delete-selected"]'
            ),
        ];

        this._textOnlyRows = document.querySelectorAll("[data-text-only]");
        this._lineOnlyRows = document.querySelectorAll("[data-line-only]");
        this._hiddenForLineRows = document.querySelectorAll("[data-hide-for-line]");
        this._resizableOnlyRows = document.querySelectorAll("[data-resizable-only]");
        this._textEmptyHint = document.querySelector("[data-text-empty-hint]");

        this._bindTabs();
        this._bind();
        eventBus.on("selection:change", (selected) => this._onSelectionChange(selected));
        this._setEnabled(false);
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

        this.fontFamily.addEventListener("change", () => {
            this._apply((el) => {
                if (el.font === undefined) return;
                el.font = this.fontFamily.value;
                el.autoSize?.();
            });
            this._commit();
        });
        this.fontSize.addEventListener("input", () =>
            this._apply((el) => {
                if (el.fontSize === undefined) return;
                el.fontSize = Number(this.fontSize.value);
                el.autoSize?.();
            })
        );
        this.fontSize.addEventListener("change", () => this._commit());

        this._bindBooleanToggle(this.boldBtn, "bold");
        this._bindBooleanToggle(this.italicBtn, "italic");
        this._bindBooleanToggle(this.underlineBtn, "underline");
        this._bindBooleanToggle(this.startArrowBtn, "startArrow");
        this._bindBooleanToggle(this.endArrowBtn, "endArrow");

        this.alignButtons.forEach((button) => {
            button.addEventListener("click", () => {
                this._apply((el) => {
                    if (el.align !== undefined) el.align = button.dataset.value;
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
    }

    /** Botão independente (não exclusivo) que alterna um campo booleano do elemento (bold/italic/underline/startArrow/endArrow). */
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
        this.fill.value = element.style.fill.startsWith("#") ? element.style.fill : "#ffffff";
        this.stroke.value = element.style.stroke.startsWith("#") ? element.style.stroke : "#1e1e1e";
        this.opacity.value = Math.round(element.style.opacity * 100);
        this.rotation.value = element.rotation;
        this.width.value = Math.round(element.width);
        this.height.value = Math.round(element.height);
        this.fontFamily.value = element.font ?? "Inter";
        this.fontSize.value = element.fontSize ?? 14;
        this.routeType.value = element.routeType ?? "straight";

        this._syncSwatchActive(document.querySelector('[data-swatches="stroke"]'), element.style.stroke);
        this._syncSwatchActive(document.querySelector('[data-swatches="fill"]'), element.style.fill);
        this._syncSegmentedActive(this.strokeWidthGroup, String(element.style.strokeWidth));
        this._syncSegmentedActive(this.strokeStyleGroup, element.style.strokeStyle);
        this._syncToggleButtons();

        this.boldBtn.classList.toggle("segmented__active", Boolean(element.bold));
        this.italicBtn.classList.toggle("segmented__active", Boolean(element.italic));
        this.underlineBtn.classList.toggle("segmented__active", Boolean(element.underline));
        this.alignButtons.forEach((b) => b.classList.toggle("segmented__active", b.dataset.value === element.align));
        this.startArrowBtn.classList.toggle("segmented__active", Boolean(element.startArrow));
        this.endArrowBtn.classList.toggle("segmented__active", Boolean(element.endArrow));
    }

    _toggleTypeSpecificRows(element, selectionCount) {
        const isText = element?.type === "text";
        const isLine = LINE_TYPES.has(element?.type);
        const isResizable = selectionCount === 1 && RESIZABLE_TYPES.has(element?.type);
        this._textOnlyRows.forEach((row) => (row.hidden = !isText));
        this._lineOnlyRows.forEach((row) => (row.hidden = !isLine));
        this._hiddenForLineRows.forEach((row) => (row.hidden = isLine));
        this._resizableOnlyRows.forEach((row) => (row.hidden = !isResizable));
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
