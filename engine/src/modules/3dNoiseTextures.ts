import { Data3DTexture, RedFormat, UnsignedByteType, LinearFilter, RepeatWrapping } from 'three';
import { Module } from "./Module";
import { ECSContext } from "../core/ecs";
import { generateSeamless3DNoise } from "../utils/generateSeamless3DNoise";

export type NoiseTextureDefinition = {
  type: "perlin3d";
  params: {
    size: number;
    frequency: number;
    seed: number;
  };
};

export class NoiseTextureModule extends Module<NoiseTextureDefinition, Data3DTexture> {
  constructor(ctx: ECSContext, factories: Record<string, (params: any) => Data3DTexture>) {
    super(ctx, factories);
  }
}

export const noiseTextureModule = (ctx: ECSContext) => new NoiseTextureModule(ctx, {
  perlin3d: (params: { size: number; frequency: number; seed: number }) => {
    const size = params.size;
    const frequency = params.frequency;
    const seed = params.seed;
    
    const data = generateSeamless3DNoise(size, frequency, seed);
    const tex = new Data3DTexture(data, size, size, size);
    tex.format = RedFormat;
    tex.type = UnsignedByteType;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.wrapS = tex.wrapT = tex.wrapR = RepeatWrapping;
    tex.needsUpdate = true;
    
    return tex;
  }
});
