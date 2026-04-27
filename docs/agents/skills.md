# Gizmo Agent Skills

Gizmo ships portable Agent Skills in `.agents/skills/`. These skills teach
coding agents how to use the Gizmo CLI, live sessions, MCP server, generated
automation references, and security model.

## Included Skills

- `gizmo-world-builder`: create, inspect, modify, and validate Gizmo worlds.
- `gizmo-live-session`: operate live sessions, camera control, screenshots,
  tokens, and run artifacts.
- `gizmo-mcp-integrator`: configure Codex, Claude Code, and other MCP-compatible
  agents for `gizmo mcp` and `gizmo start`.
- `gizmo-module-author`: author module types and module instances safely.

There is intentionally no contributor skill yet.

## Canonical Repo Location

```text
.agents/skills/<skill-name>/SKILL.md
```

The `.agents/skills` directory is the canonical source in this repo. Do not keep
duplicate skill copies in agent-specific directories. If another tool needs a
different path, install from `.agents/skills` or use the `skills` CLI.

## Install with npx skills

List available skills from the published GitHub repo:

```bash
npx skills add generalholography/gizmo --list
```

Install all Gizmo skills for Codex globally:

```bash
npx skills add generalholography/gizmo --skill '*' -a codex -g -y
```

Install all Gizmo skills for Claude Code globally:

```bash
npx skills add generalholography/gizmo --skill '*' -a claude-code -g -y
```

Install only the world-builder skill for Codex:

```bash
npx skills add generalholography/gizmo --skill gizmo-world-builder -a codex -g -y
```

Install from a local checkout during development:

```bash
npx skills add . --skill '*' -a codex --copy
```

Use `--copy` when symlinks are not appropriate. Otherwise, symlink-based installs
keep one source of truth.

## Manual Fallback

Codex global install:

```bash
mkdir -p ~/.codex/skills
cp -R .agents/skills/gizmo-world-builder ~/.codex/skills/
```

Claude Code global install:

```bash
mkdir -p ~/.claude/skills
cp -R .agents/skills/gizmo-world-builder ~/.claude/skills/
```

## Maintenance Rules

- Keep each `SKILL.md` short and task-focused.
- Link generated references instead of copying command/resource tables.
- Run `npm run skills:check` after editing skills.
- Run `npm run docs:generate` when command/resource catalogs change.
- Keep safety warnings on every skill that can lead to CLI, MCP, live session, or
  JavaScript factory execution.

## References

- [Agent workflow](./workflow.md)
- [Agent MCP setup](./mcp-setup.md)
- [Generated prompt context](./prompt-context.generated.md)
- [Automation commands](../reference/automation-commands.generated.md)
- [Automation resources](../reference/automation-resources.generated.md)
