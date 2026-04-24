import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import Stats from 'stats.js';
import RAPIER from '@dimforge/rapier3d-compat';
import * as RECAST from '@recast-navigation/core';
import { disposeSceneRecursively } from './utils/sceneDisposal';
import {
	createNoise2D,
	createNoise3D,
	createNoise4D,
} from 'simplex-noise';
import { motionSystem } from './core/systems/motion';
import { characterUnstickSystem } from './core/systems/characterUnstick';
import { bodyRenderingSystem } from './core/systems/bodyRendering';
import { gltfRenderingSystem } from './core/systems/gltfRendering';
import { motionControlSystem } from './core/systems/motionControl';
import { cameraSystem } from './core/systems/camera';
import { orbitControlsSystem } from './core/systems/orbitControls';
import { editorCameraSystem } from './core/systems/flyControls';
import { editorSelectionSystem } from './core/systems/editorSelection';
import { staticCameraSystem } from './core/systems/staticCamera';
import { initEditorCameraController } from './core/editorCameraController';
import { heldItemSystem } from './core/systems/heldItem';
import { mountSystem } from './core/systems/mount';
import { animationSystem } from './core/systems/animation';
import { spawn, restoreDeferredEntityReferences } from './core/spawn';
import { InputState } from './core/input';
import { addCollisionEvent, CollisionEventCallback, collisionSystem } from './core/systems/collision';
import { killPlaneSystem } from './core/systems/killPlane';
import { addSystem, clearECS, createECS, ECSContext, getResource, getModule, resetECS, runSystems, setResource, World } from './core/ecs';
import { registerArchetype } from './modules/archetype';
import cube from './data/cube';
import sphere from './data/sphere';
import cylinder from './data/cylinder';
import cone from './data/cone';
import pyramid from './data/pyramid';
import pointLight from './data/pointLight';
import sceneCamera from './data/sceneCamera';
import terrain from './data/terrain';
import player from './data/player';
import gun from './data/gun';
import bullet from './data/bullet';
import ufo from './data/ufo';
import tree from './data/tree';
import dragon from './data/dragon';
import { Player } from './core/components/Player';
import { StaticCamera } from './core/components/StaticCamera';
import { Inventory as InventoryComp } from './core/components/Inventory';
import { defineQuery } from 'bitecs';
import { Inventory, inventoryChanged, InventoryChangeCallback, dropSelected } from './core/inventory';
import { Metrics, MetricsKey } from './core/metrics';
import { checkAchievementsFor, Achievement } from './core/achievements';
import PreviewRenderer from './core/PreviewRenderer';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './core/ui/App';
import EventEmitter from './utils/eventEmitter';
import { ReactiveMap, ReactiveSet } from './utils/reactiveTypes';
import { LazyMap } from './utils/lazyMap';
import TriggerInput, { TriggerInputKey } from './core/triggerInput';
import enemy from './data/enemy';
import skeleton from './data/skeleton';
import bow from './data/bow';
import arrow from './data/arrow';
import skull from './data/skull';
import { assetGeneratorExampleArchetypes } from './data/assetGeneratorExamples';
import { updateEffectCooldownSystem } from './core/systems/updateEffectCooldowns';
import { updateTimeElapsedEffects } from './core/systems/timeElapsedEffects';
import { updateSpawnerSystem } from './core/systems/updateSpawner';
import { MotionSource } from './core/components/MotionSource';
import { _RuntimeCharacterControllerData } from './core/components/_RuntimeCharacterControllerData';
import { hasComponent } from 'bitecs';
import { computeDebugTransforms } from './utils/computeDebugTransforms';
import { computeAITargetLines } from './utils/computeAITargetLines';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { getNavMeshDebugMesh, getCrowdDebugMesh, NavMeshDataKey, NavMeshDataJob, NavMeshGenerationState } from './modules/navMesh';
import { WorldMetadata } from './core/schema';
import { updateSkyboxSystem } from './core/systems/updateSkybox';
import type { EditorTaskStore } from './core/ui/editor/TaskStore';
import { captureEntityScreenshot, captureWorldScreenshot, type ScreenshotOptions, type ScreenshotResult } from './core/render/screenshot';
import {
	type FrameSelectionOptions,
	type ViewportCameraPose,
	type ViewportCameraSetOptions,
	applyViewportCameraPose,
	frameViewportBounds,
	frameViewportEntity,
	getViewportCameraPose,
} from './core/viewportCamera';
import * as SkyboxShader from './core/shaders/skybox';
import { navMeshSystem } from './core/systems/navMeshSystem';
import { updateAISystem } from './core/systems/updateAISystem';
import { updatePlayerInputState } from './core/systems/updatePlayerInputState';
import { particleSystem } from './core/systems/particleSystem';
import healthPotion from './data/healthPotion';
import NavMeshWorker from './core/workers/navMeshWorker?worker';
import { CrowdHelper, NavMeshHelper } from '@recast-navigation/three';
import { timeToSunDirection } from './utils/math';
import { detectMobile } from './utils/deviceDetection';
import { PostprocessingManager } from './core/postprocessing/PostprocessingManager';
import { getStore, InventoryStore } from './modules/entityStore';
import { getRenderScale, getShadowQuality, ShadowQuality } from './core/settings';
import { setSettingsOverrides } from './core/ui/settings/settingsOverrides';
import { initialize, createWorldDefinition } from './core/initializeWorld';
import { serializeWorld } from './core/serializeWorld';
import {
	saveWorldToFile,
	loadWorldFromFile,
	serializeWorldToJSON,
	loadWorldFromJSON
} from './core/worldPersistence';
import { DEFAULT_SKY_CONFIG, type WorldDefinition } from './core/worldSchema';
import {
	registerRuntimeModuleType,
	unregisterRuntimeModuleType,
	listRuntimeModuleTypes,
	getPersistedRuntimeModuleType,
	upsertRuntimeModuleInstance,
	removeRuntimeModuleInstance,
	listRuntimeModuleInstances,
	type RuntimeModuleTypeDefinition as PersistedRuntimeModuleTypeDefinition,
	type RuntimeModuleTypeCatalogEntry,
	type RuntimeModuleInstanceCatalogEntry,
} from './core/runtimeModuleTypes';
import { createWebXRHelpers } from './webxr';
import type { EditorSessionConfig } from './core/editor/sessionConfig';

export type { InputState } from './core/input';
export { 
	SETTINGS_KEYS,
	RENDER_SCALES,
	getMouseSensitivity,
	setMouseSensitivity,
	getSSAOQuality,
	setSSAOQuality,
	getAntialias,
	setAntialias,
	getShadowQuality,
	setShadowQuality,
	getBryceMode,
	setBryceMode,
	getRenderScale,
	setRenderScale,
	getUseLights,
	setUseLights
} from './core/settings';
export type { 
	RenderScale,
	SSAOQuality,
	ShadowQuality 
} from './core/settings';

// Export world initialization and serialization
export { initialize, createWorldDefinition } from './core/initializeWorld';
export { serializeWorld } from './core/serializeWorld';
export { 
	saveWorldToFile, 
	loadWorldFromFile, 
	serializeWorldToJSON, 
	loadWorldFromJSON 
} from './core/worldPersistence';
export type { 
	WorldDefinition, 
	InitializeWorldOptions, 
	SerializeWorldOptions,
	AchievementDefinition,
	DimensionDefinition,
	ChunkDefinition,
	PlayerState,
	RuntimeModuleTypeDefinition,
} from './core/worldSchema';
export {
	registerRuntimeModuleType,
	unregisterRuntimeModuleType,
	listRuntimeModuleTypes,
	getPersistedRuntimeModuleType,
	upsertRuntimeModuleInstance,
	removeRuntimeModuleInstance,
	listRuntimeModuleInstances,
} from './core/runtimeModuleTypes';

export enum EngineMode {
	GAME = 'game',
	DISPLAY = 'display',
	EDITOR = 'editor',
}

export enum LifecycleEvent {
	LOAD_WORLD = 'load_world',
	QUIT = 'quit',
	PLAYER_DEATH = 'player_death',
}

export enum DebugState {
	NONE = 'none',
	PERF = 'perf',
	PHYSICS = 'physics',
	AI = 'ai'
}

export { setupWebControls } from './setupWebControls';
export { setupTouchControls } from './setupTouchControls';
export { KILL_PLANE_Y } from './core/systems/killPlane';

export const ENGINE_UI_ROOT_ID = 'engine-ui-root';

// Export editor components and functionality
export { EditorProvider, useEditor, useSelectedEntity, useSelectedEntities } from './core/ui/editor/EditorContext';
export { Toolbar } from './core/ui/editor/Toolbar';
export { HierarchyPanel } from './core/ui/editor/HierarchyPanel';
export { InspectorPanel } from './core/ui/editor/InspectorPanel';
export { TransformEditor } from './core/ui/editor/TransformEditor';
export { ComponentInspector } from './core/ui/editor/ComponentInspector';
export { BodyEditor } from './core/ui/editor/BodyEditor';
export { WorldInspector } from './core/ui/editor/WorldInspector';
export { WorldSettingsPanel } from './core/ui/editor/WorldSettingsPanel';
export { ArchetypeBrowser } from './core/ui/editor/ArchetypeBrowser';
export { GenericComponentEditor } from './core/ui/editor/GenericComponentEditor';
export { Vector3Input } from './core/ui/editor/components/Vector3Input';
export { CommandManager } from './core/editor/CommandManager';
export { PlayModeController } from './core/editor/PlayModeController';
export { ComponentEditorRegistry, componentEditorRegistry } from './core/editor/ComponentEditorRegistry';
export { resolveEditorSessionConfig, getResolvedEditorSessionConfig } from './core/editor/sessionConfig';
export { TransformCommand } from './core/editor/commands/TransformCommand';
export { AddEntityCommand, DeleteEntityCommand, DuplicateEntityCommand } from './core/editor/commands/EntityCommand';
export { ModifyBodyCommand } from './core/editor/commands/BodyCommand';
export { ModifyWorldSettingsCommand } from './core/editor/commands/WorldSettingsCommand';
export { ReinitializeWorldCommand } from './core/editor/commands/ReinitializeWorldCommand';
export { ModifyComponentCommand } from './core/editor/commands/ModifyComponentCommand';
export * from './automation/definitions';

// Export schema system
export * from './core/editor/schema';
export * from './core/ui/editor/fieldRenderers';

export type { EditorState, EditorTool, EditorMode } from './core/editor/EditorState';
export type { EditorSessionConfig, EditorSessionScope, EditorSessionCapabilities, ResolvedEditorSessionConfig } from './core/editor/sessionConfig';
export type { EditorCommand } from './core/editor/CommandManager';
export type { EditorContextValue } from './core/ui/editor/EditorContext';
export type { ComponentEditorProps, ComponentEditorComponent } from './core/editor/ComponentEditorRegistry';
export type {
	EditorTaskCommand,
	EditorTaskItem,
	EditorTaskMessage,
	EditorTaskSnapshot,
	EditorTaskStore,
} from './core/ui/editor/TaskStore';

export type ConsoleCommand = (...args: string[]) => Promise<string | null | undefined> | string | null | undefined;

// Import and export automation types and functions
import { readAutomationResource, listAutomationResources } from './automation/resources';
import { executeAutomationBatch, executeAutomationCommand, listAutomationCommands, type AutomationCommandCall } from './automation/commands';
import type { AutomationCommandParameter } from './automation/commands';
export type { AutomationResource } from './automation/resources';
export type { AutomationCommand, AutomationCommandParameter } from './automation/commands';

export interface EngineConfig {
        /** @deprecated Use mode instead */
        display?: boolean;
        mode?: EngineMode;
        hudVisible?: boolean;
        /** Optional hook for editor UI to open the web-layer composer */
        onRequestComposer?: () => void;
        /** Optional hook for editor UI to save world to Cloud Storage (Milestone 1.2) */
        onSaveWorld?: (worldId: string) => Promise<void>;
        /** Optional hook for editor UI to open a new-tab play session */
        onOpenPlayMode?: (mode: 'game' | 'display') => void;
        /** Optional hook for editor UI to list available assets */
        onListAssets?: () => Promise<EditorAssetRecord[]>;
        /** Optional hook for editor UI to upload a new asset */
        onUploadAsset?: (file: File) => Promise<EditorAssetRecord>;
        /** Optional editor task store for task history UI */
        taskStore?: EditorTaskStore;
        /** Optional session scoping for the shared editor UI */
        editorSessionConfig?: EditorSessionConfig;
        /** Enable WebXR hooks and APIs */
        enableXR?: boolean;
        /** Default session init options when entering XR */
        xrSessionInit?: XRSessionInit;
        /** Default session mode when entering XR */
        xrSessionMode?: XRSessionMode;
        /** Optional runtime settings overrides (keys from SETTINGS_KEYS). */
        settingsOverrides?: Record<string, any>;
        /** Custom console commands to register */
	consoleCommands?: Record<string, ConsoleCommand>;
}

export type SkyboxObjects = {
	skybox: THREE.Mesh;
	ambientLight: THREE.AmbientLight;
	directionalLight: THREE.DirectionalLight | null;
	lightTarget: THREE.Object3D | null;
}

export type DeathScreenButton = {
	text: string;
	callback: () => void;
};

export type PlayerDeathEvent = {
	playerEid: number;
	killerEid?: number;
	killerName?: string;
};

export type EditorAssetType = 'model';

export type EditorAssetRecord = {
	id: string;
	name: string;
	type: EditorAssetType;
	format: string;
	url: string;
	storagePath: string;
	contentType?: string;
	sizeBytes?: number;
	updatedAt?: number;
	createdAt?: number;
};

export interface EngineAPI {
	scene: THREE.Scene;
	worldRoot: THREE.Group;
	camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
        /** Active XR session camera controller */
        physicsWorld: RAPIER.World;
        THREE: typeof THREE;
        RAPIER: typeof RAPIER;
	createNoise2D: typeof createNoise2D;
	createNoise3D: typeof createNoise3D;
	createNoise4D: typeof createNoise4D;
	/** ECS world instance */
	ecsWorld: ECSContext;
	/** spawn an entity from an archetype or bundle */
	spawn: typeof spawn;
	/** initialize world from declarative definition */
	initialize: typeof initialize;
	/** register a new archetype */
	registerArchetype: typeof registerArchetype;
	/** register additional ECS systems */
	addSystem: typeof addSystem;
	/** add a resource to the engine */
	setResource: <R>(name: string, resource: R, disposeFn?: (res: R) => void) => void;
	/** get a resource by name */
	getResource: <R>(name: string, hideWarnings?: boolean) => R | undefined;
	/** get a module by name */
	getModule: typeof getModule;
	/** register a persisted runtime module type backed by factory source */
	registerRuntimeModuleType: (definition: PersistedRuntimeModuleTypeDefinition) => PersistedRuntimeModuleTypeDefinition;
	/** unregister a persisted runtime module type */
	unregisterRuntimeModuleType: (moduleName: string, typeName: string) => boolean;
	/** register or replace a named module instance */
	registerRuntimeModuleInstance: (moduleName: string, instanceName: string, definition: { type: string; params: any }) => void;
	/** remove a named module instance */
	unregisterRuntimeModuleInstance: (moduleName: string, instanceName: string) => boolean;
	/** list all registered module types */
	listRuntimeModuleTypes: () => RuntimeModuleTypeCatalogEntry[];
	/** list all named module instances */
	listRuntimeModuleInstances: () => RuntimeModuleInstanceCatalogEntry[];
	/** current generic input state */
	input: InputState;
        /** update input state */
        updateInput: (data: Partial<InputState>) => void;
	/** current trigger input state */
	triggerInput: TriggerInput;
	/** set a trigger input state */
	setTriggerInput: (key: TriggerInputKey) => void;
	/** add a collision event callback */
	addCollisionEvent: typeof addCollisionEvent;
	/** get the player inventory */
	getPlayerInventory: () => Inventory | undefined;
	/** render a preview image for an entity definition */
	getPreview: (def: Record<string, any>) => string;
	/** select active hotbar slot */
	selectHotbarSlot: (index: number) => void;
	/** subscribe to inventory changes for an entity */
	onInventoryChange: (eid: number, cb: InventoryChangeCallback) => () => void;
	/** subscribe to the player inventory */
	onPlayerInventoryChange: (cb: InventoryChangeCallback) => () => void;
	/** get the current player entity id */
	getPlayerEid: () => number | undefined;
        lifecycleEvents: EventEmitter<PlayerDeathEvent>;
        canvas?: HTMLCanvasElement;
        isDebugMode: () => boolean;
        isHUDVisible: () => boolean;
        /** Whether an XR session is currently presenting */
        isXRSessionActive: () => boolean;
        /** Check if XR is supported in this browser/environment */
        isXRSupported: () => Promise<boolean>;
        /** Request entry into an immersive XR session */
        enterXR: (mode?: XRSessionMode, sessionInit?: XRSessionInit) => Promise<XRSession | null>;
        /** Exit an active XR session */
        exitXR: () => Promise<void>;
        /** Get the current XR session */
        getXRSession: () => XRSession | null;
        /** configure death screen buttons */
        setDeathScreenButtons: (buttons: DeathScreenButton[]) => void;
	getConfig: () => EngineConfig;
	/** save world state to a JSON file */
	saveWorldToFile: (filename?: string) => WorldDefinition;
	/** load world state from a file (opens file picker), returns world script for loadWorld */
	loadWorldFromFile: (onLoad: (worldScript: string) => void, onError?: (error: Error) => void) => void;
	/** serialize world to JSON string */
	serializeWorldToJSON: () => string;
	/** serialize world to WorldDefinition object with options */
	serializeWorld: (options?: { includeEntities?: boolean; includeRuntime?: boolean }) => WorldDefinition;
	/** load world from JSON string, returns world script for loadWorld */
	loadWorldFromJSON: (json: string) => string;
	/** capture a screenshot of the current world viewport */
	captureWorldScreenshot: (options?: ScreenshotOptions) => ScreenshotResult;
	/** capture a screenshot of a specific entity */
	captureEntityScreenshot: (eid: number, options?: ScreenshotOptions) => ScreenshotResult;
	/** read the current viewport camera pose */
	getViewportCamera: () => ViewportCameraPose;
	/** update the current viewport camera pose */
	setViewportCamera: (options: ViewportCameraSetOptions) => ViewportCameraPose;
	/** frame the viewport camera around an entity */
	frameViewportEntity: (eid: number, options?: FrameSelectionOptions) => ViewportCameraPose;
	/** frame the viewport camera around arbitrary bounds */
	frameViewportBounds: (bounds: { center: { x: number; y: number; z: number }; size: { x: number; y: number; z: number } }, options?: FrameSelectionOptions) => ViewportCameraPose;
	/** register a handler used by the Render Inspector to upscale screenshots */
	setImageUpscaleHandler: (
		handler: ((payload: ImageUpscaleRequest) => Promise<ImageUpscaleResult>) | null,
		meta?: ImageUpscaleMeta | null,
	) => void;
	/** get metadata for the current image upscale handler */
	getImageUpscaleMeta: () => ImageUpscaleMeta | null;
	/** set available image upscale models */
	setImageUpscaleModels: (models: ImageUpscaleModelOption[]) => void;
	/** get available image upscale models */
	getImageUpscaleModels: () => ImageUpscaleModelOption[];
	/** set active image upscale model id */
	setActiveImageUpscaleModelId: (modelId: string) => void;
	/** get active image upscale model id */
	getActiveImageUpscaleModelId: () => string | null;
	/** request image upscale using the registered handler */
	upscaleImage: (payload: ImageUpscaleRequest) => Promise<ImageUpscaleResult>;
	/** Automation interface for structured inspection and editing */
	automation: {
		getResource: (name: string, params?: Record<string, any>) => any;
		executeCommand: (name: string, params: any) => Promise<string>;
		executeBatch: (calls: AutomationCommandCall[], description?: string) => Promise<string[]>;
		listResources: () => Array<{ name: string; description: string }>;
		listCommands: () => Array<{ name: string; description: string; parameters: AutomationCommandParameter[] }>;
	};
	/** load world directly from WorldDefinition (bypasses script generation) */
	loadWorldFromDefinition: (worldDefinition: WorldDefinition) => Promise<void>;
	/** hot-reload a world script */
	loadWorld: (code: string) => Promise<void>;
	/** dispose and cleanup the engine */
	dispose: () => void;
}

export interface ImageUpscaleRequest {
	dataUrl: string;
	prompt?: string;
	scope?: 'world' | 'entity';
	eid?: number;
	modelId?: string | null;
}

export interface ImageUpscaleResult extends ScreenshotResult {
	modelId?: string;
	modelName?: string;
}

export interface ImageUpscaleMeta {
	modelId?: string;
	modelName?: string;
	supportsImageGeneration?: boolean;
	activeModelId?: string | null;
}

export interface ImageUpscaleModelOption {
	id: string;
	name: string;
	supportsImageGeneration: boolean;
}

export interface WorldScript {
	setupScene?(api: EngineAPI): void;
	run?(api: EngineAPI): void;
	tick?(delta: number, api: EngineAPI): void;
}

export async function loadDependencies() {
	console.log('Loading dependencies...');
	// Load RAPIER physics engine
	await RAPIER.init();
	await RECAST.init();
}

// Helper function to apply shadow quality settings
function applyShadowQuality(renderer: THREE.WebGLRenderer, directionalLight: THREE.DirectionalLight | null, quality: ShadowQuality): void {
	if (quality === 'off') {
		renderer.shadowMap.enabled = false;
		if (directionalLight) {
			directionalLight.castShadow = false;
		}
		return;
	}

	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	if (directionalLight) {
		directionalLight.castShadow = true;

		// Map quality levels to shadow map sizes
		let shadowMapSize: number;
		switch (quality) {
			case 'low':
				shadowMapSize = 512;
				break;
			case 'med':
				shadowMapSize = 1024;
				break;
			case 'high':
				shadowMapSize = 2048;
				break;
			default:
				shadowMapSize = 1024; // fallback to medium
		}

		directionalLight.shadow.mapSize.width = shadowMapSize;
		directionalLight.shadow.mapSize.height = shadowMapSize;
		if (directionalLight.shadow.map) {
			directionalLight.shadow.map.dispose();
			directionalLight.shadow.map = null;
		}
		directionalLight.shadow.needsUpdate = true;
	}
}

export function startEngine(canvas: HTMLCanvasElement, config: EngineConfig = {}) {
	console.log('Starting engine...');

	// Normalize mode from config - support legacy display boolean
	let mode = config.mode;
	if (!mode) {
		mode = config.display ? EngineMode.DISPLAY : EngineMode.GAME;
	}

        // Extract config values with defaults
        const hudVisible = config.hudVisible ?? true;
        const xrEnabled = config.enableXR ?? true;
        const xrSessionMode = config.xrSessionMode ?? 'immersive-vr';
        const xrSessionInit: XRSessionInit = {
                optionalFeatures: ['local-floor', 'bounded-floor'],
                ...config.xrSessionInit,
        };

	const handleClick = (mode === EngineMode.GAME)
		? () => { canvas.requestPointerLock(); }
		: () => { };

	canvas.addEventListener('click', handleClick);

	// reset ECS state for a fresh engine instance
	const ctx = createECS();
	
	// In editor mode, start paused (not playing)
	if (mode === EngineMode.EDITOR) {
		ctx.isPlaying = false;
	}
	
	const playerQuery = defineQuery([Player]);
	const staticCameraQuery = defineQuery([StaticCamera]);

	// —— Core Three.js Setup ——
        const renderer = new THREE.WebGLRenderer({
                canvas,
                logarithmicDepthBuffer: false
        });
        renderer.xr.enabled = xrEnabled;
        renderer.xr.setReferenceSpaceType('local-floor');
        // IMPORTANT: use setPixelRatio so internal drawing buffer matches device DPI.
	// Direct assignment (renderer.pixelRatio = ...) is a no-op in Three.js and leaves pixel ratio at 1,
	// causing postprocessing (EffectComposer) to run at effectively half resolution on HiDPI screens.
	// Initial pixel ratio includes stored render scale; PostprocessingManager will
	// adjust dynamically if the user changes the render scale setting.
	renderer.setPixelRatio(Math.min((window.devicePixelRatio || 1) * getRenderScale(ctx), 2));
	// renderer.toneMapping = THREE.NoToneMapping
	renderer.setSize(window.innerWidth, window.innerHeight, false);
	renderer.setClearColor(0x333366);

	// Initialize shadow mapping based on quality setting
	renderer.shadowMap.enabled = getShadowQuality(ctx) !== 'off';
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	camera.far = 2000;
	scene.add(camera);

	// Scene will be set up by skybox system
	scene.add(camera);

	// —— Postprocessing Setup ——
	const postprocessingManager = new PostprocessingManager(ctx, scene, renderer, camera);

	// —— Shadow Quality Tracking ——
	let currentShadowQuality = getShadowQuality(ctx);
	let directionalLight: THREE.DirectionalLight | null = null;

	function createDefaultWorldMetadata(): WorldMetadata {
		return {
			title: 'Untitled World',
			description: '',
			tags: [],
			brandColors: ['#87ceeb', '#fffacd'],
			dimensions: [{
				name: 'base',
				gravity: -9.81,
				useDayNightCycle: false,
				sky: {
					color: DEFAULT_SKY_CONFIG.color,
					sun: { ...DEFAULT_SKY_CONFIG.sun },
					clouds: { ...DEFAULT_SKY_CONFIG.clouds },
					stars: { ...DEFAULT_SKY_CONFIG.stars },
				},
				chunks: [],
			}],
		};
	}

	function teardownCurrentWorld() {
		running = false;
		cancelAnimationFrame(frameId);

		if (worldRoot && worldRoot.children.length > 0) {
			disposeSceneRecursively(worldRoot);
		}
		scene.remove(worldRoot);

		if (navMeshWorker) {
			console.log('[CLEANUP] Terminating NavMesh worker');
			navMeshWorker.terminate();
			navMeshWorker = null;
		}
	}

	function createNavMeshWorkerInstance(): Worker {
		const worker = new NavMeshWorker();
		worker.onmessage = (event) => {
			const navMeshExport = event.data;
			const result = RECAST.importNavMesh(navMeshExport);
			const navMesh = result.navMesh;
			console.log('Nav mesh generated successfully');

			const crowd = new RECAST.Crowd(navMesh, {
				maxAgents: 100,
				maxAgentRadius: 10.0,
			});

			const navMeshHelper = new NavMeshHelper(navMesh, {
				navMeshMaterial: new THREE.MeshBasicMaterial({
					color: 0x00ffff,
					transparent: true,
					opacity: 0.3,
					side: THREE.DoubleSide,
					depthTest: false,
					depthWrite: false,
				}),
			});

			const crowdHelper = new CrowdHelper(crowd, {
				agentMaterial: new THREE.MeshBasicMaterial({
					color: 0xff0000,
					transparent: true,
					opacity: 0.8,
				}),
			});

			const navMeshData = getResource<Map<NavMeshDataKey, NavMeshDataJob>>(ctx, 'navMeshData');
			if (!navMeshData) {
				throw new Error('navMeshData resource is not available for nav mesh worker results');
			}

			navMeshData.set(0, {
				state: NavMeshGenerationState.DONE,
				data: { navMesh, navMeshHelper, crowd, crowdHelper },
			});
		};
		return worker;
	}

	function registerBuiltInArchetypes() {
		registerArchetype(ctx, "cube", cube, true);
		registerArchetype(ctx, "sphere", sphere, true);
		registerArchetype(ctx, "cylinder", cylinder, true);
		registerArchetype(ctx, "cone", cone, true);
		registerArchetype(ctx, "pyramid", pyramid, true);
		registerArchetype(ctx, "pointLight", pointLight, true);
		registerArchetype(ctx, "sceneCamera", sceneCamera, true);
		registerArchetype(ctx, "gun", gun, true);
		registerArchetype(ctx, "bullet", bullet, true);
		registerArchetype(ctx, "terrain", terrain, true);
		if (mode === EngineMode.DISPLAY) {
			registerArchetype(ctx, "player", {}, true);
		} else {
			registerArchetype(ctx, "player", player, true);
		}
		registerArchetype(ctx, "ufo", ufo, true);
		registerArchetype(ctx, "tree", tree, true);
		registerArchetype(ctx, "enemy", enemy, true);
		registerArchetype(ctx, "skeleton", skeleton, true);
		registerArchetype(ctx, "bow", bow, true);
		registerArchetype(ctx, "arrow", arrow, true);
		registerArchetype(ctx, "skull", skull, true);
		registerArchetype(ctx, "healthPotion", healthPotion, true);
		registerArchetype(ctx, "dragon", dragon, true);
		for (const entry of assetGeneratorExampleArchetypes) {
			registerArchetype(ctx, entry.archetypeName, entry.bundle, true);
		}
	}

	function initializeWorldResources() {
		if (config.settingsOverrides) {
			setSettingsOverrides(ctx, config.settingsOverrides);
		}
		setResource(ctx, 'nextStableId', 0);
		setResource(ctx, 'displayMode', mode === EngineMode.DISPLAY);
		setResource(ctx, 'editorMode', mode === EngineMode.EDITOR);
		setResource(ctx, 'eventQueue', new RAPIER.EventQueue(true), (eq) => { eq.free(); console.log('EventQueue disposed') });
		setResource(ctx, 'renderObjects', new Map<number, THREE.Object3D>(), (map) => {
			console.log('[DISPOSE] Disposing renderObjects map with', map.size, 'entries');
			map.forEach((obj) => {
				obj.traverse((child) => {
					const mesh = child as THREE.Mesh;
					if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
						mesh.geometry.dispose();
					}
					if (mesh.material) {
						const mat = mesh.material;
						if (Array.isArray(mat)) {
							mat.forEach(m => {
								if (m && typeof m.dispose === 'function') {
									m.dispose();
								}
							});
						} else if (mat && typeof mat.dispose === 'function') {
							mat.dispose();
						}
					}
				});
			});
			map.clear();
		});
		setResource(ctx, 'startTime', Date.now() / 1000);
		setResource(ctx, 'xrSessionActive', false);
		setResource(ctx, 'metadata', createDefaultWorldMetadata());
		setResource(ctx, 'collisionEventCallbacks', new Array<CollisionEventCallback>());
		setResource(ctx, 'sensorIntersectionPairs', new LazyMap<number, Set<number>>(() => new Set<number>()));
		setResource(ctx, 'handleToEntity', new Map<number, number>());
		setResource(ctx, 'inventoryChangeCallbacks', new Map<number, Set<InventoryChangeCallback>>(), (map) => {
			console.log('[DISPOSE] Clearing inventoryChangeCallbacks with', map.size, 'entries');
			map.forEach((set) => set.clear());
			map.clear();
		});
		setResource(ctx, 'playerInventoryCallbacks', new Set<InventoryChangeCallback>(), (set) => {
			console.log('[DISPOSE] Clearing playerInventoryCallbacks with', set.size, 'entries');
			set.clear();
		});
		setResource(ctx, 'playerInventoryCooldownCallbacks', new ReactiveMap<number>());
		setResource(ctx, 'metrics', new Metrics(ctx));
		const achievementsMap = new ReactiveMap<Achievement>();
		setResource(ctx, 'achievements', achievementsMap, (map) => {
			console.log('[DISPOSE] Clearing achievements with', map.size, 'entries');
			map.removeAllListeners();
			map.clear();
		});
		const checkAllForNewAchievement = (_achievement: Achievement) => checkAchievementsFor(ctx, "Player");
		achievementsMap.on('set', checkAllForNewAchievement);
		setResource(ctx, 'unlockedAchievements', new LazyMap<MetricsKey, ReactiveSet<string>>(() => new ReactiveSet<string>()));
		const preview = new PreviewRenderer(ctx, 64);
		setResource(ctx, 'previewRenderer', preview, (p) => p.dispose());
		setResource(ctx, 'originalMaterialsMap', new Map<number, THREE.Material>(), (map) => {
			console.log('[DISPOSE] Disposing originalMaterialsMap with', map.size, 'entries');
			map.forEach((material) => {
				if (material && typeof material.dispose === 'function') {
					material.dispose();
				}
			});
			map.clear();
		});
		setResource(ctx, 'effectsArrays', new Map<number, any>(), (map) => {
			console.log('[DISPOSE] Clearing effectsArrays with', map.size, 'entries');
			map.clear();
		});
		setResource(ctx, 'crowdAgents', new Map<number, RECAST.CrowdAgent>(), (map) => {
			console.log('[DISPOSE] Clearing crowdAgents with', map.size, 'entries');
			map.clear();
		});
		setResource(ctx, 'deathScreenButtons', [] as DeathScreenButton[]);
		setResource(ctx, 'lifecycleEvents', lifecycleEvents);
		setResource(ctx, 'isMobile', detectMobile());
		setResource(ctx, 'navMeshData', new Map<NavMeshDataKey, NavMeshDataJob>(), (map) => {
			map.forEach(({ state, data }) => {
				if (!data) return;
				if (data.crowd) {
					data.crowd.destroy();
				}
				if (data.navMesh) {
					data.navMesh.destroy();
				}
				if (data.navMeshHelper) {
					data.navMeshHelper.navMeshGeometry.dispose();
					if (data.navMeshHelper.navMeshMaterial) {
						data.navMeshHelper.navMeshMaterial.dispose();
					}
					data.navMeshHelper.clear();
				}
				if (data.crowdHelper) {
					data.crowdHelper.clear();
				}
				console.log(`NavMeshDataJob for ${state} disposed`);
			});
		});
		setResource(ctx, 'navMeshWorker', navMeshWorker, (w) => w?.terminate());
		setResource(ctx, 'intersectionShapeCache', new Map<string, RAPIER.Capsule>(), (cache) => {
			cache.forEach((shape) => shape.intoRaw().free());
			cache.clear();
			console.log('IntersectionShapeCache disposed');
		});
	}

	function configureEditorModeSystems() {
		if (mode !== EngineMode.EDITOR) {
			return;
		}

		console.log('Editor mode: Using Unity-style camera controls');
		const existingCameraState = getResource(ctx, 'editorCameraState');
		if (!existingCameraState) {
			const cameraController = initEditorCameraController(ctx, camera, renderer.domElement);
			setResource(ctx, 'editorCameraCleanup', cameraController.cleanup, (cleanup) => cleanup());
		}

		addSystem(ctx, editorCameraSystem);

		const transformControls = new TransformControls(camera, renderer.domElement);
		transformControls.setMode('translate');
		transformControls.setSpace('world');
		transformControls.addEventListener('dragging-changed', (event: { value: unknown }) => {
			if (event.value === true) {
				const cameraState = getResource(ctx, 'editorCameraState');
				if (cameraState) {
					(cameraState as any).isRotating = false;
				}
			}
		});

		setResource(ctx, 'transformControls', transformControls, (tc) => tc.dispose());
		addSystem(ctx, editorSelectionSystem);
	}

	function registerCoreSystems() {
		addSystem(ctx, updateEffectCooldownSystem);
		addSystem(ctx, updateTimeElapsedEffects);
		addSystem(ctx, updateSpawnerSystem);
		addSystem(ctx, updateAISystem);
		addSystem(ctx, updatePlayerInputState);
		addSystem(ctx, motionControlSystem);
		addSystem(ctx, mountSystem);
		addSystem(ctx, motionSystem);
		addSystem(ctx, characterUnstickSystem);
		addSystem(ctx, killPlaneSystem);
		addSystem(ctx, collisionSystem);
		addSystem(ctx, bodyRenderingSystem);
		addSystem(ctx, gltfRenderingSystem);
		addSystem(ctx, particleSystem);
		addSystem(ctx, animationSystem);

		if (mode === EngineMode.GAME) {
			addSystem(ctx, cameraSystem);
		}

		addSystem(ctx, updateSkyboxSystem);
		addSystem(ctx, heldItemSystem);
		addSystem(ctx, navMeshSystem);
	}

	function configureDisplayModeCamera() {
		if (mode !== EngineMode.DISPLAY) {
			return;
		}

		const staticCameraEntities = staticCameraQuery(ctx);
		if (staticCameraEntities.length > 0) {
			console.log('Display mode: Using StaticCamera');
			addSystem(ctx, staticCameraSystem);
			return;
		}

		console.log('Display mode: Using OrbitControls (no StaticCamera found)');
		const orbitControls = new OrbitControls(camera, renderer.domElement);
		orbitControls.enableDamping = true;
		orbitControls.dampingFactor = 0.1;
		orbitControls.autoRotate = true;
		orbitControls.autoRotateSpeed = 0.5;
		camera.position.set(0, 10, 10);
		orbitControls.target.set(0, 0, 0);
		orbitControls.autoRotate = true;
		orbitControls.autoRotateSpeed = 2;

		const disableAutoRotate = () => {
			orbitControls.autoRotate = false;
			canvas.removeEventListener('mousedown', disableAutoRotate);
			canvas.removeEventListener('touchstart', disableAutoRotate);
		};

		canvas.addEventListener('mousedown', disableAutoRotate);
		canvas.addEventListener('touchstart', disableAutoRotate);
		setResource(ctx, 'orbitControls', orbitControls, (oc) => oc.dispose());
		addSystem(ctx, orbitControlsSystem);
	}

	function bootstrapFreshWorld(gravity: number) {
		teardownCurrentWorld();

		worldRoot = new THREE.Group();
		scene.add(worldRoot);
		api.worldRoot = worldRoot;

		physicsWorld?.free();
		physicsWorld = new RAPIER.World({ x: 0, y: gravity, z: 0 });
		api.physicsWorld = physicsWorld;

		resetECS(ctx);
		Object.assign(ctx, {
			three: { scene, renderer, camera, worldRoot },
			rapier: { world: physicsWorld },
			input: inputState,
		});

		navMeshWorker = createNavMeshWorkerInstance();
		registerBuiltInArchetypes();
		initializeWorldResources();
		configureEditorModeSystems();
		registerCoreSystems();
		tickHandlers = [];
	}

	function finalizeWorldLoad() {
		const skyboxObjects = createSkyboxAndLighting();
		if (skyboxObjects) {
			setResource(ctx, 'skybox', skyboxObjects);
		}

		cleanupDebugRapierMesh();
		ctx.time.reset();
		lastRealTimestamp = (typeof performance !== 'undefined' ? performance.now() : Date.now());
		running = true;
		renderer.compile(scene, camera);
		reactRoot.render(React.createElement(App, { api }));
		const firstHudEl = document.getElementById('hud-root');
		if (firstHudEl) firstHudEl.style.display = hudShown ? 'block' : 'none';
		api.lifecycleEvents.emit(LifecycleEvent.LOAD_WORLD);
		animate();
	}

	// —— Handle Resize ——
	window.addEventListener('resize', () => {
		renderer.setSize(window.innerWidth, window.innerHeight, false);
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		postprocessingManager.onResize(window.innerWidth, window.innerHeight);
	});

	// —— Generic Input State ——
	const inputState: InputState = {
		moveX: 0,
		moveY: 0,
		moveZ: 0,
		yaw: 0,
		pitch: 0,
		interact: 0,
		primary: 0,
		secondary: 0,
		sprint: false,
	};
	function updateInput(data: Partial<InputState>) {
		Object.assign(inputState, data);
	}

	const triggerInput = new TriggerInput();
	function setTriggerInput(key: TriggerInputKey) { triggerInput.set(key); }

	// —— Debug State ——
	let debugState = DebugState.NONE;
	// —— HUD Visibility Flag ——
	let hudShown = hudVisible;

	// —— Physics World Setup ——
	let physicsWorld: RAPIER.World = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

	// —— Scene Group for World Scripts ——
	let worldRoot: THREE.Group = new THREE.Group();

	// —— Per-frame Hooks from WorldScript ——
	let tickHandlers: Array<(dt: number, api: EngineAPI) => void> = [];

        // —— Animation Frame ID ——
        let frameId: number = 0;

        // —— Running Flag ——
        let running = false;

        // —— NavMesh Worker Reference ——
        let navMeshWorker: Worker | null = null;

        // —— XR Helpers ——
        const {
                xrSupportPromise,
                enterXR,
                exitXR,
                getXRSession,
                getAnimationLoopMode,
        } = createWebXRHelpers({
                renderer,
                xrEnabled,
                xrSessionMode,
                xrSessionInit,
                ctx,
                animate,
                getFrameId: () => frameId,
                setFrameId: (id: number) => { frameId = id; },
        });

	// #region debug
	// —— Rapier Debug Rendering ——
	let debugRapierMesh: THREE.LineSegments | null = null;
	let debugRapierBuffers: RAPIER.DebugRenderBuffers | null = null;
	const debugRapierMaterial = new THREE.LineBasicMaterial({
		color: 0x77ff77,
		linewidth: 1,
		depthTest: false, // Draw on top of everything - set true if you want obstruction by geometry
		depthWrite: false,
		transparent: true,
		opacity: 0.65,
		polygonOffset: true,
		polygonOffsetFactor: -10, // Push lines forward
	});

	// --- Debug Transform Mesh ---
	let debugTransformMesh: LineSegments2 | null = null;
	const debugTransformMaterial = new LineMaterial({
		color: 0xffffff,
		linewidth: 3, // thickness in pixels
		depthTest: false,
		depthWrite: false,
		transparent: true,
		opacity: 1.0,
		polygonOffset: true,
		polygonOffsetFactor: -10,
		vertexColors: true,
	});

	// --- Debug Nav Mesh ---
	let debugNavMesh: THREE.Object3D | null = null;

	// --- Debug Crowd Mesh ---
	let debugCrowdMesh: THREE.Object3D | null = null;

	// --- Debug AI Target Lines ---
	let debugAITargetMesh: LineSegments2 | null = null;
	const debugAITargetMaterial = new LineMaterial({
		color: 0xff0000, // Red color
		linewidth: 2, // thickness in pixels
		depthTest: false,
		depthWrite: false,
		transparent: true,
		opacity: 0.8,
		polygonOffset: true,
		polygonOffsetFactor: -5,
		vertexColors: true,
	});

	function cleanupDebugRapierMesh() {
		if (debugRapierMesh) {
			worldRoot.remove(debugRapierMesh);
			debugRapierMesh.geometry.dispose();
			debugRapierMesh = null;
		}
		debugRapierBuffers = null;
	}

	function cleanupDebugTransformMesh() {
		if (debugTransformMesh) {
			worldRoot.remove(debugTransformMesh);
			debugTransformMesh.geometry.dispose();
			debugTransformMesh = null;
		}
	}

	function cleanupDebugNavMesh() {
		if (debugNavMesh) {
			worldRoot.remove(debugNavMesh);
			debugNavMesh = null;
		}
	}

	function cleanupDebugCrowdMesh() {
		if (debugCrowdMesh) {
			worldRoot.remove(debugCrowdMesh);
			debugCrowdMesh = null;
		}
	}

	function cleanupDebugAITargetMesh() {
		if (debugAITargetMesh) {
			worldRoot.remove(debugAITargetMesh);
			debugAITargetMesh.geometry.dispose();
			debugAITargetMesh = null;
		}
	}

	function updateDebugMeshes() {
		// --- RAPIER Debug Shapes (Physics only) ---
		if (!physicsWorld || debugState !== DebugState.PHYSICS) {
			cleanupDebugRapierMesh();
		} else {
			debugRapierBuffers = physicsWorld.debugRender();
			const { vertices, colors } = debugRapierBuffers;
			if (!vertices || vertices.length === 0) {
				cleanupDebugRapierMesh();
			} else {
				const geometry = new THREE.BufferGeometry();
				geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
				geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 4));
				if (debugRapierMesh) {
					debugRapierMesh.geometry.dispose();
					debugRapierMesh.geometry = geometry;
				} else {
					debugRapierMesh = new THREE.LineSegments(geometry, debugRapierMaterial);
					debugRapierMesh.frustumCulled = false;
					worldRoot.add(debugRapierMesh);
				}
			}
		}

		// --- Transform Debug Axes (All states except None) ---
		if (debugState === DebugState.NONE) {
			cleanupDebugTransformMesh();
		} else {
			const { vertices, colors } = computeDebugTransforms(scene, false);
			if (!vertices || vertices.length === 0) {
				cleanupDebugTransformMesh();
			} else {
				const geometry = new LineSegmentsGeometry();
				geometry.setPositions(vertices);
				geometry.setColors(colors);
				if (debugTransformMesh) {
					debugTransformMesh.geometry.dispose();
					debugTransformMesh.geometry = geometry;
				} else {
					debugTransformMesh = new LineSegments2(geometry, debugTransformMaterial);
					debugTransformMesh.frustumCulled = false;
					worldRoot.add(debugTransformMesh);
				}
			}
		}

		// --- Nav Mesh Debug (AI only) ---
		if (debugState !== DebugState.AI) {
			cleanupDebugNavMesh();
		} else {
			const navMeshDebugMesh = getNavMeshDebugMesh(ctx);
			if (navMeshDebugMesh && navMeshDebugMesh !== debugNavMesh) {
				// Remove old debug mesh if different
				if (debugNavMesh) {
					worldRoot.remove(debugNavMesh);
				}
				// Add new debug mesh
				debugNavMesh = navMeshDebugMesh;
				worldRoot.add(debugNavMesh);
			} else if (!navMeshDebugMesh && debugNavMesh) {
				// Remove debug mesh if no nav mesh
				cleanupDebugNavMesh();
			}
		}

		// --- Crowd Debug (AI only) ---
		if (debugState !== DebugState.AI) {
			cleanupDebugCrowdMesh();
		} else {
			const crowdDebugMesh = getCrowdDebugMesh(ctx);
			if (crowdDebugMesh && crowdDebugMesh !== debugCrowdMesh) {
				// Remove old debug mesh if different
				if (debugCrowdMesh) {
					worldRoot.remove(debugCrowdMesh);
				}
				// Add new debug mesh
				debugCrowdMesh = crowdDebugMesh;
				worldRoot.add(debugCrowdMesh);
			} else if (!crowdDebugMesh && debugCrowdMesh) {
				// Remove debug mesh if no crowd
				cleanupDebugCrowdMesh();
			}
		}

		// --- AI Target Lines Debug (AI only) ---
		if (debugState !== DebugState.AI) {
			cleanupDebugAITargetMesh();
		} else {
			const { vertices, colors } = computeAITargetLines(ctx);
			if (!vertices || vertices.length === 0) {
				cleanupDebugAITargetMesh();
			} else {
				const geometry = new LineSegmentsGeometry();
				geometry.setPositions(vertices);
				geometry.setColors(colors);
				if (debugAITargetMesh) {
					debugAITargetMesh.geometry.dispose();
					debugAITargetMesh.geometry = geometry;
				} else {
					debugAITargetMesh = new LineSegments2(geometry, debugAITargetMaterial);
					debugAITargetMesh.frustumCulled = false;
					worldRoot.add(debugAITargetMesh);
				}
			}
		}
	}
	// #endregion

        const stats = new Stats();
        stats.showPanel(1);
        stats.dom.style.display = debugState !== DebugState.NONE ? 'block' : 'none';
        document.body.appendChild(stats.dom);

        // —— Animation + Physics Loop ——
        // Track real (unscaled) time between frames for editor systems when timescale is 0
        let lastRealTimestamp = (typeof performance !== 'undefined' ? performance.now() : Date.now());

        // Only this subset should run when the editor is paused so visuals and controls stay responsive
        const editorPausedSystems = [
                editorCameraSystem,
                editorSelectionSystem,
                bodyRenderingSystem,
                gltfRenderingSystem,
                particleSystem,
                updateSkyboxSystem,
                staticCameraSystem,
                orbitControlsSystem,
        ];
        function animate() {
                if (!running) return;
                stats.begin(); // Start measuring performance

		// Set timescale to 0 when not playing to pause physics/gameplay systems
		// But we still need deltaTime for editor systems (camera movement, etc.)
		ctx.time.setTimescale(ctx.isPlaying ? 1 : 0);
		ctx.time.update();

		// In editor mode when not playing, we need real deltaTime for editor systems
		// even though gameplay systems should see 0 (via timescale)
		const dt = ctx.time.getDelta();
		// Prefer Timer.getRealDelta if available; otherwise compute from performance.now()
		const editorDt = (typeof (ctx.time as any).getRealDelta === 'function')
			? (ctx.time as any).getRealDelta()
			: (() => {
				const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
				const d = (now - lastRealTimestamp) / 1000;
				lastRealTimestamp = now;
				return d;
			})();
		
		// For gameplay systems, use scaled deltaTime (will be 0 when not playing)
		setResource(ctx, 'deltaTime', dt);
		// For editor systems, use real deltaTime
		setResource(ctx, 'editorDeltaTime', editorDt);

		// Update frame number for performance optimizations
		const frameNumber = (getResource<number>(ctx, 'frameNumber') || 0) + 1;
		setResource(ctx, 'frameNumber', frameNumber);

                // Handle system execution based on mode and playing state
                if (!ctx.isPlaying && mode === EngineMode.EDITOR) {
                        // EDITOR mode when paused: run only the systems needed for visuals and editor tools
                        for (const system of editorPausedSystems) {
                                system(ctx);
                        }
                } else if (!ctx.isPlaying && mode === EngineMode.GAME) {
                        // GAME mode when paused: Don't run any systems (game is paused)
                        // Systems will receive dt=0 from timescale, but we skip execution entirely
                        // to ensure complete pause of gameplay, physics, AI, animations, etc.
                } else {
                        // In all other cases, run all systems:
                        // - GAME mode when playing (ctx.isPlaying === true)
                        // - DISPLAY mode (always runs, doesn't have pause)
                        // - EDITOR mode when playing (ctx.isPlaying === true)
                        runSystems(ctx);
                        for (const fn of tickHandlers) fn(dt, api as any);
                }

		updateDebugMeshes();
		stats.dom.style.display = debugState !== DebugState.NONE ? 'block' : 'none';
		const hudEl = document.getElementById('hud-root');
		if (hudEl) hudEl.style.display = hudShown ? 'block' : 'none';

		// Update shadow quality if changed
		const newShadowQuality = getShadowQuality(ctx);
		if (newShadowQuality !== currentShadowQuality) {
			applyShadowQuality(renderer, directionalLight, newShadowQuality);
			currentShadowQuality = newShadowQuality;
		}

                // Update XR state and choose rendering path
                const xrSession = getXRSession();
                const xrActive = renderer.xr.isPresenting && !!xrSession;
                setResource(ctx, 'xrSessionActive', xrActive);

                // Update postprocessing settings and render
                postprocessingManager.updateSettings(ctx);
                const xrCamera = xrActive ? renderer.xr.getCamera() : undefined;
                postprocessingManager.render(xrCamera);
                stats.end(); // End measuring performance
                if (getAnimationLoopMode() === 'raf') {
                        frameId = requestAnimationFrame(animate);
                }
        }

	// —— UI Root Setup ——
	const uiRoot = document.createElement('div');
	uiRoot.id = ENGINE_UI_ROOT_ID;
	uiRoot.style.position = 'absolute';
	uiRoot.style.top = '0';
	uiRoot.style.left = '0';
	uiRoot.style.overflow = 'hidden';
	uiRoot.style.pointerEvents = 'none'; // Allow clicks to pass through to canvas

	function resizeUIRoot() {
		const rect = canvas.getBoundingClientRect();
		uiRoot.style.width = rect.width + 'px';
		uiRoot.style.height = rect.height + 'px';
		uiRoot.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
		// Ensure UI elements like the hotbar appear above touch controls
		// which currently use a z-index of 15
		uiRoot.style.zIndex = '50';
	}
	resizeUIRoot();
	window.addEventListener('resize', resizeUIRoot);
	// If canvas might move/resize for other reasons, consider using ResizeObserver:
	if (window.ResizeObserver) {
		const ro = new ResizeObserver(resizeUIRoot);
		ro.observe(canvas);
	}

	canvas.parentElement?.appendChild(uiRoot);

	// —— React Root Mount ——
	const reactRoot = createRoot(uiRoot);

	// —— Single Compile Before First Frame ——
	renderer.compile(scene, camera);

	// —— Lifecycle Events ——
	const lifecycleEvents = new EventEmitter<any>();
	let imageUpscaleHandler: ((payload: ImageUpscaleRequest) => Promise<ImageUpscaleResult>) | null = null;
	let imageUpscaleMeta: ImageUpscaleMeta | null = null;
	let imageUpscaleModels: ImageUpscaleModelOption[] = [];
	let activeImageUpscaleModelId: string | null = null;

	const renderFrameForScreenshot = () => {
		const xrSession = getXRSession();
		const xrActive = renderer.xr.isPresenting && !!xrSession;
		const xrCamera = xrActive ? renderer.xr.getCamera() : undefined;
		postprocessingManager.updateSettings(ctx);
		postprocessingManager.render(xrCamera);
	};

	// —— Exposed Engine API ——
	// Note that we bind the methods to the ECS context to give the llm
	// code a more concise API
	const api: any = {
		scene,
		worldRoot,
		camera,
		renderer,
		physicsWorld,
		THREE,
		RAPIER,
		createNoise2D,
		createNoise3D,
		createNoise4D,
		ecsWorld: ctx,
		spawn: spawn.bind(null, ctx),
		initialize: initialize.bind(null, ctx),
		registerArchetype: registerArchetype.bind(null, ctx),
		addSystem: addSystem.bind(null, ctx),
		setResource: <R>(name: string, resource: R, disposeFn?: (res: R) => void) => setResource(ctx, name, resource, disposeFn),
		getResource: <R>(name: string, hideWarnings?: boolean) => getResource<R>(ctx, name, hideWarnings),
		getModule: getModule.bind(null, ctx),
		registerRuntimeModuleType: (definition: PersistedRuntimeModuleTypeDefinition) =>
			registerRuntimeModuleType(ctx, definition, { persist: true }),
		unregisterRuntimeModuleType: (moduleName: string, typeName: string) =>
			unregisterRuntimeModuleType(ctx, moduleName, typeName),
		registerRuntimeModuleInstance: (moduleName: string, instanceName: string, definition: { type: string; params: any }) =>
			upsertRuntimeModuleInstance(ctx, moduleName, instanceName, definition),
		unregisterRuntimeModuleInstance: (moduleName: string, instanceName: string) =>
			removeRuntimeModuleInstance(ctx, moduleName, instanceName),
		listRuntimeModuleTypes: () => listRuntimeModuleTypes(ctx),
		listRuntimeModuleInstances: () => listRuntimeModuleInstances(ctx),
		input: inputState,
		updateInput,
		triggerInput,
		setTriggerInput,
		addCollisionEvent: addCollisionEvent.bind(null, ctx),
		getPlayerInventory: getPlayerInventory,
		getPreview: (def: Record<string, any>) => {
			const pr = getResource<PreviewRenderer>(ctx, 'previewRenderer');
			return pr ? pr.getPreview(def) : '';
		},
		selectHotbarSlot: (index: number) => {
			const eids = playerQuery(ctx);
			if (eids.length === 0) return;
			eids.sort((a, b) => a - b);
			const pid = eids[0];

			const clampedIndex = Math.min(index, InventoryComp.size[pid] - 1);
			InventoryComp.selected[pid] = clampedIndex
			const invs = getStore<InventoryStore>(ctx, 'inventory');
			const inv = invs.get(pid);
			if (inv) {
				inv.selected = clampedIndex;
				inventoryChanged(ctx, pid);
			}
		},
		onInventoryChange: (eid: number, cb: InventoryChangeCallback) => {
			let map = getResource<Map<number, Set<InventoryChangeCallback>>>(ctx, 'inventoryChangeCallbacks');
			if (!map) {
				map = new Map();
				setResource(ctx, 'inventoryChangeCallbacks', map);
			}
			let set = map.get(eid);
			if (!set) {
				set = new Set();
				map.set(eid, set);
			}
			set.add(cb);
			return () => set!.delete(cb);
		},
		onPlayerInventoryChange: (cb: InventoryChangeCallback) => {
			let set = getResource<Set<InventoryChangeCallback>>(ctx, 'playerInventoryCallbacks');
			if (!set) {
				set = new Set();
				setResource(ctx, 'playerInventoryCallbacks', set);
			}
			set.add(cb);
			const eid = api.getPlayerEid();
			if (eid !== undefined) {
				const invs = getStore<InventoryStore>(ctx, 'inventory');
				const inv = invs.get(eid);
				if (inv) cb(inv);
			}
			return () => set.delete(cb);
		},
		getPlayerEid: () => {
			const eids = playerQuery(ctx);
			if (eids.length === 0) return undefined;
			eids.sort((a, b) => a - b);
			return eids[0];
		},
                lifecycleEvents: lifecycleEvents,
                canvas: canvas,
                isDebugMode: () => debugState !== DebugState.NONE,
                isHUDVisible: () => hudShown,
                isXRSessionActive: () => renderer.xr.isPresenting && !!getXRSession(),
                isXRSupported: () => xrSupportPromise,
                enterXR,
                exitXR,
                getXRSession,
                setDeathScreenButtons: (buttons: DeathScreenButton[]) => {
                        setResource(ctx, 'deathScreenButtons', buttons);
                },
		getConfig: () => config,
		saveWorldToFile: (filename?: string) => saveWorldToFile(ctx, filename),
		loadWorldFromFile: (onLoad: (worldScript: string) => void, onError?: (error: Error) => void) => loadWorldFromFile(onLoad, onError),
		serializeWorldToJSON: () => serializeWorldToJSON(ctx),
		serializeWorld: (options?: { includeEntities?: boolean; includeRuntime?: boolean }) => 
			serializeWorld(ctx, options || { includeEntities: true, includeRuntime: false }),
		loadWorldFromJSON: (json: string) => loadWorldFromJSON(json),
		captureWorldScreenshot: (options?: ScreenshotOptions) =>
			captureWorldScreenshot(ctx, { ...options, renderFrame: renderFrameForScreenshot }),
		captureEntityScreenshot: (eid: number, options?: ScreenshotOptions) =>
			captureEntityScreenshot(ctx, eid, { ...options, renderFrame: renderFrameForScreenshot }),
		getViewportCamera: () => getViewportCameraPose(ctx),
		setViewportCamera: (options: ViewportCameraSetOptions) => applyViewportCameraPose(ctx, options),
		frameViewportEntity: (eid: number, options?: FrameSelectionOptions) => frameViewportEntity(ctx, eid, options),
		frameViewportBounds: (
			bounds: { center: { x: number; y: number; z: number }; size: { x: number; y: number; z: number } },
			options?: FrameSelectionOptions,
		) => {
			const center = new THREE.Vector3(bounds.center.x, bounds.center.y, bounds.center.z);
			const halfSize = new THREE.Vector3(bounds.size.x, bounds.size.y, bounds.size.z).multiplyScalar(0.5);
			const box = new THREE.Box3(center.clone().sub(halfSize), center.clone().add(halfSize));
			return frameViewportBounds(ctx, box, options);
		},
		setImageUpscaleHandler: (
			handler: ((payload: ImageUpscaleRequest) => Promise<ImageUpscaleResult>) | null,
			meta?: ImageUpscaleMeta | null,
		) => {
			imageUpscaleHandler = handler;
			imageUpscaleMeta = meta ?? null;
		},
		getImageUpscaleMeta: () => imageUpscaleMeta,
		setImageUpscaleModels: (models: ImageUpscaleModelOption[]) => {
			imageUpscaleModels = models;
		},
		getImageUpscaleModels: () => imageUpscaleModels,
		setActiveImageUpscaleModelId: (modelId: string) => {
			activeImageUpscaleModelId = modelId;
			imageUpscaleMeta = {
				...(imageUpscaleMeta ?? {}),
				activeModelId: modelId,
			};
		},
		getActiveImageUpscaleModelId: () => activeImageUpscaleModelId,
		upscaleImage: async (payload: ImageUpscaleRequest) => {
			if (!imageUpscaleHandler) {
				throw new Error('Image upscaling is not configured for this session.');
			}
			const resolvedModelId = payload.modelId ?? activeImageUpscaleModelId;
			return await imageUpscaleHandler({ ...payload, modelId: resolvedModelId });
		},
		// Automation interface
		automation: {
			getResource: (name: string, params?: Record<string, any>) => {
				return readAutomationResource(ctx, name, params);
			},
			executeCommand: async (name: string, params: any) => {
				return await executeAutomationCommand(ctx, api, name, params);
			},
			executeBatch: async (calls: AutomationCommandCall[], description?: string) => {
				return await executeAutomationBatch(ctx, api, calls, description);
			},
			listResources: () => {
				return listAutomationResources();
			},
			listCommands: () => {
				return listAutomationCommands();
			}
		}
	};

	// —— Skybox and Lighting Setup ——
	function createSkyboxAndLighting(): SkyboxObjects | undefined {
		const metadata = getResource<WorldMetadata>(ctx, 'metadata');
		const baseDimension =
			metadata?.dimensions?.find(d => d.name === 'base') ??
			metadata?.dimensions?.[0];	// return first dimension if no "base" dimension

		if (!baseDimension) return undefined;

		// Remove existing lighting
		const existingLights = scene.children.filter(child =>
			child instanceof THREE.Light ||
			child.type === 'Mesh' && child.name === 'skybox'
		);
		existingLights.forEach(light => scene.remove(light));

		const skyData = baseDimension.sky;
		const skyColor = new THREE.Color(skyData.color);

		// Create skybox with gradient
		const skyGeometry = new THREE.SphereGeometry(500, 32, 16);
		const skyMaterial = new THREE.ShaderMaterial({
			uniforms: {
				topColor: { value: skyColor },
				bottomColor: { value: skyColor.clone().multiplyScalar(0.6) },
				offset: { value: 0.0 }, // small vertical shift
				exponent: { value: 0.6 },
				sunDirection: { value: new THREE.Vector3(0, -1, 0) },
				sunColor: { value: new THREE.Color(0xffffff) },
				sunIntensity: { value: 0 },
				cloudsColor: { value: new THREE.Color(0xffffff) },
				cloudsCoverage: { value: 0.25 },
				starsIntensity: { value: 0 }
			},
			vertexShader: SkyboxShader.vert,
			fragmentShader: SkyboxShader.frag,
			side: THREE.BackSide,
			depthWrite: false
		});

		const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
		skybox.name = 'skybox';
		scene.add(skybox);

		directionalLight = null;
		let lightTarget: THREE.Object3D | null = null;

		// Configure sun if present
		if (skyData.sun) {
			const sunData = skyData.sun;
			const timeOfDay = sunData.timeOfDay;

			// Store time of day as engine resource
			setResource(ctx, 'timeOfDay', timeOfDay);

			// Convert time to angle (0-2399 -> 0-2π)
			const sunDirection = timeToSunDirection(timeOfDay);

			skyMaterial.uniforms.sunDirection.value = sunDirection;
			skyMaterial.uniforms.sunColor.value = new THREE.Color(sunData.color);
			skyMaterial.uniforms.sunIntensity.value = sunData.intensity;

			// Create independent target Object3D for the directional light
			lightTarget = new THREE.Object3D();
			lightTarget.name = 'directionalLightTarget';
			scene.add(lightTarget);

			// Add directional light
			directionalLight = new THREE.DirectionalLight(
				sunData.color,
				sunData.intensity * 0.8
			);

			// Set up shadow camera properties
			directionalLight.shadow.camera.near = 0.1;
			directionalLight.shadow.camera.far = 200;
			directionalLight.shadow.camera.left = -50;
			directionalLight.shadow.camera.right = 50;
			directionalLight.shadow.camera.top = 50;
			directionalLight.shadow.camera.bottom = -50;

			directionalLight.shadow.bias = -0.0005;

			// Apply shadow quality settings
			applyShadowQuality(renderer, directionalLight, currentShadowQuality);

			// Position light relative to target (will be updated in updateSkybox system)
			directionalLight.position.copy(sunDirection.multiplyScalar(100));
			directionalLight.target = lightTarget;

			scene.add(directionalLight);
		}

		// Configure clouds if present
		if (skyData.clouds) {
			skyMaterial.uniforms.cloudsColor.value = new THREE.Color(skyData.clouds.color);
			skyMaterial.uniforms.cloudsCoverage.value = skyData.clouds.coverage;
		}

		// Configure stars if present
		if (skyData.stars) {
			skyMaterial.uniforms.starsIntensity.value = skyData.stars.intensity;
		}

		// Add ambient light based on sky color
		const ambientLight = new THREE.AmbientLight(
			skyColor.clone().lerp(new THREE.Color(0xffffff), 0.5),
			1
		);
		scene.add(ambientLight);

		// Update renderer clear color to match sky
		renderer.setClearColor(skyColor);

		return { skybox, ambientLight, directionalLight, lightTarget };
	}

	// —— Hot-Load AI WorldScript ——
	let loadPromise: Promise<void> | null = null;
	async function loadWorld(code: string) {
		if (loadPromise) {
			console.warn('World script is already loading, please wait.');
			return loadPromise;
		}
		loadPromise = _loadWorld(code);
		try {
			await loadPromise;
		} finally {
			loadPromise = null;
		}
	}

	// —— Hot-Load AI WorldScript ——
	async function _loadWorld(code: string) {
		try {
			const metadata = getResource<WorldMetadata>(ctx, 'metadata');
			const baseDimension = metadata?.dimensions?.find(d => d.name === 'base');
			const gravity = baseDimension?.gravity ?? -9.81;
			bootstrapFreshWorld(gravity);

			// Dynamic import via Blob
			const blob = new Blob([code], { type: 'application/javascript' });
			const url = URL.createObjectURL(blob);
			const mod = await import(/* @vite-ignore */ url);
			URL.revokeObjectURL(url);

			const script: WorldScript = (mod.default ?? mod) as WorldScript;

			// Bind and call setupScene (world initialization)
			if (typeof script.setupScene === 'function') {
				script.setupScene.call(script, api);
			}

			// Execute run method (incremental changes)
			if (typeof script.run === 'function') {
				script.run.call(script, api);
			}

			configureDisplayModeCamera();

			// Bind and register tick
			if (typeof script.tick === 'function') {
				tickHandlers.push(script.tick.bind(script));
			}

			finalizeWorldLoad();
		} catch (err) {
			console.error('Failed to load world script:', err);
			throw new Error(`World script loading failed: ${err}`);
		}
	}

	// —— Load World from WorldDefinition (Direct) ——
	async function loadWorldFromDefinition(worldDefinition: WorldDefinition): Promise<void> {
		if (loadPromise) {
			console.warn('World script is already loading, please wait.');
			return loadPromise;
		}
		loadPromise = _loadWorldFromDefinition(worldDefinition);
		try {
			await loadPromise;
		} finally {
			loadPromise = null;
		}
	}

	async function _loadWorldFromDefinition(worldDefinition: WorldDefinition): Promise<void> {
		try {
			const baseDimension = worldDefinition.dimensions?.[0];
			const gravity = baseDimension?.gravity ?? -9.81;
			bootstrapFreshWorld(gravity);

			// NOW initialize world from definition (after all setup is complete)
			initialize(ctx, worldDefinition, {
				spawnEntities: true,
				merge: false
			});

			configureDisplayModeCamera();

			// Restore deferred entity references after all entities are spawned
			restoreDeferredEntityReferences(ctx);

			finalizeWorldLoad();
		} catch (err) {
			console.error('Failed to load world from definition:', err);
			throw new Error(`World definition loading failed: ${err}`);
		}
	}

	// —— Creative Mode Toggle ——
	function setCreativeMode(enabled: boolean) {
		const playerEids = playerQuery(ctx);
		if (playerEids.length === 0) {
			console.warn('No player entity found');
			return;
		}

		playerEids.sort((a, b) => a - b);
		const playerEid = playerEids[0];

		// Set creative mode and canFly properties on the runtime component
		if (hasComponent(ctx, _RuntimeCharacterControllerData, playerEid)) {
			_RuntimeCharacterControllerData.creativeMode[playerEid] = enabled ? 1 : 0;
			_RuntimeCharacterControllerData.canFly[playerEid] = enabled ? 1 : 0;

			// Enable/disable collider for noclip
			const colliderHandle = _RuntimeCharacterControllerData.colliderHandle[playerEid];
			const collider = ctx.rapier.world.getCollider(colliderHandle);
			if (collider) {
				collider.setEnabled(!enabled); // no physical collisions (ai awareness, collision triggers)
			}
		}

		console.log(`Creative mode ${enabled ? 'enabled' : 'disabled'}`);
	}

	triggerInput.on(TriggerInputKey.DEBUG, () => {
		// Cycle through debug states: None -> Perf -> Physics -> AI -> None
		switch (debugState) {
			case DebugState.NONE:
				debugState = DebugState.PERF;
				console.log('Debug mode: Performance (stats + transforms)');
				break;
			case DebugState.PERF:
				debugState = DebugState.PHYSICS;
				console.log('Debug mode: Physics (stats + transforms + colliders)');
				break;
			case DebugState.PHYSICS:
				debugState = DebugState.AI;
				console.log('Debug mode: AI (stats + transforms + navmesh + agents)');
				break;
			case DebugState.AI:
				debugState = DebugState.NONE;
				console.log('Debug mode: None (disabled)');
				// Clean up all debug visualizations when disabling
				cleanupDebugRapierMesh();
				cleanupDebugTransformMesh();
				cleanupDebugNavMesh();
				cleanupDebugCrowdMesh();
				cleanupDebugAITargetMesh();
				break;
		}
	});

	triggerInput.on(TriggerInputKey.HUD, () => {
		hudShown = !hudShown;
		console.log(`HUD ${hudShown ? 'shown' : 'hidden'}`);
	});

	triggerInput.on(TriggerInputKey.CREATIVE, () => {
		// Toggle creative mode per player instance
		const playerEids = playerQuery(ctx);
		if (playerEids.length === 0) return;
		playerEids.sort((a, b) => a - b);
		const playerEid = playerEids[0];

		if (hasComponent(ctx, _RuntimeCharacterControllerData, playerEid)) {
			const currentMode = _RuntimeCharacterControllerData.creativeMode[playerEid] === 1;
			setCreativeMode(!currentMode);
		}
	});

	triggerInput.on(TriggerInputKey.DROP_ITEM, () => {
		dropSelected(ctx, api.getPlayerEid());
	});

	// —— Cleanup ——
	async function dispose() {
		console.log('Cleaning up engine...');
		if (loadPromise) {
			await loadPromise; // Ensure any ongoing load completes
		}
		loadPromise = null;

                window.removeEventListener('resize', resizeUIRoot);
                canvas.removeEventListener('click', handleClick);
                running = false;
                cancelAnimationFrame(frameId);
                renderer.setAnimationLoop(null as any);
                await exitXR();
                
                // Terminate NavMesh worker
                if (navMeshWorker) {
                	console.log('[DISPOSE] Terminating NavMesh worker');
                	navMeshWorker.terminate();
                	navMeshWorker = null;
                }
                
                physicsWorld?.free();
                clearECS(ctx);
                
                // Dispose scene recursively to free GPU resources
                disposeSceneRecursively(scene);
                
		renderer.dispose();
		postprocessingManager.dispose();
		cleanupDebugRapierMesh();
		cleanupDebugTransformMesh();
		cleanupDebugNavMesh();
		// Unmount React root if present
		if (reactRoot) {
			reactRoot.unmount();
		}
		// Remove UI root from DOM
		if (uiRoot.parentElement) {
			uiRoot.parentElement.removeChild(uiRoot);
		}
		uiRoot?.remove();
		stats.dom.remove(); //TODO: this doesnt work
		// (You can also remove the event listeners here if you like.)
	}

	function getPlayerInventory(): Inventory | undefined {
		const eids = playerQuery(ctx);
		if (eids.length === 0) return undefined;
		eids.sort((a, b) => a - b);
		const pid = eids[0];
		const invs = getStore<InventoryStore>(ctx, 'inventory');
		return invs.get(pid);
	}

	// Create full API with loadWorld, loadWorldFromDefinition, and dispose
	const fullAPI = {
		...api,
		loadWorld,
		loadWorldFromDefinition,
		dispose,
	} as EngineAPI & { loadWorld: typeof loadWorld; loadWorldFromDefinition: typeof loadWorldFromDefinition; dispose: typeof dispose };
	
	// Update the api reference used by UI to include loadWorld and loadWorldFromDefinition
	Object.assign(api, { loadWorld, loadWorldFromDefinition, dispose });
	
	return fullAPI;
}
