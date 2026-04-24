# Stores + Rules Implementation Review (Post-Migration)

## Purpose
This document is the consolidated end-to-end review of the current Stores/Rules implementation:

- What is robust and elegant today
- What is still brittle/hacky
- Which gaps most limit usefulness for diverse games/simulations
- A prioritized hardening + capability roadmap

It supersedes the previous ad-hoc migration investigation docs.

---

## Executive assessment

## P-1 update: legacy On* path deprecation audit status

A full runtime audit was completed specifically for legacy `On*` gameplay channels (`OnInteract`, `OnPrimaryAction`, `OnSecondaryAction`, `OnCollisionEnter`, `OnEntityInRange`, `OnTimeElapsed`, `OnDie`).

### What was changed in this P-1 pass
- Runtime now **hard-rejects** deprecated `On*` components in spawn/apply-bundle with an explicit migration error.
- Core component barrel exports no longer expose legacy `On*` components, preventing accidental reintroduction through normal runtime imports.
- Cooldown update runtime no longer processes legacy `On*` cooldown component state; it is now Rules-only for active gameplay cooldown behavior.
- Added regression test coverage that spawn rejects legacy `On*` syntax.

### What legacy syntax/code should NOT be removed right now
- **World schema compatibility not related to `On*` gameplay channels** (for example legacy world layout/top-level entity shape handling) should remain for save/load interoperability.
- Legacy content files may still contain `On*` syntax as historical data, but they are now considered **unsupported content** until migrated.

### Definition of done for deprecation
- No runtime path should execute `On*` gameplay channels.
- Any attempted use must fail fast with migration guidance.
- Rules/Stores remain the single supported gameplay path.

---

### Overall
The migration achieved an important architectural unification: behavior is now largely represented as `Rules` (trigger + condition + effects) and durable simulation state can live in `Stores`.

### Current quality score (high-level)
- **Robustness:** 6.5/10
- **Extensibility:** 7/10
- **Elegance/consistency:** 6/10
- **Scalability (authoring/runtime):** 5.5/10

### Why this is a meaningful improvement
- There is now a shared behavioral substrate (`RuleModule`) instead of many separate `On*` execution channels.
- `EntityStore` gives a reusable typed backing store model with serialization hooks.
- Spawn/despawn compatibility paths allow migration without hard breakage.

### Why the architecture is not “done”
The system still has transitional seams that reduce confidence and composability:
- Mixed legacy + modern runtime paths
- Context/target semantics that are easy to misuse
- Rule execution and sensor/raycast assumptions scattered across systems
- Limited condition/composition expressiveness compared to effects

---

## What is good in the current long-term shape

## 1) Rules as a first-class runtime module
`RuleModule` now indexes and evaluates rule definitions by engine trigger and event trigger, tracks runtime state (cooldown/timers), and supports entity-level replace/remove semantics.

**Strengths**
- Unified trigger dispatch model (`emitEngineTrigger`, global event queue)
- Per-entity introspection APIs useful for UI and systems
- Serialization-friendly cooldown state support

**Implication**
This is a credible foundation for generalized simulation behavior authoring.

## 2) Stores as named typed instances
`entityStore` now supports store type registration and instance registration, including stock-like stores and inventory-related state.

**Strengths**
- Clear lifecycle for per-entity data
- Portable serialization hooks
- Enables domain data to move out of ad-hoc components over time

**Implication**
This is the right primitive for broad simulation portability.

## 3) Backward-compatibility strategy exists
Spawn/despawn conversion logic and bridging paths make it possible to migrate progressively.

**Strengths**
- Practical for real projects with lots of existing archetypes/worlds
- Low-risk adoption

**Implication**
We can keep shipping while converging architecture.

---

## Current fragility / hackiness review

## A) Transitional dual-path complexity (high priority)
Many systems still effectively support both:
- Rules-driven behavior
- Legacy `On*` semantics / component expectations

This increases code path count and regression surface. The same gameplay concept can be represented in multiple ways and behave slightly differently.

**Risk**
- Hard-to-reproduce inconsistencies
- Tooling confusion (“which path actually fired?”)
- Ongoing bug-fix cost remains high

## B) Effect context + target semantics are too implicit (high priority)
`self`, `other`, `user` targeting works, but context meaning changes by trigger source and caller. Behavior remains easy to misconfigure (recent `target: "user"` issue is evidence).

**Risk**
- Authoring mistakes that are valid syntax but wrong behavior
- Hidden coupling between systems and effect runtime assumptions

## C) Trigger/range mechanics are distributed across systems (high priority)
Range behavior currently depends on a combination of:
- Motion setup creating sensors from rule metadata
- Collision system managing sensor pair state
- Motion control performing raycast-based target resolution

This is powerful but not centralized, making edge cases easy to create (e.g., pass-through sensors vs collision, self-use actions vs look target).

**Risk**
- New trigger types or targeting modes become expensive to add safely

## D) Type/schema/runtime drift still possible (medium-high)
Effect and rule shape changes require synchronized updates across:
- Runtime execution
- Schema definitions
- Editor forms
- Example data

This has already drifted multiple times.

**Risk**
- Build/runtime pass but editor/data authoring broken (or vice versa)

## E) Rules are composable on effects, but not yet on conditions/logic flow (medium)
Current model gives `onTrue/onFalse` and per-effect success/failure chains, but condition modeling is comparatively limited and awkward for larger simulations.

**Risk**
- Complex behavior devolves into effect-chain spaghetti
- Hard to debug/visualize branching logic

## F) Observability/debuggability is weak for runtime behavior (medium)
We lack a first-class tracing/inspection model for:
- Which rule fired
- Why condition passed/failed
- Which effect failed and why
- Which trigger context values were used

**Risk**
- Slow diagnosis of simulation bugs
- Fragile content iteration at scale

---

## Functional capability gaps (what we support vs don’t)

## Currently supports well
- Engine event triggers: interact/collision/range/die/action
- Global event triggers
- Time/interval style scheduling
- Effect chaining with success/failure
- Store-backed persistent state and serialization

## Missing or limited for broad simulation goals

1. **Richer logic composition**
   - No first-class rule graph / reusable condition blocks
   - No explicit control-flow nodes (sequence, selector, parallel, guard)

2. **Dataflow and local variables**
   - No standardized per-rule temporary state/variables
   - Limited ability to pass structured values across chained effects

3. **Deterministic simulation mode controls**
   - Not clearly enforcing deterministic ordering across all trigger sources
   - Missing explicit priority/order configuration for competing rules

4. **Spatial query abstraction**
   - Range/proximity semantics are split and partly TODO-ish
   - No unified query API for “nearest N”, cone checks, LOS variants, etc.

5. **Multi-entity transactional updates**
   - No transaction boundaries / rollback semantics for effect chains
   - Partial success in multi-step chains can leave awkward intermediate state

6. **Tooling-level safety**
   - Limited static validation for impossible target contexts
   - Limited authoring-time warnings for ambiguous range/target combinations

---

## High-priority low-hanging improvements

## Priority 0 (immediate hardening)

1. **Define and enforce trigger context contracts**
   - Document for each trigger: guaranteed `self`, `other`, `user` meaning
   - Add runtime assertion + editor validation when effects request unavailable context targets

2. **Add a single “target resolution table” abstraction**
   - One resolver used by all effect application pathways
   - Remove duplicated/implicit target logic

3. **Rule execution trace hooks (dev-mode)**
   - Emit structured trace entries: trigger -> condition -> effects -> result
   - Include reason codes for skipped/fail cases

4. **Schema/runtime/editor parity tests as CI gate**
   - Auto-check every effect type and target option exists in all layers
   - Fail fast when drift occurs

## Priority 1 (short-term architecture cleanup)

5. **Centralize spatial trigger mechanics**
   - Introduce a dedicated spatial trigger service/module
   - Move sensor/raycast/range interpretation out of scattered systems

6. **Deterministic rule ordering policy**
   - Define execution order (priority + stable tie-break)
   - Expose explicit rule priority field

7. **Legacy deprecation path with hard milestones**
   - Track remaining `On*` usage and remove dead paths phase-by-phase
   - Reduce dual-path maintenance burden

## Priority 2 (capability expansion)

8. **Condition DSL improvements**
   - Add reusable named conditions
   - Add richer boolean combinators and data comparisons without custom code

9. **Rule composition primitives**
   - Sequence/selector/parallel blocks
   - Local scoped variables for intermediate values

10. **Simulation inspector tooling**
   - In-editor live rule firing timeline
   - Store diff visualizer per entity

---

## Suggested target architecture (next stable shape)

## Rules
- Keep `RuleDefinition` as the core unit
- Add explicit fields:
  - `id`, `priority`, `enabled`, `cooldown`, `tags`
  - `trigger`
  - `condition` (composable DSL)
  - `actions` (replace naming ambiguity between effects and rule control flow)
- Introduce **RuleGraph** only when needed; don’t over-engineer prematurely

## Stores
- Keep named typed stores, but formalize:
  - Store schema metadata (for validation + editor)
  - Versioned serialization contracts
  - Optional replication/authority flags if multiplayer/networking is planned

## Runtime services
- Split cleanly into:
  - `RuleRuntime` (evaluation/order/cooldown)
  - `TriggerRuntime` (event/time/spatial feed)
  - `ActionRuntime` (effect execution + context/target resolution)
  - `StoreRuntime` (state API + transactions + snapshots)

This separation will reduce accidental coupling and make correctness testing easier.

---

## Recommended roadmap (practical)

## Phase 1: Hardening (1-2 sprints)
- Context contract docs + validation
- Target resolution unification
- Rule trace diagnostics
- Parity CI tests

## Phase 2: Simplification (2-3 sprints)
- Spatial trigger service extraction
- Deterministic ordering/priority
- Legacy path retirement plan + migration script support

## Phase 3: Power features (3+ sprints)
- Rich condition DSL + reusable condition libraries
- Rule composition primitives
- Advanced simulation inspector

---

## Phase 3 investigation (decision draft - 2026-02-24)

This section captures the structural decisions needed before implementation work proceeds.

## Design intent: “platonic simulation system”
The target is a domain-agnostic simulation core built from stable primitives that can be reused across gameplay systems:
- Trigger something
- Evaluate a condition against contextual entities/data
- Apply actions/effects to resolved targets
- Persist and inspect state

To get there, we should converge on **one canonical condition model** shared by Rules, Achievements, trigger condition checks, and future systems.

## Current structural findings

1. **Condition model is split**
   - Rules currently use `RuleCondition` wrapping `ConditionDefinition`.
   - Achievements use `ConditionDefinition` directly.
   - Trigger condition checks also use `ConditionDefinition`.
   - Result: similar behavior is represented with multiple shapes and evaluation entry points.

2. **Entity binding is not composable enough**
   - Rule condition checks currently require a fixed `entity` in condition params.
   - Achievements evaluate against dynamic entity context.
   - Result: shared condition definitions are harder than they should be; reuse is awkward.

3. **Condition vocabulary is narrow and metric-centric**
   - Strong support exists for metric comparisons/combinators.
   - Limited direct querying of stores/components/relationships.
   - Result: many simulation conditions require custom logic or rule/effect workarounds.

4. **`custom` condition weakens portability**
   - Arbitrary evaluator functions are powerful but difficult to serialize, validate, inspect, and safely author in tooling.
   - Result: weaker determinism/tooling confidence and reduced content portability.

## Decision criteria for Phase 3
- One canonical shape for conditions across systems
- Context-driven subject resolution (`self`/`other`/`user`/query results)
- Serialization/tooling friendliness first, runtime functions second
- Strong composability (named/reusable condition blocks)
- Deterministic, debuggable evaluation with traceable reason output

## Architectural options

## Option A: Minimal unification (lowest migration risk)
Unify on existing `PredicateDefinition` and remove `RuleCondition` wrapper, adding a small subject selector field where needed.

**Pros**
- Fastest path
- Minimal schema churn
- Lowest immediate migration cost

**Cons**
- Keeps metric-centric ceiling
- Keeps `custom` portability issue
- Delays true composable condition system

## Option B: Canonical Condition AST (recommended)
Introduce a new shared `ConditionDefinition` + `ValueExpression` model and adapt current condition inputs into it.

**Core shape (conceptual)**
- `ConditionDefinition`:
  - boolean: `all` / `any` / `not`
  - compare: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`
  - set/string helpers (later): `contains`, `matches`
- `ValueExpression`:
  - `literal`
  - `metric` lookup
  - `store` lookup
  - `component` lookup
  - computed aggregations (e.g., `sum`)
- `EntityRef`:
  - context refs: `self` / `other` / `user`
  - explicit entity id/stable id
  - entity query output (future)

**Pros**
- Single composable model for Rules + Achievements + trigger condition checks
- Better editor/schema/runtime parity
- Better inspector/tracing surface
- Direct path to richer simulation logic without effect-chain abuse

**Cons**
- Moderate migration effort
- Requires compatibility adapters during transition

## Option C: Full rule graph first
Prioritize behavior-tree/graph control flow immediately and treat conditions as graph nodes first.

**Pros**
- High expressive power
- Natural future for advanced authoring tools

**Cons**
- Highest complexity/risk now
- Over-rotates before core condition unification is complete

## Recommendation
Choose **Option B** now, then layer control-flow primitives incrementally (some Option C outcomes) after the condition substrate is stable.

This gives the best balance of elegance, robustness, and composability while preserving migration safety.

## Recommended Phase 3 execution plan

## Phase 3.1: Condition substrate unification
1. Introduce `ConditionDefinition` as new canonical schema/runtime type.
2. Add `ConditionRuntime` service:
   - compile/cache condition evaluators
   - evaluate with explicit context `{ self, other?, user? }`
   - emit reasoned trace payloads for inspector/debugging
3. Add adapters:
   - `ConditionDefinition (legacy alias shapes) -> canonical ConditionDefinition` (read compatibility)
   - optional reverse adapter for temporary tooling compatibility
4. Migrate Rule conditions to canonical conditions.
5. Migrate Achievements to canonical conditions.
6. Migrate trigger condition checks to canonical conditions.

## Phase 3.2: Reuse + composition primitives
1. Add named condition library entries (module-managed, serializable).
2. Add references/inlining for reusable conditions in rules/achievements.
3. Add scoped condition inputs (parameterized condition templates) where needed.

## Phase 3.3: Guarded control-flow expansion
1. Add rule action composition nodes (`sequence`, `selector`) only after condition runtime is stable.
2. Keep effect execution model compatible; do not require a hard action runtime rewrite in the same phase.

## Standard concepts/shapes to enforce
- `TriggerDefinition`: when to evaluate
- `ConditionDefinition`: whether to proceed
- `ActionDefinition`/`Effect`: what happens
- `EntityRef` + `ValueExpression`: how data is addressed
- `Store`/`Metrics`/Components: data backends behind common query interfaces

These should be the engine-wide nouns used consistently in schema, runtime, editor, and tests.

## Condition unification specifics (achievements + rules)

1. **Same condition object should be legal in both systems**
   - Achievements evaluate against an achievement subject entity.
   - Rules evaluate against trigger context subject refs.

2. **No fixed entity IDs in reusable condition definitions**
   - Entity selection should come from `EntityRef` bound at evaluation time.

3. **`custom` conditions become constrained escape hatches**
   - Mark as non-serializable or dev-only unless explicitly whitelisted.
   - Prefer module-registered named conditions for reusable specialized logic.

4. **Evaluation traces should be shared**
   - One trace shape for condition success/failure reasons, regardless of caller (rule/achievement/trigger).

## Migration and compatibility strategy
- Keep existing legacy condition alias definitions readable during transition.
- Auto-normalize old definitions to canonical AST at load/register time.
- Add deprecation warnings for legacy-only constructs.
- Provide codemod/migration helper once schema stabilizes.

## Test and acceptance plan for Phase 3

## Must-have tests
1. Condition equivalence tests:
   - legacy condition-alias definitions and canonical condition forms evaluate identically.
2. Cross-system parity tests:
   - same condition definition reused in rule + achievement yields consistent behavior.
3. Context binding tests:
   - `self`/`other`/`user` resolution works and fails with clear diagnostics.
4. Serialization tests:
   - canonical condition definitions round-trip without semantic drift.
5. Determinism tests:
   - repeated simulation runs produce same condition outcomes and ordering.

## Done criteria
- Rules, Achievements, and trigger condition checks all evaluate through one condition runtime.
- One canonical condition schema is documented and used by editor/runtime.
- Legacy condition alias input remains readable (with warnings), not required for new content.
- Build passes and relevant test suites pass with new parity/compat coverage.

---

## Final conclusion
The migration direction is fundamentally correct and worth continuing. We should **not** pivot away from Stores/Rules. The best return now is **hardening and simplification**, not adding many new features immediately.

If we execute Priority 0 + Priority 1 well, the architecture becomes substantially more robust, easier to reason about, and much more scalable for diverse game/simulation genres. After that, composability upgrades (conditions + control flow) will deliver significantly more value with less risk.

---

## Phase 3 post-migration assessment (2026-02-24)

This section reflects the implementation status after completing the Phase 3 condition migration workstream.

## What is now materially unified

1. **Canonical condition runtime is in place**
   - Runtime now has a dedicated `ConditionDefinition` system (`modules/condition.ts`) used as the primary evaluator.
   - `RuleModule` conditions evaluate through this runtime.
   - Trigger condition checks (`trigger.type = "condition"`) evaluate through this runtime.
   - Achievements now use canonical `condition` shape and evaluate through the same runtime.

2. **Schema and world data shape converged**
   - World schema achievement definitions use `condition`.
   - World initialize/serialize paths read/write `condition`.
   - Key content (example engine blob, stores/rules demo world, editor test world, and other world content) has been migrated to `condition` terminology and shape.

3. **Editor and MCP surface updated**
   - Simulation Stores/Rules editor trigger list now includes `condition` trigger type.
   - Achievement/progress UI and MCP resource output now reference `condition`.

4. **Compatibility boundary is explicit**
   - Legacy alias module `modules/predicate.ts` now acts as a compatibility shim over the canonical condition runtime rather than a separate execution engine.

## Closeness to “platonic simulation system” by layer

- **Engine runtime:** 8/10
  - Strong unification of behavior evaluation primitives (trigger + condition + effect).
  - Remaining gaps are mostly expressiveness and observability, not core fragmentation.

- **Editor authoring model:** 6.5/10
  - Editor can author condition triggers/conditions, but condition editing remains generic-object oriented (limited guided DSL UX).

- **DSL/schema coherence:** 7.5/10
  - Main rules/achievements/trigger DSL now converges on `condition`.
  - Still missing first-class named/reusable condition references and parameterized condition templates.

- **Content consistency:** 7.5/10
  - Major demo/key worlds now use condition-first shapes.
  - Broader docs/examples mostly use condition-first terminology.

## Remaining architectural deltas to platonic target

1. **Condition DSL is still metric-heavy**
   - Current `ValueExpression` support is useful but limited.
   - Missing first-class store/component/query-based value sources for truly domain-agnostic simulation conditions.

2. **Spawner conditional DSL is still separate**
   - Spawner selection `conditional` rules (altitude/noise/distance mini-DSL) remain distinct from canonical `ConditionDefinition`.
   - This is a real remaining “two condition languages” seam.

3. **Reusable condition library primitives are not yet first-class**
   - No named condition references/inlining/parameterization in authoring flow.
   - Reuse currently depends on manual duplication or code-time composition.

4. **Condition observability remains shallow**
   - Rules tracing exists, but no canonical condition evaluation tree/reason trace shared across rule/trigger/achievement callers.

5. **Custom evaluator constraints are not fully hardened**
   - `custom` remains powerful but can still weaken portability/determinism if overused.
   - Needs explicit policy/validation tiering (dev-only, allowlist, or non-serializable gate).

6. **Documentation parity is incomplete**
   - Some docs still describe legacy alias shapes in migration notes, creating minor authoring confusion risk.

## Practical read: how close are we?

We are now **close on architectural substrate** and **midway on full platform polish**:
- Core substrate convergence: **largely achieved**
- Authoring + tooling + docs + inspector coherence: **partially achieved**
- Full composable simulation language (reusable condition/action graph + deep diagnostics): **not yet achieved**

Overall closeness to the Phase 3 “platonic” target: **~75%**.

## Highest-leverage next steps (post-migration)

1. **Unify spawner conditional selection with canonical `ConditionDefinition`**
   - Remove parallel condition mini-DSL and use one evaluator model everywhere.

2. **Add named reusable condition library + parameterized references**
   - This unlocks true cross-system composition and content-scale maintainability.

3. **Implement condition evaluation reason tracing**
   - Shared trace format for rules/triggers/achievements, usable by simulation inspector tooling.

4. **Expand `ValueExpression` backends**
   - Add store/component/query value sources to move beyond metric-centric conditions.

5. **Close docs/editor parity**
   - Remove remaining legacy alias terminology from docs and tighten editor-side condition schema UX/validation.

---

## Post-migration next-step implementation (2026-02-24)

This section captures the implementation pass for the five highest-leverage next steps.

## What was implemented

1. **Spawner condition unification**
   - Spawner `selection.type = "conditional"` now evaluates canonical `ConditionDefinition`.
   - Removed the parallel altitude/noise/distance mini-DSL from selection rule shape.
   - Selection evaluation now passes standardized condition input with query context (`position`, `index`) and uses the same condition runtime as rules/achievements/triggers.

2. **Named reusable condition library + parameterized references**
   - Added `condition.type = "reference"` with `params.name` + `params.args`.
   - Added `ValueExpression` backend `parameter` for template-style condition arguments.
   - Named condition library entries are module-managed and serializable through existing module instance persistence.
   - Added content examples using reusable named conditions (engine blob, store/rule demo world, editor test world).

3. **Condition evaluation reason tracing**
   - Added canonical trace node/record types:
     - `ConditionTraceNode`
     - `ConditionEvaluationTrace`
     - `ConditionTraceSource`
   - Added `evaluateConditionWithTrace(...)` and trace emission resources:
     - `conditionTraceEnabled`
     - `conditionTraceCallbacks`
     - `conditionTraceBuffer`
   - Integrated trace emission across:
     - Rules (`rule` source metadata + rule trace embedding of condition tree)
     - Trigger condition checks (`trigger` source metadata + `lastConditionTrace`)
     - Achievements (`achievement` source metadata)

4. **`ValueExpression` backend expansion**
   - Added:
     - `store` backend (entity store path lookups)
     - `component` backend (component/field lookups)
     - `query` backend (pluggable query resolvers)
   - Added built-in query resolvers:
     - `positionAxis`
     - `distanceFromPoint`
     - `fieldSample`
     - `entityCount`

5. **Docs/editor parity tightening**
   - Updated world-init and trigger-context docs to condition-first terminology.
   - Added editor-side condition validation for rule condition payloads and condition-trigger payloads.
   - Added condition/value-expression shape checks in `SimulationStoresRulesEditor` validation path.

## Sanity check: platonic/standard/grokkable/powerful?

**Short answer:** materially closer, but not fully platonic yet.

- **Platonic core nouns are now coherent:** `TriggerDefinition`, `ConditionDefinition`, `ValueExpression`, `Effect`, `Store`.
- **Standard/composable shape quality:** good. The same condition runtime now drives rules, triggers, achievements, and spawner conditional selection.
- **Grokability:** improved. There is one condition language with references and parameterization instead of multiple parallel mini-DSLs.
- **Power:** substantially improved with store/component/query value backends and reusable references.

Remaining gaps to fully platonic:
- Rule/action control-flow primitives are still limited (`sequence`/`selector` style composition still pending).
- `custom` conditions still need stronger policy/guardrails for content portability and deterministic authoring.
- Editor UX still validates shape but does not yet provide a rich guided condition builder for deep nested trees.

Current closeness estimate after this pass: **~85%**.

---

## Roadmap to 95-100% platonic (2026-02-24)

This section is a deliberate step-back analysis of what remains to move from a strong substrate (~85%) to a truly platonic simulation system.

## Target definition (what “platonic” means here)

1. **One small canonical language** for simulation behavior:
   - `TriggerDefinition` (when)
   - `ConditionDefinition` + `ValueExpression` (whether/what data)
   - `ActionDefinition` (what happens + control flow)
2. **One canonical runtime pipeline**:
   - Trigger feed -> condition evaluation -> action graph execution -> state mutation
3. **One canonical authoring experience**:
   - Editor, schema, runtime, serializer, and content examples all speak the same nouns/shapes.
4. **One canonical observability model**:
   - shared trace tree + reason codes across rules/triggers/achievements/spawners.
5. **One canonical machine-facing DSL contract**:
   - predictable JSON shapes, strict schemas, deterministic semantics, excellent LLM promptability.

## Remaining gaps by priority

### P0: rule/action control flow substrate (largest value)

Current limitation:
- Actions are still effectively effect lists with limited branching (`onSuccess`/`onFailure`), which does not scale elegantly.

Needed change:
- Introduce a first-class `ActionDefinition` AST with explicit control-flow nodes, for example:
  - `effect` (leaf)
  - `sequence`
  - `selector` (first-success)
  - `parallel` (configurable success policy)
  - `if` (condition gate)
  - `forEach` / `mapTargets` (data-driven fan-out)
  - `setVar` / `let` (scoped runtime values)
  - `emit` / `callRule` (compositional hooks)

Determinism requirements:
- Stable ordering rules for children.
- Explicit parallel semantics (`all`, `any`, `quorum`) and merge strategy.
- Defined error policy (`halt`, `continue`, `fallback`).

### P0: naming + conceptual conventions

Current limitation:
- Some residual ambiguity between “effect”, “action”, “rule”, and trigger/condition naming in docs and content patterns.

Needed convention lock:
- Canonical terms:
  - `RuleDefinition`: top-level executable unit
  - `TriggerDefinition`: activation source
  - `ConditionDefinition`: boolean gate
  - `ActionDefinition`: control-flow + operations
  - `OperationDefinition` (formerly effect leaf)
- Reserve `effect` as implementation detail or legacy alias only.
- Publish strict naming standards:
  - type names: lowerCamel enum-like strings
  - params keys: stable, explicit, no overloaded synonyms
  - no dual-shape aliases in new content

### P0: full editor parity (not just validation)

Current limitation:
- Editor validates condition shapes, but complex conditions/actions remain generic object editing.

Needed editor completion:
- Guided condition builder:
  - tree UI for `all/any/not/reference/compare`
  - typed value-expression picker (`metric/store/component/query/parameter`)
  - inline preview of resolved subject/value and trace snippets
- Action graph builder:
  - node-based or structured block editor for `sequence/selector/parallel/if`
  - per-node policy controls (failure handling, retries, cooldown scopes)
- Reusable library panes:
  - named conditions/actions with parameter templates
  - reference insertion with argument mapping UI
- Live simulation inspector:
  - timeline of trigger->condition->action traces
  - diffed store/component changes per execution

### P1: serialization and schema hardening

Current limitation:
- Runtime remains permissive in places; compatibility and legacy paths can still blur canonical shapes.

Needed hardening:
- Versioned schema contracts for rules/conditions/actions:
  - strict schema per version
  - explicit normalizer/migrator pipeline
- Serialization invariants:
  - no function-valued fields in portable content (`custom` gated)
  - canonical ordering for deterministic snapshots
  - explicit persistence policy for runtime-only fields
- Add golden round-trip tests:
  - content -> normalize -> serialize -> deserialize -> normalize equivalence
  - semantic equivalence tests for traces and outcomes

### P1: LLM-facing DSL quality and constraints

Current limitation:
- The DSL is strong but not yet optimized as a constrained generation target.

Needed improvements:
- Publish machine-oriented JSON schema bundle:
  - one schema per major concept + one composed “world DSL” schema
- Add “authoring profile” constraints for LLMs:
  - required fields
  - forbidden legacy aliases
  - small allowed type vocabularies by context
- Provide canonical prompt examples:
  - simple/medium/advanced rule packs
  - reusable condition/action library examples
  - trace-driven debugging examples
- Add lint rules oriented for generated content:
  - unreachable branches
  - unresolved references
  - impossible target contexts
  - non-deterministic constructs in deterministic mode

### P1: policy for `custom` extensions

Current limitation:
- `custom` remains powerful but weakens portability and toolability when unconstrained.

Needed policy:
- Tiered execution modes:
  - `portable`: no `custom` runtime code
  - `trusted`: allow allowlisted custom evaluators/actions
  - `dev`: unrestricted
- Explicit serialization marker for non-portable nodes.
- Editor warning surface and export guardrails for non-portable content.

## Proposed canonical shapes (next revision)

`RuleDefinition`:
- `id`
- `enabled`
- `priority`
- `cooldown`
- `trigger: TriggerDefinition`
- `condition?: ConditionDefinition`
- `actions: ActionDefinition`
- `tags?: string[]`

`ActionDefinition` (discriminated union):
- `type: "operation" | "sequence" | "selector" | "parallel" | "if" | "forEach" | "setVar"`
- `params: ...`

`OperationDefinition`:
- `op: "damage" | "heal" | "emitEvent" | ...`
- `target`
- `params`
- `onSuccess?` and `onFailure?` only as legacy alias, not canonical forward shape

## Acceptance criteria for 95%

1. Action control-flow AST implemented and used by rules in runtime.
2. Editor can fully author/control-flow actions and nested conditions without raw JSON editing.
3. Shared trace tree includes action-node evaluation details and reason codes.
4. DSL schemas are versioned and enforced in serialization/load.
5. LLM generation profile + lint checks available and used in content pipeline.

## Acceptance criteria for 100%

1. No conceptual alias drift across runtime/editor/docs/content.
2. Portable mode prohibits non-serializable constructs by default.
3. Deterministic mode reproducibility proven with golden simulation runs.
4. Full inspector parity: trace + state diff + source mapping from world DSL nodes.
5. Canonical examples/archetypes demonstrate every core primitive in clean, minimal patterns.

## Practical delivery plan

1. **Phase A (P0)**: Action AST + runtime + trace integration.
2. **Phase B (P0/P1)**: Full editor authoring for condition/action trees + reference libraries.
3. **Phase C (P1)**: Schema/versioning hardening + portable/trusted/dev policy.
4. **Phase D (P1)**: LLM DSL packaging (schemas, lint, prompt patterns, regression corpus).

If executed cleanly, this closes the remaining gap from ~85% to a robust **95%+** platform, with **100%** achievable once deterministic/policy/editor parity is fully complete.

## Update: Control-Flow + Naming Standardization Pass (Current)

### What this pass completed

1. **Rule action substrate is now canonical and action-first**
   - `RuleDefinition` now uses canonical `actions` as the runtime-authored branch payload.
   - Legacy branch aliases (`onTrue` / `onFalse`) were removed from runtime authoring shape and migrated out of key content/tests.
   - Action control flow is represented via `ActionDefinition` nodes (`operation`, `sequence`, `selector`, `parallel`, `if`) and used directly by rule execution + tracing.

2. **Concept naming is tighter and more standard**
   - Canonical runtime terminology now centers on:
     - `RuleDefinition`
     - `TriggerDefinition`
     - `ConditionDefinition`
     - `ActionDefinition`
     - effect leafs as action operations
   - Public authoring examples now use condition/actions terminology rather than predicate/onTrue language.

3. **Dedicated `custom` type labels were removed where they harmed canonical shape**
   - Condition-side dedicated `custom` condition type was previously removed.
   - Spawner-side dedicated `'custom'` spawner type was removed and replaced with canonical `'composite'` spawner shape (placement + selection + constraints + hooks + optional trigger).
   - Extensibility remains module-backed via factory registration APIs, without reserving `'custom'` as a content type.

4. **Editor parity improved using shared canonical schemas**
   - Rule editor now uses canonical trigger options from `RULE_TRIGGER_TYPE_OPTIONS` (including `primaryAction` / `secondaryAction`).
   - Added shared editor condition schema (`ConditionDefinitionField`) and value-expression schema usage so action-if and rule conditions are authored from one shape source.
   - Rule validation remains strict for canonical condition/value-expression/action target semantics.

5. **LLM-facing docs updated to canonical model**
   - Quickstart now uses `condition` (achievements/rules) and `actions` terminology.
   - Quickstart condition guidance now reflects composable condition model (`compare`, `all`, `any`, `not`, `reference`) and module name `condition`.

### Net platonic impact after this pass

- **Rule/condition/action conceptual core:** materially closer to platonic.
- **Naming/convention drift:** significantly reduced.
- **Editor canonical-shape registration:** improved from validation-heavy generic objects to shared canonical schema wiring.
- **Extensibility posture:** cleaner (module-backed factories over reserved `custom` labels).

### Updated sanity check

Are the simulation DSL components platonic/standard/easily grokkable/powerful?

- **Yes, substantially more than before** for the core runtime DSL:
  - Rules are now clearly trigger + optional condition + canonical action graph.
  - Conditions are unified and reusable.
  - Spawner composition no longer depends on a special `custom` type label.
- **Still not 100%** due remaining gaps already identified (full guided editor UX for deep trees, richer control-flow nodes like `forEach`/scoped vars, stricter versioned schema/lint/policy layers).

Practical revised estimate after this pass: **~90% platonic for core runtime DSL**, with the remaining distance mainly in editor ergonomics + schema/policy hardening.

---

## Action/Condition Canonicalization Spec (Decision Draft - 2026-02-25)

This section defines the next transition with a specific decision gate: how tightly the authoring DSL should map to runtime substrate for action control flow and condition semantics.

## Goals for this transition

1. Eliminate conceptual ambiguity between `effect`, `operation`, and `action`.
2. Keep DSL/runtime/editor/schema names aligned and easily grokkable.
3. Remove redundant condition entry points and legacy metric-only condition variants.
4. Keep composability and power while reducing nesting burden for simple rules.
5. Ensure canonical content and tests remain first-class migration targets.

## Decision options: action substrate vs DSL mapping

### Option A (recommended): full conceptual collapse, 1:1 DSL <-> runtime AST

Model:
- Make `ActionDefinition` the only behavior node concept.
- Leaf actions are concrete operation actions (e.g., `damage`, `emitEvent`, `emitParticles`) rather than `type: "operation"` wrapper nodes.
- Control-flow actions are peer action types (`if`, `sequence`, `firstSuccess`, `parallel`).

Implications:
- Runtime executes one discriminated union directly.
- Editor shows one action type picker with both leaf and control-flow entries.
- Serialization is exactly the same shape the runtime executes (no compile/down-transform layer).

Pros:
- Maximum conceptual clarity and minimum DSL drift.
- Best LLM ergonomics (fewer wrappers, fewer special cases).
- Lower long-term maintenance and fewer schema parity failures.

Cons:
- Larger migration surface now (runtime, editor schemas, existing content, tests).
- Requires explicit migration for previously wrapped `operation` nodes.

### Option B: keep substrate wrapper, add shorthand DSL that compiles to runtime

Model:
- Runtime keeps `ActionDefinition` where leaf is `type: "operation"` with embedded operation/effect payload.
- Authoring DSL permits shorthand leaf action nodes and compiles them to wrapper nodes at normalize time.

Implications:
- Two equivalent representations exist by design.
- Runtime semantics remain stable with smaller immediate code churn.

Pros:
- Lower immediate implementation cost.
- Easier incremental rollout without broad runtime rewrites.

Cons:
- Permanent representational drift risk (DSL vs runtime shape).
- More confusion in tooling, docs, and debugging.
- Higher ongoing complexity for schema/editor/LLM guidance.

## Recommendation

Choose **Option A** (full conceptual collapse).  
Given the explicit preference to avoid declarative/runtime drift, Option A is the clean long-term shape and aligns best with platonic goals.

## Canonical shape after transition

### RuleDefinition
- `id?`
- `enabled?`
- `priority?`
- `cooldown?`
- `trigger: TriggerDefinition`
- `condition?: ConditionDefinition`
- `actions: ActionDefinition`

### TriggerDefinition (rules)
- Keep event/time/engine triggers.
- **Deprecate and remove `trigger.type = "condition"` for rules**.
- Trigger means only **when** to evaluate; condition means **whether** to run actions.

### ConditionDefinition (collapsed)
- Keep only:
  - `always`
  - `compare`
  - `reference`
  - `not`
  - `all`
  - `any`
- Remove from canonical surface:
  - `equals`
  - `greaterThanOrEqual`
  - `sum` (metric-specific top-level condition)

### ValueExpression
- Keep canonical backends:
  - `literal`
  - `parameter`
  - `metric`
  - `store`
  - `component`
  - `query`
  - `sum`

### ActionDefinition (Option A target)
- Control flow:
  - `sequence`
  - `firstSuccess` (rename from `selector`; keep temporary read alias only)
  - `parallel`
  - `if`
- Leaf actions:
  - current operation/effect set promoted to first-class action types (e.g., `damage`, `heal`, `emitEvent`, `emitParticles`, etc.).
- No `type: "operation"` wrapper in canonical serialized shape.

## Naming standard lock

1. Use `action` as the only authoring/runtime noun for executable behavior nodes.
2. Use `operation` only as migration/internal historical term; do not surface in editor labels.
3. Use `firstSuccess` instead of `selector` in canonical naming.
4. Keep compatibility aliases readable during migration, but never emit them in new serialization.

## Migration specification

### Runtime/API migration
1. Refactor `ActionDefinition` discriminated union to direct leaf action types.
2. Add compatibility normalizer:
   - reads legacy `operation` wrapper
   - reads legacy `selector`
   - emits canonical `ActionDefinition`.
3. Remove rule-level condition trigger execution path from `RuleModule`.
4. Keep condition evaluation unified through `ConditionModule`.

### Editor/schema migration
1. Replace action type enum in editor schemas:
   - remove `operation`
   - replace `selector` label/type with `firstSuccess` (optional temporary alias parser).
2. Present one unified action picker containing control-flow + leaf action types.
3. Remove legacy metric-only condition types from condition schema picker.
4. Ensure all trigger param schemas display correctly and only supported triggers appear.
5. Keep module-backed editing pattern consistent (single discriminator, no duplicate type fields).

### Content migration (must-update set)
1. Built-in archetypes under `engine/src/data/**`.
2. Example engine blob: `engine/src/exampleEngineBlob.js`.
3. Rules+stores demo world:
   - `engine/src/worlds/store-rule-demo-world.js`
   - `engine/public/worlds/store-rule-demo-world.js`
4. Editor test world:
   - `engine/src/worlds/editor-test-world.js`
   - `engine/public/worlds/editor-test-world.js`
5. Any remaining world/doc examples still using removed condition/action aliases.

### Docs + LLM-facing contract updates
1. `quickstart.md` and rule/condition docs updated to final canonical nouns only.
2. `schema.ts` / exposed schema resources updated to remove legacy types from public guidance.
3. Add a short “migration aliases accepted on load, never emitted on save” policy note.

## Testing and quality gates

### P0 test additions
1. Action canonicalization tests:
   - legacy wrapper/alias inputs normalize to canonical action AST.
2. Rule trigger tests:
   - rule condition trigger removed/rejected or migrated explicitly.
3. Condition collapse tests:
   - removed condition types rejected in canonical authoring paths.
4. Editor schema tests:
   - action type list contains canonical action/control-flow types.
   - condition type list contains only canonical types.
   - no duplicate discriminator/type fields.
5. Round-trip tests:
   - deserialize legacy -> normalize -> serialize emits canonical only.

### Regression/behavior tests
1. Rule execution trace semantics unchanged for equivalent behavior.
2. Demo world smoke tests (`store-rule-demo-world`) cover representative leaf + control flow actions.
3. Editor world load/save tests ensure no schema validation regressions.

### Build/test acceptance gates
1. `engine` build passes.
2. Existing rule/condition/editor test suites pass.
3. New canonicalization tests pass.
4. No snapshot/content fixture emits deprecated canonical forms.

## Rollout strategy

1. Implement runtime canonicalization + alias reader first.
2. Migrate editor schemas/UI to canonical emit.
3. Migrate content/examples/worlds.
4. Remove legacy canonical emit paths; keep read compatibility for one transition window.
5. After window, remove remaining alias readers if desired.

## Decision summary

If priority is a platonic, stable, grokkable system with minimal long-term confusion, pick **Option A**.  
If priority is minimum immediate churn, pick Option B, but accept sustained representational drift costs.

Given current goals and explicit preference for tight mapping, the spec recommends **Option A**.

## Option A migration implementation status (2026-02-25)

This section records the concrete implementation pass after choosing Option A (full conceptual collapse).

## Implemented in this pass

1. **Action substrate collapsed to canonical action-first shape**
   - Runtime `ActionDefinition` now treats leaf actions as direct effect/action nodes (no required `type: "operation"` wrapper).
   - Control-flow action nodes are canonical: `sequence`, `firstSuccess`, `parallel`, `if`.
   - Runtime still reads legacy `operation`/`selector` via normalizer for compatibility, but canonical serialization/runtime shape is action-first.

2. **Condition model collapsed to canonical types**
   - Canonical condition types now exposed as:
     - `always`
     - `compare`
     - `reference`
     - `not`
     - `all`
     - `any`
   - Legacy metric shortcuts (`greaterThanOrEqual`, `equals`, condition-level `sum`) are no longer canonical runtime/editor types.
   - A compatibility normalizer maps legacy inputs to canonical `compare`/`ValueExpression` forms.

3. **Rule trigger canonicalization**
   - Canonical rule trigger contracts and editor trigger options no longer include `trigger.type = "condition"`.
   - Rules now model polling as timer trigger (`interval`/`time`) + top-level `condition`.
   - Runtime includes a read-compatibility adapter for legacy condition-trigger bundles.

4. **Editor/schema parity updates**
   - Action editor schema now presents one canonical action list (leaf effect/action types + control-flow types).
   - Condition editor schema now presents canonical condition types only.
   - Rules editor trigger schema removes condition trigger authoring path.
   - Validation paths were updated to canonical condition expectations.

5. **Key content migrated**
   - `engine/src/exampleEngineBlob.js` achievements updated to canonical compare/value-expression shape.
   - `engine/src/worlds/store-rule-demo-world.js` action-if branches updated to direct leaf actions.
   - `engine/src/worlds/editor-test-world.js` action graph sample updated to direct leaf actions.
   - Synced public/demo mirrors:
     - `engine/public/worlds/store-rule-demo-world.js`
     - `engine/public/worlds/editor-test-world.js`
     - `web/public/engines/0.2.0/worlds/store-rule-demo-world.js`
     - `web/public/engines/0.2.0/worlds/editor-test-world.js`

6. **Coverage additions and updates**
   - Added editor schema parity tests for canonical action/condition options:
     - `src/core/editor/schema/__tests__/actionConditionSchemaParity.test.ts`
   - Updated rule/editor/condition tests to canonical action + condition shapes.
   - Updated spawn/despawn rule-shape test to canonical interval+condition form.

## Sanity check after implementation

Are the simulation components now platonic/standard/easily-grokkable/powerful?

- **Closer than prior state**:
  - canonical nouns and shapes are tighter (`trigger` + optional top-level `condition` + canonical action tree).
  - editor/runtime/schema naming drift is materially reduced.
  - canonical condition vocabulary is cleaner and composable.
- **Remaining delta**:
  - legacy-read adapters still exist for migration safety.
  - deeper editor UX (guided visual authoring for large action/condition trees) remains a follow-up.

Practical status after this pass: **core simulation DSL is now strongly canonicalized with Option A semantics**, with remaining work primarily in advanced editor UX and eventual removal of transitional read aliases.

---

## Store-side Platonic Review (2026-02-25)

This section is a focused post-rule audit of the **store substrate** and its coupling with rules/actions/conditions.

## Current store architecture status

### What is strong now
- `EntityStoreModule` has a clean two-level model:
  - store **types** (`registerStoreType`)
  - store **instances** (`registerStoreInstance`)
- Core built-in store types are standardized and serializable per-entity where needed:
  - `stock`, `inventory`, `stableIdSet`, `metrics`, `rules`, etc.
- Conditions already support store reads as first-class value expressions:
  - `ValueExpression.type = "store"` with `store`, `path`, `subject`, `defaultValue`.
- Spawn/despawn round-trip for `Stores` is robust enough for migration-era content:
  - authoring `Stores` payload
  - compatibility mirror fields (`Inventory`, `Stock`, `DiscoveredBy`, `PickedUpBy`)
  - deferred stable-id reference restoration.

### Platonic score (stores specifically)
- Robustness: **7/10**
- Conceptual clarity: **6/10**
- Composability with rules: **6/10**
- Editor/DSL parity: **5.5/10**

Net: store substrate is solid, but **write-path expressiveness and naming/shape unification are not yet platonic**.

## Major gaps and design debt

### 1) No canonical generic store-write action (highest impact)
Current actions can mutate stores only indirectly via bespoke effect logic (`damage`/`heal` -> health stock, `discover`, `getPickedUp`, inventory operations, metrics increments via specific effects/resources).

Gap:
- There is no canonical action family like:
  - `storeSet`
  - `storePatch`
  - `storeIncrement`
  - `storePush` / `storeRemove`
- As a result, many store types are readable in conditions but not uniformly writable in actions.

Impact:
- Limits cross-system composition.
- Encourages one-off effect types for what should be generic dataflow.

### 2) Runtime state split between “store” and “resource” concepts
`metrics` is treated as both:
- a runtime resource API (`Metrics`)
- an entity store persistence layer (`MetricsStore`)

This is workable but conceptually leaky:
- condition/value-expression reads from resource for `metric`, from entityStore for `store`.
- spawn/despawn synchronizes both paths.

Impact:
- Increases cognitive overhead and drift risk.
- Weakens “one canonical state substrate” story.

### 3) Store serialization shape still carries transitional duplication
Bundles can contain both:
- canonical `Stores`
- compatibility mirrors (`Inventory`, `Stock`, `DiscoveredBy`, `PickedUpBy`)

Impact:
- Saves are larger/noisier than necessary.
- More opportunities for precedence bugs (even though `Stores` is now authoritative where present).

### 4) Store typing/validation is too permissive for large-scale authoring
`store` value expressions and editor store values are path/string-driven with shallow validation.

Missing:
- typed path contracts per store instance/type
- static validation of path existence and value type
- schema-driven editor affordances for non-stock stores.

Impact:
- Late runtime failures/default-value fallbacks.
- Harder LLM/tooling guidance.

### 5) Store editor surface is intentionally narrow, but now underpowered
`SimulationStoresRulesEditor` currently narrows editable store types to:
- `inventory`
- `stock`
- `stableIdSet`

and filters out several runtime stores.

Impact:
- Good for safety, but blocks full module-backed composability vision.
- No clear path yet for “safe but complete” editing of advanced stores.

### 6) Naming cohesion still incomplete
We now have:
- canonical `conditions`/`actions` for behavior
- but store-facing data nouns are mixed (`metric`, `store`, `stock`, legacy “variables” in historical language)

Impact:
- DSL grokkability is good in rules, less unified on data/state side.

## Store ↔ rules integration assessment

### Already good
- Rule condition layer can query store/component/metric/query/literal/parameter uniformly via `ValueExpression`.
- Rule context subjects (`self`/`other`/`user`) apply cleanly to store reads.
- Tracing exists for conditions/rules/actions and can include store-backed comparisons.

### Not yet platonic
- **Asymmetry**: conditions can read arbitrary stores; actions cannot mutate arbitrary stores canonically.
- No canonical dataflow contract for “read value expression -> write store path”.
- No transaction semantics for multi-action multi-store updates.

## Highest-priority next steps (store side)

### P0: establish canonical store-write actions
Add built-in action types:
1. `storeSet`: write expression result to `store + path` on `subject`.
2. `storePatch`: shallow/deep merge object payload into target path.
3. `storeIncrement`: numeric delta update with clamp options.
4. `storeArray` ops (append/removeByValue/removeAt) only if needed after first pass.

Requirements:
- Reuse `ValueExpression` for inputs.
- Reuse rule context subject model (`self`/`other`/`user` + explicit entity id).
- Emit full action traces with before/after snippets (size-limited).

### P0: unify metrics/store write model
Pick one canonical path for authored simulation updates:
- either expose metrics as a standard store operation target
- or keep dedicated metric actions but define explicit bridging policy and naming in DSL/docs.

Target outcome:
- clear rule of thumb for authors + LLMs (“when to use metric vs store”).

### P1: tighten store schema and validation contracts
Introduce store type capability metadata:
- readable/writable flags
- supported operations
- path schema hints (optional JSON-path-like field schema)

Use this in:
- editor validation and field generation
- runtime guardrails for store-write actions.

### P1: collapse serialization to canonical store shape
Move toward:
- canonical emit: `Stores` + explicitly scoped runtime stores
- compatibility read-only ingestion for legacy `Inventory`/`Stock` mirrors
- eventual removal of duplicate emit paths.

### P1: expand editor parity safely
Keep guardrails, but make store editing module-backed and extensible:
- dynamic store type selectors for registered instances
- read-only/hidden classification from store metadata instead of hardcoded name filters
- better typed editing UX for store-specific values.

### P2: store-level composability enhancements
- optional derived/computed store values
- optional transactional action groups (all-or-nothing for multi-store updates)
- reusable named “state transforms” (parallel to named condition references).

## Recommended canonical direction

For platonic convergence, stores should become:
- the canonical **state substrate**
- with conditions as canonical **read/query substrate**
- and actions as canonical **write/transform substrate**

In short:
- **read = `ValueExpression`**
- **write = store-write actions**
- **orchestration = rule actions/control flow**

That closes the remaining asymmetry and gives a standard, grokkable, composable simulation architecture end-to-end.

---

## Merge-readiness audit update (2026-02-25)

Scope: runtime rules/stores implementation, migration completion, legacy syntax, and test coverage.  
Known exception acknowledged: converting all example worlds from legacy `On*` syntax is still pending.

## Verdict

Conditionally merge-ready for the new rules/stores runtime path, with a few high-priority gates to either fix before merge or explicitly accept as scoped debt.

## P0 (merge gates / one-way doors)

1. **Unsupported legacy syntax still dominates world content**
   - Current count in `engine/src/worlds`: **284** `On*` usages.
   - Runtime now hard-rejects `On*` at spawn (`spawn.ts`), so these worlds are effectively incompatible unless pre-migrated.
   - If any of these worlds are user-reachable in this release line, this is a hard gate.

2. **Compatibility normalization still accepts deprecated action spellings**
   - `action.ts` still normalizes legacy control-flow aliases (`operation`, `selector`) instead of hard-failing.
   - This is convenient for migration, but it is a one-way-door risk: malformed/legacy authored content can silently pass and drift further from canonical DSL.

3. **Test suite health is not globally green**
   - Targeted rules/stores suites are green, but full `engine` suite currently reports many failures.
   - If CI policy requires global green, merge is blocked until baseline is clarified or failures are triaged/scoped.

## P1 (high-priority, should follow immediately)

1. **Legacy test surface still exercises deprecated component paths**
   - Several tests still import/use `OnPrimaryAction`/`OnInteract`/... component modules (for cooldown behavior and inventory edge cases).
   - This blurs migration completion signal and increases maintenance burden.

2. **Legacy artifacts remain in runtime-facing naming/comments**
   - Example: `killPlane.ts` comment still references `OnDie` behavior.
   - Example: `updateEffectTimers.ts` is a deprecated stub kept in tree.
   - Not functionally blocking, but these are confusion multipliers during stabilization.

3. **Coverage gaps for new store-write effects in full runtime context**
   - New effects (`add/remove inventory`, `incrementStock`, `set/incrementMetric`) have focused unit coverage and store-rule world assertions.
   - Missing: broader in-game/runtime loop assertions (trigger dispatch + persistence round-trip + editor-authored payload paths).

## P2 (post-merge hardening)

1. Tighten strictness in rule/action normalization with a switchable strict mode (`warn` -> `error` path).
2. Promote store-write semantics into formal capability metadata (writable store types, typed paths).
3. Expand merge-safety checks to include legacy-world detection thresholds in CI.

## Recommended buckets

### Bucket A: Must resolve before merge (if release-facing worlds are in scope)
- Enforce migration (or exclusion) for any world files that can be loaded by users.
- Decide CI stance for currently failing non-rules suites (block, quarantine, or baseline exception).

### Bucket B: Can merge with explicit debt ticket
- Keep alias normalization (`operation`/`selector`) only with telemetry/warnings and a scheduled removal milestone.
- Keep legacy component tests temporarily, but mark as compatibility-only and plan deletion.

### Bucket C: Next sprint quality push
- Add integration tests for new store-write effects through actual rule triggers and persistence reload.
- Clean legacy references in comments/docs/runtime stubs to reduce conceptual drift.
