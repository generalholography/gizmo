# Browser Runtime

`@gizmo3d/engine` builds versioned browser runtime artifacts for applications
that need to serve a specific runtime version.

## Published Package Shape

Install the engine package and consume runtime files from npm package contents:

```text
node_modules/@gizmo3d/engine/dist/browser/<engine-version>/
```

These artifacts are owned by the engine package. Applications can copy or serve a
chosen runtime version from the installed package as part of their build or
deployment process.

Local package builds emit the same runtime files under:

```text
engine/dist/browser/<engine-version>/
```

## When to Use Runtime Artifacts

Use versioned runtime artifacts when:

- worlds are loaded dynamically
- an app must keep older world content compatible
- a hosting layer needs static browser assets separate from npm source imports

For ordinary application bundling, import `@gizmo3d/engine` directly from your
app build.

## Build Command

From the repo root:

```bash
npm run build:package --workspace=engine
```

## Release Note

npm package contents are the release contract for browser runtime files. GitHub
Releases record tags and changelog notes; they do not distribute a separate
browser runtime artifact.
