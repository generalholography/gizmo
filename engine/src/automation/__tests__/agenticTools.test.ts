import { beforeEach, describe, expect, it } from 'vitest';
import { createECS, getResource, setResource } from '../../core/ecs';
import { spawn } from '../../core/spawn';
import { readAutomationResource, listAutomationResources } from '../resources';
import { executeAutomationCommand } from '../commands';
import { CommandManager } from '../../core/editor/CommandManager';
import { Info } from '../../core/components';
import { decode } from '../../utils/strings';
import { getEntityBundle } from '../../core/despawn';
import { getPartAtPath } from '../../core/editor/utils/bodyParts';
import { eidToStableId, stableIdToEid } from '../../utils/stableId';

describe('Automation resources', () => {
  let ctx: ReturnType<typeof createECS>;

  beforeEach(() => {
    ctx = createECS();
    setResource(ctx, 'nextStableId', 0);
    setResource(ctx, 'metadata', { title: 'Test World', description: 'Test' });
  });

  it('should list all available resources', () => {
    const resources = listAutomationResources();
    const resourceNames = resources.map(r => r.name);

    expect(resourceNames).toContain('world-state-summary');
    expect(resourceNames).toContain('component-catalog');
    expect(resourceNames).toContain('module-type-catalog');
    expect(resourceNames).toContain('module-instance-catalog');
    expect(resourceNames).toContain('entity-list');
    expect(resourceNames).toContain('entity-bundle');
    expect(resourceNames).toContain('selected-entities-full');
    expect(resourceNames).toContain('metadata');
  });

  it('should get world-state-summary resource', () => {
    spawn(ctx, { Info: { name: 'Entity1' } });
    spawn(ctx, { Info: { name: 'Entity2' } });

    const summary = readAutomationResource(ctx, 'world-state-summary') as any;

    expect(summary.title).toBe('Test World');
    expect(summary.entityCount).toBe(2);
  });

  it('should get entity-bundle resource with stableId parameter', () => {
    const eid = spawn(ctx, { 
      Info: { name: 'TestEntity' },
      Transform: { x: 10, y: 5, z: 3 }
    });

    const stableId = eidToStableId(ctx, eid);
    const result = readAutomationResource(ctx, 'entity-bundle', { stableId }) as any;

    expect(result.stableId).toBe(stableId);
    expect(result.bundle.Info.name).toBe('TestEntity');
    expect(result.bundle.Transform.x).toBe(10);
  });

  it('should get entity-bundle resource with stableId parameter', () => {
    const eid = spawn(ctx, { 
      Info: { name: 'StableEntity' },
      Transform: { x: 2, y: 4, z: 6 }
    });

    const stableId = eidToStableId(ctx, eid);
    const result = readAutomationResource(ctx, 'entity-bundle', { stableId }) as any;

    expect(result.stableId).toBe(stableId);
    expect(result.bundle.Info.name).toBe('StableEntity');
  });

  it('should throw error for entity-bundle without stableId', () => {
    expect(() => {
      readAutomationResource(ctx, 'entity-bundle');
    }).toThrow('entity-bundle resource requires stableId parameter');
  });

  it('should throw error for unknown resource', () => {
    expect(() => {
      readAutomationResource(ctx, 'nonexistent-resource');
    }).toThrow("Automation resource 'nonexistent-resource' not found");
  });

  it('should get component-catalog resource', () => {
    const catalog = readAutomationResource(ctx, 'component-catalog') as any[];

    expect(Array.isArray(catalog)).toBe(true);
    // Note: Catalog may be empty in tests if schemas aren't registered
    // This is expected - the important thing is it returns an array
  });

  it('should get module-type-catalog resource', async () => {
    await executeAutomationCommand(ctx, {} as any, 'upsert-module-type', {
      moduleName: 'field',
      typeName: 'radialPulse',
      factorySource:
        '(params) => ({ sample3D(x, y, z) { const r = Math.sqrt(x * x + z * z); return r <= (params.radius ?? 1) ? (params.amplitude ?? 1) : 0; } })',
      description: 'Simple radial field for testing',
      parameterSchema: {
        type: 'object',
        properties: {
          radius: { type: 'number' },
          amplitude: { type: 'number' },
        },
      },
    });

    const catalog = readAutomationResource(ctx, 'module-type-catalog') as any[];
    const entry = catalog.find((item) => item.moduleName === 'field' && item.typeName === 'radialPulse');

    expect(entry).toBeDefined();
    expect(entry.persisted).toBe(true);
    expect(entry.description).toBe('Simple radial field for testing');
  });

  it('should get module-instance-catalog resource', async () => {
    await executeAutomationCommand(ctx, {} as any, 'upsert-module-type', {
      moduleName: 'field',
      typeName: 'radialPulse',
      factorySource:
        '(params) => ({ sample3D(x, y, z) { const r = Math.sqrt(x * x + z * z); return r <= (params.radius ?? 1) ? (params.amplitude ?? 1) : 0; } })',
    });
    await executeAutomationCommand(ctx, {} as any, 'upsert-module-instance', {
      moduleName: 'field',
      instanceName: 'pulseMask',
      definition: {
        type: 'radialPulse',
        params: { radius: 0.25, amplitude: 2 },
      },
    });

    const catalog = readAutomationResource(ctx, 'module-instance-catalog') as any[];
    const entry = catalog.find((item) => item.moduleName === 'field' && item.instanceName === 'pulseMask');

    expect(entry).toBeDefined();
    expect(entry.typeName).toBe('radialPulse');
    expect(entry.builtIn).toBe(false);
  });

  it('should get entity-list resource', () => {
    spawn(ctx, { Info: { name: 'Entity1' }, Transform: { x: 0, y: 0, z: 0 } });
    spawn(ctx, { Info: { name: 'Entity2' }, Transform: { x: 5, y: 0, z: 0 } });

    const entityList = readAutomationResource(ctx, 'entity-list') as any[];

    expect(Array.isArray(entityList)).toBe(true);
    expect(entityList.length).toBe(2);
    expect(entityList[0].name).toBeDefined();
    expect(entityList[0].transform).toBeDefined();
    expect(entityList[0].stableId).toBeTypeOf('number');
  });

  it('should get metadata resource', () => {
    const metadata = readAutomationResource(ctx, 'metadata') as any;

    expect(metadata.title).toBe('Test World');
    expect(metadata.description).toBe('Test');
  });
});

describe('Automation commands - terminate and read-resource', () => {
  let ctx: ReturnType<typeof createECS>;
  const mockEngine = {} as any;

  beforeEach(() => {
    ctx = createECS();
    setResource(ctx, 'nextStableId', 0);
    setResource(ctx, 'metadata', { title: 'Test World' });
  });

  it('should execute terminate command', async () => {
    const result = await executeAutomationCommand(ctx, mockEngine, 'terminate', {
      message: 'All tasks completed successfully',
      success: true
    });

    expect(result).toBe('All tasks completed successfully');
  });

  it('should execute terminate with default success', async () => {
    const result = await executeAutomationCommand(ctx, mockEngine, 'terminate', {
      message: 'Done'
    });

    expect(result).toBe('Done');
  });

  it('should execute read-resource command', async () => {
    spawn(ctx, { Info: { name: 'TestEntity' } });

    const result = await executeAutomationCommand(ctx, mockEngine, 'read-resource', {
      resourceName: 'world-state-summary'
    });

    const parsed = JSON.parse(result);
    expect(parsed.title).toBe('Test World');
    expect(parsed.entityCount).toBe(1);
  });

  it('should execute read-resource with stableId parameter', async () => {
    const eid = spawn(ctx, { 
      Info: { name: 'MyEntity' },
      Transform: { x: 100, y: 50, z: 25 }
    });
    const stableId = eidToStableId(ctx, eid);

    const result = await executeAutomationCommand(ctx, mockEngine, 'read-resource', {
      resourceName: 'entity-bundle',
      stableId
    });

    const parsed = JSON.parse(result);
    expect(parsed.stableId).toBe(stableId);
    expect(parsed.bundle.Info.name).toBe('MyEntity');
    expect(parsed.bundle.Transform.x).toBe(100);
  });

  it('should execute read-resource with stableId parameter', async () => {
    const eid = spawn(ctx, { 
      Info: { name: 'StableReadEntity' },
      Transform: { x: 3, y: 6, z: 9 }
    });

    const stableId = eidToStableId(ctx, eid);

    const result = await executeAutomationCommand(ctx, mockEngine, 'read-resource', {
      resourceName: 'entity-bundle',
      stableId
    });

    const parsed = JSON.parse(result);
    expect(parsed.stableId).toBe(stableId);
    expect(parsed.bundle.Info.name).toBe('StableReadEntity');
  });

  it('should throw error for read-resource without resourceName', async () => {
    await expect(
      executeAutomationCommand(ctx, mockEngine, 'read-resource', {})
    ).rejects.toThrow('read-resource requires resourceName parameter');
  });

  it('should execute read-resource for entity-list', async () => {
    spawn(ctx, { Info: { name: 'Entity1' } });
    spawn(ctx, { Info: { name: 'Entity2' } });

    const result = await executeAutomationCommand(ctx, mockEngine, 'read-resource', {
      resourceName: 'entity-list'
    });

    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
  });

  it('should upsert and remove module types and instances through automation commands', async () => {
    await executeAutomationCommand(ctx, mockEngine, 'upsert-module-type', {
      moduleName: 'field',
      typeName: 'radialPulse',
      factorySource:
        '(params) => ({ sample3D(x, y, z) { const r = Math.sqrt(x * x + z * z); return r <= (params.radius ?? 1) ? (params.amplitude ?? 1) : 0; } })',
    });

    let typeCatalog = readAutomationResource(ctx, 'module-type-catalog') as any[];
    expect(typeCatalog.some((entry) => entry.moduleName === 'field' && entry.typeName === 'radialPulse')).toBe(true);

    await executeAutomationCommand(ctx, mockEngine, 'upsert-module-instance', {
      moduleName: 'field',
      instanceName: 'pulseMask',
      definition: {
        type: 'radialPulse',
        params: { radius: 0.3, amplitude: 1.5 },
      },
    });

    let instanceCatalog = readAutomationResource(ctx, 'module-instance-catalog') as any[];
    expect(instanceCatalog.some((entry) => entry.moduleName === 'field' && entry.instanceName === 'pulseMask')).toBe(true);

    await executeAutomationCommand(ctx, mockEngine, 'remove-module-instance', {
      moduleName: 'field',
      instanceName: 'pulseMask',
    });
    instanceCatalog = readAutomationResource(ctx, 'module-instance-catalog') as any[];
    expect(instanceCatalog.some((entry) => entry.moduleName === 'field' && entry.instanceName === 'pulseMask')).toBe(false);

    await executeAutomationCommand(ctx, mockEngine, 'remove-module-type', {
      moduleName: 'field',
      typeName: 'radialPulse',
    });
    typeCatalog = readAutomationResource(ctx, 'module-type-catalog') as any[];
    expect(typeCatalog.some((entry) => entry.moduleName === 'field' && entry.typeName === 'radialPulse' && entry.persisted)).toBe(false);
  });
});

describe('Automation commands - undo/redo integration', () => {
  let ctx: ReturnType<typeof createECS>;
  const mockEngine = {} as any;

  beforeEach(() => {
    ctx = createECS();
    setResource(ctx, 'nextStableId', 0);
  });

  it('pushes modify-component commands onto the editor command stack and supports undo/redo', async () => {
    const eid = spawn(ctx, {
      Info: { name: 'Before', description: 'Desc' },
    });

    const stableId = eidToStableId(ctx, eid);

    await executeAutomationCommand(ctx, mockEngine, 'modify-component', {
      stableId,
      componentName: 'Info',
      componentData: { name: 'After!' },
    });

    const manager = getResource<CommandManager>(ctx, 'editorCommandManager');
    expect(manager).toBeDefined();
    expect(manager?.canUndo()).toBe(true);
    expect(decode(Info.name[eid])).toBe('After!');

    expect(manager?.undo()).toBe(true);
    expect(decode(Info.name[eid])).toBe('Before');

    expect(manager?.redo()).toBe(true);
    expect(decode(Info.name[eid])).toBe('After!');
  });

  it('normalizes field-style body part paths for set-body-part-transform', async () => {
    const eid = spawn(ctx, {
      Body: {
        type: 'composite',
        params: {
          parts: [
            {
              type: 'group',
              tag: 'root',
              children: [
                {
                  type: 'primitive',
                  tag: 'head',
                  geometry: { type: 'sphere', params: { radius: 0.5 } },
                  localPosition: { x: 0, y: 1, z: 0 },
                },
              ],
            },
          ],
        },
      },
      Info: { name: 'Body Entity' },
    });
    const seed = readAutomationResource(ctx, 'entity-bundle', { stableId: eidToStableId(ctx, eid) }) as any;

    await expect(
      executeAutomationCommand(ctx, mockEngine, 'set-body-part-transform', {
        stableId: seed.stableId,
        path: 'Body.params.parts.0.children.0',
        transform: {
          position: { x: 0.25, y: 1.5, z: -0.5 },
        },
      }),
    ).resolves.toBe('Move body part');

    const currentEid = stableIdToEid(ctx, seed.stableId) ?? eid;
    const updatedBundle = getEntityBundle(ctx, currentEid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });
    const updatedPart = getPartAtPath(updatedBundle?.Body as any, [0, 0]) as any;

    expect(updatedPart?.localPosition).toEqual({ x: 0.25, y: 1.5, z: -0.5 });
  });
});
