# Reference

Generated reference files are derived from source-owned catalogs. Do not edit
generated files by hand.

## Automation

- [Automation commands](./automation-commands.generated.md)
- [Automation commands JSON](./automation-commands.generated.json)
- [Automation resources](./automation-resources.generated.md)
- [Automation resources JSON](./automation-resources.generated.json)

## Agent Context

- [Generated prompt context](../agents/prompt-context.generated.md)

## Updating References

```bash
npm run docs:generate
npm run docs:check
```

The generator reads:

- `engine/src/automation/definitions.ts`
- `engine/src/automation/resourceCatalog.ts`
