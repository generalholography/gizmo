# Gizmo Agent Skills

Gizmo ships portable Agent Skills under `.agents/skills/`. The general skill
teaches coding agents how to use the Gizmo CLI, live sessions, MCP server,
automation commands/resources, component schemas, module authoring, screenshots,
and the security model. The worldscript skill focuses on generating complete
trusted JavaScript worlds.

## Included Skill

- `gizmo`: create, inspect, modify, validate, and automate Gizmo worlds with
  the CLI or MCP.
- `gizmo-worldscript`: create complete procedural worlds with trusted
  JavaScript/MJS world scripts and opinionated quality guidance.

## Canonical Repo Location

```text
.agents/skills/<skill-name>/SKILL.md
```

The `.agents/skills` directory is the canonical source in this repo. Do not keep
duplicate skill copies in agent-specific directories. If another tool needs a
different path, install from `.agents/skills` or use the `skills` CLI.

The skill must be self-contained enough to work from an installed npm CLI
package. Agents should not need a source checkout or `docs/...` paths before
they can inspect a world, make edits, attach MCP, author modules, or capture
screenshots.

## Install with npx skills

List available skills from the published GitHub repo:

```bash
npx skills add generalholography/gizmo --list
```

Install the Gizmo skill globally:

```bash
npx skills add generalholography/gizmo --skill gizmo -g -y
```

Install the worldscript skill globally:

```bash
npx skills add generalholography/gizmo --skill gizmo-worldscript -g -y
```

If you need a client-specific install, pass the agent adapter explicitly:

```bash
npx skills add generalholography/gizmo --skill gizmo -a codex -g -y
npx skills add generalholography/gizmo --skill gizmo -a claude-code -g -y
```

Install all repo skills:

```bash
npx skills add generalholography/gizmo --skill '*' -a codex -g -y
```

Install from a local checkout during development:

```bash
npx skills add . --skill '*' -a codex --copy
```

Use `--copy` when symlinks are not appropriate. Otherwise, symlink-based installs
keep one source of truth.

## Use Skills from the npm CLI

The CLI package includes the same portable skill files. This gives npm-only users
a local source for the prompts even when they have not cloned the repository.

List the bundled skills:

```bash
npx -y @gizmo3d/cli@latest skills
```

Print one skill prompt:

```bash
npx -y @gizmo3d/cli@latest skills --print gizmo
```

```bash
npx -y @gizmo3d/cli@latest skills --print gizmo-worldscript
```

Print the bundled skills directory for manual installs:

```bash
npx -y @gizmo3d/cli@latest skills --path
```

## Manual Fallback

Codex global install:

```bash
mkdir -p ~/.codex/skills
cp -R .agents/skills/gizmo ~/.codex/skills/
cp -R .agents/skills/gizmo-worldscript ~/.codex/skills/
```

Claude Code global install:

```bash
mkdir -p ~/.claude/skills
cp -R .agents/skills/gizmo ~/.claude/skills/
cp -R .agents/skills/gizmo-worldscript ~/.claude/skills/
```

## Maintenance Rules

- Keep each `SKILL.md` compact and task-focused.
- Embed the operational command/resource summaries and high-value examples a
  skill needs to operate without repo docs.
- Keep generated skill sections between their marker comments and update them
  with `npm run skills:generate`.
- Prefer `gizmo docs ...`, `gizmo commands`, and `gizmo resources` for precise
  installed-version reference details.
- Avoid copying full generated command/resource tables into skills.
- Treat `docs/...` links as optional repo context only, under `Optional Repo Docs`.
- Run `npm run skills:check` after editing skills; it checks generated skill
  content and validates portable skill structure.
- Run `npm run docs:generate` when command/resource catalogs change, then update
  the embedded skill reference with `npm run skills:generate` if the installed
  agent workflow changes.
- Keep safety warnings on every skill that can lead to CLI, MCP, live session, or
  JavaScript factory execution.

## References

- [Agent workflow](./workflow.md)
- [Agent MCP setup](./mcp-setup.md)
- [Generated prompt context](./prompt-context.generated.md)
- [Automation commands](../reference/automation-commands.generated.md)
- [Automation resources](../reference/automation-resources.generated.md)
