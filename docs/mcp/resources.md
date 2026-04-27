# MCP Resources

Gizmo maps automation resources to MCP resources and resource templates.

Generated reference:

- [Automation resources](../reference/automation-resources.generated.md)
- [Automation resources JSON](../reference/automation-resources.generated.json)

## Common Resource URIs

- `engine://session/info`
- `engine://world/summary`
- `engine://components/catalog`
- `engine://modules/types`
- `engine://modules/instances`
- `engine://entities`
- `engine://entities/{stableId}`
- `engine://render/screenshot`
- `engine://viewport/camera`

Agents should inspect resources before making mutating tool calls.

## Targeted Entity Reads

Use entity-specific resources when precise targeting matters:

```text
engine://entities/{stableId}
```

Use stable IDs for repeatable instructions.
