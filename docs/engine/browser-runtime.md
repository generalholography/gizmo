# Browser Runtime

`@gizmo3d/engine` builds versioned browser runtime artifacts for applications
that need to serve a specific runtime version.

## Output Shape

Engine package builds emit:

```text
engine/dist/browser/<engine-version>/
```

These artifacts are owned by the engine package. Applications can copy a chosen
runtime version into their own public asset tree as part of their build or
deployment process.

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

The GitHub release workflow uploads `engine/dist/browser` as the
`engine-browser-runtime` artifact.
