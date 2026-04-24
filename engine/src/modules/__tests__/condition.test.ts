import { describe, it, expect, beforeEach } from "vitest";
import { createECS, setResource } from "../../core/ecs";
import { Metrics } from "../../core/metrics";
import { addComponent, addEntity } from "bitecs";
import { Transform } from "../../core/components";
import {
  CONDITION_TYPE_OPTIONS,
  conditionModule,
  evaluateCondition,
  evaluateConditionWithTrace,
  getConditionModule,
} from "../condition";
import { EntityStoreModule } from "../entityStore";

describe("condition module", () => {
  let ctx: any;
  let metrics: Metrics;

  beforeEach(() => {
    ctx = createECS();
    metrics = new Metrics(ctx);
    setResource(ctx, "metrics", metrics);
  });

  it("exposes only canonical condition definition types", () => {
    expect(CONDITION_TYPE_OPTIONS).toEqual(["always", "compare", "reference", "not", "all", "any"]);
  });

  it("evaluates compare conditions for gte and eq", () => {
    const module = conditionModule(ctx);
    metrics.set("player1", "items picked up", 5);

    const gteDef = {
      type: "compare",
      params: {
        operator: "gte",
        left: { type: "metric", params: { metric: "items picked up" } },
        right: { type: "literal", params: { value: 3 } },
      },
    } as const;
    const eqDef = {
      type: "compare",
      params: {
        operator: "eq",
        left: { type: "metric", params: { metric: "items picked up" } },
        right: { type: "literal", params: { value: 5 } },
      },
    } as const;

    module.register("gte", gteDef);
    module.register("eq", eqDef);

    expect(module.evaluate(gteDef, { defaultSubject: "player1", context: { self: "player1" } })).toBe(true);
    expect(module.evaluate(eqDef, { defaultSubject: "player1", context: { self: "player1" } })).toBe(true);
  });

  it("evaluates compare+sum condition with missing metrics treated as zero", () => {
    const module = conditionModule(ctx);
    metrics.set("player1", "discoveries", "A", 3);
    metrics.set("player1", "discoveries", "B", 2);

    const sumDef = {
      type: "compare",
      params: {
        operator: "gte",
        left: {
          type: "sum",
          params: {
            values: [
              { type: "metric", params: { metric: "discoveries", subtype: "A" } },
              { type: "metric", params: { metric: "discoveries", subtype: "B" } },
              { type: "metric", params: { metric: "discoveries", subtype: "C" } },
            ],
          },
        },
        right: { type: "literal", params: { value: 5 } },
      },
    } as const;

    module.register("sum", sumDef);
    expect(module.evaluate(sumDef, { defaultSubject: "player1", context: { self: "player1" } })).toBe(true);
  });

  it("evaluates compare conditions with value expressions", () => {
    metrics.set("player1", "score", 120);

    const isHighScore = evaluateCondition(
      ctx,
      {
        type: "compare",
        params: {
          operator: "gt",
          left: { type: "metric", params: { metric: "score" } },
          right: { type: "literal", params: { value: 100 } },
        },
      },
      { defaultSubject: "player1", context: { self: "player1" } },
    );

    expect(isHighScore).toBe(true);
  });

  it("supports all/any/not composition", () => {
    metrics.set("player1", "level", 10);
    metrics.set("player1", "experience", 900);

    const composite = {
      type: "all" as const,
      params: {
        conditions: [
          {
            type: "compare" as const,
            params: {
              operator: "gte" as const,
              left: { type: "metric" as const, params: { metric: "level" } },
              right: { type: "literal" as const, params: { value: 10 } },
            },
          },
          {
            type: "any" as const,
            params: {
              conditions: [
                {
                  type: "compare" as const,
                  params: {
                    operator: "gte" as const,
                    left: { type: "metric" as const, params: { metric: "experience" } },
                    right: { type: "literal" as const, params: { value: 1000 } },
                  },
                },
                {
                  type: "not" as const,
                  params: {
                    condition: {
                      type: "compare" as const,
                      params: {
                        operator: "eq" as const,
                        left: { type: "metric" as const, params: { metric: "experience" } },
                        right: { type: "literal" as const, params: { value: 0 } },
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    };

    expect(
      evaluateCondition(ctx, composite, { defaultSubject: "player1", context: { self: "player1" } }),
    ).toBe(true);
  });

  it("resolves subject via context (self/other/user)", () => {
    metrics.set("self_entity", "hp", 5);
    metrics.set("other_entity", "hp", 0);

    const condition = {
      type: "all" as const,
      params: {
        conditions: [
          {
            type: "compare" as const,
            params: {
              operator: "gte" as const,
              left: { type: "metric" as const, params: { metric: "hp", subject: "self" as const } },
              right: { type: "literal" as const, params: { value: 1 } },
            },
          },
          {
            type: "compare" as const,
            params: {
              operator: "eq" as const,
              left: { type: "metric" as const, params: { metric: "hp", subject: "other" as const } },
              right: { type: "literal" as const, params: { value: 0 } },
            },
          },
        ],
      },
    };

    expect(
      evaluateCondition(ctx, condition, {
        defaultSubject: "self_entity",
        context: { self: "self_entity", other: "other_entity" },
      }),
    ).toBe(true);
  });

  it("supports named condition references with parameterized arguments", () => {
    const module = getConditionModule(ctx);
    metrics.set("player1", "score", 15);

    module.register("score_at_least", {
      type: "compare",
      params: {
        operator: "gte",
        left: { type: "metric", params: { metric: "score" } },
        right: { type: "parameter", params: { name: "minScore", defaultValue: 0 } },
      },
    });

    expect(
      evaluateCondition(
        ctx,
        {
          type: "reference",
          params: {
            name: "score_at_least",
            args: { minScore: { type: "literal", params: { value: 10 } } },
          },
        },
        { defaultSubject: "player1", context: { self: "player1" } },
      ),
    ).toBe(true);

    expect(
      evaluateCondition(
        ctx,
        {
          type: "reference",
          params: {
            name: "score_at_least",
            args: { minScore: { type: "literal", params: { value: 20 } } },
          },
        },
        { defaultSubject: "player1", context: { self: "player1" } },
      ),
    ).toBe(false);
  });

  it("supports store and component value backends", () => {
    const eid = addEntity(ctx);
    addComponent(ctx, Transform, eid);
    Transform.x[eid] = 3;
    Transform.y[eid] = 1;
    Transform.z[eid] = -2;

    const stores = ctx.modules.get("entityStore") as EntityStoreModule;
    stores.getStore("health").set(eid, { current: 7, max: 10, min: 0 });

    const condition = {
      type: "all" as const,
      params: {
        conditions: [
          {
            type: "compare" as const,
            params: {
              operator: "eq" as const,
              left: { type: "store" as const, params: { store: "health", path: "current" } },
              right: { type: "literal" as const, params: { value: 7 } },
            },
          },
          {
            type: "compare" as const,
            params: {
              operator: "gt" as const,
              left: { type: "component" as const, params: { component: "Transform", field: "x" } },
              right: { type: "literal" as const, params: { value: 2 } },
            },
          },
        ],
      },
    };

    expect(
      evaluateCondition(ctx, condition, {
        defaultSubject: eid,
        context: { self: eid },
      }),
    ).toBe(true);
  });

  it("supports query value backend", () => {
    const first = addEntity(ctx);
    addComponent(ctx, Transform, first);
    Transform.x[first] = 0;
    Transform.y[first] = 0;
    Transform.z[first] = 0;

    const second = addEntity(ctx);
    addComponent(ctx, Transform, second);
    Transform.x[second] = 5;
    Transform.y[second] = 0;
    Transform.z[second] = 0;

    expect(
      evaluateCondition(
        ctx,
        {
          type: "compare",
          params: {
            operator: "gte",
            left: {
              type: "query",
              params: {
                query: "entityCount",
                params: { component: "Transform" },
              },
            },
            right: { type: "literal", params: { value: 2 } },
          },
        },
        { defaultSubject: first, context: { self: first } },
      ),
    ).toBe(true);

    expect(
      evaluateCondition(
        ctx,
        {
          type: "compare",
          params: {
            operator: "gte",
            left: {
              type: "query",
              params: {
                query: "positionAxis",
                params: { axis: "y" },
              },
            },
            right: { type: "literal", params: { value: 5 } },
          },
        },
        {
          defaultSubject: first,
          context: { self: first },
          queryContext: { position: { x: 0, y: 6, z: 0 } },
        },
      ),
    ).toBe(true);
  });

  it("returns and emits structured condition traces", () => {
    const traceBuffer: any[] = [];
    setResource(ctx, "conditionTraceBuffer", traceBuffer);

    const trace = evaluateConditionWithTrace(
      ctx,
      {
        type: "all",
        params: {
          conditions: [
            { type: "always", params: {} },
            {
              type: "compare",
              params: {
                operator: "eq",
                left: { type: "literal", params: { value: 1 } },
                right: { type: "literal", params: { value: 1 } },
              },
            },
          ],
        },
      },
      { defaultSubject: "trace_subject", context: { self: "trace_subject" } },
      { source: { system: "manual", name: "condition-test" } },
    );

    expect(trace.passed).toBe(true);
    expect(trace.node.type).toBe("all");
    expect(trace.node.children?.length).toBe(2);
    expect(traceBuffer).toHaveLength(1);
    expect(traceBuffer[0].source?.name).toBe("condition-test");
  });
});
