# Changelog

All notable changes to the AI Game Engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-03-06

### Changed
- Bumped engine version to `0.3.0`
- Canonicalized Simulation and Geometry schema

## [0.2.0] - 2025-11-23

### Added
- New `predicate` module for flexible condition evaluation in achievements and game logic
- Support for multiple predicate types:
  - `greaterThanOrEqual`: Numeric comparison predicates
  - `equals`: Exact equality checks
  - `sum`: Sum multiple metrics before comparison
  - `custom`: Custom evaluation functions for complex logic
  - `and`: Logical AND of multiple predicates
  - `or`: Logical OR of multiple predicates
- Comprehensive test coverage for predicates module
- Tests for achievements system with predicates

### Changed
- **BREAKING**: Achievement schema now uses `predicate` field instead of `currentValue` and `targetValue` functions
  - Old format: `{ description, currentValue: (eid) => value, targetValue: number }`
  - New format: `{ description, predicate: { type, params } }`
- Updated all 11 example worlds to use new predicate-based achievement schema
- `Achievement` type renamed from `Goal` in exports

### Migration Guide
To migrate existing achievements to the new schema:

**Before (0.1.0):**
```javascript
achievements.set('First Item', {
  description: 'Pick up your first item',
  currentValue: (eid) => metrics.get(eid, 'items picked up'),
  targetValue: 1
});
```

**After (0.2.0):**
```javascript
achievements.set('First Item', {
  description: 'Pick up your first item',
  predicate: {
    type: 'greaterThanOrEqual',
    params: {
      metric: 'items picked up',
      targetValue: 1
    }
  }
});
```

For sum operations:
**Before:**
```javascript
currentValue: (eid) => 
  metrics.get(eid, 'discoveries', 'Type A') +
  metrics.get(eid, 'discoveries', 'Type B')
```

**After:**
```javascript
predicate: {
  type: 'sum',
  params: {
    metrics: [
      { metric: 'discoveries', subtype: 'Type A' },
      { metric: 'discoveries', subtype: 'Type B' }
    ],
    targetValue: 10
  }
}
```

## [0.1.0] - Previous Release
Initial release with basic achievement system using function-based evaluation.
