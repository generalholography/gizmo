import { ECSContext } from "../core/ecs";
import { EFFECT_TARGET_OPTIONS, EFFECT_TYPE_OPTIONS, Effect } from "../core/schema";
import {
  ConditionDefinition,
  ConditionTraceNode,
  ConditionTraceSource,
  evaluateConditionWithTrace,
} from "./condition";
import { applyEffect } from "./effect";
import {
  RuleTargetValidationIssue,
  RuleTriggerType,
  RuntimeRuleContext,
  assertRuleEffectTargetAtRuntime,
  validateRuleTargetsForTrigger,
} from "./ruleContextContracts";

export const ACTION_CONTROL_FLOW_TYPE_OPTIONS = ["sequence", "firstSuccess", "parallel", "if"] as const;
export const ACTION_TYPE_OPTIONS = [
  ...ACTION_CONTROL_FLOW_TYPE_OPTIONS,
  ...EFFECT_TYPE_OPTIONS,
] as const;
export type ActionType = typeof ACTION_TYPE_OPTIONS[number];

export const ACTION_PARALLEL_SUCCESS_POLICY_OPTIONS = ["all", "any"] as const;
export type ActionParallelSuccessPolicy = typeof ACTION_PARALLEL_SUCCESS_POLICY_OPTIONS[number];

export type ActionLeafDefinition = Effect;

export type ActionDefinition =
  | ActionLeafDefinition
  | { type: "sequence"; params: { actions: ActionDefinition[]; continueOnFailure?: boolean } }
  | { type: "firstSuccess"; params: { actions: ActionDefinition[] } }
  | { type: "parallel"; params: { actions: ActionDefinition[]; successPolicy?: ActionParallelSuccessPolicy } }
  | { type: "if"; params: { condition: ConditionDefinition; then: ActionDefinition; else?: ActionDefinition } };

export type ActionInput = ActionDefinition | Effect | Array<ActionDefinition | Effect> | null | undefined;

export type ActionTraceReason =
  | "action_applied"
  | "action_failed"
  | "sequence_complete"
  | "sequence_halted"
  | "sequence_empty"
  | "first_success_selected"
  | "first_success_failed"
  | "first_success_empty"
  | "parallel_complete"
  | "parallel_partial"
  | "if_then"
  | "if_else"
  | "if_unmet"
  | "target_unavailable_for_trigger"
  | "missing_context_value"
  | "invalid_action";

export type ActionOperationTrace = {
  path: string;
  type: string;
  target: string;
  success: boolean;
  executed: boolean;
  reason: ActionTraceReason;
  message?: string;
};

export type ActionTraceNode = {
  type: string;
  passed: boolean;
  reason: ActionTraceReason;
  details?: Record<string, unknown>;
  conditionTrace?: ConditionTraceNode;
  children?: ActionTraceNode[];
};

export type ActionExecutionResult = {
  passed: boolean;
  executedOperations: number;
  successfulOperations: number;
  operationTraces: ActionOperationTrace[];
  trace: ActionTraceNode;
};

export type ActionExecutionOptions = {
  triggerType: RuleTriggerType;
  conditionTraceSource?: ConditionTraceSource;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEffectType(type: unknown): type is (typeof EFFECT_TYPE_OPTIONS)[number] {
  return typeof type === "string" && (EFFECT_TYPE_OPTIONS as readonly string[]).includes(type);
}

function isControlActionType(type: unknown): type is (typeof ACTION_CONTROL_FLOW_TYPE_OPTIONS)[number] {
  return typeof type === "string" && (ACTION_CONTROL_FLOW_TYPE_OPTIONS as readonly string[]).includes(type);
}

function normalizeEffectTarget(value: unknown): "self" | "other" | "user" {
  if (typeof value === "string" && (EFFECT_TARGET_OPTIONS as readonly string[]).includes(value)) {
    return value as "self" | "other" | "user";
  }
  return "self";
}

function isEffectLike(value: unknown): value is Effect {
  return isRecord(value) && isEffectType(value.type);
}

function normalizeEffect(effect: unknown): Effect {
  if (!isEffectLike(effect)) {
    return {
      type: "emitEvent",
      target: "self",
      params: { name: "invalid_effect_placeholder" },
    };
  }

  const source = effect as Effect;
  const base = {
    ...source,
    target: normalizeEffectTarget(source.target),
    params: (isRecord(source.params) ? source.params : {}) as Effect["params"],
  } as Effect;

  if (Array.isArray(source.onSuccess)) {
    base.onSuccess = source.onSuccess.map((entry) => normalizeEffect(entry));
  }

  if (Array.isArray(source.onFailure)) {
    base.onFailure = source.onFailure.map((entry) => normalizeEffect(entry));
  }

  return base;
}

function normalizeActionNode(value: unknown): ActionDefinition {
  if (Array.isArray(value)) {
    return {
      type: "sequence",
      params: {
        actions: value.map((entry) => normalizeActionNode(entry)),
      },
    };
  }

  if (isEffectLike(value)) {
    return normalizeEffect(value) as ActionDefinition;
  }

  if (!isRecord(value) || typeof value.type !== "string") {
    return {
      type: "sequence",
      params: {
        actions: [],
      },
    };
  }

  const params = isRecord(value.params) ? value.params : {};

  if (isEffectType(value.type)) {
    return normalizeEffect(value) as ActionDefinition;
  }

  if (value.type === "sequence") {
    return {
      type: "sequence",
      params: {
        actions: Array.isArray(params.actions)
          ? params.actions.map((entry) => normalizeActionNode(entry))
          : [],
        continueOnFailure: params.continueOnFailure === true,
      },
    };
  }

  if (value.type === "firstSuccess") {
    return {
      type: "firstSuccess",
      params: {
        actions: Array.isArray(params.actions)
          ? params.actions.map((entry) => normalizeActionNode(entry))
          : [],
      },
    };
  }

  if (value.type === "parallel") {
    const successPolicy = typeof params.successPolicy === "string" &&
      (ACTION_PARALLEL_SUCCESS_POLICY_OPTIONS as readonly string[]).includes(params.successPolicy)
      ? (params.successPolicy as ActionParallelSuccessPolicy)
      : "all";

    return {
      type: "parallel",
      params: {
        actions: Array.isArray(params.actions)
          ? params.actions.map((entry) => normalizeActionNode(entry))
          : [],
        successPolicy,
      },
    };
  }

  if (value.type === "if") {
    const condition = isRecord(params.condition)
      ? (params.condition as ConditionDefinition)
      : ({ type: "always", params: {} } as ConditionDefinition);

    return {
      type: "if",
      params: {
        condition,
        then: normalizeActionNode(params.then),
        else: params.else !== undefined ? normalizeActionNode(params.else) : undefined,
      },
    };
  }

  if (isControlActionType(value.type)) {
    return {
      type: "sequence",
      params: { actions: [] },
    };
  }

  return {
    type: "sequence",
    params: {
      actions: [],
    },
  };
}

export function normalizeActionDefinition(action: ActionInput): ActionDefinition {
  return normalizeActionNode(action);
}

export function buildActionSequenceFromEffects(effects: Effect[] | undefined): ActionDefinition {
  return normalizeActionDefinition(effects ?? []);
}

function isControlNode(node: ActionDefinition): node is Exclude<ActionDefinition, ActionLeafDefinition> {
  return node.type === "sequence" || node.type === "firstSuccess" || node.type === "parallel" || node.type === "if";
}

export function validateActionTargetsForTrigger(
  triggerType: RuleTriggerType,
  action: ActionInput,
  pathPrefix = "actions",
): RuleTargetValidationIssue[] {
  const normalized = normalizeActionDefinition(action);

  const collect = (node: ActionDefinition, path: string, issues: RuleTargetValidationIssue[]): void => {
    if (!isControlNode(node)) {
      const actionIssues = validateRuleTargetsForTrigger(triggerType, [node as Effect], path);
      issues.push(...actionIssues);
      return;
    }

    if (node.type === "sequence" || node.type === "firstSuccess" || node.type === "parallel") {
      const children = node.params.actions;
      for (let i = 0; i < children.length; i++) {
        collect(children[i], `${path}.params.actions[${i}]`, issues);
      }
      return;
    }

    if (node.type === "if") {
      collect(node.params.then, `${path}.params.then`, issues);
      if (node.params.else) {
        collect(node.params.else, `${path}.params.else`, issues);
      }
    }
  };

  const issues: RuleTargetValidationIssue[] = [];
  collect(normalized, pathPrefix, issues);
  return issues;
}

function mergeResults(
  trace: ActionTraceNode,
  children: ActionExecutionResult[],
  passed: boolean,
): ActionExecutionResult {
  let executedOperations = 0;
  let successfulOperations = 0;
  const operationTraces: ActionOperationTrace[] = [];

  for (const child of children) {
    executedOperations += child.executedOperations;
    successfulOperations += child.successfulOperations;
    operationTraces.push(...child.operationTraces);
  }

  return {
    passed,
    executedOperations,
    successfulOperations,
    operationTraces,
    trace: {
      ...trace,
      children: children.map((entry) => entry.trace),
    },
  };
}

function executeNode(
  ctx: ECSContext,
  action: ActionDefinition,
  runtimeContext: RuntimeRuleContext,
  options: ActionExecutionOptions,
  path: string,
): ActionExecutionResult {
  if (!isControlNode(action)) {
    const operation = action as Effect;
    const assertion = assertRuleEffectTargetAtRuntime(options.triggerType, operation, runtimeContext);

    if (assertion.valid === false) {
      const reason = assertion.reason;
      return {
        passed: false,
        executedOperations: 0,
        successfulOperations: 0,
        operationTraces: [{
          path,
          type: operation.type,
          target: operation.target ?? "self",
          success: false,
          executed: false,
          reason,
          message: assertion.message,
        }],
        trace: {
          type: operation.type,
          passed: false,
          reason,
          details: {
            actionType: operation.type,
            target: operation.target ?? "self",
            message: assertion.message,
          },
        },
      };
    }

    const success = applyEffect(
      ctx,
      operation,
      runtimeContext.self,
      runtimeContext.other,
      undefined,
      runtimeContext.user,
    );

    return {
      passed: success,
      executedOperations: 1,
      successfulOperations: success ? 1 : 0,
      operationTraces: [{
        path,
        type: operation.type,
        target: operation.target ?? "self",
        success,
        executed: true,
        reason: success ? "action_applied" : "action_failed",
      }],
      trace: {
        type: operation.type,
        passed: success,
        reason: success ? "action_applied" : "action_failed",
        details: {
          actionType: operation.type,
          target: operation.target ?? "self",
        },
      },
    };
  }

  if (action.type === "sequence") {
    const childResults: ActionExecutionResult[] = [];
    const children = action.params.actions;

    if (children.length === 0) {
      return {
        passed: true,
        executedOperations: 0,
        successfulOperations: 0,
        operationTraces: [],
        trace: {
          type: "sequence",
          passed: true,
          reason: "sequence_empty",
        },
      };
    }

    let passed = true;
    let halted = false;
    const continueOnFailure = action.params.continueOnFailure === true;

    for (let i = 0; i < children.length; i++) {
      const result = executeNode(ctx, children[i], runtimeContext, options, `${path}.params.actions[${i}]`);
      childResults.push(result);
      if (!result.passed) {
        passed = false;
        if (!continueOnFailure) {
          halted = true;
          break;
        }
      }
    }

    return mergeResults(
      {
        type: "sequence",
        passed,
        reason: halted ? "sequence_halted" : "sequence_complete",
        details: {
          continueOnFailure,
          halted,
        },
      },
      childResults,
      passed,
    );
  }

  if (action.type === "firstSuccess") {
    const childResults: ActionExecutionResult[] = [];
    const children = action.params.actions;

    if (children.length === 0) {
      return {
        passed: false,
        executedOperations: 0,
        successfulOperations: 0,
        operationTraces: [],
        trace: {
          type: "firstSuccess",
          passed: false,
          reason: "first_success_empty",
        },
      };
    }

    let selectedIndex = -1;
    for (let i = 0; i < children.length; i++) {
      const result = executeNode(ctx, children[i], runtimeContext, options, `${path}.params.actions[${i}]`);
      childResults.push(result);
      if (result.passed) {
        selectedIndex = i;
        break;
      }
    }

    const passed = selectedIndex >= 0;
    return mergeResults(
      {
        type: "firstSuccess",
        passed,
        reason: passed ? "first_success_selected" : "first_success_failed",
        details: {
          selectedIndex,
        },
      },
      childResults,
      passed,
    );
  }

  if (action.type === "parallel") {
    const children = action.params.actions;
    const childResults = children.map((entry, index) =>
      executeNode(ctx, entry, runtimeContext, options, `${path}.params.actions[${index}]`),
    );

    const policy = action.params.successPolicy ?? "all";
    const passed = policy === "any"
      ? childResults.some((entry) => entry.passed)
      : childResults.every((entry) => entry.passed);

    return mergeResults(
      {
        type: "parallel",
        passed,
        reason: passed ? "parallel_complete" : "parallel_partial",
        details: {
          successPolicy: policy,
        },
      },
      childResults,
      passed,
    );
  }

  if (action.type === "if") {
    const conditionTrace = evaluateConditionWithTrace(
      ctx,
      action.params.condition,
      {
        defaultSubject: runtimeContext.self,
        context: {
          self: runtimeContext.self,
          other: runtimeContext.other,
          user: runtimeContext.user,
        },
      },
      {
        source: options.conditionTraceSource,
      },
    );

    if (conditionTrace.passed) {
      const thenResult = executeNode(ctx, action.params.then, runtimeContext, options, `${path}.params.then`);
      return {
        ...thenResult,
        trace: {
          type: "if",
          passed: thenResult.passed,
          reason: "if_then",
          conditionTrace: conditionTrace.node,
          children: [thenResult.trace],
        },
      };
    }

    if (action.params.else) {
      const elseResult = executeNode(ctx, action.params.else, runtimeContext, options, `${path}.params.else`);
      return {
        ...elseResult,
        trace: {
          type: "if",
          passed: elseResult.passed,
          reason: "if_else",
          conditionTrace: conditionTrace.node,
          children: [elseResult.trace],
        },
      };
    }

    return {
      passed: false,
      executedOperations: 0,
      successfulOperations: 0,
      operationTraces: [],
      trace: {
        type: "if",
        passed: false,
        reason: "if_unmet",
        conditionTrace: conditionTrace.node,
      },
    };
  }

  return {
    passed: false,
    executedOperations: 0,
    successfulOperations: 0,
    operationTraces: [],
    trace: {
      type: "unknown",
      passed: false,
      reason: "invalid_action",
    },
  };
}

export function executeActionDefinition(
  ctx: ECSContext,
  action: ActionInput,
  runtimeContext: RuntimeRuleContext,
  options: ActionExecutionOptions,
): ActionExecutionResult {
  const normalized = normalizeActionDefinition(action);
  return executeNode(ctx, normalized, runtimeContext, options, "actions");
}
