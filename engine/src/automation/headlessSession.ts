import fs from 'node:fs/promises';
import path from 'node:path';
import type { ECSContext } from '../core/ecs';
import { clearECS, getResource, setResource } from '../core/ecs';
import { createWorldDefinition, initialize } from '../core/initializeWorld';
import { serializeWorld } from '../core/serializeWorld';
import { loadWorldFromJSON } from '../core/worldPersistence';
import { executeAutomationBatch, executeAutomationCommand, type AutomationCommandCall } from './commands';
import { readAutomationResource } from './resources';
import { createHeadlessECSContext } from './headlessContext';
import {
  isMutatingAutomationCommand,
  persistsWorldForAutomationCommand,
  type AutomationBatchResult,
  type AutomationSession,
} from './session';
import { runWorldScriptInContext } from './worldScript';

export interface HeadlessWorldSessionOptions {
  worldFilePath: string;
  autoSave?: boolean;
  allowWorldScripts?: boolean;
}

export interface HeadlessWorldSessionInfo {
  serverName: 'engine';
  mode: 'headless-file';
  worldFilePath: string;
  worldFormat: 'json' | 'world-script';
  autoSave: boolean;
  allowWorldScripts: boolean;
  dirty: boolean;
  existsOnDisk: boolean;
  worldTitle?: string;
  entityCount?: number;
  lastSavedAt?: string | null;
}

export class HeadlessWorldSession implements AutomationSession {
  readonly worldFilePath: string;
  readonly autoSave: boolean;
  readonly allowWorldScripts: boolean;

  private ctx!: ECSContext;
  private dirty = false;
  private existsOnDisk = false;
  private lastSavedAt: string | null = null;
  private worldFormat: 'json' | 'world-script' = 'json';

  private constructor(options: HeadlessWorldSessionOptions) {
    this.worldFilePath = path.resolve(options.worldFilePath);
    this.autoSave = options.autoSave !== false;
    this.allowWorldScripts = options.allowWorldScripts === true;
  }

  static async open(options: HeadlessWorldSessionOptions): Promise<HeadlessWorldSession> {
    const session = new HeadlessWorldSession(options);
    await session.initialize();
    return session;
  }

  getContext(): ECSContext {
    return this.ctx;
  }

  getInfo(): HeadlessWorldSessionInfo {
    const summary = readAutomationResource(this.ctx, 'world-state-summary') as any;
    return {
      serverName: 'engine',
      mode: 'headless-file',
      worldFilePath: this.worldFilePath,
      worldFormat: this.worldFormat,
      autoSave: this.autoSave,
      allowWorldScripts: this.allowWorldScripts,
      dirty: this.dirty,
      existsOnDisk: this.existsOnDisk,
      worldTitle: summary?.title,
      entityCount: summary?.entityCount,
      lastSavedAt: this.lastSavedAt,
    };
  }

  async callTool(name: string, args: Record<string, any> = {}): Promise<{ text: string; changed: boolean }> {
    const result = await executeAutomationCommand(this.ctx, {} as any, name, args);
    const changed = isMutatingAutomationCommand(name);
    if (persistsWorldForAutomationCommand(name)) {
      this.dirty = true;
      this.updateSessionInfoResource();
      if (this.autoSave) {
        await this.save();
      }
    }
    return {
      text: result,
      changed,
    };
  }

  async callBatch(calls: AutomationCommandCall[], description?: string): Promise<AutomationBatchResult> {
    const results = await executeAutomationBatch(this.ctx, {} as any, calls, description);
    const changed = calls.some((call) => isMutatingAutomationCommand(call.name));
    if (calls.some((call) => persistsWorldForAutomationCommand(call.name))) {
      this.dirty = true;
      this.updateSessionInfoResource();
      if (this.autoSave) {
        await this.save();
      }
    }

    return {
      changed,
      results: calls.map((call, index) => ({
        text: results[index] ?? call.name,
        changed: isMutatingAutomationCommand(call.name),
      })),
    };
  }

  readResource(name: string, params?: Record<string, any>): any {
    this.updateSessionInfoResource();
    return readAutomationResource(this.ctx, name, params);
  }

  async save(): Promise<void> {
    const definition = serializeWorld(this.ctx, {
      includeEntities: true,
      includeRuntime: true,
    });

    await fs.mkdir(path.dirname(this.worldFilePath), { recursive: true });
    let contents: string;
    if (this.worldFormat === 'world-script') {
      contents = loadWorldFromJSON(JSON.stringify(definition));
    } else {
      contents = JSON.stringify(definition, null, 2);
    }
    await this.writeTextFileAtomically(contents);

    this.existsOnDisk = true;
    this.dirty = false;
    this.lastSavedAt = new Date().toISOString();
    this.updateSessionInfoResource();
  }

  async close(): Promise<void> {
    if (!this.ctx) return;
    clearECS(this.ctx);
  }

  private async initialize(): Promise<void> {
    this.ctx = await createHeadlessECSContext();

    try {
      const raw = await fs.readFile(this.worldFilePath, 'utf8');
      await this.loadFromFileContents(raw);
      this.existsOnDisk = true;
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        throw new Error(`Failed to read world definition at ${this.worldFilePath}: ${error?.message || error}`);
      }
      this.existsOnDisk = false;
      this.worldFormat = 'json';
      this.loadWorldDefinition(createWorldDefinition());
    }

    this.updateSessionInfoResource();

    if (!this.existsOnDisk && this.autoSave) {
      await this.save();
    }
  }

  private updateSessionInfoResource(): void {
    setResource(this.ctx, 'automationCapabilities', {
      allowWorldScripts: this.allowWorldScripts,
    });
    setResource(this.ctx, 'runWorldScriptInContext', runWorldScriptInContext);
    setResource(this.ctx, 'automationSessionInfo', this.getInfo());
  }

  private loadWorldDefinition(worldDefinition: any): void {
    initialize(this.ctx, createWorldDefinition(worldDefinition), {
      merge: false,
      spawnEntities: true,
    });
  }

  private async loadFromFileContents(raw: string): Promise<void> {
    const trimmed = raw.trim();
    const extension = path.extname(this.worldFilePath).toLowerCase();

    if (extension === '.json' || trimmed.startsWith('{')) {
      this.worldFormat = 'json';
      const parsed = JSON.parse(raw);
      this.loadWorldDefinition(parsed);
      return;
    }

    if (extension === '.js' || extension === '.mjs' || trimmed.includes('setupScene(')) {
      this.worldFormat = 'world-script';
      await this.loadWorldScriptModule();
      return;
    }

    throw new Error(`Unsupported world file format for ${this.worldFilePath}`);
  }

  private async loadWorldScriptModule(): Promise<void> {
    await runWorldScriptInContext(this.ctx, { path: this.worldFilePath });
  }

  private async writeTextFileAtomically(contents: string): Promise<void> {
    const dir = path.dirname(this.worldFilePath);
    const tempPath = path.join(dir, `.${path.basename(this.worldFilePath)}.${process.pid}.${Date.now()}.tmp`);
    const backupPath = `${this.worldFilePath}.bak`;

    await fs.writeFile(tempPath, contents, 'utf8');
    if (this.existsOnDisk) {
      await fs.copyFile(this.worldFilePath, backupPath).catch((error: any) => {
        if (error?.code !== 'ENOENT') throw error;
      });
    }
    await fs.rename(tempPath, this.worldFilePath);
  }
}
