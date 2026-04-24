import { defineQuery, hasComponent } from "bitecs";
import * as Components from "../core/components";
import { ECSContext, getModule, getResource } from "../core/ecs";
import { Metrics, MetricsKey } from "../core/metrics";
import { Module } from "./Module";
import type { EntityStoreModule } from "./entityStore";
import type { FieldResolved } from "./field";

export const CONDITION_TYPE_OPTIONS = [
  "always",
  "compare",
  "reference",
  "not",
  "all",
  "any",
] as const;
export type ConditionType = typeof CONDITION_TYPE_OPTIONS[number];

export const VALUE_EXPRESSION_TYPE_OPTIONS = [
  "literal",
  "parameter",
  "metric",
  "store",
  "component",
  "query",
  "sum",
] as const;
export type ValueExpressionType = typeof VALUE_EXPRESSION_TYPE_OPTIONS[number];

export const CONDITION_COMPARE_OPERATOR_OPTIONS = ["eq", "neq", "gt", "gte", "lt", "lte"] as const;
export type ConditionCompareOperator = typeof CONDITION_COMPARE_OPERATOR_OPTIONS[number];

export type ConditionSubjectRef = MetricsKey | "self" | "other" | "user";

export type ConditionContext = {
  self?: MetricsKey;
  other?: MetricsKey;
  user?: MetricsKey;
};

export type ConditionEvaluationInput = {
  defaultSubject: MetricsKey;
  context?: ConditionContext;
  parameters?: Record<string, unknown>;
  queryContext?: Record<string, unknown>;
};

export type ValueExpression =
  | { type: "literal"; params: { value: unknown } }
  | { type: "parameter"; params: { name: string; defaultValue?: unknown } }
  | { type: "metric"; params: { metric: string; subtype?: string; subject?: ConditionSubjectRef; defaultValue?: number } }
  | { type: "store"; params: { store: string; path?: string; subject?: ConditionSubjectRef; defaultValue?: unknown } }
  | { type: "component"; params: { component: string; field?: string; subject?: ConditionSubjectRef; defaultValue?: unknown } }
  | { type: "query"; params: { query: string; params?: Record<string, ValueExpression | unknown>; defaultValue?: unknown } }
  | { type: "sum"; params: { values: ValueExpression[] } };

export type ConditionDefinition =
  | { type: "always"; params: Record<string, never> }
  | { type: "compare"; params: { operator: ConditionCompareOperator; left: ValueExpression; right: ValueExpression } }
  | { type: "reference"; params: { name: string; args?: Record<string, ValueExpression | unknown> } }
  | { type: "not"; params: { condition: ConditionDefinition } }
  | { type: "all"; params: { conditions: ConditionDefinition[] } }
  | { type: "any"; params: { conditions: ConditionDefinition[] } };

export type ConditionTraceReason =
  | "always_true"
  | "comparison_true"
  | "comparison_false"
  | "subject_unresolved"
  | "metric_missing"
  | "reference_resolved"
  | "reference_missing"
  | "reference_depth_exceeded"
  | "all_true"
  | "all_false"
  | "any_true"
  | "any_false"
  | "not_true"
  | "not_false";

export type ConditionTraceNode = {
  type: string;
  passed: boolean;
  reason: ConditionTraceReason;
  details?: Record<string, unknown>;
  children?: ConditionTraceNode[];
};

export type ConditionTraceSource = {
  system: "rule" | "trigger" | "achievement" | "spawner" | "manual";
  name?: string;
  owner?: MetricsKey;
  trigger?: string;
};

export type ConditionEvaluationTrace = {
  timestamp: number;
  source?: ConditionTraceSource;
  input: ConditionEvaluationInput;
  passed: boolean;
  node: ConditionTraceNode;
};

export type ConditionTraceCallback = (trace: ConditionEvaluationTrace) => void;

export type ConditionEvaluationOptions = {
  source?: ConditionTraceSource;
  emitTrace?: boolean;
  maxReferenceDepth?: number;
};

export type ConditionEvaluator = (input: ConditionEvaluationInput) => boolean;
export type ConditionQueryResolver = (
  params: Record<string, unknown>,
  input: ConditionEvaluationInput,
  ctx: ECSContext,
) => unknown;

type InternalConditionEvaluator = (
  input: ConditionEvaluationInput,
  state: ConditionEvaluatorState,
) => ConditionTraceNode;

type ConditionEvaluatorState = {
  depth: number;
  maxDepth: number;
};

type ValueEvaluator = (input: ConditionEvaluationInput, state: ConditionEvaluatorState) => unknown;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function deepGet(value: unknown, path: string | undefined): unknown {
  if (!path) return value;
  const keys = path.split(".").map((entry) => entry.trim()).filter(Boolean);
  let current: unknown = value;
  for (const key of keys) {
    if (!isObject(current)) return undefined;
    current = current[key];
  }
  return current;
}

function cloneInput(input: ConditionEvaluationInput): ConditionEvaluationInput {
  return {
    defaultSubject: input.defaultSubject,
    context: input.context ? { ...input.context } : undefined,
    parameters: input.parameters ? { ...input.parameters } : undefined,
    queryContext: input.queryContext ? { ...input.queryContext } : undefined,
  };
}

export function resolveConditionSubject(
  ref: ConditionSubjectRef | undefined,
  input: ConditionEvaluationInput,
): MetricsKey | undefined {
  if (ref === undefined || ref === "self") {
    return input.context?.self ?? input.defaultSubject;
  }
  if (ref === "other") {
    return input.context?.other;
  }
  if (ref === "user") {
    return input.context?.user;
  }
  return ref;
}

function resolveEntitySubject(
  ref: ConditionSubjectRef | undefined,
  input: ConditionEvaluationInput,
): number | undefined {
  const resolved = resolveConditionSubject(ref, input);
  if (typeof resolved === "number" && Number.isFinite(resolved)) return resolved;
  if (typeof resolved === "string") {
    const numeric = Number(resolved);
    if (Number.isFinite(numeric)) return numeric;
  }
  return undefined;
}

function resolveMetricValue(
  ctx: ECSContext,
  input: ConditionEvaluationInput,
  metric: string,
  subtype: string | undefined,
  subject?: ConditionSubjectRef,
  fallback = 0,
): { value: number; subject?: MetricsKey; hasSubject: boolean; hasMetrics: boolean } {
  const resolvedSubject = resolveConditionSubject(subject, input);
  if (resolvedSubject === undefined) {
    return { value: fallback, hasSubject: false, hasMetrics: true };
  }

  const metrics = getResource<Metrics>(ctx, "metrics", true);
  if (!metrics) {
    return { value: fallback, hasSubject: true, hasMetrics: false, subject: resolvedSubject };
  }

  const value = subtype
    ? metrics.get(resolvedSubject, metric, subtype)
    : metrics.get(resolvedSubject, metric);
  return {
    value: asNumber(value, fallback),
    hasSubject: true,
    hasMetrics: true,
    subject: resolvedSubject,
  };
}

function compareValues(
  operator: ConditionCompareOperator,
  left: unknown,
  right: unknown,
): boolean {
  if (operator === "eq") return left === right;
  if (operator === "neq") return left !== right;

  const leftNumber = asNumber(left, Number.NaN);
  const rightNumber = asNumber(right, Number.NaN);
  if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) return false;

  if (operator === "gt") return leftNumber > rightNumber;
  if (operator === "gte") return leftNumber >= rightNumber;
  if (operator === "lt") return leftNumber < rightNumber;
  if (operator === "lte") return leftNumber <= rightNumber;
  return false;
}

function isValueExpression(value: unknown): value is ValueExpression {
  return isObject(value) && typeof value.type === "string" && isObject(value.params);
}

function normalizeValueExpression(value: unknown): ValueExpression {
  if (!isObject(value) || typeof value.type !== "string" || !isObject(value.params)) {
    return { type: "literal", params: { value } };
  }

  const params = value.params;

  if (value.type === "literal") {
    return { type: "literal", params: { value: params.value } };
  }

  if (value.type === "parameter") {
    return {
      type: "parameter",
      params: {
        name: typeof params.name === "string" && params.name.trim().length > 0 ? params.name : "param",
        defaultValue: params.defaultValue,
      },
    };
  }

  if (value.type === "metric") {
    return {
      type: "metric",
      params: {
        metric: typeof params.metric === "string" && params.metric.trim().length > 0 ? params.metric : "metric",
        subtype: typeof params.subtype === "string" ? params.subtype : undefined,
        subject: params.subject as ConditionSubjectRef | undefined,
        defaultValue: typeof params.defaultValue === "number" ? params.defaultValue : undefined,
      },
    };
  }

  if (value.type === "store") {
    return {
      type: "store",
      params: {
        store: typeof params.store === "string" && params.store.trim().length > 0 ? params.store : "store",
        path: typeof params.path === "string" && params.path.trim().length > 0 ? params.path : undefined,
        subject: params.subject as ConditionSubjectRef | undefined,
        defaultValue: params.defaultValue,
      },
    };
  }

  if (value.type === "component") {
    return {
      type: "component",
      params: {
        component: typeof params.component === "string" && params.component.trim().length > 0
          ? params.component
          : "Transform",
        field: typeof params.field === "string" && params.field.trim().length > 0 ? params.field : undefined,
        subject: params.subject as ConditionSubjectRef | undefined,
        defaultValue: params.defaultValue,
      },
    };
  }

  if (value.type === "query") {
    const queryParams: Record<string, ValueExpression | unknown> = {};
    if (isObject(params.params)) {
      for (const [key, entry] of Object.entries(params.params)) {
        queryParams[key] = isValueExpression(entry)
          ? normalizeValueExpression(entry)
          : entry;
      }
    }
    return {
      type: "query",
      params: {
        query: typeof params.query === "string" && params.query.trim().length > 0 ? params.query : "query",
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        defaultValue: params.defaultValue,
      },
    };
  }

  if (value.type === "sum") {
    const values = Array.isArray(params.values)
      ? params.values.map((entry) => normalizeValueExpression(entry))
      : [];
    return {
      type: "sum",
      params: { values },
    };
  }

  return { type: "literal", params: { value: params.value } };
}

function metricExpression(
  metric: string,
  subtype: string | undefined,
  subject: ConditionSubjectRef | undefined,
): ValueExpression {
  return {
    type: "metric",
    params: {
      metric,
      subtype,
      subject,
      defaultValue: 0,
    },
  };
}

export function normalizeConditionDefinition(definition: unknown): ConditionDefinition {
  if (!isObject(definition) || typeof definition.type !== "string") {
    return { type: "always", params: {} };
  }

  const params = isObject(definition.params) ? definition.params : {};

  if (definition.type === "always") {
    return { type: "always", params: {} };
  }

  if (definition.type === "compare") {
    const operator = typeof params.operator === "string" &&
      (CONDITION_COMPARE_OPERATOR_OPTIONS as readonly string[]).includes(params.operator)
      ? (params.operator as ConditionCompareOperator)
      : "eq";
    return {
      type: "compare",
      params: {
        operator,
        left: normalizeValueExpression(params.left),
        right: normalizeValueExpression(params.right),
      },
    };
  }

  if (definition.type === "reference") {
    const args: Record<string, ValueExpression | unknown> = {};
    if (isObject(params.args)) {
      for (const [key, value] of Object.entries(params.args)) {
        args[key] = isValueExpression(value) ? normalizeValueExpression(value) : value;
      }
    }
    return {
      type: "reference",
      params: {
        name: typeof params.name === "string" && params.name.trim().length > 0 ? params.name : "condition_name",
        args: Object.keys(args).length > 0 ? args : undefined,
      },
    };
  }

  if (definition.type === "not") {
    return {
      type: "not",
      params: {
        condition: normalizeConditionDefinition(params.condition),
      },
    };
  }

  if (definition.type === "all" || definition.type === "any") {
    const conditions = Array.isArray(params.conditions)
      ? params.conditions.map((entry) => normalizeConditionDefinition(entry))
      : [];
    return {
      type: definition.type,
      params: { conditions },
    };
  }

  if (definition.type === "greaterThanOrEqual" || definition.type === "equals") {
    const metric = typeof params.metric === "string" && params.metric.trim().length > 0
      ? params.metric
      : "metric";
    const subtype = typeof params.subtype === "string" && params.subtype.trim().length > 0
      ? params.subtype
      : undefined;
    const subject = params.subject as ConditionSubjectRef | undefined;
    return {
      type: "compare",
      params: {
        operator: definition.type === "greaterThanOrEqual" ? "gte" : "eq",
        left: metricExpression(metric, subtype, subject),
        right: { type: "literal", params: { value: asNumber(params.targetValue, 0) } },
      },
    };
  }

  if (definition.type === "sum") {
    const metrics = Array.isArray(params.metrics) ? params.metrics : [];
    const subject = params.subject as ConditionSubjectRef | undefined;
    const values = metrics.map((entry) => {
      const metric = isObject(entry) && typeof entry.metric === "string" && entry.metric.trim().length > 0
        ? entry.metric
        : "metric";
      const subtype = isObject(entry) && typeof entry.subtype === "string" && entry.subtype.trim().length > 0
        ? entry.subtype
        : undefined;
      return metricExpression(metric, subtype, subject);
    });

    return {
      type: "compare",
      params: {
        operator: "gte",
        left: { type: "sum", params: { values } },
        right: { type: "literal", params: { value: asNumber(params.targetValue, 0) } },
      },
    };
  }

  return { type: "always", params: {} };
}

function hasResourceMap(ctx: ECSContext): boolean {
  return Boolean((ctx as any)?.resources && typeof (ctx as any).resources.get === "function");
}

function shouldEmitTrace(ctx: ECSContext): boolean {
  if (!hasResourceMap(ctx)) return false;
  const enabled = getResource<boolean>(ctx, "conditionTraceEnabled", true);
  if (enabled === true) return true;
  const callbacks = getResource<ConditionTraceCallback[]>(ctx, "conditionTraceCallbacks", true);
  if (Array.isArray(callbacks) && callbacks.length > 0) return true;
  const buffer = getResource<ConditionEvaluationTrace[]>(ctx, "conditionTraceBuffer", true);
  return Array.isArray(buffer);
}

function emitTrace(ctx: ECSContext, trace: ConditionEvaluationTrace): void {
  if (!hasResourceMap(ctx)) return;
  const callbacks = getResource<ConditionTraceCallback[]>(ctx, "conditionTraceCallbacks", true);
  if (Array.isArray(callbacks)) {
    for (const callback of callbacks) {
      try {
        callback(trace);
      } catch (error) {
        console.warn("[condition] Condition trace callback failed:", error);
      }
    }
  }
  const buffer = getResource<ConditionEvaluationTrace[]>(ctx, "conditionTraceBuffer", true);
  if (Array.isArray(buffer)) {
    buffer.push(trace);
  }
}

function getTraceTimestamp(ctx: ECSContext): number {
  const base = ctx.time?.getElapsed?.() ?? 0;
  if (!hasResourceMap(ctx)) return base;
  return base + (getResource<number>(ctx, "deltaTime", true) ?? 0);
}

function getQueryPosition(input: ConditionEvaluationInput): { x: number; y: number; z: number } | undefined {
  const position = input.queryContext?.position;
  if (!isObject(position)) return undefined;
  const x = asNumber(position.x, Number.NaN);
  const y = asNumber(position.y, Number.NaN);
  const z = asNumber(position.z, Number.NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return undefined;
  return { x, y, z };
}

export class ConditionModule extends Module<ConditionDefinition, InternalConditionEvaluator> {
  private readonly queryResolvers = new Map<string, ConditionQueryResolver>();

  constructor(ctx: ECSContext) {
    super(ctx, {} as Record<string, (params: any) => InternalConditionEvaluator>);
    this.registerBuiltInQueries();
    this.registerBuiltInConditionTypes();
  }

  override addDefinition(name: string, def: ConditionDefinition, isBuiltIn = false): void {
    super.addDefinition(name, normalizeConditionDefinition(def), isBuiltIn);
  }

  override resolve(defOrName: string | ConditionDefinition): number {
    const rawDef = typeof defOrName === "string"
      ? this.definitionsByName[defOrName]
      : defOrName;

    const def = normalizeConditionDefinition(rawDef);

    if (!def) {
      throw new Error(`Unknown condition definition '${defOrName}'`);
    }

    if (!this.getRegisteredTypes().includes(def.type)) {
      throw new Error(`Unknown condition type '${def.type}'`);
    }

    return super.resolve(def);
  }

  override register(name: string, def: ConditionDefinition): InternalConditionEvaluator;
  override register(name: string, baseName: string, overrides: Partial<ConditionDefinition>): InternalConditionEvaluator;
  override register(
    name: string,
    defOrBase: ConditionDefinition | string,
    overrides?: Partial<ConditionDefinition>,
  ): InternalConditionEvaluator {
    if (typeof defOrBase === "string") {
      const base = this.definitionsByName[defOrBase];
      if (!base) throw new Error(`Unknown definition '${defOrBase}'`);
      const mergedParams = overrides?.params
        ? { ...base.params, ...overrides.params }
        : base.params;
      const merged = { ...(base as any), ...(overrides ?? {}), params: mergedParams } as ConditionDefinition;
      return super.register(name, normalizeConditionDefinition(merged));
    }
    return super.register(name, normalizeConditionDefinition(defOrBase));
  }

  registerQuery(name: string, resolver: ConditionQueryResolver): void {
    this.queryResolvers.set(name, resolver);
  }

  getQuery(name: string): ConditionQueryResolver | undefined {
    return this.queryResolvers.get(name);
  }

  evaluate(definition: ConditionDefinition, input: ConditionEvaluationInput): boolean {
    return this.evaluateWithTrace(normalizeConditionDefinition(definition), input).passed;
  }

  evaluateWithTrace(
    definition: ConditionDefinition,
    input: ConditionEvaluationInput,
    options: Pick<ConditionEvaluationOptions, "maxReferenceDepth"> = {},
  ): { passed: boolean; node: ConditionTraceNode } {
    const normalized = normalizeConditionDefinition(definition);
    const evaluator = this.get(this.resolve(normalized));
    const maxDepth = options.maxReferenceDepth ?? 16;
    const node = evaluator(input, { depth: 0, maxDepth });
    return { passed: node.passed, node };
  }

  private registerBuiltInQueries(): void {
    this.registerQuery("positionAxis", (params, input) => {
      const axis = typeof params.axis === "string" ? params.axis : "y";
      const position = getQueryPosition(input);
      if (!position) return undefined;
      if (axis === "x" || axis === "y" || axis === "z") {
        return position[axis];
      }
      return undefined;
    });

    this.registerQuery("distanceFromPoint", (params, input) => {
      const position = getQueryPosition(input);
      const point = isObject(params.point) ? params.point : undefined;
      if (!position || !point) return undefined;

      const x = asNumber(point.x, Number.NaN);
      const y = asNumber(point.y, Number.NaN);
      const z = asNumber(point.z, Number.NaN);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return undefined;

      const includeY = params.includeY === true;
      if (includeY) {
        return Math.hypot(position.x - x, position.y - y, position.z - z);
      }
      return Math.hypot(position.x - x, position.z - z);
    });

    this.registerQuery("fieldSample", (params, input, ctx) => {
      const fieldName = typeof params.field === "string" ? params.field : undefined;
      if (!fieldName) return undefined;

      const fieldModule = getModule<any>(ctx, "field", true);
      if (!fieldModule) return undefined;

      try {
        const field = fieldModule.get(fieldModule.resolve(fieldName)) as FieldResolved | undefined;
        if (!field?.sample3D) return undefined;

        const position = getQueryPosition(input);
        if (!position) return undefined;

        const terrainSize = asNumber(params.terrainSize, 100);
        const raw = field.sample3D(
          position.x / terrainSize,
          position.y / terrainSize,
          position.z / terrainSize,
        );
        return params.normalize01 === true ? (raw + 1) / 2 : raw;
      } catch {
        return undefined;
      }
    });

    this.registerQuery("entityCount", (params, input, ctx) => {
      const componentName = typeof params.component === "string" ? params.component : undefined;
      if (!componentName) return 0;
      const component = (Components as Record<string, any>)[componentName];
      if (!component) return 0;

      const query = defineQuery([component]);
      const entities = query(ctx as any);
      const withinDistance = asNumber(params.withinDistance, Number.NaN);
      if (!Number.isFinite(withinDistance)) {
        return entities.length;
      }

      const from = getQueryPosition(input);
      const transform = (Components as Record<string, any>).Transform;
      if (!from || !transform) return entities.length;

      const includeY = params.includeY === true;
      let count = 0;
      for (const eid of entities) {
        if (!hasComponent(ctx as any, transform, eid)) continue;
        const dx = asNumber(transform.x?.[eid], 0) - from.x;
        const dy = asNumber(transform.y?.[eid], 0) - from.y;
        const dz = asNumber(transform.z?.[eid], 0) - from.z;
        const dist = includeY ? Math.hypot(dx, dy, dz) : Math.hypot(dx, dz);
        if (dist <= withinDistance) count++;
      }
      return count;
    });
  }

  private compileValueExpression(expression: ValueExpression): ValueEvaluator {
    if (expression.type === "literal") {
      return () => expression.params.value;
    }

    if (expression.type === "parameter") {
      const { name, defaultValue } = expression.params;
      return (input) => input.parameters?.[name] ?? defaultValue;
    }

    if (expression.type === "metric") {
      const { metric, subtype, subject, defaultValue } = expression.params;
      const fallback = defaultValue ?? 0;
      return (input) => resolveMetricValue(this.ctx, input, metric, subtype, subject, fallback).value;
    }

    if (expression.type === "store") {
      const { store, path, subject, defaultValue } = expression.params;
      return (input) => {
        const eid = resolveEntitySubject(subject, input);
        if (eid === undefined) return defaultValue;

        const storeModule = getModule<EntityStoreModule>(this.ctx, "entityStore", true);
        if (!storeModule) return defaultValue;

        try {
          const storeInstance = storeModule.getStore<any>(store);
          const value = storeInstance?.get(eid);
          const resolved = deepGet(value, path);
          return resolved === undefined ? defaultValue : resolved;
        } catch {
          return defaultValue;
        }
      };
    }

    if (expression.type === "component") {
      const { component, field, subject, defaultValue } = expression.params;
      return (input) => {
        const eid = resolveEntitySubject(subject, input);
        if (eid === undefined) return defaultValue;

        const componentDef = (Components as Record<string, any>)[component];
        if (!componentDef) return defaultValue;
        if (!hasComponent(this.ctx as any, componentDef, eid)) return defaultValue;

        if (!field) return true;
        const buffer = componentDef[field];
        const value = buffer?.[eid];
        return value === undefined ? defaultValue : value;
      };
    }

    if (expression.type === "query") {
      const { query, params, defaultValue } = expression.params;
      const paramEvaluators = Object.entries(params ?? {}).map(([name, value]) => {
        if (isValueExpression(value)) {
          return { name, evaluate: this.compileValueExpression(value), literal: undefined };
        }
        return { name, evaluate: undefined, literal: value };
      });

      return (input, state) => {
        const resolver = this.getQuery(query);
        if (!resolver) return defaultValue;

        const evaluatedParams: Record<string, unknown> = {};
        for (const entry of paramEvaluators) {
          evaluatedParams[entry.name] = entry.evaluate
            ? entry.evaluate(input, state)
            : entry.literal;
        }

        const value = resolver(evaluatedParams, input, this.ctx);
        return value === undefined ? defaultValue : value;
      };
    }

    if (expression.type === "sum") {
      const evaluators = expression.params.values.map((entry) => this.compileValueExpression(entry));
      return (input, state) =>
        evaluators.reduce((sum, evaluate) => sum + asNumber(evaluate(input, state), 0), 0);
    }

    return () => undefined;
  }

  private registerBuiltInConditionTypes(): void {
    this.registerType("always", () => () => ({
      type: "always",
      passed: true,
      reason: "always_true",
    }));

    this.registerType("compare", (params: {
      operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
      left: ValueExpression;
      right: ValueExpression;
    }) => {
      const evaluateLeft = this.compileValueExpression(params.left);
      const evaluateRight = this.compileValueExpression(params.right);
      return (input, state) => {
        const left = evaluateLeft(input, state);
        const right = evaluateRight(input, state);
        const passed = compareValues(params.operator, left, right);
        return {
          type: "compare",
          passed,
          reason: passed ? "comparison_true" : "comparison_false",
          details: {
            operator: params.operator,
            left,
            right,
          },
        };
      };
    });

    this.registerType("reference", (params: {
      name: string;
      args?: Record<string, ValueExpression | unknown>;
    }) => {
      const args = Object.entries(params.args ?? {}).map(([name, value]) => {
        if (isValueExpression(value)) {
          return { name, evaluate: this.compileValueExpression(value), literal: undefined };
        }
        return { name, evaluate: undefined, literal: value };
      });

      return (input, state) => {
        if (state.depth >= state.maxDepth) {
          return {
            type: "reference",
            passed: false,
            reason: "reference_depth_exceeded",
            details: { name: params.name, maxDepth: state.maxDepth },
          };
        }

        const definition = this.definitionsByName[params.name];
        if (!definition) {
          return {
            type: "reference",
            passed: false,
            reason: "reference_missing",
            details: { name: params.name },
          };
        }

        const resolvedArgs: Record<string, unknown> = {};
        for (const entry of args) {
          resolvedArgs[entry.name] = entry.evaluate
            ? entry.evaluate(input, state)
            : entry.literal;
        }

        const evaluator = this.get(this.resolve(params.name));
        const child = evaluator(
          {
            ...input,
            parameters: {
              ...(input.parameters ?? {}),
              ...resolvedArgs,
            },
          },
          {
            depth: state.depth + 1,
            maxDepth: state.maxDepth,
          },
        );

        return {
          type: "reference",
          passed: child.passed,
          reason: "reference_resolved",
          details: {
            name: params.name,
            args: resolvedArgs,
          },
          children: [child],
        };
      };
    });

    this.registerType("not", (params: { condition: ConditionDefinition }) => {
      const evaluate = this.get(this.resolve(params.condition));
      return (input, state) => {
        const child = evaluate(input, { depth: state.depth + 1, maxDepth: state.maxDepth });
        return {
          type: "not",
          passed: !child.passed,
          reason: child.passed ? "not_false" : "not_true",
          children: [child],
        };
      };
    });

    this.registerType("all", (params: { conditions: ConditionDefinition[] }) => {
      const evaluators = params.conditions.map((entry) => this.get(this.resolve(entry)));
      return (input, state) => {
        const children = evaluators.map((evaluate) =>
          evaluate(input, { depth: state.depth + 1, maxDepth: state.maxDepth }),
        );
        const passed = children.every((entry) => entry.passed);
        return {
          type: "all",
          passed,
          reason: passed ? "all_true" : "all_false",
          children,
        };
      };
    });

    this.registerType("any", (params: { conditions: ConditionDefinition[] }) => {
      const evaluators = params.conditions.map((entry) => this.get(this.resolve(entry)));
      return (input, state) => {
        const children = evaluators.map((evaluate) =>
          evaluate(input, { depth: state.depth + 1, maxDepth: state.maxDepth }),
        );
        const passed = children.some((entry) => entry.passed);
        return {
          type: "any",
          passed,
          reason: passed ? "any_true" : "any_false",
          children,
        };
      };
    });
  }
}

export const conditionModule = (ctx: ECSContext) => new ConditionModule(ctx);

export function getConditionModule(ctx: ECSContext): ConditionModule {
  const existing = ctx.modules.get("condition") as ConditionModule | undefined;
  if (existing) return existing;
  const created = conditionModule(ctx);
  ctx.modules.set("condition", created as any);
  return created;
}

export function evaluateCondition(
  ctx: ECSContext,
  definition: ConditionDefinition,
  input: ConditionEvaluationInput,
): boolean {
  const module = getConditionModule(ctx);
  return module.evaluate(definition, input);
}

export function evaluateConditionWithTrace(
  ctx: ECSContext,
  definition: ConditionDefinition,
  input: ConditionEvaluationInput,
  options: ConditionEvaluationOptions = {},
): ConditionEvaluationTrace {
  const module = getConditionModule(ctx);
  const evaluation = module.evaluateWithTrace(definition, input, {
    maxReferenceDepth: options.maxReferenceDepth,
  });

  const trace: ConditionEvaluationTrace = {
    timestamp: getTraceTimestamp(ctx),
    source: options.source,
    input: cloneInput(input),
    passed: evaluation.passed,
    node: evaluation.node,
  };

  const shouldEmit = options.emitTrace ?? shouldEmitTrace(ctx);
  if (shouldEmit) {
    emitTrace(ctx, trace);
  }

  return trace;
}
