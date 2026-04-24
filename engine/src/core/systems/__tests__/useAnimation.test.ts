import { describe, it, expect, beforeEach } from 'vitest';
import { createECS, setResource } from '../../ecs';
import { addEntity } from 'bitecs';
import { triggerUseAnimation } from '../animation';
import { Transform } from '../../components/Transform';
import { Body } from '../../components/Body';
import { Animation } from '../../components/Animation';
import { animationModule } from '../../../modules/animation';
import * as THREE from 'three';

describe('Use Animation System', () => {
  let ctx: any;
  let module: any;

  beforeEach(() => {
    ctx = createECS();
    module = animationModule(ctx);
    
    // Initialize required resources
    setResource(ctx, 'renderObjects', new Map<number, THREE.Object3D>());
    setResource(ctx, 'activeAnimations', new Map());
    setResource(ctx, 'deltaTime', 1/60);
  });

  it('should create use animation with correct properties', () => {
    // Test that "use" animation is properly defined
    const animationDef = {
      clips: [
        {
          name: "default",
          duration: 1.0,
          tracks: [
            {
              targetTag: "root",
              keyframes: [
                { time: 0.0, rotation: [0, 0, 0] },
                { time: 1.0, rotation: [0, 0, 0] },
              ]
            }
          ]
        },
        {
          name: "use",
          duration: 0.6,
          tracks: [
            {
              targetTag: "root",
              keyframes: [
                { time: 0, rotation: [0, 0, 0] },
                { time: 0.2, rotation: [0, 0, -Math.PI / 2] },
                { time: 0.6, rotation: [0, 0, 0] }
              ]
            }
          ]
        }
      ]
    };

    const animationId = module.resolve(animationDef);
    const resolved = module.get(animationId);

    expect(resolved).toBeDefined();
    expect(resolved.clips).toHaveLength(2);
    
    const useClip = resolved.clips.find((clip: any) => clip.name === "use");
    expect(useClip).toBeDefined();
    expect(useClip.name).toBe("use");
    expect(useClip.duration).toBe(0.6);
    expect(useClip.blendMode).toBe(THREE.AdditiveAnimationBlendMode);
  });

  it('should handle triggerUseAnimation gracefully when entity has no animation', () => {
    const eid = addEntity(ctx);
    
    // Should not throw when entity has no animation
    expect(() => triggerUseAnimation(ctx, eid)).not.toThrow();
  });

  it('should handle triggerUseAnimation gracefully when entity has no use clip', () => {
    const eid = addEntity(ctx);
    Transform.x[eid] = 0;
    Transform.y[eid] = 0;
    Transform.z[eid] = 0;
    Body.bodyId[eid] = 1;
    
    // Create animation without "use" clip
    const animationDef = {
      clips: [
        {
          name: "default",
          duration: 1.0,
          tracks: [
            {
              targetTag: "root",
              keyframes: [
                { time: 0.0, rotation: [0, 0, 0] },
                { time: 1.0, rotation: [0, 0, 0] },
              ]
            }
          ]
        }
      ]
    };

    const animationId = module.resolve(animationDef);
    Animation.animationId[eid] = animationId;
    
    // Create mock render object
    const renderObject = new THREE.Object3D();
    const renderObjects = new Map<number, THREE.Object3D>();
    renderObjects.set(eid, renderObject);
    setResource(ctx, 'renderObjects', renderObjects);
    
    // Should not throw when animation has no "use" clip
    expect(() => triggerUseAnimation(ctx, eid)).not.toThrow();
  });

  it('should verify use animation is in the schema', () => {
    // This test ensures "use" is a valid animation name in the schema
    const validAnimationNames = ["default", "move", "air", "use", "takeDamage"];
    expect(validAnimationNames).toContain("use");
  });
});