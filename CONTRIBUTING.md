# Contributing to Gizmo

Thanks for helping improve Gizmo. This project is an npm workspace containing
the engine, CLI, and MCP server. Contributions should keep those package
boundaries clear and should include focused validation for the behavior changed.

## Workspace Layout

```text
engine/  @gizmo3d/engine - runtime, editor APIs, automation commands/resources
cli/     @gizmo3d/cli    - gizmo command, live sessions, snapshots, MCP setup
mcp/     @gizmo3d/mcp    - MCP server and resource URI interop
docs/    public documentation
```

## Setup

```bash
npm install
npm run build
npm test
npm run validate
```

For package-specific work:

```bash
npm run test --workspace=engine
npm run test --workspace=cli
npm run test --workspace=mcp
```

## Pull Request Expectations

- Keep changes focused and explain the user-facing impact.
- Add or update tests when behavior changes.
- Update docs when public commands, resources, package exports, world shapes, or
  security behavior changes.
- Do not commit local `.gizmo/runs/*` artifacts, screenshots, or generated test
  output unless they are intentionally part of a fixture.
- Include the commands you ran in the PR description.

## Documentation Changes

Public docs live in `docs/` and package entrypoints live in each package
`README.md`. Keep the vocabulary consistent:

- rule = trigger + condition + actions
- automation command = structured mutation/action
- automation resource = read-only world/session view
- live session = browser-backed editable session
- headless session = file-backed session without browser rendering

Avoid private deployment notes, historical design logs, or migration-only terms
in primary user docs. If a historical note is necessary, label it clearly.

## Adding Automation Commands or Resources

Automation commands are defined in `engine/src/automation/definitions.ts` and
implemented in `engine/src/automation/commands.ts`. Automation resources are
defined in `engine/src/automation/resourceCatalog.ts` and implemented in
`engine/src/automation/resources.ts`.

When changing these surfaces:

- Keep names stable and descriptive.
- Include parameter descriptions and schemas where possible.
- Add focused tests in the owning package.
- Update CLI, MCP, and docs references if the public behavior changes.

## Security-Sensitive Changes

Read `SECURITY.md` before changing:

- world script loading
- persisted runtime module factories
- live session authentication
- remote binding
- MCP command/resource exposure
- screenshot or artifact handling

Security changes should include tests and a short explanation of the trust
boundary being preserved.

## Release Process

Maintainers publish packages through the GitHub release workflow. Before a
release, run:

```bash
npm run build
npm test
npm run validate
npm run pack:dry-run
```

See `docs/release-process.md` for the public release checklist.
