import { defineComponent, Types, hasComponent, addComponent } from "bitecs";
import { ECSContext, getResource, getModule } from "../ecs";
import { Metrics } from "../metrics";
import { getName } from "./Info";
import { despawn } from "../despawn";
import { DamageFlash } from "./DamageFlash";
import * as THREE from "three";
import { damageFlashMat } from "../systems/bodyRendering";
import { decode } from "../../utils/strings";
import { Faction, NO_FACTION_ID } from "./Faction";
import { Inventory as InventoryComp } from "./Inventory";
import { Inventory, drop, inventoryChanged } from "../inventory";
import { Transform } from "./Transform";
import { AI } from "./AI";
import { Owner } from "./Owner";
import { getMemory } from "../memory";
import { Player } from "./Player";
import EventEmitter from "../../utils/eventEmitter";
import { clamp } from "../../utils/math";
import { dismount, MountedBy } from "./MountedBy";
import { Mounting } from "./Mounting";
import { MotionSource } from "./MotionSource";
import { _RuntimeCharacterControllerData } from "./_RuntimeCharacterControllerData";
import { motionSourceModule } from "../../modules/motionSource";
import { getStore, InventoryStore, StockStore, Store } from "../../modules/entityStore";
import { getRuleModule } from "../../modules/rule";

export const Health = defineComponent({
  value: Types.f32,
  maxValue: Types.f32,
});

export enum Relationship {
  NEUTRAL,
  FRIENDLY,
  HOSTILE,
}

export const BASE_KNOCKBACK_FORCE = 10.5;

function ensureHealthStock(ctx: ECSContext, eid: number): { current: number; max: number; min?: number } | undefined {
  const stocks = getStore<StockStore>(ctx, 'health');
  if (stocks.has(eid)) {
    const healthStock = stocks.get(eid);
    if (!healthStock) return undefined;
    Health.value[eid] = healthStock.current;
    Health.maxValue[eid] = healthStock.max;
    return healthStock;
  }

  // Legacy fallback: if an entity still carries the Health component,
  // hydrate the authoritative health stock instance from it.
  if (!hasComponent(ctx, Health, eid)) return undefined;

  const next = { current: Health.value[eid], max: Health.maxValue[eid] || Health.value[eid], min: 0 };
  stocks.set(eid, next);
  return next;
}

function writeHealthStock(ctx: ECSContext, eid: number, current: number, max: number): void {
  const stocks = getStore<StockStore>(ctx, 'health');
  stocks.set(eid, { current, max, min: 0 });
  Health.value[eid] = current;
  Health.maxValue[eid] = max;
}

export function getRelationship(ctx: ECSContext, eid1: number, eid2: number): Relationship {
  const actorFaction = hasComponent(ctx, Faction, eid1) ? decode(Faction.id[eid1]) : NO_FACTION_ID;
  const targetFaction = hasComponent(ctx, Faction, eid2) ? decode(Faction.id[eid2]) : NO_FACTION_ID;
  // Check if factions are hostile
  // If either is unaligned, they are neutral
  if (actorFaction === NO_FACTION_ID || targetFaction === NO_FACTION_ID) {
    return Relationship.NEUTRAL;
  }
  // If both are aligned, check if they are the same faction
  // If they are the same faction, they are not hostile
  if (actorFaction === targetFaction) {
    return Relationship.FRIENDLY;
  }
  return Relationship.HOSTILE;
}

// Heal logic split out for reuse
export function doHeal(ctx: ECSContext, actor: number, target: number, amount: number): boolean {
  try {
    const health = ensureHealthStock(ctx, target);
    if (!health) return false;

    // Allow healing regardless of relationship - healing should be universal
    const currentHealth = health.current;
    const maxHealth = health.max;
    
    // Ensure we don't heal above max health (never heal less than 0 health means don't exceed max)
    const healAmount = Math.min(amount, maxHealth - currentHealth);
    
    if (healAmount <= 0) return false; // Already at max health or invalid heal
    
    writeHealthStock(ctx, target, currentHealth + healAmount, maxHealth);

    const metrics = getResource<Metrics>(ctx, 'metrics');
    metrics.increment(target, 'health received', getName(ctx, actor), healAmount);
    
    return true;
  } catch (error) {
    console.error('Error in doHeal:', error);
    return false;
  }
}

// Calculate the F factor based on motion source type
function calculateFFactor(ctx: ECSContext, actor: number): number {
  if (!hasComponent(ctx, MotionSource, actor)) {
    return 0; // No motion source, no knockback force
  }

  const motionSourceMod = getModule<ReturnType<typeof motionSourceModule>>(ctx, 'motionSource');
  if (!motionSourceMod) return 0;

  const motionSource = motionSourceMod.get(MotionSource.motionSourceId[actor]);
  if (!motionSource) return 0;

  if (motionSource.bodyType === 'static') {
    return 0;
  } else if (motionSource.bodyType === 'dynamic') {
    // F = mass * rb speed / 5, clamped to 1-2
    const rb = ctx.rapier.world.getRigidBody(MotionSource.bodyHandle[actor]);
    if (!rb) return 1;
    
    const velocity = rb.linvel();
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
    const mass = motionSource.mass || 1;
    const F = (mass * speed) / 5;
    return clamp(F, 1, 2);
  } else if (motionSource.bodyType === 'kinematic' && motionSource.controller?.type === 'character') {
    //TODO: fix to adjust for
    //- is melee
    //- is player sprinting (max)
    //- is the move vector towards target
    return 1;

    // Character controller: based on percentage of max xz velocity and angle between move and direction to target
    const rb = ctx.rapier.world.getRigidBody(MotionSource.bodyHandle[actor]);
    if (!rb) return 1;
    
    const velocity = rb.linvel();
    const xzSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    const maxSpeed = motionSource.controller.speed;
    const speedRatio = maxSpeed > 0 ? xzSpeed / maxSpeed : 0;
    
    // For now, use speed ratio clamped to 1-2. 
    // TODO: Factor in angle between move vector and direction to target
    return clamp(1 + speedRatio, 1, 2);
  }
  
  return 1;
}

// Calculate knockback vector 
function calculateKnockbackVector(
  ctx: ECSContext, 
  actor: number, 
  target: number, 
  knockbackModifier: number, 
  isCollision: boolean = false, 
  collisionDirection?: THREE.Vector3
): THREE.Vector3 {
  const F = calculateFFactor(ctx, actor);
  
  let direction: THREE.Vector3;
  
  if (isCollision && collisionDirection) {
    // Use collision direction normalized
    direction = collisionDirection.clone().normalize();
  } else {
    // Default: xz vector from actor to target normalized + (0, 0.33, 0) then normalized again
    if (!hasComponent(ctx, Transform, actor) || !hasComponent(ctx, Transform, target)) {
      return new THREE.Vector3(0, 0, 0);
    }
    
    const actorPos = new THREE.Vector3(Transform.x[actor], Transform.y[actor], Transform.z[actor]);
    const targetPos = new THREE.Vector3(Transform.x[target], Transform.y[target], Transform.z[target]);
    
    const xzDirection = new THREE.Vector3(
      targetPos.x - actorPos.x,
      0,
      targetPos.z - actorPos.z
    ).normalize();
    
    direction = xzDirection.add(new THREE.Vector3(0, 0.33, 0)).normalize();
  }
  
  return direction.multiplyScalar(BASE_KNOCKBACK_FORCE * knockbackModifier * F);
}

// Apply knockback to target based on its motion source type
function applyKnockback(ctx: ECSContext, target: number, knockbackVector: THREE.Vector3): void {
  if (!hasComponent(ctx, MotionSource, target)) {
    return; // No motion source, can't apply knockback
  }

  const motionSourceMod = getModule<ReturnType<typeof motionSourceModule>>(ctx, 'motionSource');
  if (!motionSourceMod) return;

  const motionSource = motionSourceMod.get(MotionSource.motionSourceId[target]);
  if (!motionSource) return;

  if (motionSource.bodyType === 'static') {
    // Do nothing for static bodies
    return;
  } else if (motionSource.bodyType === 'dynamic') {
    // Add knockback vector as force to dynamic rigid body
    const rb = ctx.rapier.world.getRigidBody(MotionSource.bodyHandle[target]);
    if (rb) {
      rb.applyImpulse({ x: knockbackVector.x, y: knockbackVector.y, z: knockbackVector.z }, true);
    }
  } else if (motionSource.bodyType === 'kinematic' && motionSource.controller?.type === 'character') {
    // Add knockback to character controller via _RuntimeCharacterControllerData
    if (!hasComponent(ctx, _RuntimeCharacterControllerData, target)) {
      addComponent(ctx, _RuntimeCharacterControllerData, target);
    }
    
    _RuntimeCharacterControllerData.knockbackVector[target][0] = knockbackVector.x;
    _RuntimeCharacterControllerData.knockbackVector[target][1] = knockbackVector.y;
    _RuntimeCharacterControllerData.knockbackVector[target][2] = knockbackVector.z;
  }
}

// Damage logic split out for reuse
export function doDamage(
  ctx: ECSContext, 
  actor: number, 
  target: number, 
  amount: number, 
  knockbackValue: number = 1, 
  isCollision: boolean = false, 
  collisionDirection?: THREE.Vector3
): boolean {
  try {
    const health = ensureHealthStock(ctx, target);
    if (!health) return false;

    const relationship = getRelationship(ctx, actor, target);
    
    if (relationship === Relationship.FRIENDLY) return false;
    const nextHealth = clamp(health.current - amount, 0, health.max);
    writeHealthStock(ctx, target, nextHealth, health.max);

  // Record damage in target's memory if target has AI
  if (hasComponent(ctx, AI, target)) {
    try {
      const memory = getMemory(ctx, target);
      // Get the actual aggressor (consider owner if actor is owned)
      const actualAggressor = hasComponent(ctx, Owner, actor) ? Owner.eid[actor] : actor;
      memory.lastDamageDealt = {
        entity: actualAggressor,
        happenedAt: performance.now()
      };
    } catch (error) {
      console.warn('Failed to update AI memory for damage:', error);
    }
  }

  if (!hasComponent(ctx, DamageFlash, target)) {
    addComponent(ctx, DamageFlash, target);
    const objects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects')!;
    const obj = objects.get(target);
    if (obj) {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = damageFlashMat;
        }
      });
    }
  }
  DamageFlash.startTime[target] = ctx.time.getElapsed();

  // Apply knockback if specified
  if (knockbackValue > 0) {
    const knockbackVector = calculateKnockbackVector(ctx, actor, target, knockbackValue, isCollision, collisionDirection);
    applyKnockback(ctx, target, knockbackVector);
  }

  const metrics = getResource<Metrics>(ctx, 'metrics');
  metrics.increment(target, 'damage received', getName(ctx, actor), amount);
  if (nextHealth <= 0) {
    // Drop all inventory items before entity dies
    if (hasComponent(ctx, InventoryComp, target)) {
      const inventories = getStore<InventoryStore>(ctx, 'inventory');
      const inv = inventories.get(target);
      if (inv) {
        // Drop all non-null inventory items
        for (let i = 0; i < inv.size; i++) {
          if (inv.slots[i] !== null) {
            drop(ctx, target, i);
          }
        }
      }
    }

    const ruleModule = getRuleModule(ctx);
    ruleModule.emitEngineTrigger('die', { self: target, other: actor });

    
    // Emit player death event if target is a player
    if (hasComponent(ctx, Player, target)) {
      const lifecycleEvents = getResource<EventEmitter<any>>(ctx, 'lifecycleEvents');
      if (lifecycleEvents) {
        const killerName = actor !== target ? getName(ctx, actor) : undefined;
        lifecycleEvents.emit('player_death', {
          playerEid: target,
          killerEid: actor !== target ? actor : undefined,
          killerName: killerName
        });
      }
    }
    
    // Check if the target being killed is a held item
    const held = getStore<Store<{ eid: number; slot: number }>>(ctx, "heldItems");
    const inventories = getStore<InventoryStore>(ctx, 'inventory');
    // Find if this entity is held by someone
    for (const [holderEid, heldData] of held.entries()) {
      if (heldData.eid === target) {
        // Remove the item from the holder's inventory
        const inv = inventories.get(holderEid);
        if (inv && heldData.slot >= 0 && heldData.slot < inv.size) {
          inv.slots[heldData.slot] = null;
          inventoryChanged(ctx, holderEid);
        }
        break;
      }
    }

    // Need to dismount before despawning to avoid dangling references
    if (hasComponent(ctx, MountedBy, target)) {
      dismount(ctx, target);
    }
    if (hasComponent(ctx, Mounting, target)) {
      const mountEid = Mounting.target[target];
      dismount(ctx, mountEid);
    }
    
    const bundle = despawn(ctx, target);
    metrics.increment(actor, 'entities killed', bundle?.Info?.name);
  }
  
  return true;
  } catch (error) {
    console.error('Error in doDamage:', error);
    return false;
  }
}
