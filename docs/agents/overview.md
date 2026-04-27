# Agent Workflows

Gizmo is designed to work well with coding agents through CLI commands and MCP.
Agents should inspect resources before mutating worlds, prefer stable IDs for
targeting, and capture screenshots when visual validation matters.

## Recommended Live Workflow

```bash
gizmo init ./my-world
cd ./my-world
gizmo start --no-open
```

Then attach an MCP-compatible agent using the printed `mcpConfig`, and open the
printed browser URL when visual feedback is needed.

## Recommended Agent Loop

1. Read `session-info` or `world-state-summary`.
2. Read `entity-list` and targeted `entity-bundle` resources.
3. Make one focused change with `call` or MCP tools.
4. Re-read relevant resources.
5. Use `camera` and `snapshot` for visual validation in live sessions.

## CLI Commands Useful to Agents

```bash
gizmo resource world-state-summary
gizmo resource entity-list
gizmo call add-entity --params '{"archetypeOrDef":"cube"}'
gizmo camera frame-entity 12
gizmo snapshot
```

## Safety Rules

- Work only in trusted local workspaces.
- Do not run JavaScript/MJS worlds from unknown sources.
- Treat printed live-session URLs and MCP tokens as secrets.
- Prefer small, reviewable mutations.
- Use resources instead of guessing world state.

## Future Skill Files

Repo-local skills should be thin task guides that reference generated command
and resource catalogs rather than duplicating those catalogs by hand. The engine
automation definitions are the source of truth for command and resource shapes.

## More Agent Docs

- [Agent workflow](./workflow.md)
- [MCP setup](./mcp-setup.md)
- [Gizmo Agent Skills](./skills.md)
- [Generated prompt context](./prompt-context.generated.md)
