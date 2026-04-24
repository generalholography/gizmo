import { vi } from 'vitest';

// Mock Rapier physics library to avoid ESM/CommonJS issues during tests
vi.mock('@dimforge/rapier3d-compat', () => {
  const makeDesc = (shape: string, args: any[]) => {
    const desc: any = {
      shape,
      args,
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      setActiveEvents: vi.fn().mockReturnThis(),
      setActiveCollisionTypes: vi.fn().mockReturnThis(),
      setTranslation: vi.fn(function (x: number, y: number, z: number) {
        this.translation = { x, y, z };
        return this;
      }),
      setRotation: vi.fn(function (quat: { x: number; y: number; z: number; w: number }) {
        this.rotation = quat;
        return this;
      }),
      setSensor: vi.fn().mockReturnThis(),
    };
    return desc;
  };

  const ColliderDesc = {
    cuboid: (...args: any[]) => makeDesc('cuboid', args),
    ball: (...args: any[]) => makeDesc('ball', args),
    cylinder: (...args: any[]) => makeDesc('cylinder', args),
    cone: (...args: any[]) => makeDesc('cone', args),
    convexMesh: (...args: any[]) => makeDesc('convexMesh', args),
    capsule: (...args: any[]) => makeDesc('capsule', args),
    roundCone: (...args: any[]) => makeDesc('roundCone', args),
    roundCylinder: (...args: any[]) => makeDesc('roundCylinder', args),
    trimesh: (...args: any[]) => makeDesc('trimesh', args),
  };

  const ActiveEvents = { COLLISION_EVENTS: 1 };
  const ActiveCollisionTypes = { ALL: 0xffff };
  const RotationOps = { identity: () => ({}) };

  return {
    __esModule: true,
    default: {
      RotationOps,
      ColliderDesc,
      ActiveEvents,
      ActiveCollisionTypes,
    },
    RotationOps,
    ColliderDesc,
    ActiveEvents,
    ActiveCollisionTypes,
  };
});
