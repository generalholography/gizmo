import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAPI } from '../App';
import { GenericFieldRenderer } from './fieldRenderers/GenericFieldRenderer';
import { BodyPartSchema } from '../../editor/schema/schemas/BodySchema';
import { AnimationTrackSchema } from '../../editor/schema/ModuleSchemas';
import { ModifyComponentCommand } from '../../editor/commands/ModifyComponentCommand';
import { getEntityBundle } from '../../despawn';
import { useEditor } from './EditorContext';
import { buildFieldDefault } from '../../editor/schema/defaults';
import { InspectorComponentSection } from './components/InspectorComponentSection';
import { ItemList, ItemListItem } from './components/ItemList';
import type { Body as BodyDefinition } from '../../schema';
import type { InspectorTab } from '../../editor/schema/FieldMetadata';
import { BodyPartFieldEditor } from './components/BodyPartFieldEditor';
import { getBodyPartEditorFields } from './components/BodyPartFieldEditor';
import { PaneTitle } from './components/PaneTitle';
import { InspectorMetadataModal } from './InspectorMetadataModal';
import { buildSchemaSurfaceItems } from './components/SchemaSurfaceEditor';
import { VirtualizedInspectorList, type VirtualizedInspectorItem } from './components/VirtualizedInspectorList';
import {
  getPartAtPath,
  hydrateCompositeBodyTypes,
  inferBodyNodeType,
  removePartAtPath,
  resolveBodyPartDisplayName,
  replacePartAtPath,
  type CompositeBody,
} from '../../editor/utils/bodyParts';

type ChildItem = ItemListItem & { path: number[]; childCount: number; partData?: any };

const { Text } = Typography;
interface PartInspectorProps {
  eid: number;
  partPath: number[];
  activeTab: InspectorTab;
}

function resolvePartLabel(part: any): string {
  return resolveBodyPartDisplayName(part);
}

function resolvePartIcon(part: any): ItemListItem['icon'] {
  const geoType = part?.geometry?.type;
  if (geoType) {
    const iconMap: Record<string, ItemListItem['icon']> = {
      image: 'box',
      box: 'box',
      sphere: 'sphere',
      cylinder: 'cylinder',
      cone: 'cone',
      pyramid: 'pyramid',
      capsule: 'cylinder',
      hemisphere: 'sphere',
      icosahedron: 'sphere',
      torus: 'sphere',
      roundedBox: 'box',
      wedge: 'pyramid',
      lathe: 'cylinder',
      star: 'cube',
      hollowCylinder: 'cylinder',
      displacedPlane: 'box',
      extrudedPolygon: 'box',
    };
    return iconMap[geoType] || 'cube';
  }
  if (part?.light) return 'light';
  return 'cube';
}


export function PartInspector({ eid, partPath, activeTab }: PartInspectorProps) {
  const api = useAPI();
  const ctx = api.ecsWorld;
  const { executeCommand, selectBodyPart } = useEditor();

  const [bodyDraft, setBodyDraft] = useState<CompositeBody | undefined>();
  const [partDraft, setPartDraft] = useState<any | null>(null);
  const [animationDraft, setAnimationDraft] = useState<any | null>(null);
  const [initialTag, setInitialTag] = useState<string | undefined>(undefined);
  const [bodyDirty, setBodyDirty] = useState(false);
  const [animationDirty, setAnimationDirty] = useState(false);
  const [popoutMetadataPath, setPopoutMetadataPath] = useState<number[] | null>(null);
  const [isPopoutMetadataOpen, setIsPopoutMetadataOpen] = useState(false);

  const childItems = useMemo<ChildItem[]>(
    () =>
      (partDraft?.children || []).map((child: any, index: number) => ({
        key: `child-${index}`,
        label: resolvePartLabel(child),
        icon: resolvePartIcon(child),
        path: [...partPath, index],
        childCount: child.children?.length || 0,
        partData: child,
      })),
    [partDraft?.children, partPath]
  );

  const loadDrafts = useCallback(() => {
    const bundle = getEntityBundle(ctx, eid, {
      includeRuntime: false,
      includeRuntimeComponents: false,
    });

    const body = bundle.Body as BodyDefinition | undefined;
    const composite = body?.type === 'composite' ? (body as CompositeBody) : undefined;
    const hydratedComposite = hydrateCompositeBodyTypes(
      composite ? (JSON.parse(JSON.stringify(composite)) as CompositeBody) : undefined
    );
    const part = getPartAtPath(hydratedComposite, partPath);
    setBodyDraft(hydratedComposite);
    setPartDraft(part);
    setInitialTag(part?.tag);

    const animation = bundle.Animation ? JSON.parse(JSON.stringify(bundle.Animation)) : null;
    setAnimationDraft(animation);

    setBodyDirty(false);
    setAnimationDirty(false);
  }, [ctx, eid, partPath]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const activeTag = useMemo(() => partDraft?.tag ?? initialTag, [initialTag, partDraft?.tag]);

  const applyDrafts = useCallback((options?: {
    partOverride?: any;
    bodyOverride?: CompositeBody | undefined;
    animationOverride?: any;
    forceBody?: boolean;
    forceAnimation?: boolean;
  }) => {
    let currentEid = eid;

    const nextBody = options?.bodyOverride ?? bodyDraft;
    const nextPart = options?.partOverride ?? partDraft;
    const shouldApplyBody = (options?.forceBody ?? false) || bodyDirty;

    if (shouldApplyBody && nextBody && nextPart) {
      const updatedBody = replacePartAtPath(nextBody, partPath, nextPart);
      if (updatedBody) {
        const bodyCommand = new ModifyComponentCommand(ctx, api, currentEid, 'Body', updatedBody, true);
        executeCommand(bodyCommand);
        currentEid = (bodyCommand as any).getCurrentEntityId?.() ?? currentEid;
        setBodyDraft(updatedBody);
        setBodyDirty(false);
      }
    }

    const nextAnimation = options?.animationOverride ?? animationDraft;
    const shouldApplyAnimation = (options?.forceAnimation ?? false) || animationDirty;

    if (shouldApplyAnimation && nextAnimation) {
      const animationCommand = new ModifyComponentCommand(ctx, api, currentEid, 'Animation', nextAnimation, true);
      executeCommand(animationCommand);
      currentEid = (animationCommand as any).getCurrentEntityId?.() ?? currentEid;
      setAnimationDraft(nextAnimation);
      setAnimationDirty(false);
    }

    if (currentEid !== eid) {
      selectBodyPart(currentEid, partPath);
    }
  }, [animationDirty, animationDraft, api, bodyDirty, bodyDraft, ctx, eid, partDraft, partPath, selectBodyPart]);

  const handleTrackChange = (clipIndex: number, trackIndex: number, value: any) => {
    setAnimationDraft((prev: any) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      next.clips = next.clips || [];
      next.clips[clipIndex].tracks[trackIndex] = value;
      return next;
    });
    setAnimationDirty(true);
  };

  const addTrack = (clipIndex: number) => {
    if (!activeTag) return;
    const nextAnimation = animationDraft ? JSON.parse(JSON.stringify(animationDraft)) : null;
    if (!nextAnimation?.clips?.[clipIndex]) return;
    const track = buildFieldDefault(AnimationTrackSchema);
    track.targetTag = activeTag;
    nextAnimation.clips[clipIndex].tracks = [...(nextAnimation.clips[clipIndex].tracks || []), track];
    setAnimationDraft(nextAnimation);
    setAnimationDirty(true);
    applyDrafts({ animationOverride: nextAnimation, forceAnimation: true });
  };

  const addChildPart = () => {
    let nextPart: any;
    setPartDraft((prev: any) => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      next.children = next.children || [];
      next.children.push(buildFieldDefault(BodyPartSchema));
      nextPart = next;
      return next;
    });
    if (nextPart) {
      setBodyDirty(true);
      applyDrafts({ partOverride: nextPart, forceBody: true });
    }
  };

  const renderChildPopout = useCallback((item: ChildItem) => {
    const childPart = getPartAtPath(bodyDraft, item.path) ?? item.partData;
    if (!childPart) return null;

    const childWithType = childPart?.type
      ? childPart
      : { ...childPart, type: inferBodyNodeType(childPart) };

    const updateChildAtPath = (nextChild: any, commit = false) => {
      if (!bodyDraft) return;
      const nextBody = replacePartAtPath(bodyDraft, item.path, nextChild);
      if (!nextBody) return;

      const selectedPart = getPartAtPath(nextBody, partPath) as any;
      setBodyDraft(nextBody);
      setPartDraft(selectedPart);
      setBodyDirty(true);

      if (commit) {
        applyDrafts({
          bodyOverride: nextBody,
          partOverride: selectedPart,
          forceBody: true,
        });
      }
    };

    return (
      <div style={{ minWidth: 200 }}>
        <BodyPartFieldEditor
          editorKey={`child-popout-${eid}-${item.path.join('.')}-${childWithType?.type ?? 'unknown'}`}
          value={childWithType}
          onChange={(val: any) => updateChildAtPath(val, false)}
          onCommit={(val: any) => {
            updateChildAtPath(val, true);
          }}
          path={`bodyPart.children.${item.path.join('.children.')}`}
          hideChildren
        />
      </div>
    );
  }, [applyDrafts, bodyDraft, eid, partPath]);

  const renderChildPopoutHeader = useCallback((item: ChildItem, _index: number, onClose: () => void) => {
    const childPart = getPartAtPath(bodyDraft, item.path) ?? item.partData;
    const title = resolveBodyPartDisplayName(childPart);

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#1b1f2a',
          borderBottom: '1px solid #2a2f3a',
          borderRadius: '6px 6px 0 0',
        }}
      >
        <PaneTitle
          title={title}
          onMetadataClick={() => {
            setPopoutMetadataPath(item.path);
            setIsPopoutMetadataOpen(true);
          }}
          metadataAriaLabel="Part metadata options"
          size="md"
        />
        <Button
          type="text"
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          style={{ padding: 0, width: 24, height: 24 }}
          aria-label="Close child part popout"
        >
          ×
        </Button>
      </div>
    );
  }, [bodyDraft]);

  const removeTrack = (clipIndex: number, trackIndex: number) => {
    const nextAnimation = animationDraft ? JSON.parse(JSON.stringify(animationDraft)) : null;
    const tracks = nextAnimation?.clips?.[clipIndex]?.tracks;
    if (!nextAnimation || !tracks) return;
    tracks.splice(trackIndex, 1);
    setAnimationDraft(nextAnimation);
    setAnimationDirty(true);
    applyDrafts({ animationOverride: nextAnimation, forceAnimation: true });
  };

  const removeChildPart = useCallback((item: ChildItem) => {
    const nextBody = removePartAtPath(bodyDraft, item.path);
    if (!nextBody) return;

    const selectedPart = getPartAtPath(nextBody, partPath) as any;
    setBodyDraft(nextBody);
    setPartDraft(selectedPart);
    setBodyDirty(true);
    applyDrafts({
      bodyOverride: nextBody,
      partOverride: selectedPart,
      forceBody: true,
    });
  }, [applyDrafts, bodyDraft, partPath]);

  if (!partDraft || !bodyDraft) {
    return (
      <Alert
        type="warning"
        message="Selected body part could not be found"
        description="Ensure the entity has a composite body and the selected path is valid."
        showIcon
      />
    );
  }

  const showDesign = activeTab === 'design';
  const showAnimation = activeTab === 'animation';
  const showSimulate = activeTab === 'simulate';

  const designItems = showDesign
    ? [
        ...buildSchemaSurfaceItems({
          fields: getBodyPartEditorFields(partDraft, true, true, 'design'),
          value: partDraft,
          activeTab: 'design',
          onFieldChange: (fieldName, value) => {
            setPartDraft((prev: any) => ({
              ...(prev ?? {}),
              [fieldName]: value,
            }));
            setBodyDirty(true);
          },
          onFieldCommit: (fieldName, value) => {
            const nextPart = {
              ...(partDraft ?? {}),
              [fieldName]: value,
            };
            setPartDraft(nextPart);
            setBodyDirty(true);
            applyDrafts({ partOverride: nextPart, forceBody: true });
          },
          pathPrefix: 'bodyPart',
        }),
        {
          key: 'part-children',
          node: (
            <InspectorComponentSection
              title="Children"
              action={(
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={(event) => {
                    event.stopPropagation();
                    addChildPart();
                  }}
                  aria-label="Add part"
                />
              )}
            >
              <ItemList<ChildItem>
                title="Children"
                showTitle={false}
                items={childItems}
                itemIcon="cube"
                onItemClick={(item) => selectBodyPart(eid, item.path)}
                emptyText="No children yet"
                renderPopout={renderChildPopout}
                renderPopoutHeader={renderChildPopoutHeader}
                onRemove={removeChildPart}
                removeTooltip="Delete child"
              />
            </InspectorComponentSection>
          ),
        },
      ]
    : [];

  const simulateItems = showSimulate
    ? buildSchemaSurfaceItems({
        fields: getBodyPartEditorFields(partDraft, true, true, 'simulate'),
        value: partDraft,
        activeTab: 'simulate',
        onFieldChange: (fieldName, value) => {
          setPartDraft((prev: any) => ({
            ...(prev ?? {}),
            [fieldName]: value,
          }));
          setBodyDirty(true);
        },
        onFieldCommit: (fieldName, value) => {
          const nextPart = {
            ...(partDraft ?? {}),
            [fieldName]: value,
          };
          setPartDraft(nextPart);
          setBodyDirty(true);
          applyDrafts({ partOverride: nextPart, forceBody: true });
        },
        pathPrefix: 'bodyPart',
      })
    : [];

  const animationItems: VirtualizedInspectorItem[] = [];
  if (showAnimation) {
    animationItems.push({
      key: 'part-animation-header',
      node: (
        <InspectorComponentSection title="Animation Tracks">
          {!activeTag ? (
            <Alert
              type="info"
              showIcon
              message="Add a Tag to this part to link animation tracks"
              description="Animation tracks target parts by tag. Set a tag above to edit tracks for this part."
            />
          ) : !animationDraft?.clips?.length ? (
            <Text style={{ color: '#999', fontSize: '12px' }}>
              No animation component or clips found for this entity.
            </Text>
          ) : null}
        </InspectorComponentSection>
      ),
    });

    if (activeTag && animationDraft?.clips?.length) {
      animationDraft.clips.forEach((clip: any, clipIndex: number) => {
        const tracks = (clip.tracks || []).filter((t: any) => t.targetTag === activeTag);
        animationItems.push({
          key: `part-clip-${clipIndex}`,
          node: (
            <InspectorComponentSection
              title={clip.name || `Clip ${clipIndex + 1}`}
              action={(
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={(event) => {
                    event.stopPropagation();
                    addTrack(clipIndex);
                  }}
                  disabled={!activeTag}
                  aria-label={`Add track to ${clip.name || `Clip ${clipIndex + 1}`}`}
                />
              )}
            >
              {tracks.length === 0 ? (
                <Alert
                  type="info"
                  showIcon
                  message="No tracks for this part yet"
                  description="Add a track to drive this part in this clip."
                />
              ) : (
                tracks.map((track: any) => {
                  const absoluteIndex = (clip.tracks || []).indexOf(track);
                  return (
                    <div key={`${clipIndex}-${absoluteIndex}`} style={{ marginBottom: 12 }}>
                      <GenericFieldRenderer
                        metadata={AnimationTrackSchema}
                        value={track}
                        onChange={(value) => handleTrackChange(clipIndex, absoluteIndex, value)}
                        onCommit={(value) => {
                          const nextAnimation = animationDraft ? JSON.parse(JSON.stringify(animationDraft)) : null;
                          if (!nextAnimation?.clips?.[clipIndex]?.tracks) return;
                          nextAnimation.clips[clipIndex].tracks[absoluteIndex] = value;
                          setAnimationDraft(nextAnimation);
                          setAnimationDirty(true);
                          applyDrafts({ animationOverride: nextAnimation, forceAnimation: true });
                        }}
                        path={`clips.${clipIndex}.tracks.${absoluteIndex}`}
                        parentValue={track}
                      />
                      <Button danger size="small" onClick={() => removeTrack(clipIndex, absoluteIndex)}>
                        Remove Track
                      </Button>
                    </div>
                  );
                })
              )}
            </InspectorComponentSection>
          ),
        });
      });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
      {showDesign && (
        <VirtualizedInspectorList items={designItems} />
      )}

      {showAnimation && (
        <VirtualizedInspectorList items={animationItems} />
      )}

      {showSimulate && (
        <VirtualizedInspectorList items={simulateItems} />
      )}
      <InspectorMetadataModal
        open={isPopoutMetadataOpen}
        mode="part"
        eid={eid}
        partPath={popoutMetadataPath ?? undefined}
        onClose={() => setIsPopoutMetadataOpen(false)}
      />

    </div>
  );
}
