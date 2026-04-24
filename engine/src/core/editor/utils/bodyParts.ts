import type { Body, Node } from '../../schema';

export type CompositeBody = Extract<Body, { type: 'composite' }>;

export type BodyNodeType = 'primitive' | 'group' | 'light';

export function inferBodyNodeType(node: Partial<Node> | undefined | null): BodyNodeType {
  const explicitType = (node as any)?.type;
  if (explicitType === 'primitive' || explicitType === 'group' || explicitType === 'light') {
    return explicitType;
  }

  if ((node as any)?.light) return 'light';
  if ((node as any)?.operation) return 'group';
  if ((node as any)?.geometry) return 'primitive';
  if (Array.isArray((node as any)?.children) && !(node as any)?.light && !(node as any)?.geometry) return 'group';
  return 'primitive';
}

export function resolveBodyPartDisplayName(node: Partial<Node> | undefined | null): string {
  const part = node as any;
  const name = typeof part?.name === 'string' ? part.name.trim() : '';
  if (name) return name;

  const tag = typeof part?.tag === 'string' ? part.tag.trim() : '';
  if (tag) return tag;

  if (part?.type === 'group') {
    const operationName = typeof part?.operation?.type === 'string' ? part.operation.type.trim() : '';
    if (operationName && operationName.toLowerCase() !== 'none') {
      return operationName;
    }
    return 'Group';
  }

  if (part?.geometry?.type) return String(part.geometry.type);
  if (part?.light?.type) return `light-${String(part.light.type)}`;
  return 'Part';
}

export function hydrateBodyNodeTypes(node: Node): Node {
  const withType = {
    ...(node as any),
    type: inferBodyNodeType(node),
  } as Node;

  if (Array.isArray((withType as any).children)) {
    (withType as any).children = (withType as any).children.map((child: Node) => hydrateBodyNodeTypes(child));
  }

  return withType;
}

export function hydrateCompositeBodyTypes(body: CompositeBody | undefined): CompositeBody | undefined {
  if (!body) return body;

  return {
    ...body,
    params: {
      ...body.params,
      parts: (body.params.parts || []).map((part) => hydrateBodyNodeTypes(part)),
    },
  };
}

export function normalizeBodyPartPath(input: unknown): number[] {
  if (Array.isArray(input)) {
    return input
      .map((segment) => {
        if (typeof segment === 'number' && Number.isInteger(segment) && segment >= 0) return segment;
        if (typeof segment === 'string' && /^\d+$/.test(segment.trim())) return Number(segment.trim());
        return null;
      })
      .filter((segment): segment is number => segment !== null);
  }

  if (typeof input === 'string') {
    return input
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map((segment) => Number(segment))
      .filter((segment) => Number.isInteger(segment) && segment >= 0);
  }

  return [];
}

/**
 * Get part at a specific path in a composite body
 */
export function getPartAtPath(body: CompositeBody | undefined, partPath: number[]): Node | null {
  if (!body) return null;
  let current: Node[] | undefined = body.params?.parts;
  let target: Node | null = null;

  for (let i = 0; i < partPath.length; i++) {
    const index = partPath[i];
    if (!Number.isInteger(index) || index < 0) return null;
    if (!current || current.length <= index) return null;
    const node = current[index];
    if (!node) return null;
    if (i === partPath.length - 1) {
      target = node;
    }
    current = node.children;
  }

  return target;
}

/**
 * Replace part at a specific path in a composite body
 */
export function replacePartAtPath(body: CompositeBody | undefined, partPath: number[], replacement: Node): CompositeBody | undefined {
  if (!body) return body;
  const clone = JSON.parse(JSON.stringify(body)) as CompositeBody;
  let current: Node[] | undefined = clone.params?.parts;

  for (let i = 0; i < partPath.length; i++) {
    const index = partPath[i];
    if (!current || current.length <= index) return clone;

    if (i === partPath.length - 1) {
      current[index] = replacement;
      return clone;
    }

    const next = current[index];
    next.children = next.children ? [...next.children] : [];
    current = next.children;
  }

  return clone;
}

/**
 * Remove part at a specific path in a composite body
 */
export function removePartAtPath(body: CompositeBody | undefined, partPath: number[]): CompositeBody | undefined {
  if (!body || partPath.length === 0) return body;
  const clone = JSON.parse(JSON.stringify(body)) as CompositeBody;
  let current: Node[] | undefined = clone.params?.parts;

  for (let i = 0; i < partPath.length; i++) {
    const index = partPath[i];
    if (!current || current.length <= index) return clone;

    if (i === partPath.length - 1) {
      current.splice(index, 1);
      return clone;
    }

    const next = current[index];
    next.children = next.children ? [...next.children] : [];
    current = next.children;
  }

  return clone;
}

/**
 * Append a part at the specified parent path (root parts array when empty)
 */
export function appendPartAtPath(
  body: CompositeBody | undefined,
  parentPath: number[],
  newPart: Node
): { body: CompositeBody; path: number[] } | null {
  if (!body) return null;
  const clone = JSON.parse(JSON.stringify(body)) as CompositeBody;
  const partClone = JSON.parse(JSON.stringify(newPart)) as Node;

  let current: Node[] | undefined = clone.params?.parts;

  for (let i = 0; i < parentPath.length; i++) {
    const index = parentPath[i];
    if (!current || current.length <= index) return null;

    const next = current[index];
    next.children = next.children ? [...next.children] : [];
    current = next.children;
  }

  if (!current) return null;

  const insertIndex = current.length;
  current.push(partClone);
  return { body: clone, path: [...parentPath, insertIndex] };
}
