import * as THREE from "three";
import { Module } from "./Module";
import { ECSContext } from "../core/ecs";
import { Animation as AnimationSchema, AnimationClip, AnimationTrack, AnimationKeyframe, Vector3 } from "../core/schema";

// Module definition schema (params is required for module pattern)
type AnimationModuleSchema = {
  type: "animator" | "clips";
  params: AnimationSchema | any;
};

export interface AnimationResolved {
  clips: THREE.AnimationClip[];
}

export class AnimationModule extends Module<AnimationModuleSchema, AnimationResolved> {
  constructor(ctx: ECSContext) {
    super(ctx, {
      animator: (params: AnimationSchema) => {
        return this.processAnimation(params);
      },
      clips: (params: AnimationSchema) => {
        return this.processAnimation(params);
      }
    });
  }

  // Override resolve to handle Animation schema directly
  resolve(defOrName: string | AnimationModuleSchema | AnimationSchema): number {
    // Check if this is a direct Animation schema (has clips but no type)
    if (typeof defOrName === 'object' && 'clips' in defOrName && !('type' in defOrName)) {
      // Convert Animation schema to AnimationModuleSchema format
      const wrappedDef: AnimationModuleSchema = {
        type: "clips",
        params: defOrName
      };
      return super.resolve(wrappedDef);
    }
    
    // Otherwise use the standard module pattern
    return super.resolve(defOrName as any);
  }

  private processAnimation(animationSchema: AnimationSchema): AnimationResolved {
    const clips: THREE.AnimationClip[] = [];

    // Convert each animation clip from schema to THREE.js format
    for (const clip of animationSchema.clips) {
      const threeClip = this.convertClipToThree(clip);

      // makes changes wrt local position and rotation
      // this kind of fucks up scale
      threeClip.blendMode = THREE.AdditiveAnimationBlendMode;

      clips.push(threeClip);
    }

    return { clips };
  }

  private convertClipToThree(clip: AnimationClip): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = [];

    for (const track of clip.tracks) {
      const trackTracks = this.convertTrackToThree(track, clip.name);
      tracks.push(...trackTracks);
    }

    return new THREE.AnimationClip(clip.name, clip.duration, tracks);
  }

  private convertTrackToThree(track: AnimationTrack, clipName: string): THREE.KeyframeTrack[] {
    const tracks: THREE.KeyframeTrack[] = [];

    // Sort keyframes by time
    const sortedKeyframes = [...track.keyframes].sort((a, b) => a.time - b.time);

    // Extract times
    const times = sortedKeyframes.map(kf => kf.time);

    // Create position track if any keyframe has position
    const hasPosition = sortedKeyframes.some(kf => kf.position !== undefined);
    if (hasPosition) {
      const positions: number[] = [];
      for (const kf of sortedKeyframes) {
        const pos = this.convertVector3ToArray(kf.position || { x: 0, y: 0, z: 0 });
        positions.push(...pos);
      }
      tracks.push(new THREE.VectorKeyframeTrack(
        `${track.targetTag}.position`,
        times,
        positions
      ));
    }

    const hasRotation = sortedKeyframes.some(kf => kf.rotation !== undefined);
    if (hasRotation) {
      const quaternions: number[] = [];
      for (const kf of sortedKeyframes) {
        const euler = new THREE.Euler(
          kf.rotation?.[0] || 0,
          kf.rotation?.[1] || 0,
          kf.rotation?.[2] || 0,
          "XYZ" // force valid order
        );
        const quat = new THREE.Quaternion().setFromEuler(euler);
        quaternions.push(quat.x, quat.y, quat.z, quat.w);
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(
        `${track.targetTag}.quaternion`,
        times,
        quaternions
      ));
    }

    // Create scale track if any keyframe has scale
    const hasScale = sortedKeyframes.some(kf => kf.scale !== undefined);
    if (hasScale) {
      const scales: number[] = [];
      for (const kf of sortedKeyframes) {
        const scale = this.convertVector3ToArray(kf.scale || { x: 1, y: 1, z: 1 });
        scales.push(...scale);
      }
      tracks.push(new THREE.VectorKeyframeTrack(
        `${track.targetTag}.scale`,
        times,
        scales
      ));
    }

    return tracks;
  }

  private convertVector3ToArray(vec: Vector3): number[] {
    if (Array.isArray(vec)) {
      return vec;
    }
    return [vec.x, vec.y, vec.z];
  }
}

export const animationModule = (ctx: ECSContext) => new AnimationModule(ctx);