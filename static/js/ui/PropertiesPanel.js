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
    constructor({ selectionManager, renderer, eventBus }) {
        this.selectionManager = selectionManager;
        this.renderer = renderer;
        this._current = null;

        this.fill = document.querySelector('[data-prop="fill"]');
        this.stroke = document.querySelector('[data-prop="stroke"]');
        this.strokeWidth = document.querySelector('[data-prop="stroke-width"]');
        this.strokeStyle = document.querySelector('[data-prop="stroke-style"]');
        this.opacity = document.querySelector('[data-prop="opacity"]');
        this.rotation = document.querySelector('[data-prop="rotation"]');
        this.fontFamily = document.querySelector('[data-prop="font-family"]');
        this.fontSize = document.querySelector('[data-prop="font-size"]');
        this.routeType = document.querySelector('[data-prop="route-type"]');
        this.bringFrontBtn = document.querySelector('[data-action="bring-front"]');
        this.sendBackBtn = document.querySelector('[data-action="send-back"]');

        this.inputs = [
            this.fill,
            this.stroke,
            this.strokeWidth,
            this.strokeStyle,
            this.opacity,
            this.rotation,
            this.fontFamily,
            this.fontSize,
            this.routeType,
            this.bringFrontBtn,
            this.sendBackBtn,
        ];

        this._connectorOnlyRows = document.querySelectorAll("[data-connector-only]");
        this._hiddenForConnectorRows = document.querySelectorAll("[data-hide-for-connector]");

        this._bind();
        eventBus.on("selection:change", (selected) => this._onSelectionChange(selected[0] ?? null));
        this._setEnabled(false);
    }

    _bind() {
        this.fill.addEventListener("input", () => this._apply((el) => (el.style.fill = this.fill.value)));
        this.stroke.addEventListener("input", () => this._apply((el) => (el.style.stroke = this.stroke.value)));
        this.strokeWidth.addEventListener("input", () =>
            this._apply((el) => (el.style.strokeWidth = Number(this.strokeWidth.value)))
        );
        this.strokeStyle.addEventListener("change", () =>
            this._apply((el) => (el.style.strokeStyle = this.strokeStyle.value))
        );
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
        this.bringFrontBtn.addEventListener("click", () => this._reorder(1));
        this.sendBackBtn.addEventListener("click", () => this._reorder(-1));
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

        this.fill.value = element.style.fill;
        this.stroke.value = element.style.stroke;
        this.strokeWidth.value = element.style.strokeWidth;
        this.strokeStyle.value = element.style.strokeStyle;
        this.opacity.value = Math.round(element.style.opacity * 100);
        this.rotation.value = element.rotation;
        this.fontFamily.value = element.font ?? "Inter";
        this.fontSize.value = element.fontSize ?? 14;
        this.routeType.value = element.routeType ?? "straight";
    }

    _toggleTypeSpecificRows(element) {
        const isConnector = element?.type === "connector";
        this._connectorOnlyRows.forEach((row) => (row.hidden = !isConnector));
        this._hiddenForConnectorRows.forEach((row) => (row.hidden = isConnector));
    }

    _setEnabled(enabled) {
        this.inputs.forEach((input) => (input.disabled = !enabled));
    }

    _reorder(direction) {
        if (!this._current) return;
        const zIndexes = this.selectionManager.scene.objects.map((o) => o.zIndex);
        this._current.zIndex = direction > 0 ? Math.max(...zIndexes) + 1 : Math.min(...zIndexes) - 1;
        this.renderer.markDirty();
    }
}
