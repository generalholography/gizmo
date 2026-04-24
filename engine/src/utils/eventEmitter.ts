type Listener<T> = (data: T) => void;

export interface IEventEmitter<T = any> {
    on(event: string, listener: Listener<T>): void;
    off(event: string, listener: Listener<T>): void;
    emit(event: string, data: T): void;
    once(event: string, listener: Listener<T>): void;
    removeAllListeners(event?: string): void;
}

export class EventEmitter<T = any> implements IEventEmitter<T> {
    private listeners: Record<string, Listener<T>[]> = {};

    on(event: string, listener: Listener<T>) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }

    off(event: string, listener: Listener<T>) {
        this.listeners[event] = (this.listeners[event] || []).filter(l => l !== listener);
    }

    emit(event: string, data?: T) {
        for (const listener of this.listeners[event] || []) {
            listener(data);
        }
    }

    once(event: string, listener: Listener<T>) {
        const onceWrapper: Listener<T> = (data) => {
            this.off(event, onceWrapper);
            listener(data);
        };
        this.on(event, onceWrapper);
    }

    removeAllListeners(event?: string) {
        if (event) {
            delete this.listeners[event];
        } else {
            this.listeners = {};
        }
    }
}
export default EventEmitter;
