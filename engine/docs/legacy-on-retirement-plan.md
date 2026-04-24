# Legacy `On*` Retirement Plan (Phase 2)

This document defines hard milestones for retiring legacy gameplay `On*` syntax while preserving save/load interoperability.

## Scope

Deprecated gameplay channels:
- `OnInteract`
- `OnPrimaryAction`
- `OnSecondaryAction`
- `OnCollisionEnter`
- `OnEntityInRange`
- `OnTimeElapsed`
- `OnDie`

Out of scope for this plan:
- Non-gameplay legacy world schema compatibility (top-level entity shape/layout compatibility).

## Milestones

1. `M1` Runtime enforcement (completed)
- Runtime rejects deprecated `On*` gameplay components at spawn/apply-bundle.
- Rule execution path is the single supported runtime gameplay channel.

2. `M2` Visibility + tracking (completed)
- Run `node scripts/report-legacy-on-usage.mjs` to track where legacy syntax still exists.
- Use `--fail-runtime` to gate CI/runtime code paths if needed.

3. `M3` Migration support (completed)
- JSON migration support script:
  - `node scripts/migrate-legacy-on-bundles.mjs <input.json> [output.json]`
  - `node scripts/migrate-legacy-on-bundles.mjs <input.json> --in-place`
- Converts legacy `On*` bundle components into `Rules` entries.

4. `M4` Content migration (open, content work)
- Migrate world/archetype content files away from `On*` syntax.
- Keep migration commits scoped by world/content pack to simplify review.

5. `M5` Final cleanup (open, post-content migration)
- Remove legacy `On*` component definitions and remaining compatibility-only tests that are no longer relevant.

## Operating guidance

- Before large refactors, run:
  - `node scripts/report-legacy-on-usage.mjs`
- After migrating bundle JSON, verify behavior with focused gameplay regression tests in the affected domain.
