import type { AutomationCommandCall } from './commands';
import { ENGINE_AUTOMATION_COMMAND_DEFINITIONS } from './definitions';

export interface AutomationToolResult {
  text: string;
  changed: boolean;
}

export interface AutomationBatchResult {
  changed: boolean;
  results: AutomationToolResult[];
}

export interface AutomationSession {
  getInfo(): Record<string, any> | Promise<Record<string, any>>;
  callTool(name: string, args?: Record<string, any>): Promise<AutomationToolResult>;
  callBatch(calls: AutomationCommandCall[], description?: string): Promise<AutomationBatchResult>;
  readResource(name: string, params?: Record<string, any>): Promise<any> | any;
  close?(): Promise<void>;
}

const CHANGING_COMMAND_NAMES = new Set(
  ENGINE_AUTOMATION_COMMAND_DEFINITIONS.filter((definition) => definition.changesState).map((definition) => definition.name),
);

const PERSISTING_COMMAND_NAMES = new Set(
  ENGINE_AUTOMATION_COMMAND_DEFINITIONS.filter((definition) => definition.persistsWorld).map((definition) => definition.name),
);

export function isMutatingAutomationCommand(name: string): boolean {
  return CHANGING_COMMAND_NAMES.has(name);
}

export function persistsWorldForAutomationCommand(name: string): boolean {
  return PERSISTING_COMMAND_NAMES.has(name);
}
