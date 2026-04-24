/**
 * Animation Component Editor
 * Dedicated editor for Animation component with clips and tracks list
 * Extracted from ComponentInspector for better separation of concerns
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Typography, Divider, message } from 'antd';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import { buildComponentDefaults, buildFieldDefault } from '../../editor/schema/defaults';
import { ModifyComponentCommand } from '../../editor/commands/ModifyComponentCommand';
import { GenericFieldRenderer } from './fieldRenderers/GenericFieldRenderer';
import { AnimationSchema } from '../../editor/schema/schemas/AnimationSchema';
import { AnimationClipSchema, AnimationTrackSchema } from '../../editor/schema/ModuleSchemas';
import { ItemList, ItemListItem } from './components/ItemList';
import { ComponentHeader } from './components/ComponentHeader';
import { EDITOR_COLORS, EDITOR_SPACING, EDITOR_TYPOGRAPHY } from './styles/tokens';
import type { FieldMetadata } from '../../editor/schema/FieldMetadata';
import type { Node as BodyNode } from '../../schema';

const { Text } = Typography;

// Build AnimationClipOverviewSchema (excludes tracks)
const AnimationClipOverviewSchema: FieldMetadata = {
  ...AnimationClipSchema,
  fields: {
    ...AnimationClipSchema.fields,
  },
};
delete (AnimationClipOverviewSchema.fields as any)?.tracks;

/**
 * Deep clone a value using JSON serialization
 */
function cloneValue<T>(value: T): T {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

/**
 * Flatten parts to find all tagged parts
 */
function flattenParts(parts: BodyNode[] = [], parentPath: number[] = []): { label: string; path: number[] }[] {
  const items: { label: string; path: number[] }[] = [];
  parts.forEach((part, index) => {
    const path = [...parentPath, index];
    const tag = (part as any).tag;
    if (tag) {
      items.push({ label: tag as string, path });
    }
    if (part.children && part.children.length) {
      items.push(...flattenParts(part.children, path));
    }
  });
  return items;
}

/**
 * Get a body part by its path
 */
function getPartByPath(parts: BodyNode[] | undefined, path: number[]): BodyNode | null {
  if (!parts) return null;
  let current: any = parts;
  for (let i = 0; i < path.length; i++) {
    const idx = path[i];
    if (!Array.isArray(current) || current.length <= idx) return null;
    const node = current[idx];
    if (i === path.length - 1) return node as BodyNode;
    current = (node as any).children;
  }
  return null;
}

/**
 * Find part path by tag
 */
function findPartPathByTag(parts: BodyNode[] = [], tag?: string): number[] | null {
  if (!tag) return null;
  for (let i = 0; i < parts.length; i++) {
    const node = parts[i];
    if ((node as any).tag === tag) {
      return [i];
    }
    if (node.children) {
      const childPath = findPartPathByTag(node.children, tag);
      if (childPath) {
        return [i, ...childPath];
      }
    }
  }
  return null;
}

interface TrackItem extends ItemListItem {
  targetTag: string;
  keyframeCount: number;
  trackData?: any;
  clipIndex: number;
  trackIndex: number;
}

/**
 * List tracks as TrackItem objects
 */
function listTracks(tracks: any[] = [], clipIndex: number): TrackItem[] {
  return tracks.map((track, index) => ({
    key: `clip-${clipIndex}-track-${index}`,
    label: track.targetTag || `Track ${index + 1}`,
    icon: 'timeline' as const,
    targetTag: track.targetTag || '',
    keyframeCount: track.keyframes?.length || 0,
    childCount: track.keyframes?.length || 0,
    trackData: track,
    clipIndex,
    trackIndex: index,
  }));
}

export interface AnimationComponentEditorProps {
  eid: number;
  animationData: any;
  /** Body data for resolving part tags */
  bodyData?: any;
}

/**
 * AnimationComponentEditor - Dedicated editor for Animation component
 */
export function AnimationComponentEditor({ eid, animationData, bodyData }: AnimationComponentEditorProps) {
  const api = useAPI();
  const ctx = api.ecsWorld;
  const { executeCommand, selectBodyPart } = useEditor();
  const [animationDraft, setAnimationDraft] = useState<any | null>(null);
  const [animationDirty, setAnimationDirty] = useState(false);
  const latestAnimationDraftRef = React.useRef<any | null>(null);
  const animationDirtyRef = React.useRef(false);

  // Sync draft with incoming animation data
  useEffect(() => {
    if (!animationDirty) {
      const nextDraft = animationData ? cloneValue(animationData) : null;
      setAnimationDraft(nextDraft);
      latestAnimationDraftRef.current = nextDraft;
      animationDirtyRef.current = false;
    }
  }, [animationData, animationDirty]);

  // Find the first tagged part for auto-targeting new tracks
  const primaryTaggedPart = useMemo(() => {
    const allParts = flattenParts(bodyData?.params?.parts || []);
    for (const item of allParts) {
      const part = getPartByPath(bodyData?.params?.parts, item.path);
      if (part && (part as any).tag) {
        return { label: (part as any).tag as string, path: item.path };
      }
    }
    return undefined;
  }, [bodyData?.params?.parts]);

  // Apply animation draft as a command
  const applyAnimationDraft = useCallback((draft?: any, force = false) => {
    const nextAnimation = draft ?? animationDraft;
    if (!nextAnimation || (!force && !animationDirty)) return;

    const command = new ModifyComponentCommand(ctx, api, eid, 'Animation', nextAnimation, true);
    executeCommand(command);
    setAnimationDraft(nextAnimation);
    setAnimationDirty(false);
    latestAnimationDraftRef.current = nextAnimation;
    animationDirtyRef.current = false;
  }, [ctx, api, eid, executeCommand, animationDraft, animationDirty]);

  // Handle animation commit
  const handleAnimationCommit = useCallback((value: any) => {
    setAnimationDraft(value);
    setAnimationDirty(true);
    latestAnimationDraftRef.current = value;
    animationDirtyRef.current = true;
    applyAnimationDraft(value, true);
  }, [applyAnimationDraft]);

  // Add a new clip
  const addClip = useCallback(() => {
    let nextDraft: any = null;
    setAnimationDraft((prev: any) => {
      const next = prev ? cloneValue(prev) : buildComponentDefaults(AnimationSchema as any);
      next.clips = next.clips || [];
      next.clips.push(buildFieldDefault(AnimationClipSchema));
      nextDraft = next;
      return next;
    });
    if (nextDraft) {
      setAnimationDirty(true);
      latestAnimationDraftRef.current = nextDraft;
      animationDirtyRef.current = true;
      applyAnimationDraft(nextDraft, true);
    }
  }, [applyAnimationDraft]);

  // Add a track to a specific clip
  const addTrackForClip = useCallback((clipIndex: number) => {
    const targetTag = primaryTaggedPart?.label || '';
    let nextDraft: any = null;
    setAnimationDraft((prev: any) => {
      const next = prev ? cloneValue(prev) : buildComponentDefaults(AnimationSchema as any);
      next.clips = next.clips || [];
      next.clips[clipIndex].tracks = next.clips[clipIndex].tracks || [];
      const track = buildFieldDefault(AnimationTrackSchema);
      track.targetTag = targetTag;
      next.clips[clipIndex].tracks.push(track);
      nextDraft = next;
      return next;
    });
    if (nextDraft) {
      setAnimationDirty(true);
      latestAnimationDraftRef.current = nextDraft;
      animationDirtyRef.current = true;
      applyAnimationDraft(nextDraft, true);
    }
  }, [applyAnimationDraft, primaryTaggedPart?.label]);

  const removeTrackForClip = useCallback((clipIndex: number, trackIndex: number) => {
    const nextDraft = cloneValue(animationDraft ?? {});
    const tracks = nextDraft?.clips?.[clipIndex]?.tracks;
    if (!tracks) return;
    tracks.splice(trackIndex, 1);
    setAnimationDraft(nextDraft);
    setAnimationDirty(true);
    latestAnimationDraftRef.current = nextDraft;
    animationDirtyRef.current = true;
    applyAnimationDraft(nextDraft, true);
  }, [animationDraft, applyAnimationDraft]);

  useEffect(() => {
    latestAnimationDraftRef.current = animationDraft;
    animationDirtyRef.current = animationDirty;
  }, [animationDraft, animationDirty]);

  useEffect(() => {
    return () => {
      if (!animationDirtyRef.current || !latestAnimationDraftRef.current) return;

      try {
        const command = new ModifyComponentCommand(ctx, api, eid, 'Animation', latestAnimationDraftRef.current, true);
        executeCommand(command);
        animationDirtyRef.current = false;
      } catch (error) {
        console.error('Failed to commit Animation on unmount:', error);
      }
    };
  }, [api, ctx, eid, executeCommand]);

  // Render popout widget for track editing
  const renderTrackPopout = useCallback((item: TrackItem) => {
    const trackData = animationDraft?.clips?.[item.clipIndex]?.tracks?.[item.trackIndex] ?? item.trackData;
    if (!trackData) return null;

    return (
      <div style={{ minWidth: 200 }}>
        <GenericFieldRenderer
          metadata={AnimationTrackSchema}
          value={trackData}
          onChange={(val: any) => {
            setAnimationDraft((prev: any) => {
              if (!prev) return prev;
              const next = cloneValue(prev);
              if (next.clips[item.clipIndex]?.tracks) {
                next.clips[item.clipIndex].tracks[item.trackIndex] = val;
              }
              latestAnimationDraftRef.current = next;
              return next;
            });
            setAnimationDirty(true);
            animationDirtyRef.current = true;
          }}
          onCommit={(val: any) => {
            const next = cloneValue(animationDraft ?? {});
            if (next.clips[item.clipIndex]?.tracks) {
              next.clips[item.clipIndex].tracks[item.trackIndex] = val;
            }
            setAnimationDraft(next);
            setAnimationDirty(true);
            latestAnimationDraftRef.current = next;
            animationDirtyRef.current = true;
            applyAnimationDraft(next, true);
          }}
          path={`clips.${item.clipIndex}.tracks.${item.trackIndex}`}
          parentValue={animationDraft}
        />
      </div>
    );
  }, [animationDraft, applyAnimationDraft]);

  if (!animationDraft) {
    return (
      <Text style={{ color: EDITOR_COLORS.textTertiary, fontSize: EDITOR_TYPOGRAPHY.fontSizeMd }}>
        Animation component missing or failed to load.
      </Text>
    );
  }

  return (
    <>
      <ComponentHeader title="Clips" icon="timeline" onAdd={addClip} addTooltip="Add clip" />
      {(animationDraft.clips || []).map((clip: any, clipIndex: number) => {
        const trackItems = listTracks(clip.tracks || [], clipIndex);

        return (
          <div key={`clip-${clipIndex}`} style={{ marginBottom: EDITOR_SPACING.md }}>
            <GenericFieldRenderer
              metadata={AnimationClipOverviewSchema}
              value={clip}
              onChange={(val) => {
                setAnimationDraft((prev: any) => {
                  if (!prev) return prev;
                  const next = cloneValue(prev);
                  next.clips[clipIndex] = val;
                  latestAnimationDraftRef.current = next;
                  return next;
                });
                setAnimationDirty(true);
                animationDirtyRef.current = true;
              }}
              onCommit={(val) => {
                const next = cloneValue(animationDraft ?? {});
                if (!next.clips) return;
                next.clips[clipIndex] = val;
                setAnimationDraft(next);
                setAnimationDirty(true);
                latestAnimationDraftRef.current = next;
                animationDirtyRef.current = true;
                applyAnimationDraft(next, true);
              }}
              path={`clips.${clipIndex}`}
              parentValue={animationDraft}
            />

            <Divider style={{ margin: `${EDITOR_SPACING.sm}px 0`, background: EDITOR_COLORS.divider }} />
            <ItemList<TrackItem>
              title="Tracks"
              items={trackItems}
              itemIcon="timeline"
              onItemClick={(item) => {
                const path = findPartPathByTag(bodyData?.params?.parts, item.targetTag);
                if (path) {
                  selectBodyPart(eid, path);
                } else {
                  message.info('No part found with that tag. Set the tag in the part inspector.');
                }
              }}
              onAdd={() => addTrackForClip(clipIndex)}
              addButtonLabel="Add track"
              addTooltip="Add track"
              emptyText="No tracks. Add one to target a part."
              renderPopout={renderTrackPopout}
              onRemove={(item) => removeTrackForClip(item.clipIndex, item.trackIndex)}
              removeTooltip="Delete track"
            />
          </div>
        );
      })}
    </>
  );
}
