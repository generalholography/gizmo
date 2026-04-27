# Gizmo Agent Workflow Notes

Use resources instead of guessing. The usual read path is:

```bash
gizmo resource world-state-summary
gizmo resource entity-list
gizmo resource entity-bundle --stable-id <id>
```

Useful edit examples:

```bash
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
gizmo call set-transform --params '{"stableId":12,"transform":{"x":2,"y":1,"z":0}}'
gizmo call modify-component --params '{"stableId":12,"componentName":"Info","componentData":{"name":"Renamed"}}'
```

Use screenshots only in live sessions:

```bash
gizmo camera frame-entity 12
gizmo snapshot
```

When a requested change is visual, finish with the screenshot path and a short
summary of the visible result.
