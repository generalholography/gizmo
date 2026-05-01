# Changelog

This changelog will track notable changes for the public Gizmo workspace.

Gizmo follows semantic versioning for published packages under the `@gizmo3d`
scope. Package-specific changes may also be called out in the relevant package
README or release notes.

## 0.3.2

### Added

- USDZ model export for Apple Quick Look and AR sharing from the editor export
  menu.
- Live-session artifact export handling so embedded browsers write model exports
  and scripts to the active `.gizmo/runs/<run-id>/artifacts/` directory.
- Generated Agent Skill reference content sourced from the installed automation
  command and resource catalogs.

### Changed

- Live sessions now persist manual browser edits back to the backing world file
  through the editor Save control.
- The editor starts live CLI sessions with the left panel collapsed and uses a
  smaller, icon-forward toolbar and narrower side panes.
- The export menu now presents standard model formats at the top level and keeps
  legacy JSON/script downloads under Other.
- Release docs now treat npm packages as the distribution source for runtime
  artifacts instead of GitHub release uploads.

## 0.3.1

### Added

- Single installable `gizmo` Agent Skill for CLI, live-session, MCP, screenshot,
  component, and module-authoring workflows.
- `gizmo docs` command for installed-version agent reference, including command,
  resource, component, and module lookups.
- Bundled npm CLI skill prompt at `dist/skills/gizmo/SKILL.md` for npm-only and
  manual agent workflows.

### Changed

- README and getting-started docs now make the `npx skills add
  generalholography/gizmo --skill gizmo` path part of the quickstart.
- CLI package contents now include the single `gizmo` skill instead of multiple
  task-specific skills.
- Release workflow now uses npm trusted publishing/OIDC instead of an npm token.

## 0.3.0

### Added

- Public documentation pass for the open-source repository.
- Root-level OSS project files for contribution, support, security, and release
  orientation.
- GitHub issue and pull request templates for public project intake.

### Changed

- Public docs now use the package names `@gizmo3d/engine`, `@gizmo3d/cli`, and
  `@gizmo3d/mcp`.
- Public terminology is standardized around worlds, entities, components,
  rules, triggers, conditions, actions, stores, automation commands, and
  automation resources.
- Release workflow now publishes scoped packages with explicit public access and
  creates a GitHub Release for version tags.

Initial public documentation baseline for the extracted Gizmo workspace.
