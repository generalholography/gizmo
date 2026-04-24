import { defineQuery, enterQuery, exitQuery } from 'bitecs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { ECSContext, getModule, getResource, setResource } from '../ecs';
import { Body } from '../components/Body';
import { Transform } from '../components/Transform';
import { getGltfTimingDebug } from '../settings';

type GltfAssetStatus = 'loading' | 'loaded' | 'error';

type GltfAssetCacheEntry = {
	status: GltfAssetStatus;
	scene?: THREE.Object3D;
	error?: Error;
	promise?: Promise<void>;
	lastCloneMs?: number;
};

type GltfEntityState = {
	url: string;
	attached?: THREE.Object3D;
	attachPending?: boolean;
	attachRequestId?: number;
};

const gltfRenderQuery = defineQuery([Body, Transform]);
const gltfRenderEnter = enterQuery(gltfRenderQuery);
const gltfRenderExit = exitQuery(gltfRenderQuery);

const getGltfAssetCache = (ctx: ECSContext) => {
	let cache = getResource<Map<string, GltfAssetCacheEntry>>(ctx, 'gltfAssetCache');
	if (!cache) {
		cache = new Map();
		setResource(ctx, 'gltfAssetCache', cache);
	}
	return cache;
};

const getGltfEntityState = (ctx: ECSContext) => {
	let state = getResource<Map<number, GltfEntityState>>(ctx, 'gltfEntityState');
	if (!state) {
		state = new Map();
		setResource(ctx, 'gltfEntityState', state);
	}
	return state;
};

const getGltfLoader = (ctx: ECSContext) => {
	let loader = getResource<GLTFLoader>(ctx, 'gltfLoader');
	if (!loader) {
		loader = new GLTFLoader();
		loader.setCrossOrigin('anonymous');
		loader.setMeshoptDecoder(MeshoptDecoder);
		setResource(ctx, 'gltfLoader', loader);
	}
	return loader;
};

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const shouldLogGltfTiming = (ctx: ECSContext) => getGltfTimingDebug(ctx);

const scheduleIdle = (task: () => void) => {
	const requestIdle = (globalThis as typeof globalThis & {
		requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
	}).requestIdleCallback;

	if (typeof requestIdle === 'function') {
		requestIdle(() => task(), { timeout: 250 });
		return;
	}

	setTimeout(task, 0);
};

const countSceneNodes = (scene: THREE.Object3D, maxCount = 2000) => {
	let count = 0;
	const stack: THREE.Object3D[] = [scene];
	while (stack.length > 0 && count < maxCount) {
		const current = stack.pop();
		if (!current) continue;
		count += 1;
		for (const child of current.children) {
			stack.push(child);
		}
	}
	return count;
};

const resolveGltfAsset = async (
	ctx: ECSContext,
	url: string
): Promise<void> => {
	const cache = getGltfAssetCache(ctx);
	const existing = cache.get(url);
	if (existing?.status === 'loaded' || existing?.status === 'loading') {
		return existing?.promise ?? Promise.resolve();
	}

	const loader = getGltfLoader(ctx);
	const entry: GltfAssetCacheEntry = {
		status: 'loading',
	};
	const loadStart = nowMs();

	const promise = loader.loadAsync(url)
		.then((gltf) => {
			const resolvedAt = nowMs();
			entry.status = 'loaded';
			entry.scene = gltf.scene;
			const assignedAt = nowMs();
			if (shouldLogGltfTiming(ctx)) {
				console.debug('[gltfRenderingSystem] GLTF load timing', {
					url,
					loadMs: resolvedAt - loadStart,
					assignMs: assignedAt - resolvedAt,
				});
			}
		})
		.catch((error: Error) => {
			entry.status = 'error';
			entry.error = error;
			console.error('[gltfRenderingSystem] Failed to load GLTF', { url, error });
		});

	entry.promise = promise;
	cache.set(url, entry);
	return promise;
};

const applyMaterialOverride = (
	ctx: ECSContext,
	root: THREE.Object3D,
	materialDef?: any
) => {
	if (!materialDef) return;
	const materialMod = getModule(ctx, 'material', true);
	if (!materialMod) return;
	const materialId = materialMod.resolve(materialDef);
	const material = materialMod.get(materialId);

	root.traverse((child) => {
		if (child instanceof THREE.Mesh) {
			child.material = material;
		}
	});
};

type AttachResult = {
	object: THREE.Object3D;
	cloneMs: number;
	attachMs: number;
};

const attachSceneToEntity = (
	ctx: ECSContext,
	eid: number,
	scene: THREE.Object3D,
	materialDef?: any
): AttachResult | undefined => {
	const objects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
	if (!objects) return;
	const group = objects.get(eid);
	if (!group) return;

	const root = group.getObjectByName('root') ?? group;
	const cloneStart = nowMs();
	const clone = SkeletonUtils.clone(scene) as THREE.Object3D;
	const cloneEnd = nowMs();

	clone.traverse((child) => {
		if (child instanceof THREE.Mesh) {
			child.castShadow = true;
			child.receiveShadow = true;
			if (Array.isArray(child.material)) {
				child.material.forEach((mat) => {
					if (mat.transparent) {
						child.castShadow = false;
					}
				});
			} else if (child.material?.transparent) {
				child.castShadow = false;
			}
		}
	});

	applyMaterialOverride(ctx, clone, materialDef);
	const attachStart = nowMs();
	root.add(clone);
	const attachEnd = nowMs();

	if (shouldLogGltfTiming(ctx)) {
		console.debug('[gltfRenderingSystem] GLTF clone timing', {
			eid,
			cloneMs: cloneEnd - cloneStart,
			attachMs: attachEnd - attachStart,
		});
	}
	return {
		object: clone,
		cloneMs: cloneEnd - cloneStart,
		attachMs: attachEnd - attachStart,
	};
};

export const gltfRenderingSystem = (ctx: ECSContext): void => {
	const bodyMod = getModule(ctx, 'body', true);
	if (!bodyMod) return;

	const assetCache = getGltfAssetCache(ctx);
	const entityState = getGltfEntityState(ctx);
	for (const eid of gltfRenderEnter(ctx)) {
		const def = bodyMod.getDefinition(Body.bodyId[eid]);
		if (!def || def.type !== 'gltf') continue;
		const url = def.params?.file;
		if (!url) continue;
		entityState.set(eid, { url });
		void resolveGltfAsset(ctx, url);
	}

	const entities = gltfRenderQuery(ctx);
	for (const eid of entities) {
		const def = bodyMod.getDefinition(Body.bodyId[eid]);
		if (!def || def.type !== 'gltf') continue;
		const url = def.params?.file;
		if (!url) continue;

		const state = entityState.get(eid);
		if (!state || state.url !== url) {
			if (state?.attached) {
				state.attached.removeFromParent();
			}
			entityState.set(eid, { url });
			void resolveGltfAsset(ctx, url);
			continue;
		}

		if (!state.attached && !state.attachPending) {
			const cached = assetCache.get(url);
			if (cached?.status === 'loaded' && cached.scene) {
				state.attachPending = true;
				state.attachRequestId = (state.attachRequestId ?? 0) + 1;
				const requestId = state.attachRequestId;
				const sceneNodeCount = countSceneNodes(cached.scene);
				const shouldDefer = sceneNodeCount >= 1500 || (cached.lastCloneMs !== undefined && cached.lastCloneMs >= 12);
				const logTiming = shouldLogGltfTiming(ctx);
				if (logTiming) {
					console.debug('[gltfRenderingSystem] GLTF attach scheduling', {
						eid,
						url,
						sceneNodes: sceneNodeCount,
						defer: shouldDefer,
						lastCloneMs: cached.lastCloneMs,
					});
				}

				const attemptAttach = () => {
					const latestState = entityState.get(eid);
					if (!latestState || latestState.url !== url || latestState.attachRequestId !== requestId) return;
					const objects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects');
					const group = objects?.get(eid);
					if (!objects || !group) {
						scheduleIdle(attemptAttach);
						return;
					}

					const result = attachSceneToEntity(ctx, eid, cached.scene, def.params?.material);
					if (result) {
						latestState.attached = result.object;
						latestState.attachPending = false;
						cached.lastCloneMs = result.cloneMs;
					}
				};

				if (shouldDefer) {
					scheduleIdle(attemptAttach);
				} else {
					attemptAttach();
				}
			}
		}
	}

	for (const eid of gltfRenderExit(ctx)) {
		const state = entityState.get(eid);
		if (state?.attached) {
			state.attached.removeFromParent();
		}
		entityState.delete(eid);
	}
};
