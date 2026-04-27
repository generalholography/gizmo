# Security

This page summarizes the security model. The authoritative policy is
[`SECURITY.md`](../SECURITY.md).

Gizmo is designed for trusted local workspaces. World scripts and runtime module
factories may execute JavaScript. Automation commands can mutate and auto-save
world files.

## Safe Defaults

- `gizmo start` and `gizmo serve` bind to `127.0.0.1` by default.
- Live sessions use a per-session token.
- API requests require the token in a header.
- API query-string tokens are rejected.
- Remote binding requires `--allow-remote`.

## Practical Guidance

- Prefer JSON worlds for interchange.
- Inspect JavaScript/MJS worlds before running them.
- Treat printed live-session URLs and MCP configs as local secrets.
- Do not expose live sessions to the public internet.
- Review screenshot artifacts before sharing them.

Read [SECURITY.md](../SECURITY.md) for reporting guidance.
