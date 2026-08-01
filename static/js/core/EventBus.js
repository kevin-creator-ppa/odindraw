/**
 * Barramento de eventos simples (pub/sub) usado para desacoplar os módulos
 * do editor (câmera, cena, ferramentas, UI). É também o ponto de extensão
 * natural para sincronização em tempo real (WebSocket) no futuro: quem
 * consumir os mesmos eventos de mutação da Scene pode retransmiti-los.
 */
export class EventBus {
    constructor() {
        this._listeners = new Map();
    }

    on(event, handler) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(handler);
        return () => this.off(event, handler);
    }

    off(event, handler) {
        this._listeners.get(event)?.delete(handler);
    }

    emit(event, payload) {
        this._listeners.get(event)?.forEach((handler) => handler(payload));
    }
}
