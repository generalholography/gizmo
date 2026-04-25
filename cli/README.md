# @gizmo3d/cli

`@gizmo3d/cli` installs the `gizmo` command. It is the recommended entrypoint
for creating Gizmo worlds, starting live browser-backed sessions, attaching
MCP-compatible agents, running automation commands, reading resources,
controlling the viewport camera, and capturing screenshots.

## Install

```bash
npm install -g @gizmo3d/cli
gizmo --help
```

For local repo development, build the workspace and run the CLI package script:

```bash
npm install
npm run build
npm run cli --workspace=cli -- --help
```

## Quick Start

```bash
gizmo init ./my-world
cd ./my-world
gizmo dev --no-open
```

`gizmo dev` starts a local live session, writes the active target to
`.gizmo/session.json`, creates a run directory under `.gizmo/runs/`, and prints
browser and MCP setup details.

Follow-up commands reuse the active session:

```bash
gizmo resource world-state-summary
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
gizmo camera get
gizmo snapshot
```

## Command Overview

```text
gizmo init       Create a world file and save it for the workspace
gizmo use        Save a default world file for the workspace
gizmo dev        Start the recommended live workflow
gizmo live       Start a browser-backed live server
gizmo mcp        Start a stdio MCP server
gizmo mcp-config Print MCP configuration
gizmo call       Execute one automation command
gizmo batch      Execute multiple automation commands
gizmo resource   Read one automation resource
gizmo camera     Inspect or control the viewport camera
gizmo snapshot   Capture a render screenshot
gizmo commands   List automation commands
gizmo resources  List automation resources
gizmo session    Read live-session summary
gizmo clean      Remove stale run artifacts
```

## Create or Select a World

```bash
gizmo init
gizmo init ./my-world
gizmo init ./my-world/world.json
```

If the path is a directory, `init` creates `world.json` inside it. By default it
also writes `.gizmo/session.json` so later commands can run without repeated
`--world` flags.

Useful options:

- `--force`: overwrite an existing world file
- `--no-use`: create the world without saving it as the workspace default

To select an existing world:

```bash
gizmo use /absolute/path/to/world.json
```

Target resolution order:

1. `--world`
2. `ENGINE_WORLD`
3. `.gizmo/session.json`

## Live Sessions

```bash
gizmo dev ./world.json --no-open
```

`dev` is the recommended local workflow. It starts a live server, optionally
opens a browser, writes the active live session to `.gizmo/session.json`, creates
an active run, and prints:

- local server URL
- browser URL
- MCP command
- workspace-local MCP config
- portable MCP config with explicit server details

Live sessions bind to `127.0.0.1` by default and use a per-session token. Use
`--allow-remote` only on trusted networks.

The lower-level primitive is:

```bash
gizmo live
```

## MCP

Start a headless stdio MCP server for the selected world:

```bash
gizmo mcp
```

Or pass an explicit world:

```bash
gizmo mcp --world /absolute/path/to/world.json
```

Generic MCP config:

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

## Commands and Resources

Read a resource:

```bash
gizmo resource world-state-summary
gizmo resource entity-list
gizmo resource entity-bundle --stable-id 12
```

Execute a command:

```bash
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
gizmo call set-transform --params '{"stableId":12,"transform":{"x":2,"y":1,"z":0}}'
```

List available surfaces:

```bash
gizmo commands
gizmo resources
```

Automation commands and resources are defined by `@gizmo3d/engine`.

## Camera and Screenshots

```bash
gizmo camera get
gizmo camera set --position '{"x":0,"y":8,"z":18}' --look-at '{"x":0,"y":4,"z":0}'
gizmo camera frame-entity 12
gizmo snapshot
```

Screenshots default to `.gizmo/runs/<run-id>/artifacts/`. You can override the
path:

```bash
gizmo snapshot --output ./captures/world.png
```

## Clean Artifacts

```bash
gizmo clean
gizmo clean --all
```

`clean` removes stale `.gizmo/runs/*` directories for the current workspace. It
does not delete world files.

## Local Development

From the repo root:

```bash
npm run build --workspace=cli
npm run test --workspace=cli
npm run validate --workspace=cli
```

Build a publishable package tarball:

```bash
npm run pack:dist --workspace=cli
```

## Troubleshooting

If `gizmo --help` does not show the expected commands, your shell may be
resolving an older binary:

```bash
which gizmo
npm prefix -g
gizmo --help
```

Remove or replace the older install, then reinstall `@gizmo3d/cli`.

## Documentation

- [CLI overview](../docs/cli/overview.md)
- [Getting started](../docs/getting-started.md)
- [MCP overview](../docs/mcp/overview.md)
- [Agent workflows](../docs/agents/overview.md)
- [Security](../SECURITY.md)

## License

MIT
