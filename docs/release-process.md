# Release Process

This repository publishes three packages:

- `@gizmo3d/engine`
- `@gizmo3d/cli`
- `@gizmo3d/mcp`

The root workspace is private and is not published.

## First Public Release Setup

Before the first public release:

1. Make the GitHub repository public.
2. Confirm the repository URL in each `package.json` matches the public GitHub
   repository exactly.
3. Confirm the npm scope exists and your npm account can publish public packages
   under it.
4. Choose one npm publishing authentication path:
   - recommended after the first publish: npm Trusted Publishing for each
     package, configured for `.github/workflows/release.yml`
   - bootstrap/simple path: a granular npm automation token stored as the
     repository or environment secret `NPM_TOKEN`
5. If using the bootstrap token path, ensure the npm token has publish access to
   the `@gizmo3d` scope and the GitHub `npm` environment allows the release job
   to read `NPM_TOKEN`.
6. Enable two-factor authentication on the publishing npm account, or use a
   granular token that is allowed to publish according to npm policy.

Scoped packages are private by default on npm. The workflow uses
`--access public` on every publish so first publishes create public packages.

## Validation Checklist

Before releasing:

```bash
npm install
npm run build
npm test
npm run docs:check
npm run skills:check
npm run validate
npm run pack:dry-run
```

`npm run validate` checks generated docs, validates agent skills, and validates
the CLI build/package behavior. The release workflow also runs package dry-runs
before publishing.

If local npm cache ownership prevents `npm pack`, use a temporary cache for the
dry run:

```bash
npm_config_cache=/private/tmp/gizmo-npm-cache npm run pack:dry-run
```

## GitHub Workflow

The release workflow is defined in `.github/workflows/release.yml`.

It runs validation on manual dispatch and version tags matching `v*`. The
publish job only runs for tag refs, which prevents accidental package publishes
from an arbitrary branch. The workflow:

1. checks out the repo
2. installs dependencies
3. builds all workspaces
4. runs tests
5. validates the CLI
6. dry-runs package contents
7. publishes engine, MCP, and CLI packages as public scoped packages with npm
   provenance
8. uploads the engine browser runtime artifact
9. creates a GitHub Release when the workflow is triggered by a version tag

## Manual First Publish

If you want to create the npm packages manually before relying on the workflow:

```bash
npm login
npm whoami
npm ci
npm run build:package
npm test
npm run validate
npm_config_cache=/private/tmp/gizmo-npm-cache npm run pack:dry-run
npm publish --workspace=engine --access public
npm publish --workspace=mcp --access public
npm run build --workspace=cli
npm publish --workspace=cli --access public
```

Then verify:

```bash
npm view @gizmo3d/engine version
npm view @gizmo3d/mcp version
npm view @gizmo3d/cli version
npm install -g @gizmo3d/cli
gizmo --version
```

## Tag Release

For the normal GitHub workflow release:

```bash
git status
npm ci
npm run build
npm test
npm run validate
npm_config_cache=/private/tmp/gizmo-npm-cache npm run pack:dry-run
git tag v0.3.0
git push origin v0.3.0
```

The tag push triggers `.github/workflows/release.yml`. Watch the Actions run,
then verify npm package pages and the GitHub Release.

If creating a release manually:

```bash
gh release create v0.3.0 --title "v0.3.0" --notes-file CHANGELOG.md --prerelease
```

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

## Post-Release Checks

After publishing:

```bash
npm view @gizmo3d/engine version
npm view @gizmo3d/mcp version
npm view @gizmo3d/cli version
npm install -g @gizmo3d/cli
mkdir gizmo-release-smoke
cd gizmo-release-smoke
gizmo start --no-open
```

Stop the live session after the smoke test and remove the temporary workspace.
