# Screenshots

Screenshots are available from live sessions through the `render-screenshot`
automation resource and the `gizmo snapshot` command.

## Capture the Viewport

```bash
gizmo snapshot
```

By default, the output goes to:

```text
.gizmo/runs/<run-id>/artifacts/
```

## Capture to a Specific File

```bash
gizmo snapshot --output ./captures/world.png
```

## Frame Before Capturing

```bash
gizmo camera frame-entity 12
gizmo snapshot
```

## Camera Control

```bash
gizmo camera get
gizmo camera set --position '{"x":0,"y":8,"z":18}' --look-at '{"x":0,"y":4,"z":0}'
```

## Sharing Guidance

Screenshots can reveal world state and local context. Review artifacts before
sharing them in issues or documentation.
