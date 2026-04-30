---
name: gizmo-module-author
description: Create, inspect, update, and remove Gizmo runtime module types and module instances using automation commands and catalogs. Use when authoring custom fields, materials, meshes, colliders, or persisted runtime factory source.
license: Apache-2.0
compatibility: Requires the gizmo CLI and trusted JavaScript factory source.
---

# Gizmo Module Author

Use this skill when editing Gizmo module types or module instances.

## Safety

Persisted runtime module types can include JavaScript factory source. Treat
factory source like executable project code. Do not add or run module factories
from untrusted sources.

## Inspect Catalogs

```bash
gizmo resource module-type-catalog
gizmo resource module-instance-catalog
```

Use these before changing module definitions.

## Commands

Relevant automation commands:

- `upsert-module-type`
- `remove-module-type`
- `upsert-module-instance`
- `remove-module-instance`

Read the generated command reference before constructing parameters:

- `docs/reference/automation-commands.generated.md`

## Authoring Guidance

- Keep factory source small and reviewable.
- Include a useful description and parameter schema when registering a module
  type.
- Prefer named module instances for reusable configured definitions.
- Re-read catalogs after each mutation.
- If a module affects rendering, validate with a live session screenshot.

## References

- Concepts: `docs/concepts.md`
- Engine automation API: `docs/engine/automation-api.md`
- Automation commands: `docs/reference/automation-commands.generated.md`
- Automation resources: `docs/reference/automation-resources.generated.md`
- Security: `SECURITY.md`
