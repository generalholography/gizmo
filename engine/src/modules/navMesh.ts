import * as THREE from 'three';
import { NavMesh, init, Crowd, CrowdAgent } from '@recast-navigation/core';
import { getPositionsAndIndices } from '@recast-navigation/three';
import { NavMeshHelper, CrowdHelper } from '@recast-navigation/three';
import { ECSContext, getModule, getResource, setResource } from '../core/ecs';
import { MotionSource } from '../core/components/MotionSource';
import { hasComponent, defineQuery } from 'bitecs';
import { Transform } from '../core/components/Transform';
import { bodyModule } from './body';
import { Body } from '../core/components';

export interface NavMeshData {
  navMesh: NavMesh | null;
  navMeshHelper: NavMeshHelper | null;
  crowd: Crowd | null;
  crowdHelper: CrowdHelper | null;
}

export enum NavMeshGenerationState {
  UNINITIALIZED,
  GENERATING,
  DONE,
}

export type NavMeshDataKey = number;
export type NavMeshDataJob = {
  state: NavMeshGenerationState;
  data: NavMeshData | null;
}

/**
 * Generates a nav mesh from static meshes in the scene
 * @param ctx ECS context
 * @param scene Three.js scene containing meshes
 * @returns NavMeshData containing the nav mesh and debug visualization
 */
export function generateNavMesh(ctx: ECSContext, scene: THREE.Scene) {
  try {

    // Collect static meshes from the scene
    const staticMeshes: THREE.Mesh[] = [];
    const tempMeshes: THREE.Mesh[] = [];

    // Get all entities that have Transform component
    const transformQuery = defineQuery([Transform]);
    const entities = transformQuery(ctx);

    // Get render objects mapping
    const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
    const bodyMod = getModule<ReturnType<typeof bodyModule>>(ctx, 'body');
    if (!renderObjects) {
      console.warn('No render objects found in context');
      return { navMesh: null, navMeshHelper: null, crowd: null, crowdHelper: null };
    }

    console.log('Found render objects:', renderObjects.size);

    // Collect static meshes (entities without MotionSource or with static MotionSource)
    for (const eid of entities) {
      const obj = renderObjects.get(eid);
      if (!obj) {
        console.log(`Entity ${eid} has no render object`);
        continue;
      }

      // Check if entity has MotionSource component
      const hasMotion = hasComponent(ctx, MotionSource, eid);
      let isStatic = true;

      if (hasMotion) {
        // Get the MotionSource type - check if it's static
        // Note: We're checking the resolved MotionSource component data
        // MotionSource.bodyType could be "static", "dynamic", or "kinematic"
        // For now, we'll consider anything that's not explicitly static as non-static
        // TODO: Access the actual resolved MotionSource data to check bodyType
        // console.log(`Entity ${eid} has MotionSource`);
        isStatic = ctx.rapier.world.getRigidBody(MotionSource.bodyHandle[eid]).isFixed();
      } else {
        // console.log(`Entity ${eid} has no MotionSource, marking as static`);
      }

      let hasInterior = false;
      if (bodyMod && hasComponent(ctx, Body, eid)) {
        const bodyId = Body.bodyId[eid];
        const bodyDef = bodyMod.getDefinition(bodyId);
        if (bodyDef && bodyDef.type === 'composite' && bodyDef.params?.hasInterior) {
          hasInterior = true;
        }
      }

      if (isStatic) {
        // Traverse the object and collect meshes
        let meshCount = 0;
        obj.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.geometry &&
            child.material.opacity !== 0 && // This is a hacky way to filter out invisible meshes
            !child.userData.ignoreCollisions // Check if the mesh is marked to ignore collisions
          ) {
            staticMeshes.push(child);
            meshCount++;

            // If this entity has an interior, add a flipped-winding clone so navmesh captures interior surfaces
            if (hasInterior) {
              // Ensure child's world matrix is up to date
              child.updateWorldMatrix(true, false);

              // Clone geometry (not the mesh) and bake the child's world transform into it
              const geom = child.geometry.clone() as THREE.BufferGeometry;
              // Apply the child's world transform to vertex positions/normals
              geom.applyMatrix4(child.matrixWorld);

              // Flip triangle winding on the transformed geometry
              flipGeometryWinding(geom);

              // Normals will point the opposite way after flipping winding.
              // Either recompute normals or negate existing normals.
              if (geom.getAttribute('normal')) {
                // recompute normals from geometry (works in most cases)
                geom.computeVertexNormals();
              }

              // Create a mesh from the baked, flipped geometry. No transform needed anymore.
              const flippedMesh = new THREE.Mesh(geom, child.material);
              flippedMesh.matrixAutoUpdate = false; // it's already baked into geometry

              staticMeshes.push(flippedMesh);
              tempMeshes.push(flippedMesh);
            }
          }
        });
      }
    }


    if (staticMeshes.length === 0) {
      console.warn('No static meshes found for nav mesh generation');
      // return { navMesh: null, navMeshHelper: null, crowd: null, crowdHelper: null };
    }

    const [positions, indices] = getPositionsAndIndices(staticMeshes);
    const config = {
      cs: 0.3,  // cellSize -> cs
      ch: 0.3,  // cellHeight -> ch
      walkableHeight: 2.0,
      walkableRadius: 0.6,
      walkableClimb: 2,
      walkableSlopeAngle: 70,
    }
    getResource<Worker>(ctx, 'navMeshWorker').postMessage({ positions, indices, config }, [
      positions.buffer,
      indices.buffer,
    ]);

    // Dispose of any temporary meshes created for interior flipping
    for (const m of tempMeshes) {
      m.geometry?.dispose?.();
    }

    // // Use the Three.js helper to generate nav mesh directly from meshes
    // const navMeshResult = threeToTileCache(staticMeshes, {
    //   cs: 0.3,  // cellSize -> cs
    //   ch: 0.3,  // cellHeight -> ch
    //   walkableHeight: 2.0,
    //   walkableRadius: 0.6,
    //   walkableClimb: 2,
    //   walkableSlopeAngle: 70,
    // });

    // if (!navMeshResult.success) {
    //   const error = 'error' in navMeshResult ? navMeshResult.error : 'Unknown error';
    //   console.error('Failed to generate nav mesh:', error);
    //   return { navMesh: null, navMeshHelper: null, crowd: null, crowdHelper: null };
    // }

    // const navMesh = navMeshResult.navMesh;
    // console.log('Nav mesh generated successfully');

    // // Create crowd for pathfinding
    // const crowd = new Crowd(navMesh, {
    //   maxAgents: 100,
    //   maxAgentRadius: 10.0,
    // });

    // // Create debug visualization using NavMeshHelper
    // const navMeshHelper = new NavMeshHelper(navMesh, {
    //   navMeshMaterial: new THREE.MeshBasicMaterial({
    //     color: 0x00ffff,
    //     transparent: true,
    //     opacity: 0.3,
    //     side: THREE.DoubleSide,
    //     depthTest: false,
    //     depthWrite: false,
    //   })
    // });

    // // Create crowd debug visualization using CrowdHelper
    // const crowdHelper = new CrowdHelper(crowd, {
    //   agentMaterial: new THREE.MeshBasicMaterial({
    //     color: 0xff0000,
    //     transparent: true,
    //     opacity: 0.8,
    //   })
    // });

    // return { navMesh, navMeshHelper, crowd, crowdHelper };

  } catch (error) {
    console.error('Error generating nav mesh:', error);
    // return { navMesh: null, navMeshHelper: null, crowd: null, crowdHelper: null };
  }
}

/**
 * Flip the triangle winding order of a BufferGeometry in-place.
 * If indexed: swap i1 and i2 for each triangle.
 * If non-indexed: swap vertex 1 and 2 for each triangle in all attributes we care about (positions only for our use-case).
 */
function flipGeometryWinding(geometry: THREE.BufferGeometry) {
  const index = geometry.getIndex();
  if (index) {
    const src = index.array as any; // TypedArray
    const ctor = (src as any).constructor as { new(length: number): any };
    const flipped = new ctor(src.length);
    for (let i = 0; i < src.length; i += 3) {
      flipped[i] = src[i];
      flipped[i + 1] = src[i + 2];
      flipped[i + 2] = src[i + 1];
    }
    geometry.setIndex(new THREE.BufferAttribute(flipped, 1));
  } else {
    // Non-indexed geometry: swap vertices 1 and 2 for each triangle for positions
    const pos = geometry.getAttribute('position');
    if (!pos) return;
    const arr = pos.array as any; // Float32Array
    const itemSize = pos.itemSize; // expect 3
    for (let i = 0; i < arr.length; i += itemSize * 3) {
      // v0 = i, v1 = i+itemSize, v2 = i+itemSize*2
      for (let k = 0; k < itemSize; k++) {
        const a = arr[i + itemSize + k];
        const b = arr[i + itemSize * 2 + k];
        arr[i + itemSize + k] = b;
        arr[i + itemSize * 2 + k] = a;
      }
    }
    pos.needsUpdate = true;
  }
}

/**
 * Creates a debug visualization mesh for the nav mesh
 */
function createNavMeshDebugMesh(navMesh: NavMesh): THREE.Mesh {
  // This function is no longer needed since we use NavMeshHelper
  // Keeping it for compatibility but it won't be used
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  return new THREE.Mesh(geometry, material);
}

/**
 * Initialize nav mesh generation for a world
 */
export async function initializeNavMesh(ctx: ECSContext, scene: THREE.Scene): Promise<void> {
  try {
    console.log('Initializing nav mesh');

    // Generate nav mesh
    const navMeshData = await generateNavMesh(ctx, scene);

    // Store nav mesh data as a resource
    getResource<Map<NavMeshDataKey, NavMeshDataJob>>(ctx, 'navMeshData').set(0, { state: NavMeshGenerationState.DONE, data: navMeshData });
  } catch (error) {
    console.error('Failed to initialize nav mesh:', error);
  }
}

/**
 * Get the nav mesh debug mesh for rendering
 */
export function getNavMeshDebugMesh(ctx: ECSContext): THREE.Object3D | null {
  const navMeshJobs = getResource<Map<NavMeshDataKey, NavMeshDataJob>>(ctx, 'navMeshData');
  const navMeshData = navMeshJobs?.get(0)?.data;
  return navMeshData?.navMeshHelper || null;
}

/**
 * Get the crowd debug mesh for rendering
 */
export function getCrowdDebugMesh(ctx: ECSContext): THREE.Object3D | null {
  const navMeshJobs = getResource<Map<NavMeshDataKey, NavMeshDataJob>>(ctx, 'navMeshData');
  const navMeshData = navMeshJobs?.get(0)?.data;
  return navMeshData?.crowdHelper || null;
}

/**
 * Get the nav mesh for pathfinding
 */
export function getNavMesh(ctx: ECSContext): NavMesh | null {
  const navMeshJobs = getResource<Map<NavMeshDataKey, NavMeshDataJob>>(ctx, 'navMeshData');
  const navMeshData = navMeshJobs?.get(0)?.data;
  return navMeshData?.navMesh || null;
}

/**
 * Get the crowd for pathfinding
 */
export function getCrowd(ctx: ECSContext): Crowd | null {
  const navMeshJobs = getResource<Map<NavMeshDataKey, NavMeshDataJob>>(ctx, 'navMeshData');
  const navMeshData = navMeshJobs?.get(0)?.data;
  return navMeshData?.crowd || null;
}

/**
 * Add an agent to the crowd for pathfinding
 * @param ctx ECS context
 * @param position Starting position of the agent
 * @param agentParams Optional agent parameters
 * @returns CrowdAgent or null if failed
 */
export function addCrowdAgent(
  ctx: ECSContext,
  position: { x: number; y: number; z: number },
  agentParams?: {
    radius?: number;
    height?: number;
    maxSpeed?: number;
    maxAcceleration?: number;
  }
): CrowdAgent | null {
  const crowd = getCrowd(ctx);
  if (!crowd) {
    return null;
  }

  const params = {
    radius: agentParams?.radius ?? 0.5,
    height: agentParams?.height ?? 2.0,
    maxSpeed: agentParams?.maxSpeed ?? 6.0,
    maxAcceleration: agentParams?.maxAcceleration ?? 20.0,
    collisionQueryRange: agentParams?.radius * 12,
    pathOptimizationRange: agentParams?.radius * 30,
    separationWeight: 0,
    updateFlags: 7,
    obstacleAvoidanceType: 0,
    queryFilterType: 0,
    userData: 0,
  };

  try {
    const snapRes = crowd.navMeshQuery.findNearestPoly(position, { halfExtents: { x: params.radius, y: params.height, z: params.radius } });
    if (snapRes.success) {
      position = snapRes.nearestPoint;
    }
    const agent = crowd.addAgent(position, params);
    // console.log('Added crowd agent at position:', position);
    return agent;
  } catch (error) {
    console.error('Failed to add crowd agent:', error);
    return null;
  }
}

/**
 * Remove an agent from the crowd
 * @param ctx ECS context  
 * @param agent Agent to remove
 */
export function removeCrowdAgent(ctx: ECSContext, agent: CrowdAgent): void {
  const crowd = getCrowd(ctx);
  if (!crowd) {
    console.warn('No crowd available for removing agent');
    return;
  }

  try {
    crowd.removeAgent(agent);
    console.log('Removed crowd agent');
  } catch (error) {
    console.error('Failed to remove crowd agent:', error);
  }
}

/**
 * Update the crowd simulation
 * @param ctx ECS context
 * @param deltaTime Time step for the update
 */
export function updateCrowd(ctx: ECSContext, deltaTime: number): boolean {
  const navMeshData = getResource<Map<NavMeshDataKey, NavMeshDataJob>>(ctx, 'navMeshData').get(0)?.data;
  const crowd = navMeshData?.crowd;
  if (!crowd) return false;

  try {
    crowd.update(deltaTime);

    // Update crowd debug visualization if it exists
    if (navMeshData.crowdHelper) {
      navMeshData.crowdHelper.update();
    }
    return true;
  } catch (error) {
    console.error('Failed to update crowd:', error);
    return false;
  }
}
