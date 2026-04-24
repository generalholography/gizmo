/**
 * Entity Commands
 * Add, delete, and duplicate entity operations
 */

import * as THREE from 'three';
import { ECSContext, getResource } from '../../ecs';
import { spawn, ArchetypeRef } from '../../spawn';
import { despawn, ArchetypeBundle, getEntityBundle } from '../../despawn';
import { EditorCommand } from '../CommandManager';
import { Info } from '../../components/Info';
import { hasComponent } from 'bitecs';
import { decode } from '../../../utils/strings';
import { eidToStableId, stableIdToEid } from '../../../utils/stableId';

function sanitizeBundleForSpawn(bundle: ArchetypeBundle): ArchetypeBundle {
  const sanitized = JSON.parse(JSON.stringify(bundle)) as ArchetypeBundle;
  if ('StableID' in sanitized) {
    delete (sanitized as any).StableID;
  }
  if (sanitized._meta && 'stableId' in sanitized._meta) {
    delete (sanitized._meta as any).stableId;
  }
  return sanitized;
}

/**
 * Add Entity Command
 */
export class AddEntityCommand implements EditorCommand {
  description: string;
  private spawnedEid: number | null = null;
  private stableId?: number;
  
  constructor(
    private ctx: ECSContext,
    private archetypeRef: ArchetypeRef,
    private overrides: Record<string, any> = {},
    private archetypeName?: string
  ) {
    this.description = `Add ${archetypeName || 'Entity'}`;
  }

  execute(): void {
    const archetypeRef = typeof this.archetypeRef === 'string'
      ? this.archetypeRef
      : sanitizeBundleForSpawn(this.archetypeRef);

    this.spawnedEid = spawn(this.ctx, archetypeRef, this.overrides);
    this.stableId = this.spawnedEid !== null ? eidToStableId(this.ctx, this.spawnedEid) : undefined;
    console.log(`[AddEntity] Spawned entity ${this.spawnedEid}`);
  }
  
  undo(): void {
    const resolvedEid = this.stableId !== undefined ? stableIdToEid(this.ctx, this.stableId) : this.spawnedEid;
    if (resolvedEid === null || resolvedEid === undefined) {
      console.warn('[AddEntity] Cannot undo: entity was never spawned');
      return;
    }
    
    despawn(this.ctx, resolvedEid);
    console.log(`[AddEntity] Despawned entity ${resolvedEid}`);
    this.spawnedEid = null;
  }
  
  redo(): void {
    this.execute();
  }
  
  getSpawnedEntityId(): number | null {
    return this.spawnedEid;
  }
}

/**
 * Delete Entity Command
 */
export class DeleteEntityCommand implements EditorCommand {
  description: string;
  private entityBundle: ArchetypeBundle | null = null;
  
  constructor(
    private ctx: ECSContext,
    private eid: number,
    private entityName?: string
  ) {
    this.description = `Delete ${entityName || `Entity #${eid}`}`;
  }
  
  execute(): void {
    // Capture state before deletion
    this.entityBundle = despawn(this.ctx, this.eid);
    console.log(`[DeleteEntity] Deleted entity ${this.eid}`);
  }
  
  undo(): void {
    if (!this.entityBundle) {
      console.warn('[DeleteEntity] Cannot undo: entity bundle not saved');
      return;
    }
    
    // Re-spawn the entity with its saved bundle
    const newEid = spawn(this.ctx, this.entityBundle);
    console.log(`[DeleteEntity] Restored entity as ${newEid}`);
    
    // Note: New entity will have different ID, which is a known limitation
    // For V2, we could track and restore stable IDs
  }
  
  redo(): void {
    if (!this.entityBundle) {
      console.warn('[DeleteEntity] Cannot redo: entity bundle not saved');
      return;
    }
    
    // Find entity by matching bundle (approximate)
    // This is a limitation - ideally we'd track stable IDs
    console.warn('[DeleteEntity] Redo after undo may not target exact same entity');
  }
}

/**
 * Duplicate Entity Command
 */
export class DuplicateEntityCommand implements EditorCommand {
  description: string;
  private duplicatedEid: number | null = null;
  private sourceBundle: ArchetypeBundle | null = null;
  
  constructor(
    private ctx: ECSContext,
    private sourceEid: number,
    private offset: { x?: number; y?: number; z?: number } = { x: 1, z: 1 }
  ) {
    let entityName = `Entity #${sourceEid}`;
    if (hasComponent(ctx, Info, sourceEid)) {
      entityName = decode(Info.name[sourceEid]);
    }
    this.description = `Duplicate ${entityName}`;
  }
  
  execute(): void {
    // Get bundle from source entity (without despawning)
    const renderObjects = getResource<Map<number, THREE.Object3D>>(this.ctx, 'renderObjects');
    if (!renderObjects?.has(this.sourceEid)) {
      console.error(`[DuplicateEntity] Source entity ${this.sourceEid} not found`);
      return;
    }
    
    this.sourceBundle = sanitizeBundleForSpawn(getEntityBundle(this.ctx, this.sourceEid));
    
    // Apply offset to transform
    if (this.sourceBundle.Transform && this.offset) {
      this.sourceBundle.Transform.x += this.offset.x || 0;
      this.sourceBundle.Transform.y += this.offset.y || 0;
      this.sourceBundle.Transform.z += this.offset.z || 0;
    }
    
    // Spawn duplicate
    this.duplicatedEid = spawn(this.ctx, this.sourceBundle);
    console.log(`[DuplicateEntity] Duplicated entity ${this.sourceEid} as ${this.duplicatedEid}`);
  }
  
  undo(): void {
    if (this.duplicatedEid === null) {
      console.warn('[DuplicateEntity] Cannot undo: no duplicate was created');
      return;
    }
    
    despawn(this.ctx, this.duplicatedEid);
    console.log(`[DuplicateEntity] Removed duplicate ${this.duplicatedEid}`);
    this.duplicatedEid = null;
  }
  
  redo(): void {
    this.execute();
  }
  
  getDuplicatedEntityId(): number | null {
    return this.duplicatedEid;
  }
}
