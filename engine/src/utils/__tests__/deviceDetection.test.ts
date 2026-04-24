import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectMobile } from '../deviceDetection';

describe('Mobile detection', () => {
    // Store original values
    const originalNavigator = global.navigator;
    const originalWindow = global.window;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Restore original values
        global.navigator = originalNavigator;
        global.window = originalWindow;
    });

    it('should detect mobile when device has touch and small screen', () => {
        // Mock a mobile device with touch and small screen
        Object.defineProperty(global, 'window', {
            value: {
                innerWidth: 400, // Small screen
            },
            writable: true
        });

        Object.defineProperty(global.window, 'ontouchstart', {
            value: true,
            writable: true
        });

        Object.defineProperty(global, 'navigator', {
            value: {
                maxTouchPoints: 5,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            writable: true
        });

        expect(detectMobile()).toBe(true);
    });

    it('should detect mobile when device has touch and mobile user agent', () => {
        // Mock a device with touch and mobile user agent
        Object.defineProperty(global, 'window', {
            value: {
                innerWidth: 1000, // Large screen
            },
            writable: true
        });

        Object.defineProperty(global.window, 'ontouchstart', {
            value: true,
            writable: true
        });

        Object.defineProperty(global, 'navigator', {
            value: {
                maxTouchPoints: 5,
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
            },
            writable: true
        });

        expect(detectMobile()).toBe(true);
    });

    it('should not detect mobile for desktop without touch', () => {
        // Mock a desktop device
        Object.defineProperty(global, 'window', {
            value: {
                innerWidth: 1200, // Large screen
            },
            writable: true
        });

        // No ontouchstart property
        Object.defineProperty(global, 'navigator', {
            value: {
                maxTouchPoints: 0,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            writable: true
        });

        expect(detectMobile()).toBe(false);
    });

    it('should not detect mobile for touch device with large screen and desktop user agent', () => {
        // Mock a desktop with touch (like Surface Pro)
        Object.defineProperty(global, 'window', {
            value: {
                innerWidth: 1200, // Large screen
            },
            writable: true
        });

        Object.defineProperty(global.window, 'ontouchstart', {
            value: true,
            writable: true
        });

        Object.defineProperty(global, 'navigator', {
            value: {
                maxTouchPoints: 5,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            writable: true
        });

        expect(detectMobile()).toBe(false);
    });
});