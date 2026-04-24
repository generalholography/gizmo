import type { CliRunConfig } from './runArtifacts';
import { buildMcpCommand, buildMcpConfig } from './agentConfig';

interface LiveBrowserOpenResult {
  command: string;
  args: string[];
}

interface BuildLiveSessionOutputOptions {
  mode: 'live' | 'dev';
  liveInfo: Record<string, any>;
  run: CliRunConfig;
  browserOpen?: LiveBrowserOpenResult | null;
}

export function buildLiveSessionOutput(options: BuildLiveSessionOutputOptions): Record<string, any> {
  const serverUrl =
    typeof options.liveInfo.serverUrl === 'string' && options.liveInfo.serverUrl.trim()
      ? options.liveInfo.serverUrl
      : undefined;
  const browserUrl =
    typeof options.liveInfo.browserUrl === 'string' && options.liveInfo.browserUrl.trim()
      ? options.liveInfo.browserUrl
      : undefined;
  const token =
    typeof options.liveInfo.token === 'string' && options.liveInfo.token.trim()
      ? options.liveInfo.token
      : undefined;
  const mcpConfig = buildMcpConfig();
  const portableMcpConfig = buildMcpConfig(serverUrl ? { serverUrl, token } : {});
  const payload =
    options.mode === 'dev'
      ? {
          mode: 'dev',
          live: options.liveInfo,
        }
      : options.liveInfo;

  return {
    ...payload,
    run: options.run,
    ...(options.mode === 'dev'
      ? {
          browserOpened: !!options.browserOpen,
          browserOpen: options.browserOpen ?? null,
        }
      : {}),
    browserTargets: browserUrl
      ? {
          system: browserUrl,
          codex: browserUrl,
        }
      : null,
    codex: browserUrl
      ? {
          browserUrl,
          openInAppBrowserUrl: browserUrl,
          note: 'Open this URL in the Codex in-app browser to attach the visible live world.',
        }
      : null,
    mcpCommand: buildMcpCommand(),
    mcpConfig,
    portableMcpCommand: buildMcpCommand(serverUrl ? { serverUrl, token } : {}),
    portableMcpConfig,
    nextSteps: [
      browserUrl
        ? `Open ${browserUrl} in the Codex in-app browser or any local browser.`
        : 'Open the returned live browser URL in a local browser.',
      'Attach your coding agent with mcpConfig from the same workspace.',
      'Use portableMcpConfig when attaching from another workspace or machine.',
      'Use gizmo snapshot to capture the current viewport into the active run artifacts directory.',
    ],
  };
}
