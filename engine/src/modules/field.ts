import { createNoise3D } from "simplex-noise";
import alea from "alea";
import { Module } from "./Module";
import { ECSContext } from "../core/ecs";

export type FieldDefinition =
  | {
      type: "simplex";
      params: {
        amplitude?: number;
        frequency?: number;
        octaves?: number;
        seed?: number;
      };
    }
  | {
      type: "composite";
      params: {
        blend?: "add" | "multiply" | "max" | "min";
        fields: FieldDefinition[];
      };
    };

export interface FieldResolved {
  sample3D: (x: number, y: number, z: number) => number;
}

export const fieldModule = (ctx: ECSContext) => {
  const module = new Module<FieldDefinition, FieldResolved>(
    ctx,
    {} as Record<string, (params: any) => FieldResolved>
  );

  module.registerType("simplex", (params: any) => {
    const amplitude = params?.amplitude ?? 1;
    const frequency = params?.frequency ?? 1;
    const octaves = params?.octaves ?? 1;
    const seed = params?.seed ?? 0;
    const gen = createNoise3D(alea(String(seed)));
    return {
      sample3D(x: number, y: number, z: number) {
        let n = 0,
          amp = 1,
          freq = frequency;
        for (let o = 0; o < octaves; o++) {
          n += gen(x * freq, y * freq, z * freq) * amp;
          amp *= 0.5;
          freq *= 2;
        }
        return n * amplitude;
      },
    };
  });

  module.registerType("composite", (params: any) => {
    const blend: "add" | "multiply" | "max" | "min" = params?.blend ?? "add";
    const fieldDefs: FieldDefinition[] = params?.fields ?? [];

    const resolved = fieldDefs.map((def) => module.get(module.resolve(def)));

    return {
      sample3D(x: number, y: number, z: number) {
        if (resolved.length === 0) {
          return 0;
        }

        switch (blend) {
          case "multiply": {
            let product = 1;
            for (const field of resolved) {
              product *= field.sample3D(x, y, z);
            }
            return product;
          }
          case "max": {
            let maxValue = -Infinity;
            for (const field of resolved) {
              const value = field.sample3D(x, y, z);
              if (value > maxValue) {
                maxValue = value;
              }
            }
            return maxValue;
          }
          case "min": {
            let minValue = Infinity;
            for (const field of resolved) {
              const value = field.sample3D(x, y, z);
              if (value < minValue) {
                minValue = value;
              }
            }
            return minValue;
          }
          case "add":
          default: {
            let sum = 0;
            for (const field of resolved) {
              sum += field.sample3D(x, y, z);
            }
            return sum;
          }
        }
      },
    };
  });

  return module;
};
