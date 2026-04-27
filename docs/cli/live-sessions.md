# Live Sessions

Live sessions run a browser-backed Gizmo editor/runtime and expose the same
automation command/resource model as headless sessions.

## Start the Recommended Workflow

```bash
gizmo start ./world.json --no-open
```

`start` starts a live server, writes session metadata to `.gizmo/session.json`,
creates an active run under `.gizmo/runs/`, and prints browser and MCP setup
details.

## Lower-Level Live Server

```bash
gizmo serve
```

`serve` is the lower-level primitive used by `start`.

## Follow-Up Commands

After `start`, commands can usually omit `--server`:

```bash
gizmo resource world-state-summary
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
gizmo camera get
gizmo snapshot
```

## Security Model

Live sessions bind to `127.0.0.1` by default and use a per-session token.
Remote binding requires `--allow-remote` and should only be used on trusted
networks.

Treat printed browser URLs and portable MCP configs as local secrets.
