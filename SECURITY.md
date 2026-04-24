# Security Policy

## Local Trust Boundary

Gizmo automation is intended for trusted local workspaces. World scripts may execute JavaScript, and runtime module factories may persist JavaScript source. Do not run the CLI, MCP server, or live workflow against untrusted repositories or world files.

## Live Sessions

`gizmo dev` and `gizmo live` bind to `127.0.0.1` by default and protect API requests with a per-session token. The token appears in the printed browser URL and portable MCP config. Treat those values as local secrets.

The live browser page can be opened with a tokenized URL. API calls under `/api/*` require the token in `x-gizmo-token` or `Authorization: Bearer <token>`; API query-string tokens are rejected. The page sets a same-origin session cookie for browser asset and module requests only.

Binding to non-loopback hosts requires `--allow-remote`. Only use it on trusted networks.

## Reporting Issues

Please report security issues privately to the repository maintainers. Include reproduction steps, affected command paths, and whether a malicious world file or network access is required.
