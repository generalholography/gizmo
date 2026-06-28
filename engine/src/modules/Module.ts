import { ECSContext } from "../core/ecs";

export class Module<D extends { type: string; params: any }, R> {
  public readonly definitionsByName: Record<string, D> = {};
  private readonly definitionsById: Record<number, D> = {};
  protected readonly ctx: ECSContext;
  private factories: Record<string, (params: any) => R>;
  private registry: Record<number, R> = {};
  private readonly builtInDefinitions: Set<string> = new Set();

  constructor(ctx: ECSContext, initialFactories: Record<string, (params: any) => R>) {
    this.factories = { ...initialFactories };
    this.ctx = ctx;
  }

  private hashDef(obj: any): number {
    const str = JSON.stringify(obj);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
  }

  addDefinition(name: string, def: D, isBuiltIn: boolean = false): void {
    this.definitionsByName[name] = def;
    if (isBuiltIn) {
      this.builtInDefinitions.add(name);
    }
  }

  replaceDefinition(name: string, def: D, isBuiltIn: boolean = false): void {
    const previous = this.definitionsByName[name];
    if (previous) {
      const previousId = this.hashDef(previous);
      this.disposeResolved(previousId);
      delete this.registry[previousId];
      delete this.definitionsById[previousId];
    }

    this.definitionsByName[name] = def;
    if (isBuiltIn) {
      this.builtInDefinitions.add(name);
    } else {
      this.builtInDefinitions.delete(name);
    }
  }

  registerType(name: string, factory: (params: any) => R): void {
    this.factories[name] = factory;
  }

  unregisterType(name: string): boolean {
    const exists = Object.prototype.hasOwnProperty.call(this.factories, name);
    if (exists) {
      delete this.factories[name];
    }
    return exists;
  }

  /**
   * Get all registered type names (factories)
   */
  getRegisteredTypes(): string[] {
    return Object.keys(this.factories);
  }

  hasDefinition(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.definitionsByName, name);
  }

  getDefinitionByName(name: string): D | undefined {
    return this.definitionsByName[name];
  }

  isBuiltIn(name: string): boolean {
    return this.builtInDefinitions.has(name);
  }
  
  /**
   * Mark an existing definition as built-in (for tracking runtime vs built-in definitions)
   */
  markAsBuiltIn(name: string): void {
    if (this.definitionsByName[name]) {
      this.builtInDefinitions.add(name);
    }
  }
  
  /**
   * Get all runtime-registered definitions (excluding built-ins)
   */
  getRuntimeDefinitions(): Array<{ name: string; definition: D }> {
    const runtime: Array<{ name: string; definition: D }> = [];
    for (const [name, definition] of Object.entries(this.definitionsByName)) {
      if (!this.builtInDefinitions.has(name)) {
        runtime.push({ name, definition });
      }
    }
    return runtime;
  }

  /**
   * Get all built-in definitions that shipped with the engine
   */
  getBuiltInDefinitions(): Array<{ name: string; definition: D }> {
    const builtIns: Array<{ name: string; definition: D }> = [];
    for (const [name, definition] of Object.entries(this.definitionsByName)) {
      if (this.builtInDefinitions.has(name)) {
        builtIns.push({ name, definition });
      }
    }
    return builtIns;
  }

  resolve(defOrName: string | D): number {
    const def = typeof defOrName === "string" ? this.definitionsByName[defOrName] : defOrName;
    if (!def) throw new Error(`Unknown definition '${defOrName}'`);
    const id = this.hashDef(def);
    if (!this.registry[id]) {
      let build = this.factories[def.type];
      if (!build) {
        const factoryNames = Object.keys(this.factories);
        if (factoryNames.length > 0) {
          const defaultFactory = factoryNames[0];
          console.warn(`No factory found for type '${def.type}', defaulting to '${defaultFactory}'`);
          build = this.factories[defaultFactory];
        } else {
          throw new Error(`No factories available and no factory for '${def.type}'`);
        }
      }
      this.registry[id] = build(def.params);
      this.definitionsById[id] = def;
    }
    return id;
  }

  register(name: string, def: D): R;
  register(name: string, baseName: string, overrides: Partial<D>): R;
  register(name: string, defOrBase: D | string, overrides: Partial<D> = {} as any): R {
    let def: D;
    if (typeof defOrBase === "string") {
      const base = this.definitionsByName[defOrBase];
      if (!base) throw new Error(`Unknown definition '${defOrBase}'`);
      const mergedParams = overrides.params
        ? { ...base.params, ...overrides.params }
        : base.params;
      def = { ...(base as any), ...overrides, params: mergedParams } as D;
    } else {
      def = defOrBase;
    }
    this.addDefinition(name, def);
    const id = this.resolve(name);
    return this.registry[id];
  }

  unregister(name: string): boolean {
    if (!this.hasDefinition(name)) {
      return false;
    }
    const previousId = this.hashDef(this.definitionsByName[name]);
    this.disposeResolved(previousId);
    delete this.registry[previousId];
    delete this.definitionsById[previousId];
    delete this.definitionsByName[name];
    this.builtInDefinitions.delete(name);
    return true;
  }

  getDefinition(id: number): D | undefined {
    return this.definitionsById[id];
  }

  get(id: number): R {
    return this.registry[id];
  }

  /**
   * Get the name of a definition by its ID (if it exists)
   */
  getDefinitionName(id: number): string | undefined {
    const def = this.definitionsById[id];
    if (!def) return undefined;
    
    // Search for the name in definitionsByName
    for (const [name, definition] of Object.entries(this.definitionsByName)) {
      if (definition === def) {
        return name;
      }
    }
    return undefined;
  }

  /**
   * Serialize a definition as name + diff (delta from base if applicable)
   * Returns either a string (named reference) or full definition
   */
  serializeDefinition(id: number, options: { useDelta?: boolean } = {}): any {
    const { useDelta = false } = options;
    const def = this.definitionsById[id];
    if (!def) return undefined;

    const name = this.getDefinitionName(id);
    
    // If we have a name and delta serialization is enabled, try to use name reference
    if (name && useDelta) {
      // Check if this is a built-in or registered definition
      if (this.definitionsByName[name]) {
        // Return just the name if definition matches exactly
        const registeredDef = this.definitionsByName[name];
        if (this.definitionsEqual(def, registeredDef)) {
          return name;
        }
      }
    }

    // Return full definition
    return def;
  }

  /**
   * Deep equality check for definitions
   */
  private definitionsEqual(a: D, b: D): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private disposeResolved(id: number): void {
    const resource = this.registry[id];
    if (resource && typeof (resource as any).dispose === 'function') {
      try {
        (resource as any).dispose();
      } catch (e) {
        console.warn('[MODULE] Failed to dispose resource:', e);
      }
    }
  }

  /**
   * Clear all registries and dispose resources
   * This prevents memory leaks by releasing THREE.js objects and other cached resources
   */
  clear(): void {
    console.log('[MODULE] Clearing registries...');
    
    // Dispose registry resources that support disposal
    Object.keys(this.registry).forEach((id) => this.disposeResolved(Number(id)));
    
    // Clear all maps by reassigning to new empty objects
    // This is safer than deleting keys because it handles non-enumerable properties
    (this as any).definitionsByName = {};
    (this as any).definitionsById = {};
    (this as any).registry = {};
    this.builtInDefinitions.clear();
    
    console.log('[MODULE] Registries cleared');
  }
}
