import { duplicateSelected, deleteSelected } from "../managers/objectActions.js";

/**
 * Liga os controles da sidebar direita ao elemento selecionado: lê o
 * estado atual quando a seleção muda e escreve de volta a cada edição.
 * Sem seleção, os controles ficam desabilitados.
 *
 * Edições "ao vivo" (arrastar um slider) atualizam o desenho a cada
 * evento `input`, mas só entram no histórico de desfazer quando o
 * usuário termina o gesto (`change`) — senão cada pixel de um arraste
 * de opacidade viraria um passo de undo.
 *
 * "Tipo de rota" só aparece para conectores; "Rotação" some para eles
 * (a posição do conector é sempre recalculada a partir dos objetos
 * ligados, rotação não se aplica). Fonte/tamanho/estilo/alinhamento só
 * aparecem para elementos de texto.
 */
export class PropertiesPanel {
    constructor({ scene, selectionManager, renderer, eventBus, historyManager }) {
        this.scene = scene;
        this.selectionManager = selectionManager;
        this.renderer = renderer;
        this.historyManager = historyManager;
        this._current = null;

        this.fill = document.querySelector('[data-prop="fill"]');
        this.stroke = document.querySelector('[data-prop="stroke"]');
        this.strokeWidthGroup = document.querySelector('[data-prop="stroke-width"]');
        this.strokeStyleGroup = document.querySelector('[data-prop="stroke-style"]');
        this.opacity = document.querySelector('[data-prop="opacity"]');
        this.rotation = document.querySelector('[data-prop="rotation"]');
        this.fontFamily = document.querySelector('[data-prop="font-family"]');
        this.fontSize = document.querySelector('[data-prop="font-size"]');
        this.boldBtn = document.querySelector('[data-prop="bold"]');
        this.italicBtn = document.querySelector('[data-prop="italic"]');
        this.underlineBtn = document.querySelector('[data-prop="underline"]');
        this.alignButtons = document.querySelectorAll('[data-prop="align"]');
        this.routeType = document.querySelector('[data-prop="route-type"]');
        this.lockBtn = document.querySelector('[data-action="toggle-lock"]');
        this.visibleBtn = document.querySelector('[data-action="toggle-visible"]');

        this.inputs = [
            this.fill,
            this.stroke,
            this.opacity,
            this.rotation,
            this.fontFamily,
            this.fontSize,
            this.boldBtn,
            this.italicBtn,
            this.underlineBtn,
            this.routeType,
            this.lockBtn,
            this.visibleBtn,
            ...this.alignButtons,
            ...this.strokeWidthGroup.querySelectorAll("button"),
            ...this.strokeStyleGroup.querySelectorAll("button"),
            ...document.querySelectorAll(
                '[data-action="send-back"], [data-action="send-backward"], [data-action="bring-forward"], [data-action="bring-front"], [data-action="duplicate-selected"], [data-action="delete-selected"]'
            ),
        ];

        this._connectorOnlyRows = document.querySelectorAll("[data-connector-only]");
        this._hiddenForConnectorRows = document.querySelectorAll("[data-hide-for-connector]");
        this._textOnlyRows = document.querySelectorAll("[data-text-only]");

        this._bind();
        eventBus.on("selection:change", (selected) => this._onSelectionChange(selected[0] ?? null));
        this._setEnabled(false);
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

        this._bindTextToggle(this.boldBtn, "bold");
        this._bindTextToggle(this.italicBtn, "italic");
        this._bindTextToggle(this.underlineBtn, "underline");

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
            if (!this._current) return;
            this._current.locked = !this._current.locked;
            this._syncToggleButtons();
            this._commit();
        });
        this.visibleBtn.addEventListener("click", () => {
            if (!this._current) return;
            this._current.visible = !this._current.visible;
            this._syncToggleButtons();
            this.renderer.markDirty();
            this._commit();
        });
    }

    /** Botão independente (não exclusivo) de estilo de texto: bold/italic/underline. */
    _bindTextToggle(button, key) {
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

    _apply(mutate) {
        if (!this._current) return;
        mutate(this._current);
        this.renderer.markDirty();
    }

    _commit() {
        this.historyManager?.pushSnapshot();
    }

    _onSelectionChange(element) {
        this._current = element;
        this._setEnabled(Boolean(element));
        this._toggleTypeSpecificRows(element);
        if (!element) return;

        this.fill.value = element.style.fill.startsWith("#") ? element.style.fill : "#ffffff";
        this.stroke.value = element.style.stroke.startsWith("#") ? element.style.stroke : "#1e1e1e";
        this.opacity.value = Math.round(element.style.opacity * 100);
        this.rotation.value = element.rotation;
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
    }

    _toggleTypeSpecificRows(element) {
        const isConnector = element?.type === "connector";
        const isText = element?.type === "text";
        this._connectorOnlyRows.forEach((row) => (row.hidden = !isConnector));
        this._hiddenForConnectorRows.forEach((row) => (row.hidden = isConnector));
        this._textOnlyRows.forEach((row) => (row.hidden = !isText));
    }

    _setEnabled(enabled) {
        this.inputs.forEach((input) => (input.disabled = !enabled));
    }

    _reorderAbsolute(direction) {
        if (!this._current) return;
        const zIndexes = this.scene.objects.map((o) => o.zIndex);
        this._current.zIndex = direction > 0 ? Math.max(...zIndexes) + 1 : Math.min(...zIndexes) - 1;
        this.renderer.markDirty();
        this._commit();
    }

    /** Troca de posição com o vizinho imediato (avançar/recuar uma camada). */
    _reorderRelative(direction) {
        if (!this._current) return;
        const sorted = [...this.scene.objects].sort((a, b) => a.zIndex - b.zIndex);
        const index = sorted.indexOf(this._current);
        const swapIndex = index + direction;
        if (swapIndex < 0 || swapIndex >= sorted.length) return;

        const other = sorted[swapIndex];
        [this._current.zIndex, other.zIndex] = [other.zIndex, this._current.zIndex];
        this.renderer.markDirty();
        this._commit();
    }
}
