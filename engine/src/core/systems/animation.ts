import { defineQuery, enterQuery, exitQuery, hasComponent } from "bitecs";
import * as THREE from "three";
import { ECSContext, getModule, getResource, setResource } from "../ecs";
import { Transform } from "../components/Transform";
import { Body } from "../components/Body";
import { Animation } from "../components/Animation";
import { MotionSource } from "../components/MotionSource";
import { _InputState, parseInputState } from "../components/_InputState";
import { AnimationModule } from "../../modules/animation";
import { motionSourceModule } from "../../modules/motionSource";
import { _RuntimeCharacterControllerData } from "../components/_RuntimeCharacterControllerData";
import { prepareAnimatedColliderBindings, syncAnimatedColliders } from "./animatedColliderSync";

// Track active clips and actions for each entity
interface EntityAnimationState {
  mixer: THREE.AnimationMixer;
  clips: Map<string, THREE.AnimationClip>;
  actions: Map<string, THREE.AnimationAction>;
  currentClipName?: string;
  triggeredActions: Map<string, THREE.AnimationAction>; // Track currently playing triggered animations
}

const animationQuery = defineQuery([Body, Animation, Transform]);
const animationQueryNew = enterQuery(animationQuery);
const animationQueryExit = exitQuery(animationQuery);

function determineActiveClip(ctx: ECSContext, eid: number): string {
  // Check if entity has character controller motion source
  if (hasComponent(ctx, MotionSource, eid)) {
    const motionSourceDef = getModule<ReturnType<typeof motionSourceModule>>(ctx, 'motionSource').get(MotionSource.motionSourceId[eid]);
    
    if (motionSourceDef.controller?.type === "character") {
      // Check if entity has input state (i.e., is being controlled)
      if (hasComponent(ctx, _InputState, eid)) {
        const input = parseInputState(ctx, eid);
        const isMoving = Math.abs(input.moveX) > 0.01 || Math.abs(input.moveZ) > 0.01;
        
        if (isMoving) {
          return "move";
        }
        
        // Check if entity is in the air (not grounded) and can't fly
        const isGrounded = MotionSource.isGrounded[eid] === 1;
        const canFly = hasComponent(ctx, _RuntimeCharacterControllerData, eid) &&
                      _RuntimeCharacterControllerData.canFly[eid] === 1;
        
        if (!isGrounded && !canFly) {
          return "air";
        }
      }
    }
  }
  
  return "default";
}

// Function to trigger a "use" animation for an entity
export function triggerUseAnimation(ctx: ECSContext, eid: number): void {
  const activeAnimations = getResource<Map<number, EntityAnimationState>>(ctx, 'activeAnimations');
  if (!activeAnimations) return;
  
  const animationState = activeAnimations.get(eid);
  if (!animationState || !animationState.clips.has("use")) return;
  
  // Stop any existing "use" animation
  const existingUseAction = animationState.triggeredActions.get("use");
  if (existingUseAction) {
    existingUseAction.stop();
  }
  
  // Create and start new "use" animation
  const useClip = animationState.clips.get("use")!;
  const useAction = animationState.mixer.clipAction(useClip);
  useAction.setLoop(THREE.LoopOnce, 1); // Play once
  useAction.clampWhenFinished = true; // Keep final pose
  useAction.reset(); // Reset to start
  useAction.play();
  
  // Track the triggered action
  animationState.triggeredActions.set("use", useAction);
}

export const animationSystem = (ctx: ECSContext): void => {
  const renderObjects = getResource<Map<number, THREE.Object3D>>(ctx, 'renderObjects')!;
  const animationModule = getModule<AnimationModule>(ctx, 'animation');
  const dt = getResource<number>(ctx, 'deltaTime') || 1 / 60;
  
  // Track active animation states for cleanup
  let activeAnimations = getResource<Map<number, EntityAnimationState>>(ctx, 'activeAnimations');
  if (!activeAnimations) {
    activeAnimations = new Map();
    setResource(ctx, 'activeAnimations', activeAnimations);
  }

  // Process new entities with animation
  for (const eid of animationQueryNew(ctx)) {
    const renderObject = renderObjects.get(eid);
    const animationDef = animationModule.get(Animation.animationId[eid]);
    
    if (renderObject && animationDef) {
      // Create one mixer for the root object
      const mixer = new THREE.AnimationMixer(renderObject);
      
      // Create clips and actions maps
      const clips = new Map<string, THREE.AnimationClip>();
      const actions = new Map<string, THREE.AnimationAction>();
      
      // For each animation clip, create an action but don't play it yet
      for (const clip of animationDef.clips) {
        clips.set(clip.name, clip);
        const action = mixer.clipAction(clip);
        if (clip.name === "use") {
          // "Use" animations should be set up differently but not added to main actions
          // They will be created on-demand when triggered
        } else {
          action.setLoop(THREE.LoopRepeat, Infinity);
          actions.set(clip.name, action);
        }
      }
      
      const animationState: EntityAnimationState = {
        mixer,
        clips,
        actions,
        currentClipName: undefined,
        triggeredActions: new Map()
      };
      
      activeAnimations.set(eid, animationState);
    }
  }

  // Update all active animations and determine which clip should be playing
  for (const [eid, animationState] of activeAnimations) {
    const desiredClipName = determineActiveClip(ctx, eid);
    
    // Check if we need to change the active clip
    if (animationState.currentClipName !== desiredClipName) {
      // Stop current clip if any
      if (animationState.currentClipName && animationState.actions.has(animationState.currentClipName)) {
        const currentAction = animationState.actions.get(animationState.currentClipName)!;
        currentAction.stop();
      }
      
      // Start new clip if it exists
      if (animationState.actions.has(desiredClipName)) {
        const newAction = animationState.actions.get(desiredClipName)!;
        newAction.play();
        animationState.currentClipName = desiredClipName;
      } else {
        // Fallback: try to play "default" if the desired clip doesn't exist
        if (desiredClipName !== "default" && animationState.actions.has("default")) {
          const defaultAction = animationState.actions.get("default")!;
          defaultAction.play();
          animationState.currentClipName = "default";
        } else {
          animationState.currentClipName = undefined;
        }
      }
    }
    
    // Clean up finished triggered animations
    for (const [actionName, action] of animationState.triggeredActions) {
      if (!action.isRunning()) {
        animationState.triggeredActions.delete(actionName);
      }
    }
    
    prepareAnimatedColliderBindings(ctx, eid);

    // Update the mixer
    animationState.mixer.update(dt);
    syncAnimatedColliders(ctx, eid);
  }

  // Clean up removed entities
  for (const eid of animationQueryExit(ctx)) {
    const animationState = activeAnimations.get(eid);
    if (animationState) {
      animationState.mixer.stopAllAction();
      activeAnimations.delete(eid);
    }
  }
};
