import { defineQuery, hasComponent } from 'bitecs';
import { ECSContext, getModule, getResource, setResource } from './ecs';
import { DimensionDefinition } from './worldSchema';
import { spawn } from './spawn';
import { despawn } from './despawn';
import { DimensionTerrain } from './components/DimensionTerrain';
import { Info } from './components/Info';
import { writeEncodedString } from '../utils/strings';
import type { FieldDefinition } from '../modules/field';

const dimensionTerrainQuery = defineQuery([DimensionTerrain]);

type TerrainRecord = {
  dimensionName: string;
  eid: number;
};

function terrainRecordKey(dimensionName: string): string {
  return `dimension:${dimensionName}`;
}

function getTerrainRecords(ctx: ECSContext): Map<string, TerrainRecord> {
  let records = getResource<Map<string, TerrainRecord>>(ctx, 'dimensionTerrainEntities', true);
  if (!records) {
    records = new Map();
    setResource(ctx, 'dimensionTerrainEntities', records);
  }
  return records;
}

function resolveTerrainSize(size: any): { x: number; z: number; normalization: number } {
  if (typeof size === 'object' && size !== null) {
    const x = Number((size as any).x ?? (size as any).width ?? 100);
    const z = Number((size as any).z ?? (size as any).depth ?? x);
    return {
      x: Number.isFinite(x) && x > 0 ? x : 100,
      z: Number.isFinite(z) && z > 0 ? z : 100,
      normalization: Math.max(x, z, 1),
    };
  }

  const uniform = Number(size ?? 100);
  const safeUniform = Number.isFinite(uniform) && uniform > 0 ? uniform : 100;
  return { x: safeUniform, z: safeUniform, normalization: safeUniform };
}

function cloneFieldDefinition(definition: FieldDefinition): FieldDefinition {
  return JSON.parse(JSON.stringify(definition));
}

function resolveTerrainFieldReference(ctx: ECSContext, dimension: DimensionDefinition): string | FieldDefinition | undefined {
  const terrain = dimension.terrain;
  if (!terrain?.heightField) return undefined;

  if (typeof terrain.heightField === 'string') {
    return terrain.heightField;
  }

  const fieldModule = getModule(ctx, 'field', true);
  const fieldName = `${dimension.name}.terrainHeight`;
  try {
    fieldModule?.replaceDefinition(fieldName, terrain.heightField as FieldDefinition);
    (terrain as any).heightField = fieldName;
    return fieldName;
  } catch (error) {
    console.warn(`Failed to register dimension terrain field '${fieldName}':`, error);
    return terrain.heightField as FieldDefinition;
  }
}

function resolveTerrainGeometryField(
  ctx: ECSContext,
  field: string | FieldDefinition,
): string | FieldDefinition {
  if (typeof field !== 'string') {
    return cloneFieldDefinition(field);
  }

  const fieldModule = getModule<any>(ctx, 'field', true);
  const definition = fieldModule?.getDefinitionByName(field) as FieldDefinition | undefined;
  return definition ? cloneFieldDefinition(definition) : field;
}

function createTerrainBundle(ctx: ECSContext, dimension: DimensionDefinition) {
  const terrain = dimension.terrain;
  if (!terrain) return null;

  const fieldReference = resolveTerrainFieldReference(ctx, dimension);
  if (!fieldReference) return null;
  const geometryField = resolveTerrainGeometryField(ctx, fieldReference);

  const size = resolveTerrainSize(terrain.size);
  const heightOffset = terrain.heightOffset ?? 0;
  const resolution = terrain.resolution ?? 128;
  const material = terrain.material ?? {
    type: 'solid',
    params: { color: '#22883a' },
  };

  const parts: any[] = [
    {
      geometry: {
        type: 'displacedPlane',
        params: {
          lengthX: size.x,
          lengthZ: size.z,
          resolution,
          field: geometryField,
        },
      },
      material,
      localPosition: [0, heightOffset, 0],
    },
  ];

  if (terrain.water?.enabled) {
    parts.push({
      geometry: {
        type: 'displacedPlane',
        params: {
          lengthX: size.x,
          lengthZ: size.z,
          resolution: Math.min(resolution, 128),
          field: { type: 'simplex', params: { amplitude: 0 } },
        },
      },
      material: terrain.water.material ?? {
        type: 'liquid',
        params: {
          baseColor: '#3366ff',
          depthTint: '#112244',
          opacity: 0.65,
          waveFreq: 1,
          waveAmp: 0.35,
          waveSpeed: 1,
        },
      },
      localPosition: [0, terrain.water.height ?? 0, 0],
      ignoreCollisions: true,
    });
  }

  return {
    Info: {
      name: `${dimension.name} Terrain`,
      description: `Dimension terrain for ${dimension.name}`,
    },
    Transform: {},
    Body: {
      type: 'composite',
      params: { parts },
    },
    MotionSource: {
      type: 'static',
      params: {},
    },
    DimensionTerrain: {},
  };
}

function removeDimensionTerrain(ctx: ECSContext, record: TerrainRecord | undefined): void {
  if (!record) return;
  try {
    despawn(ctx, record.eid);
  } catch {
    // The entity may already have been cleared by a full ECS reset.
  }
}

export function syncDimensionTerrain(ctx: ECSContext, dimensions: DimensionDefinition[]): void {
  const records = getTerrainRecords(ctx);
  const expected = new Set<string>();

  for (const dimension of dimensions) {
    const key = terrainRecordKey(dimension.name);
    expected.add(key);
    removeDimensionTerrain(ctx, records.get(key));
    records.delete(key);

    if (!dimension.terrain?.enabled && dimension.terrain?.enabled !== undefined) {
      continue;
    }

    const bundle = createTerrainBundle(ctx, dimension);
    if (!bundle) continue;

    const eid = spawn(ctx, bundle);
    if (hasComponent(ctx, Info, eid)) {
      writeEncodedString(Info.name[eid], bundle.Info.name);
      writeEncodedString(Info.description[eid], bundle.Info.description);
    }
    records.set(key, { dimensionName: dimension.name, eid });
  }

  for (const [key, record] of records.entries()) {
    if (expected.has(key)) continue;
    removeDimensionTerrain(ctx, record);
    records.delete(key);
  }
}

export function getDimensionTerrainEntityIds(ctx: ECSContext): number[] {
  const fromResource = getResource<Map<string, TerrainRecord>>(ctx, 'dimensionTerrainEntities', true);
  if (fromResource) {
    return Array.from(fromResource.values()).map((record) => record.eid);
  }

  return Array.from(dimensionTerrainQuery(ctx));
}

export function isDimensionTerrainEntity(ctx: ECSContext, eid: number): boolean {
  return hasComponent(ctx, DimensionTerrain, eid);
}
