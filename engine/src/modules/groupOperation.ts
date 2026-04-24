import { Module } from "./Module";
import { ECSContext } from "../core/ecs";
import { GroupNode, GroupOperation } from "../core/schema";

export type CsgGroupOperation = Extract<GroupOperation, { type: "union" | "subtract" | "intersect" | "exclude" }>;
export type MeshGroupOperation = Extract<GroupOperation, { type: "taper" | "mirror" }>;
export type PlacementGroupOperation = Extract<GroupOperation, { type: "place" }>;

type GroupOperationDefinition = {
  type: GroupOperation["type"];
  params: Record<string, any>;
};

export class GroupOperationModule extends Module<GroupOperationDefinition, GroupOperation> {
  constructor(ctx: ECSContext) {
    super(ctx, {
      none: (): GroupOperation => ({ type: "none", params: {} }),
      union: (): GroupOperation => ({ type: "union", params: {} }),
      subtract: (): GroupOperation => ({ type: "subtract", params: {} }),
      intersect: (): GroupOperation => ({ type: "intersect", params: {} }),
      exclude: (): GroupOperation => ({ type: "exclude", params: {} }),
      taper: (params: any): GroupOperation => ({
        type: "taper",
        params: {
          axis: params?.axis ?? "y",
          factor: Number.isFinite(params?.factor) ? params.factor : 0,
        },
      }),
      mirror: (params: any): GroupOperation => ({
        type: "mirror",
        params: {
          axis: params?.axis ?? "x",
          planeOffset: Number.isFinite(params?.planeOffset) ? params.planeOffset : 0,
          sourceSide: params?.sourceSide ?? "both",
        },
      }),
      place: (params: any): GroupOperation => ({
        type: "place",
        params: {
          placement: {
            type: params?.placement?.type ?? "points",
            params: params?.placement?.params ?? { positions: [] },
          },
          orientation:
            params?.orientation === 'tangent' ||
            params?.orientation === 'radial' ||
            params?.orientation === 'fixed'
              ? params.orientation
              : 'none',
          ...(Number.isFinite(params?.fixedYaw) ? { fixedYaw: params.fixedYaw } : {}),
          ...(Number.isFinite(params?.seed) ? { seed: params.seed } : {}),
        },
      }),
    });
  }

  resolveOperation(operation: GroupNode["operation"] | undefined): GroupOperation {
    const definition = this.toDefinition(operation);
    const id = this.resolve(definition);
    return this.get(id);
  }

  private toDefinition(operation: GroupNode["operation"] | undefined): GroupOperationDefinition {
    if (!operation) return { type: "none", params: {} };
    return {
      type: operation.type,
      params: operation.params ?? {},
    };
  }

  isCsgOperation(operation: GroupOperation): operation is CsgGroupOperation {
    return operation.type === "union" || operation.type === "subtract" || operation.type === "intersect" || operation.type === "exclude";
  }

  isMeshOperation(operation: GroupOperation): operation is MeshGroupOperation {
    return operation.type === "taper" || operation.type === "mirror";
  }

  isPlacementOperation(operation: GroupOperation): operation is PlacementGroupOperation {
    return operation.type === "place";
  }
}

export const groupOperationModule = (ctx: ECSContext) => new GroupOperationModule(ctx);
