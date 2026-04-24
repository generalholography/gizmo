/**
 * Legacy compatibility shim.
 *
 * The canonical condition system lives in `modules/condition.ts`.
 * New code should use `ConditionDefinition` and `conditionModule`.
 */

export {
  conditionModule as predicateModule,
  evaluateCondition as evaluatePredicate,
  getConditionModule as getPredicateModule,
  resolveConditionSubject as resolvePredicateSubject,
  type ConditionDefinition as PredicateDefinition,
  type ConditionEvaluationInput as PredicateEvaluationInput,
  type ConditionEvaluator as PredicateEvaluator,
  type ConditionSubjectRef as PredicateSubjectRef,
} from "./condition";
