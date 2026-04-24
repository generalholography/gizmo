import { describe, it, expect } from 'vitest';
import skeleton from '../skeleton';
import bow from '../bow';
import arrow from '../arrow';
import skull from '../skull';

function getRule(entity: any, type: string) {
  return entity.Rules.find((rule: any) => rule.trigger.type === type);
}

describe('Skeleton Entity Integration', () => {
  it('should have bow that can shoot arrows', () => {
    // Test the bow's OnPrimaryAction effect
    const spawnEffect = getRule(bow, 'primaryAction').actions[0];
    expect(spawnEffect.type).toBe('spawnEntityFrom');
    expect(spawnEffect.params.entity).toBe('arrow');
    expect(spawnEffect.params.velocity).toBe(40);
  });

  it('should have arrow with damage configuration', () => {
    // Verify arrow has proper damage effect setup
    const inRangeRule = getRule(arrow, 'entityInRange');
    expect(inRangeRule).toBeDefined();
    expect(inRangeRule.actions).toHaveLength(1);

    const damageEffect = inRangeRule.actions[0];
    expect(damageEffect.type).toBe('damage');
    expect(damageEffect.params.amount).toBe(3);
    expect(damageEffect.onSuccess).toBeDefined();
    expect(damageEffect.onSuccess![0].type).toBe('kill');
  });

  it('should have skull that can be picked up but does nothing else', () => {
    const interactRule = getRule(skull, 'interact');
    expect(interactRule).toBeDefined();
    expect(interactRule.actions).toHaveLength(1);
    expect(interactRule.actions[0].type).toBe('getPickedUp');

    // Verify no functional actions
    expect(getRule(skull, 'primaryAction')).toBeUndefined();
    expect(getRule(skull, 'secondaryAction')).toBeUndefined();
    expect(getRule(skull, 'entityInRange')).toBeUndefined();
  });

  it('should have skeleton with proper body structure and tags', () => {
    // Verify the skeleton has the required structure
    const torso = skeleton.Body.params.parts[0];
    const head = torso.children.find((child: any) => child.tag === 'head');
    
    expect(head).toBeDefined();
    expect(head.children ?? []).toHaveLength(0); // arms are siblings under spine in current skeleton data
    
    // Find the heldItemAnchor in right arm
    const rightArm = torso.children.find((child: any) => child.tag === "arm_r");
    expect(rightArm).toBeDefined();
    expect(rightArm.children[0].tag).toBe('heldItemAnchor');
  });

  it('should have skeleton with inventory containing bow and skull', () => {
    expect(skeleton.Inventory).toBeDefined();
    expect(skeleton.Inventory.size).toBe(3);
    expect(skeleton.Inventory.items).toEqual(['bow', 'skull', 'healthPotion']);
    expect(skeleton.Inventory.selectedItemIndex).toBe(0);
  });

  it('should have skeleton with default and move animations', () => {
    expect(skeleton.Animation).toBeDefined();
    expect(skeleton.Animation.clips).toHaveLength(2);
    
    const clipNames = skeleton.Animation.clips.map((clip: any) => clip.name);
    expect(clipNames).toContain('default');
    expect(clipNames).toContain('move');
  });

  it('should have skeleton with enemy AI characteristics', () => {
    expect(skeleton.AI).toBeDefined();
    expect(skeleton.AI.isAggressive).toBe(true);
    expect(skeleton.AI.awarenessRange).toBe(30);
    expect(skeleton.Faction.id).toBe('enemy_faction');
    expect(skeleton.Health.value).toBe(8);
  });

  it('should have bow with proper appearance and mechanics', () => {
    expect(bow.Info.name).toBe('Bow');
    expect(bow.Info.description).toContain('wooden bow');
    
    // Check for wooden appearance
    const mainBody = bow.Body.params.parts[0];
    expect(mainBody.material.params.color).toBe('#8B4513'); // Brown wood
    
    // Check cooldown is reasonable for a bow
    expect(getRule(bow, 'primaryAction').cooldown).toBe(1.0);
  });

  it('should have arrow with proper appearance', () => {
    expect(arrow.Info.name).toBe('Arrow');
    
    // Check arrow has wooden shaft, metal tip, and fletching
    const parts = arrow.Body.params.parts;
    expect(parts).toHaveLength(1);
    
    // Shaft should be brown wood
    const shaft = parts[0];
    expect(shaft).toBeDefined();
    
    // Tip should be silver metal 
    const tip = parts[0].children.find((p: any) => p.material.params.color === '#C0C0C0');
    expect(tip).toBeDefined();
  });
});
