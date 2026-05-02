# CLI Troubleshooting

## `gizmo` resolves to an old binary

Check:

```bash
which gizmo
npm prefix -g
gizmo --help
```

Remove the old binary or reinstall `@gizmo3d/cli` into the active npm prefix.

## Commands cannot find a world

Pass a world explicitly:

```bash
gizmo resource world-state-summary --world /absolute/path/to/world.json
```

Or save a workspace default:

```bash
gizmo use /absolute/path/to/world.json
```

## Live commands cannot find a server

Start `start` again from the workspace:

```bash
gizmo start --no-open --port 0
```

Then retry the command. `start` refreshes `.gizmo/session.json`.

## Screenshots fail in headless mode

Screenshot resources require a browser-backed live session. Start `gizmo start` or
`gizmo serve` first.

## JavaScript world fails to load

JavaScript/MJS worlds execute project code. Make sure the file exists, belongs
to a trusted workspace, and can be imported by the current Node.js environment.
