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

Use `--no-open` in agent environments. The agent should immediately show the
printed `browserUrl` or `codex.openInAppBrowserUrl` so the user can watch if
they want, then continue working without waiting. If the agent has an
in-app/local browser tool, it can open the URL there too. In a regular terminal
where you want Gizmo to open the system browser, omit `--no-open`:

```bash
gizmo start ./world.json
```

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

## Saving and Exports

Manual editor saves in a live session write the current browser world back to
the backing world file. Use the toolbar Save button or `Ctrl+S`/`Cmd+S`.

Model exports from the live editor are written to the active run artifacts
directory instead of relying on browser downloads:

```text
.gizmo/runs/<run-id>/artifacts/
```

This keeps exports reliable in embedded browsers such as Codex's in-app browser.
Normal browser downloads remain the fallback for non-live embedded editor use.

The editor can export the current world or selected entity as GLB, glTF, STL, or
USDZ. GLB is the most portable default for browser and toolchain use. USDZ is
intended for Apple Quick Look and AR sharing; simple Gizmo materials are
converted for USDZ export, but custom shader/effect materials may not translate
as completely as GLB.

## Security Model

Live sessions bind to `127.0.0.1` by default and use a per-session token.
Remote binding requires `--allow-remote` and should only be used on trusted
networks.

Treat printed browser URLs and portable MCP configs as local secrets.
