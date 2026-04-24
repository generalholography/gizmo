import { ECSContext, getResource } from "../core/ecs";
import {
  ActionDefinition,
  ActionInput,
  ActionOperationTrace,
  ActionTraceNode,
  executeActionDefinition,
  normalizeActionDefinition,
} from "./action";
import {
  ConditionDefinition,
  ConditionSubjectRef,
  ConditionTraceNode,
  ValueExpression,
  evaluateConditionWithTrace,
  normalizeConditionDefinition,
} from "./condition";
import { RuleTriggerType } from "./ruleContextContracts";

export type EngineTriggerType = Extract<
  RuleTriggerType,
  "interact" | "collisionEnter" | "entityInRange" | "timeElapsed" | "die" | "primaryAction" | "secondaryAction"
>;

export type RuleTrigger =
  | { type: 'immediate'; params?: Record<string, never> }
  | { type: 'event'; params: { event: string } } // global custom event
  | { type: 'interact' | 'collisionEnter' | 'die'; params?: Record<string, never> }
  | { type: 'timeElapsed'; params: { delay: number; repeat?: boolean } }
  | { type: 'primaryAction' | 'secondaryAction' | 'entityInRange'; params?: { range?: number } }
  | { type: 'time'; params: { delay: number; repeat?: boolean } }
  | { type: 'interval'; params: { interval: number; initialDelay?: number; maxCount?: number } }
  | { type: 'proximity'; params: { position: { x: number; y: number; z: number }; radius: number; once?: boolean } };

export type RuleDefinition = {
  trigger: RuleTrigger;
  condition?: ConditionDefinition;
  priority?: number;
  actions: ActionInput;
  cooldown?: number;
  enabled?: boolean;
  __cooldownRemaining?: number;
};

type CanonicalRuleDefinition = Omit<RuleDefinition, "actions"> & {
  actions: ActionDefinition;
};

type RuleRuntimeState = {
  elapsed: number;
  completed: boolean;
  lastFiredAt: number;
  fireCount: number;
};

export type RuleContext = {
  self: number;
  other?: number;
  user?: number;
};

export type RuleTraceReason =
  | "rule_disabled"
  | "cooldown_active"
  | "condition_false"
  | "no_actions_defined"
  | "target_unavailable_for_trigger"
  | "missing_context_value"
  | "action_applied"
  | "action_failed"
  | "actions_skipped";

export type RuleOperationTrace = {
  index: number;
  type: string;
  target: string;
  executed: boolean;
  success: boolean;
  reason: RuleTraceReason;
  path?: string;
  message?: string;
};

export type RuleExecutionTrace = {
  timestamp: number;
  ruleName: string;
  owner: number;
  trigger: RuleTrigger["type"];
  context: RuleContext;
  conditionPassed?: boolean;
  conditionTrace?: ConditionTraceNode;
  actionTrace?: ActionTraceNode;
  reason: RuleTraceReason;
  fired: boolean;
  operations: RuleOperationTrace[];
  /**
   * @deprecated Legacy alias maintained for trace consumers that still read `effects`.
   */
  effects?: RuleOperationTrace[];
};

export type RuleTraceCallback = (trace: RuleExecutionTrace) => void;

type GlobalRuleEvent = {
  name: string;
  payload?: any;
};

const ENGINE_TRIGGERS: EngineTriggerType[] = ["interact", "collisionEnter", "entityInRange", "timeElapsed", "die", "primaryAction", "secondaryAction"];

function applyDefaultSubjectToValueExpression(
  expression: ValueExpression,
  subject: ConditionSubjectRef,
): ValueExpression {
  if (expression.type === "metric" && expression.params.subject === undefined) {
    return {
      ...expression,
      params: {
        ...expression.params,
        subject,
      },
    };
  }

  if (expression.type === "sum") {
    return {
      ...expression,
      params: {
        ...expression.params,
        values: expression.params.values.map((entry) => applyDefaultSubjectToValueExpression(entry, subject)),
      },
    };
  }

  if (expression.type === "query" && expression.params.params) {
    const params: Record<string, ValueExpression | unknown> = {};
    for (const [name, value] of Object.entries(expression.params.params)) {
      if (value && typeof value === "object" && typeof (value as any).type === "string") {
        params[name] = applyDefaultSubjectToValueExpression(value as ValueExpression, subject);
      } else {
        params[name] = value;
      }
    }
    return {
      ...expression,
      params: {
        ...expression.params,
        params,
      },
    };
  }

  return expression;
}

function applyDefaultSubjectToCondition(
  condition: ConditionDefinition,
  subject: ConditionSubjectRef | undefined,
): ConditionDefinition {
  if (subject === undefined) return condition;

  if (condition.type === "compare") {
    return {
      ...condition,
      params: {
        ...condition.params,
        left: applyDefaultSubjectToValueExpression(condition.params.left, subject),
        right: applyDefaultSubjectToValueExpression(condition.params.right, subject),
      },
    };
  }

  if (condition.type === "not") {
    return {
      ...condition,
      params: {
        condition: applyDefaultSubjectToCondition(condition.params.condition, subject),
      },
    };
  }

  if (condition.type === "all" || condition.type === "any") {
    return {
      ...condition,
      params: {
        conditions: condition.params.conditions.map((entry) => applyDefaultSubjectToCondition(entry, subject)),
      },
    };
  }

  return condition;
}

export class RuleModule {
  private readonly definitionsByName = new Map<string, CanonicalRuleDefinition>();
  private readonly globalEventIndex = new Map<string, Set<string>>();
  private readonly engineTriggerIndex = new Map<EngineTriggerType, Set<string>>();
  private readonly stateByName = new Map<string, RuleRuntimeState>();
  private readonly ownerByRule = new Map<string, number>();
  private readonly registrationIndexByRule = new Map<string, number>();
  private readonly globalEventQueue: GlobalRuleEvent[] = [];
  private nextRegistrationIndex = 0;

  constructor(private readonly ctx: ECSContext) {
    for (const trigger of ENGINE_TRIGGERS) {
      this.engineTriggerIndex.set(trigger, new Set());
    }
  }

  private normalizeRuleDefinition(def: RuleDefinition): CanonicalRuleDefinition {
    const source = def as any;
    const { actions: _actions, ...rest } = source;

    let trigger = source.trigger as RuleTrigger;
    let condition = source.condition ? normalizeConditionDefinition(source.condition) : undefined;

    // Read-compatibility adapter: condition-trigger rules become interval + top-level condition.
    if (source.trigger?.type === "condition") {
      const checkInterval = typeof source.trigger.params?.checkInterval === "number" && source.trigger.params.checkInterval > 0
        ? source.trigger.params.checkInterval
        : 1;
      trigger = { type: "interval", params: { interval: checkInterval } };

      const triggerCondition = applyDefaultSubjectToCondition(
        normalizeConditionDefinition(source.trigger.params?.condition),
        source.trigger.params?.subject as ConditionSubjectRef | undefined,
      );
      condition = condition
        ? {
            type: "all",
            params: {
              conditions: [triggerCondition, condition],
            },
          }
        : triggerCondition;

      if (source.trigger.params?.once === true) {
        (rest as any).__legacyConditionTriggerOnce = true;
      }
    }

    return {
      ...rest,
      trigger,
      condition,
      actions: normalizeActionDefinition(def.actions),
    };
  }

  registerEntityRule(name: string, ownerEid: number, def: RuleDefinition): CanonicalRuleDefinition {
    const normalizedDefinition = this.normalizeRuleDefinition(def);
    const now = this.getNow();
    const remaining = typeof normalizedDefinition.__cooldownRemaining === 'number'
      ? Math.max(0, normalizedDefinition.__cooldownRemaining)
      : 0;
    const cooldown = typeof normalizedDefinition.cooldown === 'number' ? normalizedDefinition.cooldown : 0;
    const initialLastFiredAt = remaining > 0 && cooldown > 0
      ? now - Math.max(0, cooldown - remaining)
      : -Infinity;

    this.definitionsByName.set(name, normalizedDefinition);
    this.ownerByRule.set(name, ownerEid);
    this.registrationIndexByRule.set(name, this.nextRegistrationIndex++);
    this.stateByName.set(name, {
      elapsed: 0,
      completed: false,
      lastFiredAt: initialLastFiredAt,
      fireCount: 0,
    });

    if (normalizedDefinition.trigger.type === 'event') {
      const eventName = normalizedDefinition.trigger.params.event;
      if (!this.globalEventIndex.has(eventName)) {
        this.globalEventIndex.set(eventName, new Set());
      }
      this.globalEventIndex.get(eventName)!.add(name);
    } else if ((ENGINE_TRIGGERS as string[]).includes(normalizedDefinition.trigger.type)) {
      this.engineTriggerIndex.get(normalizedDefinition.trigger.type as EngineTriggerType)?.add(name);
    }

    if (normalizedDefinition.trigger.type === 'immediate') {
      this.executeRule(name, { self: ownerEid });
      const state = this.stateByName.get(name);
      if (state) state.completed = true;
    }

    return normalizedDefinition;
  }

  emitEngineTrigger(triggerType: EngineTriggerType, context: RuleContext): number {
    const listeners = this.engineTriggerIndex.get(triggerType);
    if (!listeners) return 0;

    let fired = 0;
    for (const ruleName of this.getSortedRuleNames(listeners)) {
      const owner = this.ownerByRule.get(ruleName);
      if (owner !== context.self) continue;
      if (this.executeRule(ruleName, context)) {
        fired++;
      }
    }
    return fired;
  }

  emitGlobalEvent(name: string, payload?: any): void {
    this.globalEventQueue.push({ name, payload });
  }

  update(deltaTime: number): void {
    for (const ruleName of this.getSortedRuleNames(this.definitionsByName.keys())) {
      const def = this.definitionsByName.get(ruleName);
      if (!def) continue;
      const owner = this.ownerByRule.get(ruleName);
      if (owner === undefined) continue;
      const state = this.stateByName.get(ruleName);
      if (!state || state.completed || def.enabled === false) continue;

      if (def.trigger.type === 'time' || def.trigger.type === 'timeElapsed') {
        state.elapsed += deltaTime;
        if (state.elapsed >= def.trigger.params.delay) {
          this.executeRule(ruleName, { self: owner });
          if (def.trigger.params.repeat) {
            state.elapsed = 0;
          } else {
            state.completed = true;
          }
        }
      } else if (def.trigger.type === 'interval') {
        state.elapsed += deltaTime;
        const initialDelay = def.trigger.params.initialDelay ?? 0;
        if (state.elapsed < initialDelay) continue;

        const elapsedAfterDelay = state.elapsed - initialDelay;
        const shouldHaveFired = Math.floor(elapsedAfterDelay / def.trigger.params.interval) + 1;

        while (state.fireCount < shouldHaveFired) {
          if (def.trigger.params.maxCount !== undefined && state.fireCount >= def.trigger.params.maxCount) {
            state.completed = true;
            break;
          }
          const fired = this.executeRule(ruleName, { self: owner });
          if (fired && (def as any).__legacyConditionTriggerOnce === true) {
            state.completed = true;
            state.fireCount++;
            break;
          }
          state.fireCount++;
        }

        if (def.trigger.params.maxCount !== undefined && state.fireCount >= def.trigger.params.maxCount) {
          state.completed = true;
        }
      }
      // proximity currently requires dedicated spatial events/systems, so runtime update no-op for now.
    }

    this.drainGlobalEvents();
  }

  private drainGlobalEvents(): void {
    while (this.globalEventQueue.length > 0) {
      const evt = this.globalEventQueue.shift()!;
      const listeners = this.globalEventIndex.get(evt.name);
      if (!listeners) continue;
      for (const ruleName of this.getSortedRuleNames(listeners)) {
        const owner = this.ownerByRule.get(ruleName);
        if (owner === undefined) continue;
        const other = typeof evt.payload?.other === 'number'
          ? evt.payload.other
          : (typeof evt.payload?.target === 'number' ? evt.payload.target : undefined);
        const user = typeof evt.payload?.user === 'number'
          ? evt.payload.user
          : (typeof evt.payload?.actor === 'number' ? evt.payload.actor : undefined);
        this.executeRule(ruleName, { self: owner, other, user });
      }
    }
  }

  removeEntityRules(eid: number): void {
    for (const [ruleName, owner] of this.ownerByRule.entries()) {
      if (owner !== eid) continue;
      const def = this.definitionsByName.get(ruleName);
      if (def?.trigger.type === 'event') {
        this.globalEventIndex.get(def.trigger.params.event)?.delete(ruleName);
      } else if (def && (ENGINE_TRIGGERS as string[]).includes(def.trigger.type)) {
        this.engineTriggerIndex.get(def.trigger.type as EngineTriggerType)?.delete(ruleName);
      }
      this.ownerByRule.delete(ruleName);
      this.registrationIndexByRule.delete(ruleName);
      this.stateByName.delete(ruleName);
      this.definitionsByName.delete(ruleName);
    }
  }

  replaceEntityRules(eid: number, rules: RuleDefinition[]): void {
    this.removeEntityRules(eid);
    rules.forEach((rule, index) => {
      this.registerEntityRule(`rule_${eid}_${index}`, eid, rule);
    });
  }

  getEntityRules(eid: number): RuleDefinition[] {
    const result: RuleDefinition[] = [];
    for (const [name, owner] of this.ownerByRule.entries()) {
      if (owner !== eid) continue;
      const def = this.definitionsByName.get(name);
      if (def) result.push(def);
    }
    return result;
  }

  hasRuleForEntity(eid: number): boolean {
    for (const owner of this.ownerByRule.values()) {
      if (owner === eid) return true;
    }
    return false;
  }

  hasEngineTriggerForEntity(eid: number, triggerType: EngineTriggerType): boolean {
    for (const [name, owner] of this.ownerByRule.entries()) {
      if (owner !== eid) continue;
      const def = this.definitionsByName.get(name);
      if (def?.trigger.type === triggerType) return true;
    }
    return false;
  }

  getEntityRulesByTrigger(eid: number, triggerType: EngineTriggerType): RuleDefinition[] {
    const rules: RuleDefinition[] = [];
    for (const [name, owner] of this.ownerByRule.entries()) {
      if (owner !== eid) continue;
      const def = this.definitionsByName.get(name);
      if (def?.trigger.type === triggerType) {
        rules.push(def);
      }
    }
    return rules;
  }

  getEntityRulesForSerialization(eid: number): RuleDefinition[] {
    const now = this.getNow();
    const rules: RuleDefinition[] = [];
    for (const [name, owner] of this.ownerByRule.entries()) {
      if (owner !== eid) continue;
      const def = this.definitionsByName.get(name);
      const state = this.stateByName.get(name);
      if (!def) continue;

      const cloned: RuleDefinition = { ...def };
      delete cloned.__cooldownRemaining;
      delete (cloned as any).__legacyConditionTriggerOnce;

      if (state && typeof def.cooldown === 'number' && Number.isFinite(def.cooldown) && def.cooldown > 0 && state.lastFiredAt !== -Infinity) {
        const elapsed = Math.max(0, now - state.lastFiredAt);
        const remaining = Math.max(0, def.cooldown - elapsed);
        if (remaining > 0) {
          cloned.__cooldownRemaining = remaining;
        }
      }

      rules.push(cloned);
    }
    return rules;
  }

  getEntityMaxCooldownPercent(eid: number): number | null {
    const now = this.getNow();
    let maxPct = -1;
    for (const [name, owner] of this.ownerByRule.entries()) {
      if (owner !== eid) continue;
      const def = this.definitionsByName.get(name);
      const state = this.stateByName.get(name);
      if (!def || !state || !def.cooldown || !Number.isFinite(def.cooldown) || def.cooldown <= 0) continue;
      const remaining = state.lastFiredAt === -Infinity ? 0 : Math.max(0, def.cooldown - (now - state.lastFiredAt));
      const pct = remaining / def.cooldown;
      if (pct > maxPct) maxPct = pct;
    }
    return maxPct >= 0 ? Math.min(1, Math.max(0, maxPct)) : null;
  }

  private isTraceEnabled(): boolean {
    const enabled = getResource<boolean>(this.ctx, "ruleTraceEnabled", true);
    if (enabled === true) return true;
    const callbacks = getResource<RuleTraceCallback[]>(this.ctx, "ruleTraceCallbacks", true);
    return Array.isArray(callbacks) && callbacks.length > 0;
  }

  private emitTrace(trace: RuleExecutionTrace): void {
    if (!this.isTraceEnabled()) return;
    const callbacks = getResource<RuleTraceCallback[]>(this.ctx, "ruleTraceCallbacks", true);
    if (Array.isArray(callbacks)) {
      for (const callback of callbacks) {
        try {
          callback(trace);
        } catch (error) {
          console.warn("[rules] Rule trace callback failed:", error);
        }
      }
    }
    const traceBuffer = getResource<RuleExecutionTrace[]>(this.ctx, "ruleTraceBuffer", true);
    if (Array.isArray(traceBuffer)) {
      traceBuffer.push(trace);
    }
  }

  private evaluateConditionDefinition(
    ruleName: string,
    triggerType: RuleTrigger["type"],
    condition: ConditionDefinition | undefined,
    context: RuleContext,
  ): { passed: boolean; trace?: ConditionTraceNode } {
    if (!condition) return { passed: true };
    const trace = evaluateConditionWithTrace(this.ctx, normalizeConditionDefinition(condition), {
      defaultSubject: context.self,
      context: {
        self: context.self,
        other: context.other,
        user: context.user,
      },
    }, {
      source: { system: "rule", name: ruleName, owner: context.self, trigger: triggerType },
    });
    return { passed: trace.passed, trace: trace.node };
  }

  private toRuleOperationTrace(operationTrace: ActionOperationTrace, index: number): RuleOperationTrace {
    let reason: RuleTraceReason;
    if (operationTrace.reason === "action_applied") reason = "action_applied";
    else if (operationTrace.reason === "action_failed") reason = "action_failed";
    else if (operationTrace.reason === "target_unavailable_for_trigger") reason = "target_unavailable_for_trigger";
    else if (operationTrace.reason === "missing_context_value") reason = "missing_context_value";
    else reason = "action_failed";

    return {
      index,
      type: operationTrace.type,
      target: operationTrace.target,
      executed: operationTrace.executed,
      success: operationTrace.success,
      reason,
      path: operationTrace.path,
      message: operationTrace.message,
    };
  }

  private executeRule(ruleName: string, context: RuleContext): boolean {
    const def = this.definitionsByName.get(ruleName);
    const state = this.stateByName.get(ruleName);
    if (!def || !state) return false;

    const owner = this.ownerByRule.get(ruleName);
    if (owner === undefined) return false;

    const now = this.getNow();

    if (def.enabled === false) {
      const operations: RuleOperationTrace[] = [];
      this.emitTrace({
        timestamp: now,
        ruleName,
        owner,
        trigger: def.trigger.type,
        context: { ...context },
        reason: "rule_disabled",
        fired: false,
        operations,
        effects: operations,
      });
      return false;
    }

    if (def.cooldown && Number.isFinite(def.cooldown)) {
      if (state.lastFiredAt !== -Infinity && now - state.lastFiredAt < def.cooldown) {
        const operations: RuleOperationTrace[] = [];
        this.emitTrace({
          timestamp: now,
          ruleName,
          owner,
          trigger: def.trigger.type,
          context: { ...context },
          reason: "cooldown_active",
          fired: false,
          operations,
          effects: operations,
        });
        return false;
      }
    }

    const conditionEvaluation = this.evaluateConditionDefinition(
      ruleName,
      def.trigger.type,
      def.condition,
      context,
    );

    if (!conditionEvaluation.passed) {
      const operations: RuleOperationTrace[] = [];
      this.emitTrace({
        timestamp: now,
        ruleName,
        owner,
        trigger: def.trigger.type,
        context: { ...context },
        conditionPassed: false,
        conditionTrace: conditionEvaluation.trace,
        reason: "condition_false",
        fired: false,
        operations,
        effects: operations,
      });
      state.lastFiredAt = now;
      return false;
    }

    const actionResult = executeActionDefinition(
      this.ctx,
      def.actions,
      context,
      {
        triggerType: def.trigger.type,
        conditionTraceSource: { system: "rule", name: ruleName, owner, trigger: def.trigger.type },
      },
    );
    const operationTraces = actionResult.operationTraces.map((entry, index) => this.toRuleOperationTrace(entry, index));
    state.lastFiredAt = now;

    const reason: RuleTraceReason =
      operationTraces.length === 0
        ? "no_actions_defined"
        : actionResult.executedOperations === 0
          ? "actions_skipped"
          : actionResult.successfulOperations > 0
            ? "action_applied"
            : "action_failed";

    this.emitTrace({
      timestamp: now,
      ruleName,
      owner,
      trigger: def.trigger.type,
      context: { ...context },
      conditionPassed: true,
      conditionTrace: conditionEvaluation.trace,
      actionTrace: actionResult.trace,
      reason,
      fired: actionResult.executedOperations > 0,
      operations: operationTraces,
      effects: operationTraces,
    });

    return actionResult.executedOperations > 0;
  }

  hasDefinition(name: string): boolean {
    return this.definitionsByName.has(name);
  }

  private getRulePriority(ruleName: string): number {
    const priority = this.definitionsByName.get(ruleName)?.priority;
    return typeof priority === "number" && Number.isFinite(priority) ? priority : 0;
  }

  private getRuleRegistrationIndex(ruleName: string): number {
    return this.registrationIndexByRule.get(ruleName) ?? Number.MAX_SAFE_INTEGER;
  }

  private compareRuleNames(left: string, right: string): number {
    const priorityDelta = this.getRulePriority(right) - this.getRulePriority(left);
    if (priorityDelta !== 0) return priorityDelta;

    const registrationDelta = this.getRuleRegistrationIndex(left) - this.getRuleRegistrationIndex(right);
    if (registrationDelta !== 0) return registrationDelta;

    return left.localeCompare(right);
  }

  private getSortedRuleNames(ruleNames: Iterable<string>): string[] {
    return Array.from(ruleNames).sort((a, b) => this.compareRuleNames(a, b));
  }

  private getNow(): number {
    return (this.ctx.time?.getElapsed?.() ?? 0) + (getResource<number>(this.ctx, 'deltaTime', true) ?? 0);
  }
}

export const ruleModule = (ctx: ECSContext) => new RuleModule(ctx);

export function getRuleModule(ctx: ECSContext): RuleModule {
  const existing = ctx.modules.get("rule") as unknown as RuleModule | undefined;
  if (existing) return existing;
  const module = ruleModule(ctx);
  ctx.modules.set("rule", module as any);
  return module;
}
