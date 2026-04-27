# Concepts

The engine, CLI, and MCP server share the same core model.

## World

A world is a serializable scene and simulation definition. It can include
metadata, dimensions, entities, achievements, module definitions, stores, and
runtime-facing configuration.

Worlds can be loaded from JSON data files or JavaScript/MJS world scripts. JSON
is preferred for interchange; JavaScript world files are powerful but execute
code and should only come from trusted workspaces.

## Entity

An entity is a runtime object composed from components. Entities commonly have
components such as `Info`, `Transform`, `Body`, `Health`, `Inventory`, or
behavior-related rule data.

Automation commands target entities by stable ID (`stableId`). Stable IDs are
durable across serialized world saves and repeatable automation sessions.

## Component

A component is structured data attached to an entity. Components are the primary
way to describe what an entity is, how it renders, where it is, and how systems
interact with it.

The editor schema surface describes component fields and supports generic
editing in the UI and automation layer.

## Module Type and Module Instance

A module type is a registered reusable runtime factory type, such as a field,
mesh, material, collider, or other extensible runtime definition.

A module instance is a named configured definition for a module. Module catalogs
are exposed through automation resources so tools and agents can inspect what is
available in the current world.

## Rule, Trigger, Condition, and Action

Behavior is modeled as rules:

- Trigger: when the rule evaluates.
- Condition: whether the rule proceeds.
- Actions: what the rule does.

This vocabulary is the public model for new docs and examples. New content
should use trigger, condition, and action consistently.

## Store

A store is named durable simulation state. Stores let behavior and world systems
persist values outside ad hoc component fields.

## Automation Command

An automation command is a structured action exposed through the engine
automation API, CLI, and MCP tools. Commands may mutate the world and, in live
or auto-save headless sessions, persist the backing world file.

Examples:

- `add-entity`
- `delete-entity`
- `set-transform`
- `modify-component`
- `set-viewport-camera`

Command definitions live in `engine/src/automation/definitions.ts`.

## Automation Resource

An automation resource is a read-only view of world or session state.

Examples:

- `session-info`
- `world-state-summary`
- `component-catalog`
- `module-type-catalog`
- `entity-list`
- `entity-bundle`
- `render-screenshot`
- `viewport-camera`

Resource definitions live in `engine/src/automation/resourceCatalog.ts`.

## Headless Session

A headless session edits a world file without a browser canvas. It is useful for
direct file automation and MCP clients that do not need screenshots.

## Live Session

A live session starts a local browser-backed editor runtime. It supports the
same command/resource model as headless sessions, plus viewport camera control
and screenshot capture.
