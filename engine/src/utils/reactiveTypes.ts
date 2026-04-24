import EventEmitter, { IEventEmitter } from "./eventEmitter";

type AtomListener<T> = (value: T) => void;

export interface IAtom<T = any> {
    on(listener: AtomListener<T>): void;
    off(listener: AtomListener<T>): void;
    emit(value: T): void;
    set(value: T): void;
    get(): T;
    removeAllListeners(): void;
}

export class Atom<T = any> implements IAtom<T> {
    private value: T;
    private listeners: Set<AtomListener<T>> = new Set();

    constructor(initialValue: T) {
        this.value = initialValue;
    }

    on(listener: AtomListener<T>): void {
        this.listeners.add(listener);
    }

    off(listener: AtomListener<T>): void {
        this.listeners.delete(listener);
    }

    emit(value: T): void {
        for (const listener of this.listeners) {
            listener(value);
        }
    }

    set(value: T): void {
        this.value = value;
        this.emit(value);
    }

    get(): T {
        return this.value;
    }

    removeAllListeners(): void {
        this.listeners.clear();
    }
}

export class ReactiveMap<V> extends Map<string, V> implements IEventEmitter<V> {
    private emitter = new EventEmitter<V>();

    emit(event: string, data: V): void {
        this.emitter.emit(event, data);
    }

    set(key: string, value: V): this {
        super.set(key, value);
        this.emitter.emit(String(key), value);
        this.emitter.emit("set", value);
        return this;
    }

    on(key: string, listener: (value: V) => void) {
        this.emitter.on(String(key), listener);
    }

    off(key: string, listener: (value: V) => void) {
        this.emitter.off(String(key), listener);
    }

    once(key: string, listener: (value: V) => void) {
        this.emitter.once(String(key), listener);
    }

    removeAllListeners(key?: string) {
        if (key !== undefined) {
            this.emitter.removeAllListeners(String(key));
        } else {
            this.emitter.removeAllListeners();
        }
    }
}

export class ReactiveSet<T> extends Set<T> implements IEventEmitter<T> {
    private emitter = new EventEmitter<T>();

    emit(event: "add" | "delete", data: T): void {
        this.emitter.emit(event, data);
    }

    add(value: T): this {
        const existed = this.has(value);
        super.add(value);
        if (!existed) {
            this.emitter.emit("add", value);
        }
        return this;
    }

    delete(value: T): boolean {
        const existed = this.has(value);
        const result = super.delete(value);
        if (existed && result) {
            this.emitter.emit("delete", value);
        }
        return result;
    }

    on(event: "add" | "delete", listener: (value: T) => void) {
        this.emitter.on(event, listener);
    }

    off(event: "add" | "delete", listener: (value: T) => void) {
        this.emitter.off(event, listener);
    }

    once(event: "add" | "delete", listener: (value: T) => void) {
        this.emitter.once(event, listener);
    }

    removeAllListeners(event?: "add" | "delete") {
        this.emitter.removeAllListeners(event);
    }
}

export class ReactiveArray<T> extends Array<T> implements IEventEmitter<number> {
    private emitter = new EventEmitter<number>();

    emit(event: string, data: number): void {
        this.emitter.emit(event, data);
    }

    push(...items: T[]): number {
        const startIdx = this.length;
        const result = super.push(...items);
        for (let i = 0; i < items.length; i++) {
            this.emitter.emit("push", startIdx + i);
        }
        return result;
    }

    pop(): T | undefined {
        const idx = this.length - 1;
        const item = super.pop();
        if (item !== undefined) {
            this.emitter.emit("pop", idx);
        }
        return item;
    }

    splice(start: number, deleteCount?: number, ...items: T[]): T[] {
        const removed = super.splice(start, deleteCount, ...items);
        // Emit for removed items
        for (let i = 0; i < (deleteCount ?? 0); i++) {
            this.emitter.emit("splice", start + i);
        }
        // Emit for added items
        for (let i = 0; i < items.length; i++) {
            this.emitter.emit("splice", start + i);
        }
        return removed;
    }

    set(index: number, value: T) {
        this[index] = value;
        this.emitter.emit("set", index);
    }

    on(event: "push" | "pop" | "splice" | "set", listener: (index: number) => void) {
        this.emitter.on(event, listener);
    }

    off(event: "push" | "pop" | "splice" | "set", listener: (index: number) => void) {
        this.emitter.off(event, listener);
    }

    once(event: "push" | "pop" | "splice" | "set", listener: (index: number) => void) {
        this.emitter.once(event, listener);
    }

    removeAllListeners(event?: "push" | "pop" | "splice" | "set") {
        this.emitter.removeAllListeners(event);
    }
}
