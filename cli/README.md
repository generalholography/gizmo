# Engine CLI

`gizmo` is the AI-native CLI for the engine. The intended product flow is:

```bash
npm install -g ./cli/dist
gizmo init ./my-world
cd ./my-world
gizmo dev --no-open
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
gizmo snapshot
```

Once `gizmo dev` starts, the workspace has an active live session. Follow-up commands like `call`, `batch`, `resource`, `snapshot`, `session`, and `mcp` reuse that live target automatically, so you do not need to keep repeating `--server`.
Camera controls also reuse that active session, so you can frame the viewport before taking screenshots:

```bash
gizmo camera get
gizmo camera set --position '{"x":0,"y":8,"z":18}' --look-at '{"x":0,"y":4,"z":0}'
gizmo camera frame-entity 12
gizmo snapshot
```

Under the hood the CLI exposes the existing editor command system in two modes:

- `headless`: edit a world file directly from the terminal or through stdio MCP
- `live`: run a browser-backed editor session, issue commands against it, and capture viewport screenshots

All world mutations still flow through the same undoable editor command wrappers used by the engine automation layer.

It is designed around coding-agent workflows:

- `gizmo init` scaffolds a workspace-local world file and saves it for repeated use
- `gizmo mcp` is the headless stdio MCP surface for Codex-, Claude Code-, and MCP-compatible assistants
- `gizmo live` gives you a browser-backed scene with the same command surface plus screenshot capture
- `gizmo dev` starts the live session and prints the exact MCP config to attach an assistant to that visible world
- `gizmo use` makes repeated local calls ergonomic inside a repo or agent workspace
- `gizmo snapshot` writes into `.gizmo/runs/<run-id>/artifacts/` by default, so validation output stays with the workspace instead of spilling into random temp paths

## Build

From the repo root:

```bash
npm run build --workspace=cli
```

During development, you can also use the convenience wrapper:

```bash
npm run engine:cli -- <command> ...
```

From the repo root, you can also use the shipped local shim directly:

```bash
./gizmo <command> ...
```

The repo shim auto-rebuilds when engine CLI sources are newer than the built bundle. If you want to skip that check during local debugging, set `GIZMO_SKIP_BUILD=1`.

For install/publish workflows, the CLI workspace emits a publishable package in `cli/dist`, and that package installs a `gizmo` binary. The publishable package name is `@gizmo3d/cli`; the executable name is intentionally the short user-facing command, `gizmo`.

```bash
# Build a publishable tarball
npm run pack:dist --workspace=cli

# Install globally from the built package folder
npm install -g ./cli/dist

# Or install from the tarball produced by npm pack
npm install -g ./cli/dist/gizmo3d-cli-*.tgz

# Verify the PATH-resolved gizmo is the one you just installed
gizmo --help
npm run validate:global --workspace=cli
```

You can also run the built-package smoke validation:

```bash
npm run validate --workspace=cli
```

If `gizmo init` says `unknown command`, your shell is almost certainly resolving an older `gizmo` binary from another prefix. Check:

```bash
which gizmo
gizmo --help
npm prefix -g
```

If `which gizmo` points somewhere other than your active npm global prefix, remove or replace the older install first, then reinstall the CLI package and rerun `npm run validate:global --workspace=cli`.

## Select a Default World

If you do not want to repeat `--world` on every headless command, save a workspace-local default:

```bash
gizmo use /absolute/path/to/world.json
```

This writes `.gizmo/session.json` in the current working directory. After that, commands like `call`, `batch`, `resource`, `mcp`, and `live` will use the saved world automatically unless you pass `--world` explicitly.

You can also use an environment variable:

```bash
ENGINE_WORLD=/absolute/path/to/world.json gizmo resource world-state-summary
```

Resolution order is:

1. `--world`
2. `ENGINE_WORLD`
3. `.gizmo/session.json`

## Commands

### Initialize a new gizmo workspace

```bash
gizmo init
gizmo init ./my-world
gizmo init ./my-world/world.mjs
```

If you pass a directory path or omit the argument entirely, `init` creates `world.json` inside that directory. By default it also writes `.gizmo/session.json` in the initialized workspace so follow-up commands can just run from there without repeating `--world`.

Useful options:

- `--force` overwrite an existing world file
- `--no-use` create the world file without saving `.gizmo/session.json`

### Save a default world for this workspace

```bash
gizmo use /absolute/path/to/world.json
```

### Start stdio MCP for coding agents

```bash
gizmo mcp
```

This starts the standalone MCP server backed by a local world file.

Generic stdio MCP config:

```json
{
  "mcpServers": {
    "gizmo": {
      "command": "gizmo",
      "args": ["mcp", "--world", "/absolute/path/to/world.json"]
    }
  }
}
```

If the agent runs inside a project workspace and you already called `gizmo use`, you can shorten that to:

```json
{
  "mcpServers": {
    "gizmo": {
      "command": "gizmo",
      "args": ["mcp"]
    }
  }
}
```

### Start the full live dev workflow

```bash
gizmo dev ./world.json
```

This starts the live server, opens the browser by default, and prints:

- `live.serverUrl`
- `live.browserUrl`
- `browserTargets.codex`
- `codex.openInAppBrowserUrl`
- `mcpCommand`
- `mcpConfig`

The printed `mcpConfig` uses the active workspace session:

```json
{
  "mcpServers": {
    "gizmo": {
      "command": "gizmo",
      "args": ["mcp"]
    }
  }
}
```

`dev` also writes the active live session to `.gizmo/session.json`, so the rest of the CLI can just use the current session:

```bash
gizmo resource world-state-summary
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
gizmo snapshot
gizmo mcp
```

`dev` also creates a fresh active run under `.gizmo/runs/<run-id>/`. Default screenshot output goes into that run’s `artifacts/` directory.

If you need a portable config for another machine or terminal that is not using the same workspace, `dev` also prints `portableMcpConfig` and `portableMcpCommand` with the explicit `--server` flag.

To keep the server local without auto-opening a browser:

```bash
gizmo dev ./world.json --no-open
```

Live sessions bind to `127.0.0.1` by default and generate a per-session token. The browser URL and portable MCP config include that token automatically. Binding to a non-loopback host is refused unless you pass `--allow-remote`; only do that for trusted local networks.

### Codex App Flow

When using Codex with the in-app browser, the most reliable flow is:

```bash
gizmo init ./my-world
cd ./my-world
gizmo dev --no-open
```

Then:

1. Open `codex.openInAppBrowserUrl` or `browserTargets.codex` in the Codex in-app browser.
2. Attach the agent with the printed `mcpConfig`.
3. Use `portableMcpConfig` if the agent is running outside the same workspace.

### Execute one command against a local world file

```bash
gizmo call add-entity \
  --params '{"archetypeOrDef":{"definition":{"Info":{"name":"Torch"}}}}'
```

### Read one resource from a local world file

```bash
gizmo resource world-state-summary
```

### Start a live browser-backed session

```bash
gizmo live
```

The command prints JSON with:

- `serverUrl`: the local bridge/API URL
- `browserUrl`: the browser page to open
- `browserTargets.codex`: the same live page URL for the Codex in-app browser
- `mcpConfig`: workspace-local MCP config for the active session
- `portableMcpConfig`: explicit `--server` MCP config for another workspace or machine

Once the browser loads `browserUrl`, the live session becomes the active workspace target and normal commands can use it directly:

```bash
gizmo resource world-state-summary
```

```bash
gizmo call add-entity \
  --params '{"archetypeOrDef":{"definition":{"Info":{"name":"Live Cube"}}}}'
```

Read the current live bridge/session state:

```bash
gizmo session
```

You can still override the target explicitly with `--server` when you want a portable one-off call against another session.

### Capture a screenshot from the live viewport

```bash
gizmo snapshot
```

Target a specific entity:

```bash
gizmo snapshot \
  --stable-id 12
```

By default, screenshots are written to `.gizmo/runs/<run-id>/artifacts/`. You can still override the path explicitly:

```bash
gizmo snapshot --output ./captures/world.png
```

### Clean stale run artifacts

```bash
gizmo clean
```

This removes stale `.gizmo/runs/*` directories for the current workspace while keeping the active run.

To remove every saved run for the current workspace, including the active one:

```bash
gizmo clean --all
```

### Control the active viewport camera

Read the current camera pose:

```bash
gizmo camera get
```

Move the camera to an explicit pose:

```bash
gizmo camera set \
  --position '{"x":0,"y":8,"z":18}' \
  --look-at '{"x":0,"y":4,"z":0}' \
  --fov 50
```

You can also supply `--rotation` as Euler angles or a quaternion instead of `--look-at`.

Frame a specific entity before capturing a screenshot:

```bash
gizmo camera frame-entity 12
gizmo snapshot
```

The `camera` command works against the current live session automatically, or against an explicit target with `--server` or `--world`.

## Notes

- `dev` is the recommended path when you want one command to start the visible world and attach an agent to it.
- `dev` pins the active live session in `.gizmo/session.json`, so follow-up commands do not need repeated `--server` flags.
- `dev` also starts a fresh workspace-scoped run in `.gizmo/runs/`, which is where default screenshot artifacts go.
- `live` mode is the lower-level live session primitive used by `dev`.
- `mcp` and `call/resource` against `--world` are best for direct file editing and existing MCP-capable coding agents.
- `camera` exposes viewport framing as a first-class product command instead of forcing agents to simulate mouse/keyboard input.
- `mcp --server <url>` proxies a running live session over stdio MCP, so assistants can edit the visible world and read screenshot resources through the same MCP surface.
- `use` is the easiest way to avoid repeating the world path in a repo or workspace.
- Live-mode mutations auto-save the current serialized world back to the backing file after each mutating command or batch.
- Screenshot resources are meaningful in `live` mode. Headless mode has no real browser canvas.
- `clean` only touches the current workspace’s `.gizmo/runs/`; it does not delete your world files.
- `npm run validate --workspace=cli` validates the built bundle, a locally installed package binary, package metadata, and live-server startup.

## Security model

`gizmo` is designed for trusted local workspaces. Headless `.js`/`.mjs` world files execute project JavaScript, and custom runtime module types can persist JavaScript factory source. Do not run `gizmo mcp`, `gizmo call`, or `gizmo dev` against untrusted repositories or world files.

Live mode protects its local HTTP API with a random session token and uses loopback binding by default. Treat the printed browser URL and portable MCP config as secrets for the lifetime of that session.

The browser page may use the token in its initial URL, but `/api/*` requests require the token in an `x-gizmo-token` header or `Authorization: Bearer <token>` header. Query-string tokens are intentionally rejected for API calls so API credentials are less likely to leak through logs or copied URLs. After the page is loaded, it sets a same-origin session cookie for browser asset and module requests so Vite imports can load without weakening API auth.
