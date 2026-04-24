import type { AutomationResourceDefinition } from '@gizmo3d/engine/automation';

const STATIC_RESOURCE_URIS: Record<string, string> = {
  'session-info': 'engine://session/info',
  'world-state-summary': 'engine://world/summary',
  'component-catalog': 'engine://components/catalog',
  'module-type-catalog': 'engine://modules/types',
  'module-instance-catalog': 'engine://modules/instances',
  'entity-list': 'engine://entities',
  'selected-entities-full': 'engine://selection/entities',
  'selected-body-parts-full': 'engine://selection/body-parts',
  metadata: 'engine://world/metadata',
  achievements: 'engine://world/achievements',
  'full-world-state': 'engine://world/full-state',
  'render-screenshot': 'engine://render/screenshot',
  'viewport-camera': 'engine://viewport/camera',
};

const TEMPLATE_RESOURCE_URIS: Record<string, string> = {
  'entity-bundle': 'engine://entities/{stableId}',
  'entity-render-screenshot': 'engine://render/entities/{stableId}/screenshot',
};

export function getMcpResourceUri(definition: AutomationResourceDefinition): string {
  if (definition.kind === 'static') {
    const uri = STATIC_RESOURCE_URIS[definition.name];
    if (!uri) {
      throw new Error(`No MCP URI mapping exists for automation resource '${definition.name}'.`);
    }
    return uri;
  }

  const uriTemplate = TEMPLATE_RESOURCE_URIS[definition.name];
  if (!uriTemplate) {
    throw new Error(`No MCP URI template mapping exists for automation resource '${definition.name}'.`);
  }
  return uriTemplate;
}

export function resolveAutomationResourceRequestFromMcpUri(uri: string): {
  name: string;
  params?: Record<string, any>;
} {
  const normalized = new URL(uri).toString();

  for (const [name, staticUri] of Object.entries(STATIC_RESOURCE_URIS)) {
    if (new URL(staticUri).toString() === normalized) {
      return { name };
    }
  }

  const url = new URL(normalized);
  if (url.protocol === 'engine:' && url.host === 'entities') {
    const stableIdValue = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const stableId = Number(stableIdValue);
    if (Number.isFinite(stableId)) {
      return {
        name: 'entity-bundle',
        params: { stableId },
      };
    }
  }

  if (url.protocol === 'engine:' && url.host === 'render') {
    const match = url.pathname.match(/^\/entities\/([^/]+)\/screenshot\/?$/);
    if (match) {
      const stableId = Number(decodeURIComponent(match[1]));
      if (!Number.isFinite(stableId)) {
        throw new Error(`Invalid stableId in resource URI '${uri}'`);
      }
      return {
        name: 'render-screenshot',
        params: { stableId },
      };
    }
  }

  throw new Error(`MCP resource URI '${uri}' not found`);
}
