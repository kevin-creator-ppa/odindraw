import { duplicateSelected, deleteSelected } from "../managers/objectActions.js";

/**
 * Liga os controles da sidebar direita ao elemento selecionado: lê o
 * estado atual quando a seleção muda e escreve de volta a cada edição.
 * Sem seleção, os controles ficam desabilitados.
 *
 * "Tipo de rota" só aparece para conectores; "Rotação" some para eles
 * (a posição do conector é sempre recalculada a partir dos objetos
 * ligados, rotação não se aplica). Alinhamento de texto e grupos ficam
 * para um refinamento posterior.
 */
export class PropertiesPanel {
    constructor({ scene, selectionManager, renderer, eventBus }) {
        this.scene = scene;
        this.selectionManager = selectionManager;
        this.renderer = renderer;
        this._current = null;

        this.fill = document.querySelector('[data-prop="fill"]');
        this.stroke = document.querySelector('[data-prop="stroke"]');
        this.strokeWidthGroup = document.querySelector('[data-prop="stroke-width"]');
        this.strokeStyleGroup = document.querySelector('[data-prop="stroke-style"]');
        this.opacity = document.querySelector('[data-prop="opacity"]');
        this.rotation = document.querySelector('[data-prop="rotation"]');
        this.fontFamily = document.querySelector('[data-prop="font-family"]');
        this.fontSize = document.querySelector('[data-prop="font-size"]');
        this.routeType = document.querySelector('[data-prop="route-type"]');

        this.inputs = [
            this.fill,
            this.stroke,
            this.opacity,
            this.rotation,
            this.fontFamily,
            this.fontSize,
            this.routeType,
            ...this.strokeWidthGroup.querySelectorAll("button"),
            ...this.strokeStyleGroup.querySelectorAll("button"),
            ...document.querySelectorAll(
                '[data-action="send-back"], [data-action="send-backward"], [data-action="bring-forward"], [data-action="bring-front"], [data-action="duplicate-selected"], [data-action="delete-selected"]'
            ),
        ];

        this._connectorOnlyRows = document.querySelectorAll("[data-connector-only]");
        this._hiddenForConnectorRows = document.querySelectorAll("[data-hide-for-connector]");

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
        this.fill.addEventListener("input", () => this._apply((el) => (el.style.fill = this.fill.value)));

        this.opacity.addEventListener("input", () =>
            this._apply((el) => (el.style.opacity = Number(this.opacity.value) / 100))
        );
        this.rotation.addEventListener("input", () => this._apply((el) => (el.rotation = Number(this.rotation.value))));
        this.fontFamily.addEventListener("change", () =>
            this._apply((el) => {
                if (el.font !== undefined) el.font = this.fontFamily.value;
            })
        );
        this.fontSize.addEventListener("input", () =>
            this._apply((el) => {
                if (el.fontSize !== undefined) el.fontSize = Number(this.fontSize.value);
            })
        );
        this.routeType.addEventListener("change", () =>
            this._apply((el) => {
                if (el.routeType !== undefined) el.routeType = this.routeType.value;
            })
        );

        document.querySelector('[data-action="send-back"]').addEventListener("click", () => this._reorderAbsolute(-1));
        document.querySelector('[data-action="bring-front"]').addEventListener("click", () => this._reorderAbsolute(1));
        document
            .querySelector('[data-action="send-backward"]')
            .addEventListener("click", () => this._reorderRelative(-1));
        document
            .querySelector('[data-action="bring-forward"]')
            .addEventListener("click", () => this._reorderRelative(1));

        document.querySelector('[data-action="duplicate-selected"]').addEventListener("click", () => {
            duplicateSelected({ scene: this.scene, selectionManager: this.selectionManager, renderer: this.renderer });
        });
        document.querySelector('[data-action="delete-selected"]').addEventListener("click", () => {
            deleteSelected({ scene: this.scene, selectionManager: this.selectionManager, renderer: this.renderer });
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
            });
        });
    }

    _syncSegmentedActive(group, value) {
        group.querySelectorAll("button").forEach((button) => {
            button.classList.toggle("segmented__active", button.dataset.value === value);
        });
    }

    _apply(mutate) {
        if (!this._current) return;
        mutate(this._current);
        this.renderer.markDirty();
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
    }

    _toggleTypeSpecificRows(element) {
        const isConnector = element?.type === "connector";
        this._connectorOnlyRows.forEach((row) => (row.hidden = !isConnector));
        this._hiddenForConnectorRows.forEach((row) => (row.hidden = isConnector));
    }

    _setEnabled(enabled) {
        this.inputs.forEach((input) => (input.disabled = !enabled));
    }

    _reorderAbsolute(direction) {
        if (!this._current) return;
        const zIndexes = this.scene.objects.map((o) => o.zIndex);
        this._current.zIndex = direction > 0 ? Math.max(...zIndexes) + 1 : Math.min(...zIndexes) - 1;
        this.renderer.markDirty();
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
    }
}
