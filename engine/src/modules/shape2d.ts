import { Module } from "./Module";
import { ECSContext } from "../core/ecs";
import { Shape2D, ShapePoint2D } from "../core/schema";

export interface Shape2DResolved {
  points: ShapePoint2D[];
  closed: boolean;
}

export class Shape2DModule extends Module<Shape2D, Shape2DResolved> {
  constructor(ctx: ECSContext) {
    super(ctx, {
      polyline: (params: any): Shape2DResolved => {
        const points = params?.points ?? [];
        return {
          points,
          closed: params?.closed === true,
        };
      },
      polygon: (params: any): Shape2DResolved => {
        const points = params?.points ?? [];
        return {
          points,
          closed: true,
        };
      },
      circle: (params: any): Shape2DResolved => {
        const radius = Math.max(0, params?.radius ?? 0);
        const center = params?.center ?? { u: 0, v: 0 };
        const segments = Math.max(3, Math.floor(params?.segments ?? 24));
        const points: ShapePoint2D[] = [];

        for (let index = 0; index < segments; index++) {
          const t = index / segments;
          const angle = t * Math.PI * 2;
          points.push({
            u: center.u + Math.cos(angle) * radius,
            v: center.v + Math.sin(angle) * radius,
          });
        }

        return { points, closed: true };
      },
      rectangle: (params: any): Shape2DResolved => {
        const width = Math.max(0, params?.width ?? 0);
        const height = Math.max(0, params?.height ?? 0);
        const center = params?.center ?? { u: 0, v: 0 };
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        return {
          points: [
            { u: center.u - halfWidth, v: center.v - halfHeight },
            { u: center.u + halfWidth, v: center.v - halfHeight },
            { u: center.u + halfWidth, v: center.v + halfHeight },
            { u: center.u - halfWidth, v: center.v + halfHeight },
          ],
          closed: true,
        };
      },
    });
  }

  resolveShape(shape: Shape2D): Shape2DResolved {
    const id = this.resolve(shape);
    return this.get(id);
  }
}

export const shape2dModule = (ctx: ECSContext) => new Shape2DModule(ctx);
