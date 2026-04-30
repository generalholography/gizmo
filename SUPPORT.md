# Support

Gizmo is an open-source project. Public support is handled through repository
issues and documentation.

## Where to Start

- Read the [documentation index](./docs/index.md).
- Check the package README for the surface you are using:
  - [engine](./engine/README.md)
  - [cli](./cli/README.md)
  - [mcp](./mcp/README.md)
- Review [SECURITY.md](./SECURITY.md) before running untrusted worlds or opening
  live sessions beyond loopback.

## Filing Issues

When filing a bug, include:

- Gizmo package and version, or commit SHA.
- Node.js version and operating system.
- The command or API call you ran.
- A minimal world file or reproduction steps.
- Relevant output from `gizmo --help`, `gizmo session`, or test logs.

For CLI/live-session issues, include whether the target was headless
(`--world`) or live (`--server` / `gizmo start` / `gizmo serve`).

## Security Issues

Do not file public issues for vulnerabilities. Follow the private reporting
guidance in [SECURITY.md](./SECURITY.md).
