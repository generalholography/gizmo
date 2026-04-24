import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage for testing
const mockLocalStorage = {
    store: {} as Record<string, string>,
    getItem: (key: string) => mockLocalStorage.store[key] || null,
    setItem: (key: string, value: string) => {
        mockLocalStorage.store[key] = value;
    },
    clear: () => {
        mockLocalStorage.store = {};
    }
};

// Mock global localStorage
Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});

import { getMouseSensitivity, setMouseSensitivity, SETTINGS_KEYS, getSSAOQuality, setSSAOQuality, getShadowQuality, setShadowQuality, getBryceMode, setBryceMode, getUseLights, setUseLights, SSAOQuality, ShadowQuality } from '../SettingsModal';

describe('Settings functionality', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
    });

    it('should return default sensitivity of 1.0 when no setting is stored', () => {
        const sensitivity = getMouseSensitivity();
        expect(sensitivity).toBe(1.0);
    });

    it('should store and retrieve mouse sensitivity correctly', () => {
        const testSensitivity = 2.5;
        setMouseSensitivity(testSensitivity);
        
        const retrievedSensitivity = getMouseSensitivity();
        expect(retrievedSensitivity).toBe(testSensitivity);
    });

    it('should persist sensitivity to localStorage with correct key', () => {
        const testSensitivity = 1.8;
        setMouseSensitivity(testSensitivity);
        
        const storedValue = mockLocalStorage.getItem(SETTINGS_KEYS.MOUSE_SENSITIVITY);
        expect(storedValue).toBe(testSensitivity.toString());
    });

    it('should handle edge cases correctly', () => {
        // Test minimum value
        setMouseSensitivity(0.1);
        expect(getMouseSensitivity()).toBe(0.1);
        
        // Test maximum value
        setMouseSensitivity(3.0);
        expect(getMouseSensitivity()).toBe(3.0);
        
        // Test fractional values
        setMouseSensitivity(1.234);
        expect(getMouseSensitivity()).toBe(1.234);
    });

    it('should have correct settings key constants', () => {
        expect(SETTINGS_KEYS.MOUSE_SENSITIVITY).toBe('game_settings_mouse_sensitivity');
        expect(SETTINGS_KEYS.SSAO_QUALITY).toBe('game_settings_ssao_quality');
        expect(SETTINGS_KEYS.SHADOW_QUALITY).toBe('game_settings_shadow_quality');
        expect(SETTINGS_KEYS.BRYCE_MODE).toBe('game_settings_bryce_mode');
        expect(SETTINGS_KEYS.USE_LIGHTS).toBe('game_settings_use_lights');
    });

    describe('SSAO Quality settings', () => {
        it('should return default quality of "med" when no setting is stored', () => {
            const quality = getSSAOQuality();
            expect(quality).toBe('med');
        });

        it('should store and retrieve SSAO quality correctly', () => {
            const testQualities: SSAOQuality[] = ['off', 'low', 'med', 'high'];
            
            testQualities.forEach(quality => {
                setSSAOQuality(quality);
                const retrievedQuality = getSSAOQuality();
                expect(retrievedQuality).toBe(quality);
            });
        });

        it('should persist SSAO quality to localStorage with correct key', () => {
            const testQuality: SSAOQuality = 'high';
            setSSAOQuality(testQuality);
            
            const storedValue = mockLocalStorage.getItem(SETTINGS_KEYS.SSAO_QUALITY);
            expect(storedValue).toBe(testQuality);
        });
    });

    describe('Shadow Quality settings', () => {
        it('should return default quality of "med" when no setting is stored', () => {
            const quality = getShadowQuality();
            expect(quality).toBe('med');
        });

        it('should store and retrieve shadow quality correctly', () => {
            const testQualities: ShadowQuality[] = ['off', 'low', 'med', 'high'];
            
            testQualities.forEach(quality => {
                setShadowQuality(quality);
                const retrievedQuality = getShadowQuality();
                expect(retrievedQuality).toBe(quality);
            });
        });

        it('should persist shadow quality to localStorage with correct key', () => {
            const testQuality: ShadowQuality = 'high';
            setShadowQuality(testQuality);
            
            const storedValue = mockLocalStorage.getItem(SETTINGS_KEYS.SHADOW_QUALITY);
            expect(storedValue).toBe(testQuality);
        });
    });

    describe('Bryce Mode settings', () => {
        it('should return default value of false when no setting is stored', () => {
            const bryceMode = getBryceMode();
            expect(bryceMode).toBe(false);
        });

        it('should store and retrieve Bryce mode correctly', () => {
            setBryceMode(true);
            expect(getBryceMode()).toBe(true);
            
            setBryceMode(false);
            expect(getBryceMode()).toBe(false);
        });

        it('should persist Bryce mode to localStorage with correct key', () => {
            setBryceMode(true);
            
            const storedValue = mockLocalStorage.getItem(SETTINGS_KEYS.BRYCE_MODE);
            expect(storedValue).toBe('true');
        });
    });

    describe('Use Lights settings', () => {
        it('should return default value of true when no setting is stored', () => {
            const useLights = getUseLights();
            expect(useLights).toBe(true);
        });

        it('should store and retrieve use lights correctly', () => {
            setUseLights(true);
            expect(getUseLights()).toBe(true);
            
            setUseLights(false);
            expect(getUseLights()).toBe(false);
        });

        it('should persist use lights to localStorage with correct key', () => {
            setUseLights(true);
            
            const storedValue = mockLocalStorage.getItem(SETTINGS_KEYS.USE_LIGHTS);
            expect(storedValue).toBe('true');
        });
    });
});
