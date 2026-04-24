export class LazyMap<K, V> extends Map<K, V> {
    private factory: () => V;

    constructor(factory: () => V, entries?: readonly (readonly [K, V])[] | null) {
        super(entries);
        this.factory = factory;
    }

    get(key: K): V {
        if (!super.has(key)) {
            const value = this.factory();
            super.set(key, value);
            return value;
        }
        return super.get(key)!;
    }

    /**
     * Retrieves the value for the specified key without creating it if it does not exist.
     * @param key The key to retrieve the value for.
     * If the key does not exist, it will return undefined.
     * @returns 
     */
    getRaw(key: K): V | undefined {
        return super.get(key);
    }
}
