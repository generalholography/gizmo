import * as z from 'zod/v3';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  ENGINE_AUTOMATION_COMMAND_DEFINITIONS,
  type AutomationParameterDefinition,
} from '@gizmo3d/engine/automation/definitions';
import { listAutomationResourceDefinitions } from '@gizmo3d/engine/automation/resources';
import type { AutomationSession } from '@gizmo3d/engine/automation/session';
import { getMcpResourceUri, resolveAutomationResourceRequestFromMcpUri } from './resourceUris';

export interface AutomationMcpServerOptions {
  name: string;
  version?: string;
  instructions: string;
  promptDescription: string;
  buildPromptText: (info: Record<string, any>, goal?: string) => string;
}

function buildZodSchema(param: AutomationParameterDefinition): z.ZodTypeAny {
  if (param.schema?.anyOf || param.schema?.oneOf) {
    if (param.name === 'archetypeOrDef') {
      return z.union([z.string(), z.record(z.any())]).describe(param.description);
    }
    return z.any().describe(param.description);
  }

  switch (param.type) {
    case 'string':
      return z.string().describe(param.description);
    case 'number':
      return z.number().describe(param.description);
    case 'boolean':
      return z.boolean().describe(param.description);
    case 'array':
      return z.array(z.any()).describe(param.description);
    case 'object':
    default:
      return z.record(z.any()).describe(param.description);
  }
}

function buildInputSchema(parameters: AutomationParameterDefinition[]): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const parameter of parameters) {
    const base = buildZodSchema(parameter);
    shape[parameter.name] = parameter.required ? base : base.optional();
  }
  return shape;
}

function toJsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function toToolResult(result: { changed?: boolean; message?: string; text?: string }): CallToolResult {
  const text = result.message || result.text || 'OK';
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
    structuredContent: {
      changed: !!result.changed,
      message: text,
    },
  };
}

function describeTemplateResource(resourceName: string, stableId: number): string {
  if (resourceName === 'entity-render-screenshot') {
    return `Viewport screenshot for StableID ${stableId}`;
  }
  return `Entity bundle for StableID ${stableId}`;
}

export async function createAutomationMcpServer(
  session: AutomationSession,
  options: AutomationMcpServerOptions,
): Promise<McpServer> {
  const info = await session.getInfo();
  const server = new McpServer(
    {
      name: options.name,
      version: options.version ?? '1.0.0',
    },
    {
      instructions: options.instructions,
    },
  );

  for (const tool of ENGINE_AUTOMATION_COMMAND_DEFINITIONS) {
    server.registerTool(
      tool.name,
      {
        title: tool.name,
        description: tool.description,
        inputSchema: buildInputSchema(tool.parameters),
      } as any,
      (async (args: Record<string, any> | undefined) => {
        const result = await session.callTool(tool.name, (args ?? {}) as Record<string, any>);
        return toToolResult(result);
      }) as any,
    );
  }

  for (const resource of listAutomationResourceDefinitions()) {
    if (resource.kind === 'static') {
      server.registerResource(
        resource.name,
        getMcpResourceUri(resource),
        {
          title: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        },
        async () => {
          const data = await session.readResource(resource.name);
          return {
            contents: [
              {
                uri: getMcpResourceUri(resource),
                mimeType: resource.mimeType,
                text: toJsonText(data),
              },
            ],
          };
        },
      );
      continue;
    }

    const uriTemplate = getMcpResourceUri(resource);
    const template = new ResourceTemplate(uriTemplate, {
      list: async () => {
        const entities = (await session.readResource('entity-list')) as Array<{
          stableId?: number;
          name?: string;
        }>;
        return {
          resources: entities
            .filter((entity) => typeof entity?.stableId === 'number')
            .map((entity) => ({
              uri: uriTemplate.replace('{stableId}', String(entity.stableId)),
              name: entity.name || `entity-${entity.stableId}`,
              description: describeTemplateResource(resource.name, entity.stableId as number),
              mimeType: resource.mimeType,
            })),
        };
      },
    });

    server.registerResource(
      resource.name,
      template,
      {
        title: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      },
      async (uri) => {
        const request = resolveAutomationResourceRequestFromMcpUri(uri.toString());
        const data = await session.readResource(request.name, request.params);
        return {
          contents: [
            {
              uri: uri.toString(),
              mimeType: resource.mimeType,
              text: toJsonText(data),
            },
          ],
        };
      },
    );
  }

  server.registerPrompt(
    'world-editor',
    {
      title: 'World Editor',
      description: options.promptDescription,
      argsSchema: {
        goal: z.string().optional().describe('Optional editing goal to focus the assistant.'),
      },
    } as any,
    (async ({ goal }: { goal?: string }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: options.buildPromptText(info, goal),
          },
        },
      ],
    })) as any,
  );

  return server;
}
