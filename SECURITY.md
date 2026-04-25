# Security Policy

Gizmo is a local-first engine, CLI, and MCP automation toolkit. Its security
model assumes you are working inside a trusted local workspace unless you
explicitly opt into broader network exposure.

## Supported Versions

Public security support starts with the first published open-source release.
Until then, report issues against the current `main` branch and include the
package versions or commit SHA you tested.

## Local Trust Boundary

Treat Gizmo workspaces like source code repositories:

- JavaScript and MJS world files can execute project code when opened by the
  CLI, MCP server, or engine automation layer.
- Persisted runtime module factories may contain JavaScript source that is
  evaluated by the runtime.
- Automation commands can mutate and auto-save world files.
- Live sessions can expose rendered screenshots and serialized world state.

Do not run `gizmo`, `gizmo mcp`, `gizmo live`, `gizmo dev`, or any embedded MCP
server against untrusted repositories, world files, or generated JavaScript.

## CLI and Headless MCP

Headless sessions open a local world file and expose structured commands and
resources. By default, mutating commands persist changes to the backing world
file.

Security guidance:

- Use a clean workspace when testing unknown content.
- Review `.js` and `.mjs` world files before opening them.
- Prefer `.json` world files for data-only interchange.
- Keep MCP clients scoped to projects you trust.
- Do not give an MCP client access to a world file you would not edit manually.

## Live Sessions

`gizmo dev` and `gizmo live` bind to `127.0.0.1` by default and create a
per-session token. The token appears in printed browser URLs and portable MCP
configuration snippets. Treat those values as local secrets for the lifetime of
the session.

The live browser page can be opened with a tokenized URL. API calls under
`/api/*` require the token in one of these headers:

- `x-gizmo-token: <token>`
- `Authorization: Bearer <token>`

API query-string tokens are rejected. After the browser page is loaded, it uses
a same-origin session cookie for browser asset and module requests.

## Remote Binding

Live sessions refuse non-loopback hosts unless started with `--allow-remote`.
Only use remote binding on trusted networks, and only when you understand who can
reach the bound host and port.

Before using `--allow-remote`:

- Assume anyone who can reach the server and token can inspect or mutate the
  active world.
- Do not share tokenized URLs in chat, logs, screenshots, or issue reports.
- Prefer a short-lived session and stop the server when finished.
- Do not expose a live session directly to the public internet.

## Screenshots and Artifacts

`gizmo snapshot` writes screenshots into `.gizmo/runs/<run-id>/artifacts/` by
default. These artifacts can reveal the world state, local file names, or other
context visible in the rendered scene.

Check artifacts before sharing bug reports or examples.

## Dependencies and Publishing

The release workflow uses npm provenance publishing for public packages. Before
publishing a release:

```bash
npm install
npm run build
npm test
npm run validate
npm run pack:dry-run
```

Review package contents before publishing if a change affects `files`, build
outputs, runtime bundles, or copied README/LICENSE files.

## Reporting a Vulnerability

Please report security issues privately to the maintainers. Include:

- Affected package and version or commit SHA.
- Reproduction steps.
- Whether the issue requires a malicious world file, project dependency, MCP
  client, network peer, or browser session.
- Expected impact, including whether world files can be read, modified, or code
  can execute.

Do not open a public issue for a vulnerability until maintainers have had a
reasonable opportunity to assess and remediate it.
