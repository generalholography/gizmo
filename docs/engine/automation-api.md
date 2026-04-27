# Automation API

The engine automation layer is the shared contract behind the CLI and MCP
server. It exposes structured commands for mutations and resources for read-only
state.

## Public Entrypoints

```ts
import {
  HeadlessWorldSession,
  listAutomationCommands,
  listAutomationResourceDefinitions,
} from '@gizmo3d/engine/automation';
```

Available package subpaths:

- `@gizmo3d/engine/automation`
- `@gizmo3d/engine/automation/world`
- `@gizmo3d/engine/automation/definitions`
- `@gizmo3d/engine/automation/commands`
- `@gizmo3d/engine/automation/resources`
- `@gizmo3d/engine/automation/session`
- `@gizmo3d/engine/automation/headless`

## Commands

Automation commands are structured calls with a name and parameter object. Many
commands mutate world state and persist the backing world file when the session
is configured for auto-save.

Generated reference:

- [Automation commands](../reference/automation-commands.generated.md)
- [Automation commands JSON](../reference/automation-commands.generated.json)

## Resources

Automation resources are read-only views of the current session or world.

Generated reference:

- [Automation resources](../reference/automation-resources.generated.md)
- [Automation resources JSON](../reference/automation-resources.generated.json)

## Headless Sessions

Headless sessions edit a world file without a browser canvas. They are useful for
agent workflows that do not require rendering.

```ts
import { HeadlessWorldSession } from '@gizmo3d/engine/automation/headless';

const session = await HeadlessWorldSession.open({
  worldFilePath: '/absolute/path/to/world.json',
  autoSave: true,
});

const summary = await session.readResource('world-state-summary');
await session.executeCommand('add-entity', { archetypeOrDef: 'cube' });
await session.close?.();
```

## Safety

Opening JavaScript/MJS worlds can execute code. Only run automation sessions
against trusted workspaces and world files.
