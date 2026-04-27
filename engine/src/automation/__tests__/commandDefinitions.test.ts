import { describe, expect, it } from 'vitest';
import { ENGINE_AUTOMATION_COMMAND_DEFINITIONS, ENGINE_EDITOR_AGENT_COMMAND_DEFINITIONS } from '../definitions';
import { AUTOMATION_COMMAND_NAMES, listAutomationCommands } from '../commands';

describe('Automation command definitions', () => {
  it('matches available command builders', () => {
    const definitionNames = ENGINE_EDITOR_AGENT_COMMAND_DEFINITIONS.map((command) => command.name).sort();
    const builderNames = [...AUTOMATION_COMMAND_NAMES].sort();
    expect(definitionNames).toEqual(builderNames);
  });

  it('defines required params for reinitialize-world', () => {
    const command = ENGINE_EDITOR_AGENT_COMMAND_DEFINITIONS.find((entry) => entry.name === 'reinitialize-world');
    expect(command).toBeDefined();
    const definitionParam = command?.parameters.find((param) => param.name === 'definition');
    expect(definitionParam?.required).toBe(true);
  });

  it('matches body part parameter names with builders', () => {
    const addBodyPart = ENGINE_EDITOR_AGENT_COMMAND_DEFINITIONS.find((entry) => entry.name === 'add-body-part');
    const insertBodyPart = ENGINE_EDITOR_AGENT_COMMAND_DEFINITIONS.find((entry) => entry.name === 'insert-body-part');
    expect(addBodyPart?.parameters.map((param) => param.name)).toEqual(['stableId', 'archetype', 'localPosition']);
    expect(insertBodyPart?.parameters.map((param) => param.name)).toEqual(['stableId', 'parentPath', 'part']);
  });

  it('does not expose structural overrides for component edits', () => {
    const componentCommands = ['add-component', 'remove-component', 'modify-component'];
    componentCommands.forEach((name) => {
      const command = ENGINE_EDITOR_AGENT_COMMAND_DEFINITIONS.find((entry) => entry.name === name);
      const parameterNames = command?.parameters.map((param) => param.name) ?? [];
      expect(parameterNames).not.toContain('isStructural');
    });
  });

  it('uses modify-world-settings command name', () => {
    const hasModify = ENGINE_EDITOR_AGENT_COMMAND_DEFINITIONS.some((entry) => entry.name === 'modify-world-settings');
    expect(hasModify).toBe(true);
  });

  it('exposes only standard automation tools through listAutomationCommands', () => {
    const names = listAutomationCommands().map((entry) => entry.name);
    expect(names).toEqual(ENGINE_AUTOMATION_COMMAND_DEFINITIONS.map((entry) => entry.name));
    expect(names).not.toContain('terminate');
    expect(names).not.toContain('read-resource');
  });
});
