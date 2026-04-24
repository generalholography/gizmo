/**
 * Assets Browser
 * Manage and spawn uploaded assets (models, etc.)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Typography, List, Button, Empty, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useAPI } from '../App';
import { useEditor } from './EditorContext';
import type { EditorAssetRecord } from '../../..';
import { EditorIcon } from './styles/EditorIcon';

const { Text, Title } = Typography;

export function AssetsBrowser() {
  const api = useAPI();
  const { setSpawnTool } = useEditor();
  const config = api.getConfig();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [assets, setAssets] = useState<EditorAssetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadAssets = useCallback(async () => {
    if (!config.onListAssets) {
      setAssets([]);
      return;
    }
    setLoading(true);
    try {
      const list = await config.onListAssets();
      setAssets(list);
    } catch (error: any) {
      console.error('[AssetsBrowser] Failed to load assets', error);
      message.error(error?.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !config.onUploadAsset) return;
    setUploading(true);
    try {
      const asset = await config.onUploadAsset(file);
      setAssets((prev) => [asset, ...prev.filter((item) => item.id !== asset.id)]);
      message.success(`Uploaded ${asset.name}`);
    } catch (error: any) {
      console.error('[AssetsBrowser] Upload failed', error);
      message.error(error?.message || 'Failed to upload asset');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [config]);

  const handleSelect = useCallback((asset: EditorAssetRecord) => {
    try {
      setSpawnTool('asset', {
        Info: {
          name: asset.name,
          description: `Asset: ${asset.name}`,
        },
        Body: {
          type: 'gltf',
          params: {
            file: asset.url,
          },
        },
      });
      message.success(`Selected ${asset.name}. Click in the viewport to place.`);
    } catch (error: any) {
      console.error('[AssetsBrowser] Failed to select asset', error);
      message.error('Failed to select asset');
    }
  }, [setSpawnTool]);

  const modelAssets = useMemo(
    () => assets.filter((asset) => asset.type === 'model'),
    [assets]
  );

  const renderAssetList = (items: EditorAssetRecord[]) => {
    if (items.length === 0) {
      return (
        <Empty
          description="No models found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ color: '#999' }}
        />
      );
    }

    return (
      <List
        loading={loading}
        dataSource={items}
        renderItem={(asset: EditorAssetRecord) => (
          <List.Item
            key={asset.id}
            style={{
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '4px',
              marginBottom: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
            }}
            onClick={() => handleSelect(asset)}
          >
            <List.Item.Meta
              title={(
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <EditorIcon name="gltf" size={16} />
                  <Text style={{ color: '#fff', fontSize: '14px' }}>{asset.name}</Text>
                </div>
              )}
            />
          </List.Item>
        )}
      />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <Title level={5} style={{ color: '#fff', margin: 0 }}>
        Assets
      </Title>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#ccc' }}>Models</Text>
        <Button
          size="small"
          type="default"
          icon={<UploadOutlined />}
          onClick={handleUploadClick}
          disabled={!config.onUploadAsset}
          loading={uploading}
        >
          Upload
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,model/gltf-binary"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderAssetList(modelAssets)}
      </div>
    </div>
  );
}
