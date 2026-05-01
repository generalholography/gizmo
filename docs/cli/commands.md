# CLI Commands

The `gizmo` command is the user-facing automation surface for world files and
live sessions.

## Command Families

```text
gizmo init       Create a world file and save it for the workspace
gizmo use        Save a default world file for the workspace
gizmo start      Start the recommended live workflow
gizmo serve      Start a browser-backed live server
gizmo mcp        Start a stdio MCP server
gizmo mcp-config Print MCP configuration
gizmo call       Execute one automation command
gizmo batch      Execute multiple automation commands
gizmo resource   Read one automation resource
gizmo camera     Inspect or control the viewport camera
gizmo snapshot   Capture a render screenshot
gizmo docs       Print CLI/agent reference docs
gizmo commands   List automation commands
gizmo resources  List automation resources
gizmo skills     Locate or print bundled Gizmo Agent Skills
gizmo session    Read live-session summary
gizmo clean      Remove stale run artifacts
gizmo version    Print the installed CLI version
```

Global polish flags:

```bash
gizmo --help
gizmo help start
gizmo start --help
gizmo --version
gizmo -v
```

## Target Selection

Commands operate against either a world file or a live server. Target resolution
uses:

1. explicit flags such as `--world` or `--server`
2. environment variables such as `GIZMO_WORLD`
3. `.gizmo/session.json`

## Automation Commands

`gizmo call` and `gizmo batch` use engine automation command definitions.

```bash
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
gizmo batch --calls '[{"name":"add-entity","params":{"archetypeOrDef":"cube"}}]'
```

Generated reference:

- [Automation commands](../reference/automation-commands.generated.md)

## Automation Resources

`gizmo resource` reads engine automation resources.

```bash
gizmo resource world-state-summary
gizmo resource entity-list
gizmo resource entity-bundle --stable-id 12
```

Generated reference:

- [Automation resources](../reference/automation-resources.generated.md)

## Installed CLI Docs

`gizmo docs` prints agent-readable Markdown from the installed CLI and engine
surface. Use it when an agent needs exact syntax without a repo checkout.

```bash
gizmo docs
gizmo docs workflow
gizmo docs commands
gizmo docs command add-entity
gizmo docs resources
gizmo docs resource entity-bundle
gizmo docs components
gizmo docs component Transform
gizmo docs modules
gizmo docs module material
```

## Agent Skills

`gizmo skills` locates or prints the portable Agent Skills bundled with the npm
CLI package.

```bash
gizmo skills
gizmo skills --path
gizmo skills --print gizmo
```
