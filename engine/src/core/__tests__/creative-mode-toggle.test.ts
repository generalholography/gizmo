import { describe, it, expect, vi, beforeEach } from 'vitest';
import TriggerInput, { TriggerInputKey } from '../triggerInput';

describe('Creative Mode Toggle', () => {
    let triggerInput: TriggerInput;
    let creativeMode: boolean;
    let mockSetCreativeMode: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        triggerInput = new TriggerInput();
        creativeMode = false;
        mockSetCreativeMode = vi.fn((enabled: boolean) => {
            console.log(`Creative mode ${enabled ? 'enabled' : 'disabled'}`);
        });

        // Setup the creative mode toggle logic (mimicking the engine's behavior)
        triggerInput.on(TriggerInputKey.CREATIVE, () => {
            creativeMode = !creativeMode;
            mockSetCreativeMode(creativeMode);
        });
    });

    it('should toggle creative mode on when pressing F5 (first press)', () => {
        expect(creativeMode).toBe(false);

        // First press: false -> true
        triggerInput.set(TriggerInputKey.CREATIVE);
        expect(creativeMode).toBe(true);
        expect(mockSetCreativeMode).toHaveBeenCalledWith(true);
    });

    it('should toggle creative mode off when pressing F5 again (second press)', () => {
        // First press: false -> true
        triggerInput.set(TriggerInputKey.CREATIVE);
        expect(creativeMode).toBe(true);

        // Second press: true -> false
        triggerInput.set(TriggerInputKey.CREATIVE);
        expect(creativeMode).toBe(false);
        expect(mockSetCreativeMode).toHaveBeenCalledWith(false);
    });

    it('should call setCreativeMode with correct state on each toggle', () => {
        // Toggle on
        triggerInput.set(TriggerInputKey.CREATIVE);
        expect(mockSetCreativeMode).toHaveBeenCalledTimes(1);
        expect(mockSetCreativeMode).toHaveBeenLastCalledWith(true);

        // Toggle off
        triggerInput.set(TriggerInputKey.CREATIVE);
        expect(mockSetCreativeMode).toHaveBeenCalledTimes(2);
        expect(mockSetCreativeMode).toHaveBeenLastCalledWith(false);

        // Toggle on again
        triggerInput.set(TriggerInputKey.CREATIVE);
        expect(mockSetCreativeMode).toHaveBeenCalledTimes(3);
        expect(mockSetCreativeMode).toHaveBeenLastCalledWith(true);
    });
});
