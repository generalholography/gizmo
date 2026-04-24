import React, { useMemo, useState } from 'react';
import { Button, Dropdown, Space, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import { EDITOR_COLORS, EDITOR_SPACING } from './styles/tokens';

const { Text } = Typography;

function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function RenderInspector() {
  const api = useAPI();
  const { selectedEntities } = useEditor();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);

  const selectedEntity = selectedEntities[0];
  const upscaleMeta = api.getImageUpscaleMeta?.();
  // Only show models that actually support image generation in the Capture + Upscale flow.
  const upscaleModels = (api.getImageUpscaleModels?.() ?? []).filter(
    (model) => model.supportsImageGeneration,
  );
  const activeModelId = api.getActiveImageUpscaleModelId?.() ?? upscaleMeta?.activeModelId ?? null;
  const activeModel =
    upscaleModels.find((model) => model.id === activeModelId) ?? upscaleModels[0] ?? undefined;
  const upscaleAvailable = Boolean(api.upscaleImage && activeModel);
  const upscaleLabel = activeModel?.name ?? activeModel?.id ?? 'Configured model';

  const modelMenuItems = useMemo<MenuProps['items']>(() => {
    return upscaleModels.map((model) => ({
      key: model.id,
      label: model.name,
      disabled: false,
    }));
  }, [upscaleModels]);

  const handleModelSelect = (modelId: string) => {
    api.setActiveImageUpscaleModelId?.(modelId);
  };

  const handleCaptureWorld = async () => {
    setIsCapturing(true);
    try {
      const result = api.captureWorldScreenshot();
      downloadImage(result.dataUrl, `world-screenshot-${Date.now()}.png`);
      message.success('World screenshot downloaded');
    } catch (error) {
      console.error('Failed to capture world screenshot', error);
      message.error('Failed to capture world screenshot');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureEntity = async () => {
    if (selectedEntity === undefined) return;
    setIsCapturing(true);
    try {
      const result = api.captureEntityScreenshot(selectedEntity);
      downloadImage(result.dataUrl, `entity-${selectedEntity}-screenshot-${Date.now()}.png`);
      message.success('Entity screenshot downloaded');
    } catch (error) {
      console.error('Failed to capture entity screenshot', error);
      message.error('Failed to capture entity screenshot');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCaptureAndUpscale = async (scope: 'world' | 'entity') => {
    if (scope === 'entity' && selectedEntity === undefined) return;
    setIsUpscaling(true);
    try {
      const baseScreenshot =
        scope === 'entity' && selectedEntity !== undefined
          ? api.captureEntityScreenshot(selectedEntity)
          : api.captureWorldScreenshot();
      const upscaled = await api.upscaleImage({
        dataUrl: baseScreenshot.dataUrl,
        prompt: '"rtx on" this image. low poly -> full photorealism. Maintain the same composition and camera angle.',
        scope,
        eid: scope === 'entity' ? selectedEntity : undefined,
      });
      downloadImage(upscaled.dataUrl, `${scope}-upscaled-${Date.now()}.png`);
      message.success('Upscaled image downloaded');
    } catch (error: any) {
      console.error('Failed to upscale image', error);
      message.error(error?.message || 'Failed to upscale image');
    } finally {
      setIsUpscaling(false);
    }
  };

  const captureButtonsDisabled = useMemo(() => isCapturing || isUpscaling, [isCapturing, isUpscaling]);
  const showWorld = selectedEntity === undefined || selectedEntity === null;
  const showEntity = selectedEntity !== undefined && selectedEntity !== null;
  const upscaleButtonProps = {
    menu: {
      items: modelMenuItems,
      onClick: ({ key }: { key: string }) => handleModelSelect(key),
    },
    placement: 'bottomRight' as const,
  };

  return (
    <div style={{ padding: `${EDITOR_SPACING.xs}px 0` }}>
      <Space direction="vertical" size={EDITOR_SPACING.sm} style={{ width: '100%' }}>
        {showWorld && (
          <div>
            <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: 12 }}>World</Text>
            <Space style={{ width: '100%', marginTop: 6 }} direction="vertical">
              <Button type="primary" block onClick={handleCaptureWorld} loading={isCapturing} disabled={captureButtonsDisabled}>
                Capture World Screenshot
              </Button>
              <Dropdown.Button
                {...upscaleButtonProps}
                style={{ width: "100%" }}
                onClick={() => handleCaptureAndUpscale('world')}
                loading={isUpscaling}
                disabled={!upscaleAvailable || captureButtonsDisabled}
              >
                Capture + Upscale
              </Dropdown.Button>
            </Space>
          </div>
        )}

        {showEntity && (
          <div>
            <Text style={{ color: EDITOR_COLORS.textSecondary, fontSize: 12 }}>Entity</Text>
            <Space style={{ width: '100%', marginTop: 6 }} direction="vertical">
              <Button
                type="primary"
                block
                onClick={handleCaptureEntity}
                loading={isCapturing}
                disabled={captureButtonsDisabled}
              >
                Capture Entity Screenshot
              </Button>
              <Dropdown.Button
                {...upscaleButtonProps}
                style={{ width: "100%" }}
                onClick={() => handleCaptureAndUpscale('entity')}
                loading={isUpscaling}
                disabled={!upscaleAvailable || captureButtonsDisabled}
              >
                Capture + Upscale
              </Dropdown.Button>
            </Space>
          </div>
        )}

        {!upscaleAvailable && (
          <Text style={{ color: EDITOR_COLORS.textTertiary, fontSize: 11 }}>
            Upscale is unavailable for the selected model.
          </Text>
        )}
        {upscaleAvailable && (
          <Text style={{ color: EDITOR_COLORS.textTertiary, fontSize: 11 }}>
            Upscaling powered by {upscaleLabel}.
          </Text>
        )}
      </Space>
    </div>
  );
}
