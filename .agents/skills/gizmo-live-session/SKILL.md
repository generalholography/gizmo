---
name: gizmo-live-session
description: Debug and operate Gizmo browser-backed live sessions, including gizmo start/serve, session files, local server auth, camera control, screenshots, and run artifacts. Use when live rendering, viewport screenshots, or session connectivity is involved.
license: MIT
compatibility: Requires the gizmo CLI, local loopback networking, and a trusted workspace.
---

# Gizmo Live Session

Use this skill for browser-backed Gizmo sessions and visual validation.

## Safety

Live sessions bind to `127.0.0.1` by default and use a per-session token. Treat
printed browser URLs and portable MCP configs as local secrets. Use
`--allow-remote` only on trusted networks.

## Start or Refresh

```bash
gizmo start --no-open
```

`start` writes `.gizmo/session.json`, creates `.gizmo/runs/<run-id>/`, and prints
browser and MCP connection details.

Use lower-level `gizmo serve` only when you need the raw live server primitive.

## Inspect

```bash
gizmo session
gizmo resource session-info
gizmo resource viewport-camera
gizmo resource world-state-summary
```

## Camera and Screenshots

```bash
gizmo camera get
gizmo camera set --position '{"x":0,"y":8,"z":18}' --look-at '{"x":0,"y":4,"z":0}'
gizmo camera frame-entity <stableId>
gizmo snapshot
```

Screenshots default to `.gizmo/runs/<run-id>/artifacts/`.

## Troubleshooting

- If commands cannot find a server, rerun `gizmo start --no-open`.
- If screenshots fail, confirm the target is live, not headless.
- If auth fails for explicit `--server`, use the current token from `gizmo start`
  output or workspace session config.
- If remote binding is requested, restate the trust boundary before proceeding.

## References

- Live sessions: `docs/cli/live-sessions.md`
- Screenshots: `docs/cli/screenshots.md`
- Troubleshooting: `docs/cli/troubleshooting.md`
- Security: `SECURITY.md`
