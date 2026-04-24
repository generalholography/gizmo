import React, { useState, useEffect } from "react";
import { Modal, Slider, Typography, Switch, Button } from "antd";
import type { 
    RenderScale,
    SSAOQuality,
    ShadowQuality,
} from "../../settings";
import { 
    SETTINGS_KEYS,
    RENDER_SCALES,
    getMouseSensitivity,
    setMouseSensitivity,
    getSSAOQuality,
    setSSAOQuality,
    getShadowQuality,
    setShadowQuality,
    getAntialias,
    setAntialias,
    getBryceMode,
    setBryceMode,
    getRenderScale,
    setRenderScale,
    getUseLights,
    setUseLights,
} from "../../settings";
import { useAPI } from "../App";
import { ECSContext } from "../../ecs";

const { Title, Text } = Typography;

interface SettingsModalProps {
    open: boolean;
    onClose: () => void;
}


const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
    const api = useAPI();
    const [mouseSensitivity, setMouseSensitivityState] = useState(getMouseSensitivity(api.ecsWorld));
    const [ssaoQuality, setSSAOQualityState] = useState<SSAOQuality>(getSSAOQuality(api.ecsWorld));
    const [shadowQuality, setShadowQualityState] = useState<ShadowQuality>(getShadowQuality(api.ecsWorld));
    const [antialias, setAntialiasState] = useState(getAntialias(api.ecsWorld));
    const [bryceMode, setBryceModeState] = useState(getBryceMode(api.ecsWorld));
    const [renderScale, setRenderScaleState] = useState<RenderScale>(getRenderScale(api.ecsWorld));
    const [useLights, setUseLightsState] = useState(getUseLights(api.ecsWorld));

    useEffect(() => {
        if (open) {
            // Load current settings when modal opens
            setMouseSensitivityState(getMouseSensitivity(api.ecsWorld));
            setSSAOQualityState(getSSAOQuality(api.ecsWorld));
            setShadowQualityState(getShadowQuality(api.ecsWorld));
            setBryceModeState(getBryceMode(api.ecsWorld));
            setAntialiasState(getAntialias(api.ecsWorld));
            setRenderScaleState(getRenderScale(api.ecsWorld));
            setUseLightsState(getUseLights(api.ecsWorld));
        }
    }, [open]);
    // Render scale toggle logic (cycles through RENDER_SCALES)
    const handleRenderScaleToggle = () => {
        const idx = RENDER_SCALES.indexOf(renderScale);
        const nextIdx = (idx + 1) % RENDER_SCALES.length;
        const nextScale = RENDER_SCALES[nextIdx];
        setRenderScaleState(nextScale);
        setRenderScale(nextScale);
        api.renderer.setPixelRatio(Math.min((window.devicePixelRatio || 1) * nextScale, 2));
    };

    const handleSensitivityChange = (value: number) => {
        setMouseSensitivityState(value);
        setMouseSensitivity(value);
    };

    const handleSSAOQualityChange = (value: number) => {
        const qualities: SSAOQuality[] = ['off', 'low', 'med', 'high', 'ultra'];
        const quality = qualities[value];
        setSSAOQualityState(quality);
        setSSAOQuality(quality);
    };

    const handleShadowQualityChange = (value: number) => {
        const qualities: ShadowQuality[] = ['off', 'low', 'med', 'high'];
        const quality = qualities[value];
        setShadowQualityState(quality);
        setShadowQuality(quality);
    };

    const handleBryceModeChange = (checked: boolean) => {
        setBryceModeState(checked);
        setBryceMode(checked);
    };

    const handleAntialiasChange = (checked: boolean) => {
        setAntialiasState(checked);
        setAntialias(checked);
    };

    const handleUseLightsChange = (checked: boolean) => {
        setUseLightsState(checked);
        setUseLights(checked);
        // Light visibility is now handled by the body rendering system
    };

    const ssaoQualityToNumber = (quality: SSAOQuality): number => {
        const map = { 'off': 0, 'low': 1, 'med': 2, 'high': 3, 'ultra': 4 };
        return map[quality];
    };

    const shadowQualityToNumber = (quality: ShadowQuality): number => {
        const map = { 'off': 0, 'low': 1, 'med': 2, 'high': 3 };
        return map[quality];
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            title="Settings"
            width={400}
            transitionName=""
            maskTransitionName=""
        >
            <div>
                <Title level={5}>Mouse Sensitivity</Title>
                <Slider
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    value={mouseSensitivity}
                    onChange={handleSensitivityChange}
                    marks={{
                        0.1: '0.1x',
                        1.0: '1.0x',
                        2.0: '2.0x',
                        3.0: '3.0x',
                    }}
                    tooltip={{
                        formatter: (value) => `${value}x`
                    }}
                />
            </div>

            <div>
                <Title level={5}>Render Scale</Title>
                <Button
                    style={{
                        width: '100%',
                        padding: '8px',
                        marginBottom: '12px',
                    }}
                    onClick={handleRenderScaleToggle}
                >
                    {`${renderScale.toFixed(1)}x`}
                </Button>
            </div>

            <div>
                <Title level={5}>SSAO Quality</Title>
                <Slider
                    min={0}
                    max={4}
                    step={1}
                    value={ssaoQualityToNumber(ssaoQuality)}
                    onChange={handleSSAOQualityChange}
                    marks={{
                        0: 'Off',
                        1: 'Low',
                        2: 'Med',
                        3: 'High',
                        4: 'Ultra'
                    }}
                    tooltip={{
                        formatter: (value) => ['Off', 'Low', 'Med', 'High', 'Ultra'][value!]
                    }}
                />
            </div>

            <div>
                <Title level={5}>Shadow Quality</Title>
                <Slider
                    min={0}
                    max={3}
                    step={1}
                    value={shadowQualityToNumber(shadowQuality)}
                    onChange={handleShadowQualityChange}
                    marks={{
                        0: 'Off',
                        1: 'Low',
                        2: 'Med',
                        3: 'High',
                    }}
                    tooltip={{
                        formatter: (value) => ['Off', 'Low', 'Med', 'High'][value!]
                    }}
                />
            </div>

            <div>
                <Title level={5}>Antialiasing</Title>
                <Switch
                    checked={antialias}
                    onChange={handleAntialiasChange}
                    checkedChildren="On"
                    unCheckedChildren="Off"
                />
            </div>

            <div>
                <Title 
                    level={5}
                    title="Toggle point/spot lights in the scene"
                    style={{ cursor: 'help' }}
                >
                    Use Lights
                </Title>
                <Switch
                    checked={useLights}
                    onChange={handleUseLightsChange}
                    checkedChildren="On"
                    unCheckedChildren="Off"
                />
            </div>

            {/* <div>
                <Title level={5}>Bryce Mode</Title>
                <Switch
                    checked={bryceMode}
                    onChange={handleBryceModeChange}
                    checkedChildren="On"
                    unCheckedChildren="Off"
                />
            </div> */}
        </Modal>
    );
};

export default SettingsModal;

// Re-export settings functions for tests
export {
    getMouseSensitivity,
    setMouseSensitivity,
    SETTINGS_KEYS,
    getSSAOQuality,
    setSSAOQuality,
    getShadowQuality,
    setShadowQuality,
    getBryceMode,
    setBryceMode,
    getUseLights,
    setUseLights,
    SSAOQuality,
    ShadowQuality,
};