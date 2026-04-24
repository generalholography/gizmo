import { describe, it, expect } from 'vitest';
import skeleton from '../skeleton';
import bow from '../bow';
import arrow from '../arrow';
import skull from '../skull';


function getRule(entity: any, type: string) {
  return entity.Rules.find((rule: any) => rule.trigger.type === type);
}

describe('Skeleton Entity and Related Items', () => {
  it('should have properly structured skeleton entity', () => {
    expect(skeleton.Info.name).toBe('Skeleton');
    expect(skeleton.Body.type).toBe('composite');
    expect(skeleton.Body.params.parts).toHaveLength(1);
    
    // Check main torso
    const torso = skeleton.Body.params.parts[0];
    expect(torso.geometry.type).toBe('box');
    expect(torso.children).toBeDefined();
    expect(torso.children).toHaveLength(5); // head, arms, legs
    
    // Find head child
    const head = torso.children!.find((child: any) => child.tag === 'head');
    expect(head).toBeDefined();

    // Find heldItemAnchor in right arm
    const rightArm = torso.children!.find((child: any) => child.tag === 'arm_r');
    expect(rightArm).toBeDefined();
    expect(rightArm.children).toBeDefined();
    const heldItemAnchor = rightArm.children[0];
    expect(heldItemAnchor.tag).toBe('heldItemAnchor');
  });

  it('should have skeleton with proper inventory containing bow and skull', () => {
    expect(skeleton.Inventory).toBeDefined();
    expect(skeleton.Inventory.size).toBe(3);
    expect(skeleton.Inventory.items).toEqual(['bow', 'skull', 'healthPotion']);
    expect(skeleton.Inventory.selectedItemIndex).toBe(0);
  });

  it('should have skeleton with animations', () => {
    expect(skeleton.Animation).toBeDefined();
    expect(skeleton.Animation.clips).toHaveLength(2);
    
    const defaultClip = skeleton.Animation.clips.find((clip: any) => clip.name === 'default');
    const moveClip = skeleton.Animation.clips.find((clip: any) => clip.name === 'move');
    
    expect(defaultClip).toBeDefined();
    expect(moveClip).toBeDefined();
    
    expect(defaultClip.duration).toBe(2.0);
    expect(moveClip.duration).toBe(1.0);
  });

  it('should have bow that shoots arrows', () => {
    expect(bow.Info.name).toBe('Bow');
    const primaryAction = getRule(bow, 'primaryAction');
    expect(primaryAction).toBeDefined();
    expect(primaryAction.actions).toHaveLength(1);

    const spawnEffect = primaryAction.actions[0];
    expect(spawnEffect.type).toBe('spawnEntityFrom');
    expect(spawnEffect.params.entity).toBe('arrow');
    expect(spawnEffect.params.velocity).toBe(40);
  });

  it('should have arrow with proper damage mechanics', () => {
    expect(arrow.Info.name).toBe('Arrow');
    const inRange = getRule(arrow, 'entityInRange');
    expect(inRange).toBeDefined();
    expect(inRange.actions).toHaveLength(1);

    const damageEffect = inRange.actions[0];
    expect(damageEffect.type).toBe('damage');
    expect(damageEffect.params.amount).toBe(3);
    expect(damageEffect.onSuccess).toBeDefined();
    expect(damageEffect.onSuccess![0].type).toBe('kill');
  });

  it('should have skull that does nothing functional', () => {
    expect(skull.Info.name).toBe('Skull');
    expect(skull.Info.description).toContain('no purpose');
    
    // Should only have pickup interaction, no primary action
    const interact = getRule(skull, 'interact');
    expect(interact).toBeDefined();
    expect(getRule(skull, 'primaryAction')).toBeUndefined();
    expect(getRule(skull, 'secondaryAction')).toBeUndefined();
  });

  it('should have skeleton with enemy AI characteristics', () => {
    expect(skeleton.AI).toBeDefined();
    expect(skeleton.AI.isAggressive).toBe(true);
    expect(skeleton.AI.awarenessRange).toBe(30);
    expect(skeleton.Faction.id).toBe('enemy_faction');
    expect(skeleton.Health.value).toBe(8);
  });

  it('should have skeleton with character controller motion', () => {
    expect(skeleton.MotionSource.type).toBe('characterController');
    expect(skeleton.MotionSource.params.speed).toBe(4);
    expect(skeleton.MotionSource.params.jumpHeight).toBe(4);
    expect(skeleton.MotionSource.params.canFly).toBe(false);
  });
});
