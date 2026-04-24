import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ECSContext, setResource } from '../../core/ecs';
import { getCrowdDebugMesh, NavMeshData, NavMeshGenerationState } from '../navMesh';
import { createWorld } from 'bitecs';
import { Timer } from 'three/examples/jsm/misc/Timer.js';

// Mock the CrowdHelper
const mockCrowdHelper = {
  clear: vi.fn(),
  update: vi.fn(),
};

function createTestContext(): ECSContext {
  const world = createWorld() as ECSContext;
  Object.assign(world, {
    three: {} as any,
    rapier: {} as any,
    input: { moveX: 0, moveY: 0, moveZ: 0, yaw: 0, pitch: 0, interact: 0, primary: 0, secondary: 0, sprint: false },
    modules: new Map(),
    resources: new Map(),
    pipeline: [],
    isPlaying: true,
    time: new Timer()
  });
  return world;
}

describe('CrowdHelper debug integration', () => {
  let ctx: ECSContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  it('should return null when no navMeshData is available', () => {
    const crowdDebugMesh = getCrowdDebugMesh(ctx);
    expect(crowdDebugMesh).toBeNull();
  });

  it('should return null when navMeshData has no crowdHelper', () => {
    const navMeshData: NavMeshData = {
      navMesh: null,
      navMeshHelper: null,
      crowd: null,
      crowdHelper: null
    };
    const navMeshJobs = new Map<number, any>();
    navMeshJobs.set(0, { state: NavMeshGenerationState.DONE, data: navMeshData });
    setResource(ctx, 'navMeshData', navMeshJobs);

    const crowdDebugMesh = getCrowdDebugMesh(ctx);
    expect(crowdDebugMesh).toBeNull();
  });

  it('should return crowdHelper when available', () => {
    const navMeshData: NavMeshData = {
      navMesh: null,
      navMeshHelper: null,
      crowd: null,
      crowdHelper: mockCrowdHelper as any
    };
    const navMeshJobs = new Map<number, any>();
    navMeshJobs.set(0, { state: NavMeshGenerationState.DONE, data: navMeshData });
    setResource(ctx, 'navMeshData', navMeshJobs);

    const crowdDebugMesh = getCrowdDebugMesh(ctx);
    expect(crowdDebugMesh).toBe(mockCrowdHelper);
  });
});
