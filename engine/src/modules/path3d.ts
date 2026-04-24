import { Module } from "./Module";
import { ECSContext } from "../core/ecs";
import { Path3D, PathPoint3D } from "../core/schema";

export interface Path3DResolved {
  points: PathPoint3D[];
  closed: boolean;
}

export class Path3DModule extends Module<Path3D, Path3DResolved> {
  constructor(ctx: ECSContext) {
    super(ctx, {
      polyline: (params: any): Path3DResolved => ({
        points: params?.points ?? [],
        closed: params?.closed === true,
      }),
      line: (params: any): Path3DResolved => {
        const start = params?.start ?? { x: 0, y: 0, z: 0 };
        const end = params?.end ?? { x: 1, y: 0, z: 0 };
        const segments = Math.max(1, Math.floor(params?.segments ?? 1));
        const points: PathPoint3D[] = [];

        for (let index = 0; index <= segments; index++) {
          const t = index / segments;
          points.push({
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t,
            z: start.z + (end.z - start.z) * t,
          });
        }

        return { points, closed: false };
      },
      circle: (params: any): Path3DResolved => {
        const center = params?.center ?? { x: 0, y: 0, z: 0 };
        const radius = Math.max(0, params?.radius ?? 0);
        const segments = Math.max(3, Math.floor(params?.segments ?? 24));
        const points: PathPoint3D[] = [];

        for (let index = 0; index < segments; index++) {
          const t = index / segments;
          const angle = t * Math.PI * 2;
          points.push({
            x: center.x + Math.cos(angle) * radius,
            y: center.y,
            z: center.z + Math.sin(angle) * radius,
          });
        }

        return { points, closed: true };
      },
      rectangle: (params: any): Path3DResolved => {
        const center = params?.center ?? { x: 0, y: 0, z: 0 };
        const width = Math.max(0, params?.width ?? 0);
        const depth = Math.max(0, params?.depth ?? 0);
        const halfWidth = width / 2;
        const halfDepth = depth / 2;

        return {
          points: [
            { x: center.x - halfWidth, y: center.y, z: center.z - halfDepth },
            { x: center.x + halfWidth, y: center.y, z: center.z - halfDepth },
            { x: center.x + halfWidth, y: center.y, z: center.z + halfDepth },
            { x: center.x - halfWidth, y: center.y, z: center.z + halfDepth },
          ],
          closed: params?.closed !== false,
        };
      },
    });
  }

  resolvePath(path: Path3D): Path3DResolved {
    const id = this.resolve(path);
    return this.get(id);
  }
}

export const path3dModule = (ctx: ECSContext) => new Path3DModule(ctx);
