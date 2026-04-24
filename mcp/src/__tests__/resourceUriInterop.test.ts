import { describe, expect, it } from 'vitest';
import { getMcpResourceUri, resolveAutomationResourceRequestFromMcpUri } from '../resourceUris';

describe('MCP resource URI interoperability', () => {
  it('maps static automation resources to canonical MCP URIs', () => {
    const summary = {
      kind: 'static',
      name: 'world-state-summary',
      description: 'summary',
      mimeType: 'application/json',
    } as const;
    expect(getMcpResourceUri(summary)).toBe('engine://world/summary');
  });

  it('maps runtime module catalogs to canonical MCP URIs', () => {
    const moduleTypes = {
      kind: 'static',
      name: 'module-type-catalog',
      description: 'module types',
      mimeType: 'application/json',
    } as const;
    expect(getMcpResourceUri(moduleTypes)).toBe('engine://modules/types');
  });

  it('maps template automation resources to canonical MCP URI templates', () => {
    const entityBundle = {
      kind: 'template',
      name: 'entity-bundle',
      description: 'entity',
      mimeType: 'application/json',
      parameters: [{ name: 'stableId', description: 'StableID' }],
    } as const;
    expect(getMcpResourceUri(entityBundle)).toBe('engine://entities/{stableId}');
  });

  it('parses entity bundle URIs back to automation resource requests', () => {
    expect(resolveAutomationResourceRequestFromMcpUri('engine://entities/42')).toEqual({
      name: 'entity-bundle',
      params: { stableId: 42 },
    });
  });

  it('parses entity screenshot URIs back to automation resource requests', () => {
    expect(resolveAutomationResourceRequestFromMcpUri('engine://render/entities/12/screenshot')).toEqual({
      name: 'render-screenshot',
      params: { stableId: 12 },
    });
  });
});
