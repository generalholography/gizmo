# World Definitions

World definitions are the durable scene and simulation format shared by the
engine, CLI, and MCP server.

## File Formats

Gizmo supports data and script worlds:

- `.json`: data-only world definitions. Prefer this for interchange and agent
  workflows.
- `.js` / `.mjs`: world scripts. These can execute code and should only come
  from trusted workspaces.

## Common Top-Level Concepts

A world can include:

- metadata such as title and description
- dimensions and world settings
- entities and their component bundles
- achievements
- module types and module instances
- stores and other durable simulation state

## Initialization and Serialization

Engine APIs:

```ts
import { initialize, serializeWorld } from '@gizmo3d/engine';
```

CLI workflow:

```bash
gizmo init ./my-world
gizmo resource full-world-state
```

MCP clients can read world state through resources such as
`world-state-summary`, `entity-list`, and `full-world-state`.

## Authoring Guidance

- Use stable IDs for repeatable automation.
- Keep JavaScript world scripts small and reviewable.
- Prefer generated automation resources over manual guessing when editing.
- Use rules as trigger + condition + actions.
- Use stores for durable simulation state that should not be hidden in ad hoc
  component fields.

## Related References

- [Concepts](../concepts.md)
- [Automation commands](../reference/automation-commands.generated.md)
- [Automation resources](../reference/automation-resources.generated.md)
