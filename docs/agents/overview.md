# Agent Workflows

Gizmo is designed to work well with coding agents through CLI commands and MCP.
Agents should inspect resources before mutating worlds, prefer stable IDs for
targeting, and capture screenshots when visual validation matters.

## Recommended Live Workflow

```bash
mkdir my-world
cd ./my-world
gizmo start --no-open --port 0
```

In agent environments, use `--no-open --port 0`. Immediately tell the user the
printed `codex.openInAppBrowserUrl` or `browserUrl` so they can watch if they
want, then continue working without waiting for them to open it. If the
environment exposes an in-app/local browser navigation tool, open the URL there
once. In a normal terminal where the user expects the system browser to open,
use `gizmo start` without `--no-open`.

Then attach an MCP-compatible agent using the printed `mcpConfig`.

## Recommended Agent Loop

1. Start the session, show the URL, and make a meaningful first edit immediately.
2. Read only the resource needed next, usually `world-state-summary` or `entity-list`.
3. Use `gizmo apply ./scene.json --world ./world.json` for complete generated scenes.
4. Use `call`, `batch`, or MCP tools for focused incremental edits.
5. Use `camera` and `snapshot` only after a browser client is attached.

## CLI Commands Useful to Agents

```bash
gizmo resource world-state-summary
gizmo resource entity-list
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
gizmo apply ./scene.json --world ./world.json
gizmo camera frame-entity 12
gizmo snapshot
```

If `gizmo` is not installed, agents should ask before running:

```bash
npm install -g @gizmo3d/cli@latest
gizmo --version
```

## Safety Rules

- Work only in trusted local workspaces.
- Do not run JavaScript/MJS worlds from unknown sources.
- Treat printed live-session URLs and MCP tokens as secrets.
- Prefer small, reviewable mutations.
- Use resources instead of guessing world state.

## Portable Skill Files

Gizmo skills must be usable after an npm-only CLI install, when the source repo
and generated docs are not present on disk. The repo intentionally exposes one
`gizmo` skill that is self-contained enough to operate the installed CLI or MCP
server, with compact command/resource summaries and examples.

The installed CLI is the source of truth for finer details: agents should use
`gizmo docs ...`, `gizmo commands`, and `gizmo resources` instead of guessing
component syntax, module syntax, command parameters, or resource names. Links to
`docs/...` paths are optional repo context only.

## More Agent Docs

- [Agent workflow](./workflow.md)
- [MCP setup](./mcp-setup.md)
- [Gizmo Agent Skills](./skills.md)
- [Generated prompt context](./prompt-context.generated.md)
