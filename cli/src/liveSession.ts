import type { AutomationCommandCall, AutomationBatchResult, AutomationSession, AutomationToolResult } from '@gizmo3d/engine/automation';
import { isMutatingAutomationCommand } from '@gizmo3d/engine/automation';
import {
  callLiveServerBatch,
  callLiveServerCommand,
  readLiveServerResource,
  readLiveServerSession,
} from './serverClient';

export class LiveAutomationSession implements AutomationSession {
  readonly serverUrl: string;
  readonly token?: string;

  constructor(serverUrl: string, token?: string) {
    this.serverUrl = serverUrl;
    this.token = token;
  }

  async getInfo(): Promise<Record<string, any>> {
    return await readLiveServerSession(this.serverUrl, this.token);
  }

  async callTool(name: string, args: Record<string, any> = {}): Promise<AutomationToolResult> {
    const result = await callLiveServerCommand(this.serverUrl, name, args, this.token);
    return {
      text: result.message || result.text || 'OK',
      changed: result.changed ?? isMutatingAutomationCommand(name),
    };
  }

  async callBatch(calls: AutomationCommandCall[], description?: string): Promise<AutomationBatchResult> {
    const result = await callLiveServerBatch(this.serverUrl, calls, description, this.token);
    const rawResults = Array.isArray(result.results) ? result.results : [];
    return {
      changed: result.changed ?? calls.some((call) => isMutatingAutomationCommand(call.name)),
      results: calls.map((call, index) => {
        const raw = rawResults[index];
        if (raw && typeof raw === 'object') {
          return {
            text: raw.text || raw.message || call.name,
            changed: raw.changed ?? isMutatingAutomationCommand(call.name),
          };
        }
        return {
          text: typeof raw === 'string' ? raw : call.name,
          changed: isMutatingAutomationCommand(call.name),
        };
      }),
    };
  }

  async readResource(name: string, params?: Record<string, any>): Promise<any> {
    return await readLiveServerResource(this.serverUrl, name, params, this.token);
  }
}
