import { describe, it, expect } from 'vitest';
import { createECS } from '../../core/ecs';
import { animationModule } from '../animation';

describe('Animation Module', () => {
  it('should create animation clips from schema using old module pattern', () => {
    const ctx = createECS();
    const module = animationModule(ctx);
    
    // Test animation definition with old pattern
    const animationDef = {
      type: "animator" as const,
      params: {
        clips: [
          {
            name: "default" as const,
            duration: 2.0,
            tracks: [
              {
                targetTag: "testBox",
                keyframes: [
                  { time: 0.0, position: [0, 0, 0] },
                  { time: 1.0, position: [0, 2, 0] },
                  { time: 2.0, position: [0, 0, 0] },
                ]
              }
            ]
          }
        ]
      }
    };

    const animationId = module.resolve(animationDef);
    const resolved = module.get(animationId);

    expect(resolved).toBeDefined();
    expect(resolved.clips).toHaveLength(1);
    expect(resolved.clips[0].name).toBe("default");
    expect(resolved.clips[0].duration).toBe(2.0);
  });

  it('should create animation clips from direct schema', () => {
    const ctx = createECS();
    const module = animationModule(ctx);
    
    // Test animation definition with direct schema
    const animationDef = {
      clips: [
        {
          name: "default" as const,
          duration: 2.0,
          tracks: [
            {
              targetTag: "testBox",
              keyframes: [
                { time: 0.0, position: [0, 0, 0] },
                { time: 1.0, position: [0, 2, 0] },
                { time: 2.0, position: [0, 0, 0] },
              ]
            }
          ]
        }
      ]
    };

    const animationId = module.resolve(animationDef);
    const resolved = module.get(animationId);

    expect(resolved).toBeDefined();
    expect(resolved.clips).toHaveLength(1);
    expect(resolved.clips[0].name).toBe("default");
    expect(resolved.clips[0].duration).toBe(2.0);
  });

  it('should handle named animation types', () => {
    const ctx = createECS();
    const module = animationModule(ctx);
    
    const animations = ["default", "move", "air", "use", "takeDamage"];
    
    for (const animName of animations) {
      const animationDef = {
        clips: [
          {
            name: animName as any,
            duration: 1.0,
            tracks: [
              {
                targetTag: "testTarget",
                keyframes: [
                  { time: 0.0, position: [0, 0, 0] },
                  { time: 1.0, position: [1, 1, 1] },
                ]
              }
            ]
          }
        ]
      };

      const animationId = module.resolve(animationDef);
      const resolved = module.get(animationId);

      expect(resolved.clips[0].name).toBe(animName);
    }
  });
});