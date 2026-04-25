# Release Process

This repository publishes three packages:

- `@gizmo3d/engine`
- `@gizmo3d/cli`
- `@gizmo3d/mcp`

The root workspace is private and is not published.

## Validation Checklist

Before releasing:

```bash
npm install
npm run build
npm test
npm run validate
npm run pack:dry-run
```

`npm run validate` currently validates the CLI build and packaged behavior. The
release workflow also runs package dry-runs before publishing.

## GitHub Workflow

The release workflow is defined in `.github/workflows/release.yml`.

It runs on manual dispatch and version tags matching `v*`. The workflow:

1. checks out the repo
2. installs dependencies
3. builds all workspaces
4. runs tests
5. validates the CLI
6. dry-runs package contents
7. publishes engine, MCP, and CLI packages with npm provenance
8. uploads the engine browser runtime artifact

## Package Contents

Before publishing a change that affects package contents, inspect:

- `engine/package.json` `files` and exports
- `cli/package.json` `files` and `bin`
- `mcp/package.json` `files` and exports
- generated `dist` package metadata
- copied README and LICENSE files

## Browser Runtime

The engine package owns versioned browser runtime artifacts in
`engine/dist/browser/<engine-version>/`. Applications that load dynamic worlds
should copy the selected runtime version into their own public asset tree.
