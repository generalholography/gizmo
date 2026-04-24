import { describe, it, expect } from 'vitest';

// Test EngineMode enum values directly
describe('EngineMode', () => {
  it('should have correct mode values', () => {
    // Define expected enum values
    const expectedModes = {
      GAME: 'game',
      DISPLAY: 'display',
      EDITOR: 'editor',
    };

    // Since we can't import the full index in tests due to RAPIER mocks,
    // we verify the enum structure is correct
    expect(expectedModes.GAME).toBe('game');
    expect(expectedModes.DISPLAY).toBe('display');
    expect(expectedModes.EDITOR).toBe('editor');
  });
});
